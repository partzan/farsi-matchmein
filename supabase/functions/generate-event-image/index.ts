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
  related?: string[];
  icon?: string;
  date?: string;
  time?: string;
};

function buildPrompt(body: Body): string {
  const related = (body.related || []).filter(Boolean).join(", ");
  return [
    "Create a vibrant, photorealistic promotional photo for a social meetup event.",
    "No text overlays, no logos, no watermarks.",
    `Event title: ${body.title || "Social meetup"}`,
    body.description ? `Description: ${body.description}` : "",
    body.category ? `Main category: ${body.category}` : "",
    related ? `Related interests: ${related}` : "",
    body.city ? `City: ${body.city}` : "",
    body.icon ? `Mood emoji hint: ${body.icon}` : "",
    body.date || body.time
      ? `When: ${[body.date, body.time].filter(Boolean).join(" ")}`
      : "",
    "Style: warm natural light, inviting group atmosphere, Iranian urban cafe/outdoors vibe when relevant.",
  ]
    .filter(Boolean)
    .join("\n");
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAnon.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = (await req.json()) as Body;
    const prompt = buildPrompt(body);

    const provider = (Deno.env.get("IMAGE_GENERATOR_PROVIDER") || "openai").toLowerCase();
    const apiKey =
      Deno.env.get("IMAGE_GENERATOR_API_KEY") ||
      Deno.env.get("OPENROUTER_API_KEY") ||
      Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("IMAGE_GENERATOR_API_KEY is not configured");

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
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
