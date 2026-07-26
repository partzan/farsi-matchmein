import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Normalize Iranian mobile → { e164: +98..., local: 09..., digits: 98912... } */
export function normalizeIranPhone(raw: string): {
  e164: string;
  local: string;
  digits: string;
} | null {
  const ascii = raw
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - "۰".charCodeAt(0)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - "٠".charCodeAt(0)));
  const digits = ascii.replace(/\D/g, "");
  let national = "";
  if (digits.startsWith("98") && digits.length >= 12) national = digits.slice(2);
  else if (digits.startsWith("0") && digits.length >= 11) national = digits.slice(1);
  else if (digits.length === 10 && digits.startsWith("9")) national = digits;
  else return null;
  if (!/^9\d{9}$/.test(national)) return null;
  return {
    e164: `+98${national}`,
    local: `0${national}`,
    digits: `98${national}`,
  };
}

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

/** Send OTP via Kavenegar Verify Lookup (template must include %token). */
export async function sendKavenegarOtp(localPhone: string, code: string) {
  const apiKey = Deno.env.get("KAVENEGAR_API_KEY")?.trim();
  if (!apiKey) throw new Error("KAVENEGAR_API_KEY is not set on the Edge Function");

  const template = (Deno.env.get("KAVENEGAR_TEMPLATE") || "verify").trim();
  const params = new URLSearchParams({
    receptor: localPhone,
    token: code,
    template,
  });
  const url = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const body = await res.json();
  const status = body?.return?.status;
  if (!res.ok || (status !== undefined && status !== 200)) {
    const raw = body?.return?.message || "Kavenegar send failed";
    // Common panel statuses → clearer Farsi hints
    if (String(raw).includes("احراز هویت")) {
      throw new Error(
        "حساب کاوه‌نگار احراز هویت نشده یا کلید API نامعتبر است. در پنل کاوه‌نگار احراز هویت را کامل کن و کلید را دوباره در Secrets بگذار.",
      );
    }
    if (status === 424 || String(raw).toLowerCase().includes("template")) {
      throw new Error(
        `قالب پیامک «${template}» در کاوه‌نگار یافت نشد یا تأیید نشده. نام قالب را با KAVENEGAR_TEMPLATE یکی کن.`,
      );
    }
    throw new Error(raw);
  }
  return body;
}

export function syntheticEmail(digits: string) {
  return `${digits}@phone.hievent.local`;
}
