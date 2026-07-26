import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  adminClient,
  corsHeaders,
  json,
  normalizeIranPhone,
  sha256,
  syntheticEmail,
} from "../_shared/otp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, code, purpose = "login" } = await req.json();
    const normalized = normalizeIranPhone(phone || "");
    if (!normalized) return json({ error: "invalid_phone" }, 400);
    if (!code || String(code).trim().length < 4) {
      return json({ error: "invalid_code" }, 400);
    }

    const admin = adminClient();
    const codeHash = await sha256(`${normalized.e164}:${String(code).trim()}`);

    const { data: rows, error: fetchError } = await admin
      .from("otp_challenges")
      .select("*")
      .eq("phone", normalized.e164)
      .eq("purpose", purpose)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;
    const challenge = rows?.[0];
    if (!challenge) {
      return json({ error: "expired_or_missing", message: "کد منقضی شده یا یافت نشد." }, 400);
    }

    if (challenge.attempts >= 5) {
      return json({ error: "too_many_attempts", message: "تلاش بیش از حد. دوباره کد بگیر." }, 429);
    }

    if (challenge.code_hash !== codeHash) {
      await admin
        .from("otp_challenges")
        .update({ attempts: challenge.attempts + 1 })
        .eq("id", challenge.id);
      return json({ error: "wrong_code", message: "کد نادرست است." }, 400);
    }

    await admin
      .from("otp_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", challenge.id);

    // ——— Profile phone change (must be logged in) ———
    if (purpose === "phone_change") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "unauthorized" }, 401);

      const anon = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );

      const { data: { user }, error: userError } = await anon.auth.getUser();
      if (userError || !user) return json({ error: "unauthorized" }, 401);

      await admin.auth.admin.updateUserById(user.id, {
        phone: normalized.e164,
        phone_confirm: true,
      });

      await admin.from("users").update({ phone: normalized.local }).eq("id", user.id);

      return json({ ok: true, phone: normalized.local, purpose: "phone_change" });
    }

    // ——— Login / signup ———
    const email = syntheticEmail(normalized.digits);

    let userId: string | null = null;

    const { data: byPhone } = await admin
      .from("users")
      .select("id")
      .eq("phone", normalized.local)
      .maybeSingle();

    if (byPhone?.id) {
      userId = byPhone.id;
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        phone: normalized.e164,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { phone: normalized.e164 },
      });

      if (createError) {
        // User may already exist in Auth with this email/phone
        const msg = createError.message || "";
        if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
          const { data: linkProbe } = await admin.auth.admin.generateLink({
            type: "magiclink",
            email,
          });
          userId = linkProbe?.user?.id ?? null;
        } else {
          throw createError;
        }
      } else {
        userId = created.user?.id ?? null;
      }
    }

    if (!userId) throw new Error("user_missing");

    await admin.auth.admin.updateUserById(userId, {
      phone: normalized.e164,
      phone_confirm: true,
      email,
      email_confirm: true,
      user_metadata: { phone: normalized.e164 },
    });

    await admin.from("users").upsert({ id: userId, phone: normalized.local });

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError) throw linkError;

    const tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash) throw new Error("missing_token_hash");

    return json({
      ok: true,
      token_hash: tokenHash,
      phone: normalized.local,
      user_id: userId,
    });
  } catch (err) {
    console.error("otp-verify error", err);
    return json(
      { error: "verify_failed", message: err instanceof Error ? err.message : "verify_failed" },
      500,
    );
  }
});
