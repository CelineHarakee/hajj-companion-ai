# Hajj & Umrah AI Assistant - Code Files Reference

This document contains all the key code files for the RAG-powered LLM chatbot interface.

## 📁 Project Structure

```
├── supabase/
│   ├── functions/
│   │   ├── chat/index.ts           # LLM chat endpoint with RAG
│   │   └── rag-search/index.ts     # RAG document retrieval
│   └── config.toml                 # Supabase configuration
├── src/
│   ├── components/
│   │   ├── ChatInput.tsx           # Chat input component
│   │   └── ChatMessage.tsx         # Message display component
│   ├── hooks/
│   │   └── useChat.ts              # Chat state management hook
│   ├── pages/
│   │   └── Index.tsx               # Main chat interface page
│   ├── index.css                   # Design system & styles
│   └── tailwind.config.ts          # Tailwind configuration
└── README.md
```

---

## 🤖 LLM Integration (Backend)

### supabase/functions/chat/index.ts

This edge function handles the AI chat with RAG (Retrieval-Augmented Generation) integration.

**Key Features:**
- Streaming responses from Google Gemini 2.5 Flash
- RAG integration with knowledge base search
- Error handling for rate limits and payment issues
- CORS support for web access

```typescript
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
              \`title.ilike.%\${keyword}%,content.ilike.%\${keyword}%,keywords.cs.{\${keyword}}\`
            ).join(',')
          )
          .limit(3);
        
        if (ragResults && ragResults.length > 0) {
          console.log(\`Found \${ragResults.length} relevant documents\`);
          ragContext = "\\n\\n**Relevant Knowledge Base Information:**\\n" + 
            ragResults.map(doc => 
              \`\\n### \${doc.title} (\${doc.category})\\n\${doc.content}\`
            ).join('\\n');
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
        Authorization: \`Bearer \${LOVABLE_API_KEY}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: \`You are an AI assistant specializing in Hajj and Umrah guidance with access to a knowledge base. Your role is to help pilgrims navigate their spiritual journey with accurate, compassionate, and practical advice.

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

Remember: You're helping people prepare for one of the most important spiritual journeys of their lives. Be supportive, informative, and encouraging.\${ragContext}\`,
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
```

---

## 📚 RAG System (Backend)

### supabase/functions/rag-search/index.ts

Standalone RAG search function for retrieving relevant documents from the knowledge base.

**Key Features:**
- Keyword-based document retrieval
- Searches titles, content, and keyword arrays
- Returns top 5 most relevant documents
- Exposed as a public API endpoint

```typescript
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
      .split(/\\s+/)
      .filter(word => word.length > 3); // Only words longer than 3 characters

    console.log("Searching for keywords:", keywords);

    // Search knowledge base using keyword matching
    const { data: results, error } = await supabase
      .from('hajj_knowledge')
      .select('*')
      .or(
        keywords.map(keyword => 
          \`title.ilike.%\${keyword}%,content.ilike.%\${keyword}%,keywords.cs.{\${keyword}}\`
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
```

### Database Schema (Knowledge Base)

```sql
-- Knowledge base table
CREATE TABLE public.hajj_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for fast searching
CREATE INDEX idx_hajj_knowledge_category ON public.hajj_knowledge(category);
CREATE INDEX idx_hajj_knowledge_keywords ON public.hajj_knowledge USING GIN(keywords);

-- Row Level Security
ALTER TABLE public.hajj_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Knowledge base is viewable by everyone" 
ON public.hajj_knowledge FOR SELECT USING (true);
```

---

## 💬 Chat Interface (Frontend)

### src/pages/Index.tsx

Main chat interface page with hero section and message display.

```typescript
import { useEffect, useRef } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { useChat } from "@/hooks/useChat";
import { Sparkles, Loader2 } from "lucide-react";
import heroImage from "@/assets/kaaba-hero.jpg";

const Index = () => {
  const { messages, isLoading, sendMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <header className="relative h-[40vh] md:h-[50vh] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: \`url(\${heroImage})\` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/60 to-background" />
        
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
          <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary px-4 py-2 rounded-full mb-4 backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">AI-Powered Guidance</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Hajj & Umrah Assistant
          </h1>
          
          <p className="text-lg md:text-xl text-white/90 max-w-2xl">
            Your intelligent companion for a blessed pilgrimage journey
          </p>
        </div>
      </header>

      {/* Chat Section */}
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8 flex flex-col">
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12">
                <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-foreground">
                    Welcome, Pilgrim! 🕋
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    Ask me anything about Hajj or Umrah - from rituals and logistics to spiritual guidance and practical tips.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 max-w-2xl w-full pt-4">
                  {[
                    "What are the steps of Hajj?",
                    "What should I pack for Umrah?",
                    "Can you explain the tawaf ritual?",
                    "Health tips for pilgrimage",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      className="text-left p-4 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all shadow-sm"
                    >
                      <p className="text-sm text-card-foreground">{suggestion}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <ChatMessage
                    key={index}
                    role={message.role}
                    content={message.content}
                  />
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t pt-4">
            <ChatInput onSend={sendMessage} disabled={isLoading} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container max-w-4xl mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            May your pilgrimage be blessed and accepted. Always verify religious guidance with qualified scholars.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
```

### src/hooks/useChat.ts

React hook for managing chat state and streaming responses.

