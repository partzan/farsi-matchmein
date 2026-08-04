import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = {
  title?: string;
  description?: string;
  city?: string;
  category?: string;
  interests?: string[];
  related?: string[];
  moodEmoji?: string;
  icon?: string;
  when?: string;
  date?: string;
  time?: string;
};

function buildPrompt(eventData: any): string {
  const {
    title,
    description,
    category,
    interests,
    city,
    when,
    moodEmoji,
  } = eventData;

  const interestsList = interests?.length ? interests.join(", ") : null;

  const lines = [
    `Create a vibrant, photorealistic promotional photo for a social meetup event.`,
    `Absolutely no text, letters, numbers, Farsi/Persian script, logos, watermarks, date stamps, or category labels in the image.`,
    ``,
    `Event title (for scene only — do not render as text): ${title || "Social meetup"}`,
  ];

  if (description) lines.push(`Description (scene mood only): ${description}`);
  if (category) lines.push(`Main category vibe: ${category}`);
  if (interestsList) lines.push(`Related interest vibes: ${interestsList}`);
  if (city) lines.push(`City: ${city}`);
  if (moodEmoji) lines.push(`Mood emoji hint: ${moodEmoji}`);
  if (when) lines.push(`When (do not render as text): ${when}`);

  lines.push(
    ``,
    `Style: warm natural light, inviting group atmosphere, Iranian urban cafe/outdoors vibe when relevant.`,
    ``,
    `People: contemporary Iranian men and women, 2025-2026 everyday style. Women in loose manteau/long coat, casual hijab worn back showing front hairline, fitted jeans, sneakers or boots, natural minimal makeup. Men in fitted t-shirts or casual shirts, jeans/chinos, sneakers, contemporary haircuts. Natural skin tones, candid unposed expressions, realistic proportions.`,
  );

  return lines.join("\n");
}

function normalizeEventData(body: Body) {
  return {
    title: body.title,
    description: body.description,
    category: body.category,
    city: body.city,
    interests: body.interests ?? body.related,
    moodEmoji: body.moodEmoji ?? body.icon,
    when: body.when ?? [body.date, body.time].filter(Boolean).join(" "),
  };
}

function resolveImageApiUrl(provider: string, configured?: string | null): string {
  const fallback =
    provider === "openrouter"
      ? "https://openrouter.ai/api/v1/images"
      : "https://api.openai.com/v1/images/generations";
  let url = (configured || fallback).trim();
  // Older OpenAI-compat path is wrong for OpenRouter's Image API
  if (/openrouter\.ai/i.test(url) && /\/images\/generations\/?$/i.test(url)) {
    url = url.replace(/\/images\/generations\/?$/i, "/images");
  }
  return url;
}

async function extractImageBase64(
  json: Record<string, unknown>,
): Promise<{ base64: string | null; mime: string }> {
  const data = json?.data;
  const item = Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;
  let mime =
    typeof item?.media_type === "string" ? item.media_type : "image/png";

  if (typeof item?.b64_json === "string" && item.b64_json) {
    return { base64: item.b64_json, mime };
  }

  // Some providers return a hosted URL instead of base64
  const url = typeof item?.url === "string" ? item.url : null;
  if (url) {
    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      throw new Error(`Failed to download generated image (${imgRes.status})`);
    }
    const contentType = imgRes.headers.get("content-type");
    if (contentType?.startsWith("image/")) mime = contentType.split(";")[0].trim();
    const bytes = new Uint8Array(await imgRes.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return { base64: btoa(binary), mime };
  }

  if (typeof json?.image_base64 === "string") {
    return { base64: json.image_base64, mime: typeof json.mime === "string" ? json.mime : mime };
  }
  if (typeof json?.b64_json === "string") {
    return { base64: json.b64_json, mime };
  }

  return { base64: null, mime };
}

