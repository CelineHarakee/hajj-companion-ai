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
          style={{ backgroundImage: `url(${heroImage})` }}
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
