
"use client";

import { useState, useRef, useEffect, useContext } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Send, User, ShieldCheck, MessageSquareHeart, PlusCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@/lib/types";
import { AppContext } from "@/contexts/AppContext";

export default function SupportPage() {
  const context = useContext(AppContext);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  if (!context) return (
    <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );

  const { mySupportTicket, createSupportTicket, addMessageToTicket, startNewTicketClient, setActiveTab } = context;

  const conversationHistory = mySupportTicket?.history || [];

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [conversationHistory]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    
    setIsSending(true);
    const text = input.trim();

    const newMessage: Message = { 
        role: "user", 
        content: text,
        timestamp: new Date().toISOString()
    };
    
    try {
        if (mySupportTicket && !mySupportTicket.isResolved) {
            await addMessageToTicket(mySupportTicket.id, newMessage);
        } else {
            await createSupportTicket(newMessage);
            toast({ title: "تم بدء محادثة جديدة", description: "سيقوم فريقنا بالرد عليك قريباً." });
        }
        setInput(""); // تفريغ الحقل فقط عند النجاح
    } catch (error) {
         toast({ title: "فشل الإرسال", description: "يرجى المحاولة مرة أخرى.", variant: "destructive" });
    } finally {
        setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in slide-in-from-left-4 duration-500">
       <header className="p-5 border-b bg-card flex items-center justify-between">
            <button 
                onClick={() => setActiveTab(5)} 
                className="p-3 bg-secondary rounded-2xl text-primary active:scale-75 transition-all"
            >
                <ArrowRight className="h-6 w-6"/>
            </button>
            <div className="flex flex-col items-center">
                <h1 className="text-xl font-black text-primary leading-none">الدعم الفني</h1>
                <p className="text-[10px] text-muted-foreground font-bold mt-1">نحن هنا لخدمتك دائماً</p>
            </div>
            <div className="w-12"></div>
      </header>

      <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
        <div className="space-y-6 pb-4">
            {conversationHistory.length === 0 ? (
                 <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="p-6 bg-primary/5 rounded-[2.5rem]">
                        <MessageSquareHeart className="h-20 w-20 text-primary animate-bounce"/>
                    </div>
                    <h2 className="text-2xl font-black text-primary">كيف يمكننا مساعدتك؟</h2>
                    <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                        اكتب استفسارك أو مشكلتك هنا، وسيقوم <br/> فريق الدعم بالرد عليك في أسرع وقت.
                    </p>
                </div>
            ) : (
                conversationHistory.map((message, index) => {
                    const isUser = message.role === "user";
                    return (
                        <div key={index} className={cn("flex items-end gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
                            <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                                <AvatarFallback className={cn(isUser ? "bg-secondary text-primary" : "bg-primary text-white")}>
                                    {isUser ? <User className="h-5 w-5"/> : <ShieldCheck className="h-5 w-5"/>}
                                </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                                "max-w-[80%] p-4 text-sm font-bold shadow-sm transition-all",
                                isUser 
                                    ? "bg-primary text-white rounded-t-[1.5rem] rounded-bl-[1.5rem]" 
                                    : "bg-white border rounded-t-[1.5rem] rounded-br-[1.5rem]"
                            )}>
                                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                <p className={cn("text-[8px] mt-2 opacity-60", isUser ? "text-left" : "text-right")}>
                                    {new Date(message.timestamp).toLocaleTimeString('ar-IQ', {hour:'2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </ScrollArea>

      <div className="p-4 bg-card border-t shadow-2xl rounded-t-[2.5rem]">
         {mySupportTicket?.isResolved ? (
             <div className="text-center p-4 space-y-4">
                <div className="bg-muted p-3 rounded-2xl text-xs font-bold text-muted-foreground">تم إغلاق هذه المحادثة. يمكنك البدء بواحدة جديدة إذا كان لديك استفسار آخر.</div>
                <Button onClick={startNewTicketClient} className="w-full h-14 rounded-2xl font-black gap-2">
                    <PlusCircle className="h-5 w-5" />
                    بدء محادثة جديدة
                </Button>
             </div>
         ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-muted/40 p-2 rounded-[1.8rem] border-2 border-muted">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-base font-bold h-12"
                    disabled={isSending}
                />
                <Button 
                    type="submit" 
                    size="icon" 
                    disabled={isSending || !input.trim()}
                    className="h-12 w-12 rounded-2xl shadow-lg shadow-primary/20 active:scale-75 transition-all"
                >
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5" />}
                </Button>
            </form>
         )}
         <p className="text-center text-[9px] text-muted-foreground mt-3 font-bold">فريق الدعم متاح من الساعة 9 صباحاً حتى 11 مساءً</p>
      </div>
    </div>
  );
}