function normalizeApiKey(raw: string): string {
  // Secrets sometimes pasted as "Bearer sk-..." — avoid double Bearer
  return raw.trim().replace(/^Bearer\s+/i, "").trim();
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError(
        "Supabase unauthorized: Missing Authorization header (sign in and retry)",
        401,
      );
    }

    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return jsonError(
        "Supabase unauthorized: empty Bearer token (sign in and retry)",
        401,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );

    // Must pass JWT — getUser() without it ignores Authorization and always fails in Edge
    const {
      data: { user },
      error: authError,
    } = await supabaseAnon.auth.getUser(jwt);
    if (authError || !user) {
      console.error(
        "generate-event-image supabase auth failed:",
        authError?.message || "no user",
      );
      return jsonError(
        `Supabase unauthorized: ${authError?.message || "invalid or expired session — sign in again"}`,
        401,
      );
    }

    const body = (await req.json()) as Body;
    const prompt = buildPrompt(normalizeEventData(body));

    const provider = (Deno.env.get("IMAGE_GENERATOR_PROVIDER") || "openai").toLowerCase();
    const apiKeyRaw =
      Deno.env.get("IMAGE_GENERATOR_API_KEY") ||
      Deno.env.get("OPENROUTER_API_KEY") ||
      Deno.env.get("OPENAI_API_KEY");
    if (!apiKeyRaw) {
      throw new Error(
        "IMAGE_GENERATOR_API_KEY is not configured (also checked OPENROUTER_API_KEY / OPENAI_API_KEY)",
      );
    }
    const apiKey = normalizeApiKey(apiKeyRaw);
    if (!apiKey) {
      throw new Error("IMAGE_GENERATOR_API_KEY is empty after trim");
    }

    let imageBase64: string | null = null;
    let mime = "image/png";

    if (provider === "openai" || provider === "dalle" || provider === "openrouter") {
      const apiUrl = resolveImageApiUrl(
        provider,
        Deno.env.get("IMAGE_GENERATOR_API_URL"),
      );
      const usingOpenRouter =
        provider === "openrouter" || /openrouter\.ai/i.test(apiUrl);
      const model =
        Deno.env.get("IMAGE_GENERATOR_MODEL") ||
        (usingOpenRouter ? "openai/dall-e-3" : "dall-e-3");

      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
      if (usingOpenRouter) {
        headers["HTTP-Referer"] =
          Deno.env.get("IMAGE_GENERATOR_HTTP_REFERER") || "https://www.r359.ir";
        headers["X-Title"] =
          Deno.env.get("IMAGE_GENERATOR_APP_TITLE") || "HiEvent";
      }

      // OpenRouter Image API: POST /api/v1/images — always returns b64_json
      // (no response_format). OpenAI Images API still uses /images/generations.
      const payload: Record<string, unknown> = usingOpenRouter
        ? {
            model,
            prompt,
            n: 1,
            size: "1024x1024",
          }
        : {
            model,
            prompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json",
          };

      console.log(
        JSON.stringify({
          msg: "image_generate_request",
          provider,
          usingOpenRouter,
          apiUrl,
          model,
        }),
      );

      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = (await response.text()).slice(0, 800);
        console.error("Image API error", response.status, errText);
        if (response.status === 401 || response.status === 403) {
          const who = usingOpenRouter ? "OpenRouter" : "Image provider";
          throw new Error(
            `${who} unauthorized (${response.status}): invalid or missing API key. ` +
              `Re-set IMAGE_GENERATOR_API_KEY (or OPENROUTER_API_KEY) in Supabase Edge secrets` +
              (usingOpenRouter ? " with a valid sk-or-v1-... key." : ".") +
              ` Details: ${errText}`,
          );
        }
        throw new Error(`Image API error (${response.status}): ${errText}`);
      }

      const json = (await response.json()) as Record<string, unknown>;
      const extracted = await extractImageBase64(json);
      imageBase64 = extracted.base64;
      mime = extracted.mime;
    } else {
      // Generic OpenAI-compatible: POST { prompt } → { image_base64 } or { data:[{b64_json}] }
      const apiUrl = Deno.env.get("IMAGE_GENERATOR_API_URL");
      if (!apiUrl) throw new Error("IMAGE_GENERATOR_API_URL required for custom provider");

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, model: Deno.env.get("IMAGE_GENERATOR_MODEL") }),
      });

      if (!response.ok) {
        const errText = (await response.text()).slice(0, 800);
        console.error("Image API error", response.status, errText);
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            `Image provider unauthorized (${response.status}): invalid or missing IMAGE_GENERATOR_API_KEY. Details: ${errText}`,
          );
        }
        throw new Error(`Image API error (${response.status}): ${errText}`);
      }

      const json = (await response.json()) as Record<string, unknown>;
      const extracted = await extractImageBase64(json);
      imageBase64 = extracted.base64;
      mime = extracted.mime;
    }

    if (!imageBase64) throw new Error("Image generator returned no image");

    return new Response(
      JSON.stringify({
        image_data_url: `data:${mime};base64,${imageBase64}`,
        prompt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("generate-event-image failed:", message);
    const status = /unauthorized|invalid or expired session|sign in/i.test(message)
      ? 401
      : 400;
    return jsonError(message, status);
  }
});
