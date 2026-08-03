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
    const apiKey = Deno.env.get("IMAGE_GENERATOR_API_KEY") ||
      Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("IMAGE_GENERATOR_API_KEY is not configured");

    let imageBase64: string | null = null;
    let mime = "image/png";

    if (provider === "openai" || provider === "dalle") {
      const model = Deno.env.get("IMAGE_GENERATOR_MODEL") || "dall-e-3";
      const apiUrl =
        Deno.env.get("IMAGE_GENERATOR_API_URL") ||
        "https://api.openai.com/v1/images/generations";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          size: "1024x1024",
          response_format: "b64_json",
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Image API error: ${errText}`);
      }

      const json = await response.json();
      imageBase64 = json?.data?.[0]?.b64_json ?? null;
      mime = "image/png";
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
        const errText = await response.text();
        throw new Error(`Image API error: ${errText}`);
      }

      const json = await response.json();
      imageBase64 =
        json?.image_base64 ||
        json?.b64_json ||
        json?.data?.[0]?.b64_json ||
        null;
      if (json?.mime) mime = json.mime;
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
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
