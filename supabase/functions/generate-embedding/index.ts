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
    
    // Create admin client for bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create anon client to verify user's JWT
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized caller");

    const { user_id } = await req.json();
    
    // Caller verification
    if (user.id !== user_id) throw new Error("Forbidden: Cannot embed for another user");

    // Fetch profile and check timestamps
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('bio, profile_updated_at, embedding_updated_at')
      .eq('id', user_id)
      .single();

    if (!profile) throw new Error("Profile not found");

    // Rate limiting: skip if embedding is already up-to-date
    if (profile.embedding_updated_at && profile.profile_updated_at <= profile.embedding_updated_at) {
      return new Response(JSON.stringify({ message: "Embedding is already up to date" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Fetch interests
    const { data: interests } = await supabaseAdmin
      .from('user_interests')
      .select('interest_categories(name)')
      .eq('user_id', user_id);

    const interestNames = interests?.map((i: any) => i.interest_categories?.name).join(', ') || 'No interests';
    const textToEmbed = `Bio: ${profile.bio || 'No bio'}\nInterests: ${interestNames}`;

    // Call Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error("Missing GEMINI_API_KEY secret");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text: textToEmbed }] }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${errorText}`);
    }

    const json = await response.json();
    const embedding = json.embedding?.values;
    if (!embedding) throw new Error("No embedding returned");

    // Save embedding back to Supabase
    await supabaseAdmin
      .from('users')
      .update({ 
        embedding,
        embedding_updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    return new Response(JSON.stringify({ message: "Embedding generated successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
