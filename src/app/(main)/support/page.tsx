
"use client";

import { useState, useRef, useEffect, FormEvent, useContext } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Bot, Loader2, Send, User, ShieldCheck, MessageSquareWarning, MessageSquarePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AppContext } from "@/contexts/AppContext";
import type { Message } from "@/lib/types";
import { askAiSupport } from "@/ai/flows/ai-support";

export default function SupportPage() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [localHistory, setLocalHistory] = useState<Message[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const context = useContext(AppContext);

  const ticket = context?.mySupportTicket;
  const conversationHistory = ticket?.history || localHistory;
  const hasAdminReplied = conversationHistory.some(m => m.role === 'admin');

  useEffect(() => {
    if (ticket) {
      setLocalHistory([]);
    }
  }, [ticket]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [conversationHistory]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !context) return;
    
    const userMessage: Message = { 
        role: "user", 
        content: input,
        timestamp: new Date().toISOString()
    };
    
    // Clear input immediately
    const currentInput = input;
    setInput("");

    // If there's an existing ticket, just add the message to it.
    if (ticket && !ticket.isResolved) {
        setIsLoading(true);
        await context.addMessageToTicket(ticket.id, userMessage);
        setIsLoading(false);
        return;
    }

    // If no ticket, manage conversation with AI locally.
    setIsLoading(true);
    const updatedLocalHistory = [...localHistory, userMessage];
    setLocalHistory(updatedLocalHistory);

    try {
      const aiResponse = await askAiSupport({ 
          history: updatedLocalHistory.map(({role, content}) => ({role, content})) 
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: aiResponse.response,
        timestamp: new Date().toISOString(),
      };
      setLocalHistory(prev => [...prev, assistantMessage]);

    } catch (error) {
       toast({
        title: "فشل الاتصال بالمساعد الذكي",
        description: "حدث خطأ ما. الرجاء المحاولة مرة أخرى.",
        variant: "destructive"
      });
      // remove the user message if AI fails
      setLocalHistory(prev => prev.slice(0, -1));
      setInput(currentInput); // Restore user input on failure
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!context || localHistory.length === 0) return;
    setIsCreatingTicket(true);
    try {
        await context.createSupportTicket(localHistory);
        toast({ title: "تم إنشاء التذكرة بنجاح", description: "سيقوم فريق الدعم بالرد عليك قريبًا." });
        setLocalHistory([]); // Clear local history as it's now in the ticket
    } catch (error) {
        toast({ title: "فشل إنشاء التذكرة", variant: "destructive"});
    } finally {
        setIsCreatingTicket(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
       <header className="p-4 border-b">
        <h1 className="text-xl font-bold text-center">الدعم الفني</h1>
      </header>
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-6">
            {conversationHistory.length === 0 && !ticket && (
                 <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                    <MessageSquareWarning className="h-16 w-16 mb-4"/>
                    <h2 className="text-xl font-semibold">أهلاً بك في الدعم الفني</h2>
                    <p>يمكنك طرح سؤالك هنا وسيقوم المساعد الذكي "سبيدي" بالرد عليك.</p>
                </div>
            )}
            {conversationHistory.map((message, index) => (
                <div
                key={index}
                className={cn(
                    "flex items-start gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                )}
                >
                {message.role !== "user" && (
                    <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn(message.role === 'admin' && 'bg-primary text-primary-foreground', message.role === 'assistant' && 'bg-secondary')}>
                        {message.role === 'admin' ? <ShieldCheck /> : <Bot />}
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
                        <AvatarFallback className="bg-secondary"><Loader2 className="h-5 w-5 animate-spin" /></AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg p-3 flex items-center">
                        <p className="text-sm">سبيدي يكتب...</p>
                    </div>
                </div>
            )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-background">
         {ticket?.isResolved ? (
             <div className="text-center text-sm text-muted-foreground p-2 bg-muted rounded-lg">
                تم إغلاق هذه المحادثة من قبل فريق الدعم. ابدأ محادثة جديدة إذا كنت بحاجة للمزيد من المساعدة.
             </div>
         ) : (
            <div className="space-y-2">
              {localHistory.length > 0 && !ticket && (
                  <Button variant="outline" className="w-full" onClick={handleCreateTicket} disabled={isCreatingTicket || isLoading}>
                      {isCreatingTicket ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <MessageSquarePlus className="ml-2 h-4 w-4"/>}
                      لم يتم حل مشكلتي، أريد التحدث مع فريق الدعم.
                  </Button>
              )}
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={hasAdminReplied || ticket ? "اكتب ردك هنا..." : "اسأل سبيدي..."}
                      className="flex-1"
                      disabled={isLoading || isCreatingTicket || (!!ticket && ticket.isResolved)}
                  />
                  <Button type="submit" size="icon" disabled={isLoading || isCreatingTicket || !input.trim() || (!!ticket && ticket.isResolved)}>
                      <Send className="h-4 w-4" />
                  </Button>
              </form>
            </div>
         )}
      </div>
    </div>
  );
}
