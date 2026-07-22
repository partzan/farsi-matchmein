import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    // Create anon client to verify JWT
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized caller");

    const { user1_id, user2_id } = await req.json();
    
    // Caller verification: caller must be one of the two users
    if (user.id !== user1_id && user.id !== user2_id) {
      throw new Error("Forbidden: Caller must be one of the users involved in the match");
    }

    // Fetch profiles
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, display_name, bio')
      .in('id', [user1_id, user2_id]);

    if (!users || users.length !== 2) throw new Error("Could not fetch both users");

    // Fetch interests
    const { data: interests1 } = await supabaseAdmin.from('user_interests').select('interest_categories(name)').eq('user_id', user1_id);
    const { data: interests2 } = await supabaseAdmin.from('user_interests').select('interest_categories(name)').eq('user_id', user2_id);

    const profile1 = users.find((u: any) => u.id === user1_id)!;
    const profile2 = users.find((u: any) => u.id === user2_id)!;
    
    const i1 = interests1?.map((i: any) => i.interest_categories?.name).join(', ') || 'None';
    const i2 = interests2?.map((i: any) => i.interest_categories?.name).join(', ') || 'None';

    const prompt = `User 1 (${profile1.display_name}): Bio: "${profile1.bio}". Interests: ${i1}.
User 2 (${profile2.display_name}): Bio: "${profile2.bio}". Interests: ${i2}.
Explain in one short, friendly, enthusiastic sentence why these two people would get along based on their shared interests or complementary bios. Keep it under 20 words. Do not use their full names, just refer to them directly ("You both...").`;

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error("Missing GEMINI_API_KEY secret");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 60, temperature: 0.7 }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${errorText}`);
    }

    const json = await response.json();
    const explanation = json.candidates?.[0]?.content?.parts?.[0]?.text || "You have shared interests that make you a great match!";

    return new Response(JSON.stringify({ explanation: explanation.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
