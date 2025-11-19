import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract keywords from query
    const keywords = query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3); // Only words longer than 3 characters

    console.log("Searching for keywords:", keywords);

    // Search knowledge base using keyword matching
    const { data: results, error } = await supabase
      .from('hajj_knowledge')
      .select('*')
      .or(
        keywords.map(keyword => 
          `title.ilike.%${keyword}%,content.ilike.%${keyword}%,keywords.cs.{${keyword}}`
        ).join(',')
      )
      .limit(5);

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to search knowledge base" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found results:", results?.length || 0);

    return new Response(
      JSON.stringify({ results: results || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in rag-search function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
