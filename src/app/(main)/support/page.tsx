
"use client";

import { useState, useRef, useEffect, FormEvent, useContext } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Send, User, ShieldCheck, MessageSquareWarning } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AppContext } from "@/contexts/AppContext";
import type { Message } from "@/lib/types";

export default function SupportPage() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const context = useContext(AppContext);

  const ticket = context?.mySupportTicket;
  const conversationHistory = ticket?.history || [];

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
    
    setIsLoading(true);
    
    const userMessage: Message = { 
        role: "user", 
        content: input,
        timestamp: new Date().toISOString()
    };
    
    setInput("");

    try {
        if (ticket && !ticket.isResolved) {
            await context.addMessageToTicket(ticket.id, userMessage);
        } else {
            await context.createSupportTicket(userMessage);
            toast({ title: "تم إرسال رسالتك", description: "سيقوم فريق الدعم بالرد عليك قريبًا." });
        }
    } catch (error) {
         toast({
            title: "فشل إرسال الرسالة",
            description: "حدث خطأ ما. الرجاء المحاولة مرة أخرى.",
            variant: "destructive"
        });
        setInput(userMessage.content); // Restore input on failure
    } finally {
        setIsLoading(false);
    }
  };


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
                    <p>يمكنك طرح سؤالك هنا وسيقوم فريقنا بالرد عليك في أقرب وقت ممكن.</p>
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
                    <AvatarFallback className={cn(message.role === 'admin' && 'bg-primary text-primary-foreground')}>
                        <ShieldCheck />
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
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-background">
         {ticket?.isResolved ? (
             <div className="text-center text-sm text-muted-foreground p-2 bg-muted rounded-lg">
                تم إغلاق هذه المحادثة من قبل فريق الدعم. ابدأ محادثة جديدة إذا كنت بحاجة للمزيد من المساعدة.
             </div>
         ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1"
                    disabled={isLoading || (!!ticket && ticket.isResolved)}
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim() || (!!ticket && ticket.isResolved)}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                </Button>
            </form>
         )}
      </div>
    </div>
  );
}
