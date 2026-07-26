import {
  adminClient,
  corsHeaders,
  json,
  normalizeIranPhone,
  sendKavenegarOtp,
  sha256,
} from "../_shared/otp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, purpose = "login" } = await req.json();
    const normalized = normalizeIranPhone(phone || "");
    if (!normalized) {
      return json({ error: "invalid_phone" }, 400);
    }
    if (!["login", "signup", "phone_change"].includes(purpose)) {
      return json({ error: "invalid_purpose" }, 400);
    }

    const admin = adminClient();

    // Rate limit: 1 SMS / 60s per phone
    const since = new Date(Date.now() - 60_000).toISOString();
    const { data: recent } = await admin
      .from("otp_challenges")
      .select("id")
      .eq("phone", normalized.e164)
      .gte("created_at", since)
      .limit(1);

    if (recent && recent.length > 0) {
      return json({ error: "rate_limited", message: "لطفاً یک دقیقه صبر کن و دوباره تلاش کن." }, 429);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256(`${normalized.e164}:${code}`);
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();

    const { error: insertError } = await admin.from("otp_challenges").insert({
      phone: normalized.e164,
      code_hash: codeHash,
      purpose,
      expires_at: expiresAt,
    });
    if (insertError) throw insertError;

    await sendKavenegarOtp(normalized.local, code);

    return json({
      ok: true,
      phone: normalized.e164,
      expires_in: 300,
    });
  } catch (err) {
    console.error("otp-send error", err);
    return json(
      { error: "send_failed", message: err instanceof Error ? err.message : "send_failed" },
      500,
    );
  }
});