```typescript
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async (input: string) => {
    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    let assistantContent = "";
    const upsertAssistant = (nextChunk: string) => {
      assistantContent += nextChunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const CHAT_URL = \`\${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat\`;
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: \`Bearer \${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}\`,
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast({
            title: "Rate Limit Reached",
            description: "Please wait a moment before sending another message.",
            variant: "destructive",
          });
          setMessages((prev) => prev.slice(0, -1));
          setIsLoading(false);
          return;
        }
        if (resp.status === 402) {
          toast({
            title: "Credits Required",
            description: "Please add credits to continue using the AI assistant.",
            variant: "destructive",
          });
          setMessages((prev) => prev.slice(0, -1));
          setIsLoading(false);
          return;
        }
        throw new Error(\`HTTP error! status: \${resp.status}\`);
      }

      if (!resp.body) {
        throw new Error("No response body");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\\n")) {
          if (!raw) continue;
          if (raw.endsWith("\\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            /* ignore partial leftovers */
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
      setIsLoading(false);
    }
  };

  return { messages, isLoading, sendMessage };
};
```

### src/components/ChatMessage.tsx

Component for displaying individual chat messages.

```typescript
import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";
  
  return (
    <div
      className={cn(
        "flex gap-3 mb-4 animate-in fade-in-50 slide-in-from-bottom-5 duration-500",
        isUser && "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-card-foreground"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "flex flex-col gap-2 rounded-lg px-4 py-3 max-w-[80%] shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground ml-auto"
            : "bg-card text-card-foreground"
        )}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
};
```

### src/components/ChatInput.tsx

Input component for sending chat messages.

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about Hajj or Umrah..."
        disabled={disabled}
        className={cn(
          "min-h-[60px] max-h-[200px] resize-none pr-12",
          "focus:ring-2 focus:ring-primary/20"
        )}
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !input.trim()}
        className={cn(
          "absolute right-2 bottom-2 h-8 w-8 rounded-full",
          "transition-all hover:scale-105 active:scale-95"
        )}
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
};
```

---

## 🎨 Styling & Design

The app uses an Islamic-inspired design system with:
- **Colors**: Greens, golds, and earth tones
- **Typography**: Clean, readable fonts
- **Dark/Light mode**: Full support via CSS variables
- **Responsive**: Mobile-first design

See `src/index.css` and `tailwind.config.ts` for full design tokens.

---

## 🚀 How It Works

1. **User sends a message** via ChatInput component
2. **useChat hook** streams the message to the chat edge function
3. **Chat function** extracts keywords and searches the knowledge base (RAG)
4. **Relevant documents** are added to the system prompt context
5. **LLM (Gemini)** generates a response using the enriched context
6. **Response streams back** token-by-token to the UI
7. **ChatMessage components** display the conversation

---

## 📝 API Endpoints

### POST /functions/v1/chat
Main chat endpoint with RAG integration.

**Request:**
\`\`\`json
{
  "messages": [
    { "role": "user", "content": "What is tawaf?" }
  ]
}
\`\`\`

**Response:** Server-Sent Events (SSE) stream

### POST /functions/v1/rag-search
Standalone RAG search endpoint.

**Request:**
\`\`\`json
{
  "query": "tawaf kaaba ritual"
}
\`\`\`

**Response:**
\`\`\`json
{
  "results": [
    {
      "id": "...",
      "title": "Tawaf Ritual",
      "content": "...",
      "category": "rituals",
      "keywords": ["tawaf", "kaaba", ...]
    }
  ]
}
\`\`\`

---

## 🔑 Environment Variables

Required environment variables (automatically configured):
- \`VITE_SUPABASE_URL\` - Supabase project URL
- \`VITE_SUPABASE_PUBLISHABLE_KEY\` - Public API key
- \`LOVABLE_API_KEY\` - Lovable AI gateway key (backend only)
- \`SUPABASE_SERVICE_ROLE_KEY\` - Full database access (backend only)

---

## 📦 Dependencies

**Frontend:**
- React 18
- TypeScript
- Tailwind CSS
- Lucide React (icons)
- Supabase JS client

**Backend:**
- Deno runtime
- Supabase Edge Functions
- Lovable AI Gateway

---

## 🎯 Key Features

✅ **RAG Integration** - Knowledge base search for accurate responses  
✅ **Streaming LLM** - Real-time token-by-token responses  
✅ **Islamic Design** - Beautiful, culturally appropriate UI  
✅ **Mobile Responsive** - Works perfectly on all devices  
✅ **Error Handling** - Rate limiting, payment errors, etc.  
✅ **Keyword Search** - Simple but effective document retrieval  
✅ **Extensible** - Easy to add more documents to knowledge base  

---

## 📚 Knowledge Base

The knowledge base contains 10 comprehensive documents covering:
- Hajj rituals (Tawaf, Sa'i, Arafat, Stoning)
- Umrah steps
- Ihram requirements and prohibitions
- Practical preparation (packing, health)
- Logistics (Mina, Muzdalifah)

**To add more documents:**
\`\`\`sql
INSERT INTO hajj_knowledge (title, content, category, keywords)
VALUES (
  'Your Title',
  'Your detailed content...',
  'category_name',
  ARRAY['keyword1', 'keyword2', 'keyword3']
);
\`\`\`

---

## 🔧 Configuration

### supabase/config.toml

\`\`\`toml
project_id = "your-project-id"

[functions.chat]
verify_jwt = false

[functions.rag-search]
verify_jwt = false
\`\`\`

Both functions are public (no authentication required) for easy testing.

---

## 💡 Future Enhancements

Potential improvements:
- Add vector embeddings for semantic search (pgvector)
- User authentication and conversation history
- Multi-language support (Arabic, Urdu, etc.)
- Image analysis for Hajj-related questions
- Admin panel to manage knowledge base
- Analytics and usage tracking

---

**Built with Lovable Cloud + Lovable AI** 🚀
