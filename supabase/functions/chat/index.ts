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
    const { messages } = await req.json();
    
    // Initialize Supabase client for RAG
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the last user message for RAG search
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    let ragContext = "";
    
    if (lastUserMessage?.content) {
      // Extract keywords from user message
      const keywords = lastUserMessage.content.toLowerCase()
        .split(/\s+/)
        .filter((word: string) => word.length > 3);
      
      console.log("RAG search keywords:", keywords);
      
      // Search knowledge base
      if (keywords.length > 0) {
        const { data: ragResults } = await supabase
          .from('hajj_knowledge')
          .select('title, content, category')
          .or(
            keywords.slice(0, 5).map((keyword: string) => 
              `title.ilike.%${keyword}%,content.ilike.%${keyword}%,keywords.cs.{${keyword}}`
            ).join(',')
          )
          .limit(3);
        
        if (ragResults && ragResults.length > 0) {
          console.log(`Found ${ragResults.length} relevant documents`);
          ragContext = "\n\n**Relevant Knowledge Base Information:**\n" + 
            ragResults.map(doc => 
              `\n### ${doc.title} (${doc.category})\n${doc.content}`
            ).join('\n');
        }
      }
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Calling Lovable AI with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an AI assistant specializing in Hajj and Umrah guidance with access to a knowledge base. Your role is to help pilgrims navigate their spiritual journey with accurate, compassionate, and practical advice.

Core Responsibilities:
- Provide accurate information about Hajj and Umrah rituals, steps, and requirements
- Offer practical guidance on logistics, preparation, and common challenges
- Answer questions about Islamic practices related to pilgrimage
- Give respectful spiritual guidance while maintaining Islamic authenticity
- Help with planning, packing lists, health precautions, and travel tips
- When relevant knowledge base information is provided, use it to enhance your responses
- Cite the knowledge base when using specific information from it

Guidelines:
- Always be respectful and compassionate
- Base answers on authentic Islamic sources and the provided knowledge base
- Provide practical, actionable advice
- If unsure about religious rulings, recommend consulting with a local scholar
- Keep responses clear, concise, and helpful
- Use simple language that pilgrims can easily understand
- When knowledge base context is available, integrate it naturally into your response

Remember: You're helping people prepare for one of the most important spiritual journeys of their lives. Be supportive, informative, and encouraging.${ragContext}`,
            },
            ...messages,
          ],
          stream: true,
        }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ 
            error: "Payment required, please add funds to your Lovable AI workspace." 
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Successfully started streaming response");
    
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
      },
    });
  } catch (error) {
    console.error("Error in chat function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
