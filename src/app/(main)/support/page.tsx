

"use client";

import { useState, useRef, useEffect, FormEvent, useContext } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Bot, Loader2, Send, User } from "lucide-react";
import { askAiSupport } from "@/ai/flows/ai-support";
import { useToast } from "@/hooks/use-toast";
import { AppContext } from "@/contexts/AppContext";


export interface Message {
  role: "user" | "assistant";
  content: string;
  isEscalation?: boolean;
}

export default function SupportPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const context = useContext(AppContext);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  useEffect(() => {
    setMessages([
        {
            role: "assistant",
            content: "مرحباً! أنا سبيدي، مساعدك الذكي في تطبيق Speed Shop. كيف يمكنني مساعدتك اليوم؟"
        }
    ])
  }, []);

  const handleEscalate = async () => {
      if (!context || messages.length === 0) return;
      setIsLoading(true);

      const lastUserQuestion = messages.filter(m => m.role === 'user').pop()?.content || "لم يحدد المستخدم سؤالاً";
      
      await context.addSupportTicket(lastUserQuestion, messages);
      
      const escalationResponseMessage: Message = { role: 'assistant', content: 'تم إرسال محادثتك بنجاح إلى فريق الدعم. سيتم التواصل معك قريبًا.'};
      
      // Remove escalation buttons from previous message and add the final response
      setMessages(prev => 
        prev.map(m => ({...m, isEscalation: false}))
            .concat(escalationResponseMessage)
      );
      
      setIsLoading(false);
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages: Message[] = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const result = await askAiSupport({ question: input, history: newMessages });
      
      const assistantMessage: Message = { 
          role: "assistant", 
          content: result.answer,
          isEscalation: result.shouldEscalate
      };
      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: "عذراً، حدث خطأ ما. هل تود إرسال سؤالك لفريق الدعم البشري؟",
        isEscalation: true
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
       <header className="p-4 border-b">
        <h1 className="text-xl font-bold text-center">الدعم الفني الذكي</h1>
      </header>
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <Bot />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-lg p-3 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.isEscalation && (
                    <div className="mt-2 flex gap-2 border-t pt-2">
                        <Button size="sm" onClick={handleEscalate} disabled={isLoading}>
                           {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : "نعم، أرسل المحادثة"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                            // Remove escalation buttons and add a clarifying question
                             setMessages(prev => 
                                prev.map(m => ({...m, isEscalation: false}))
                                .concat({role: 'assistant', content: 'تمام، كيف يمكنني مساعدتك أيضاً؟'})
                            )
                        }}>لا، شكراً</Button>
                    </div>
                )}
              </div>
               {message.role === "user" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <User />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
             <div className="flex items-start gap-3 justify-start">
                <Avatar className="h-8 w-8">
                    <AvatarFallback><Bot /></AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg p-3 flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
             </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب سؤالك هنا..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

    