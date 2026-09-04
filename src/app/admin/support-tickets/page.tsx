
"use client";

import { useState, useEffect } from 'react';
import type { SupportTicket, Message } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Check, MessageSquare, Send, ShieldCheck, User, Loader2, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSupportTickets } from '@/hooks/useSupportTickets';

export default function AdminSupportTicketsPage({ branchId }: { branchId: string }) {
  const { supportTickets, isLoading, resolveSupportTicket, addMessageToTicket } = useSupportTickets(branchId);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedTicket) {
      const liveTicket = supportTickets.find(t => t.id === selectedTicket.id);
      if (liveTicket && JSON.stringify(liveTicket.history) !== JSON.stringify(selectedTicket.history)) {
        setSelectedTicket(liveTicket);
      }
    }
  }, [supportTickets, selectedTicket]);

  if (isLoading) return <div className="p-8 text-center animate-pulse font-bold text-primary">جارِ تحميل محادثات الفرع...</div>;

  const sortedTickets = [...supportTickets].sort((a,b) => {
    if (a.isResolved !== b.isResolved) {
      return a.isResolved ? 1 : -1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  });

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !selectedTicket) return;
    setIsReplying(true);

    const adminMessage: Message = {
      role: 'admin',
      content: reply,
      timestamp: new Date().toISOString()
    };
    
    try {
        await addMessageToTicket(selectedTicket.id, adminMessage);
        setReply("");
        toast({ title: "تم إرسال الرد" });
    } catch (e) {
        toast({ title: "فشل الإرسال", variant: "destructive" });
    } finally {
        setIsReplying(false);
    }
  }

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    try {
        await resolveSupportTicket(selectedTicket.id);
        toast({ title: "تم إغلاق المحادثة" });
    } catch (e) {}
  }

  return (
    <div className="space-y-8 text-right">
      <header>
        <h1 className="text-3xl font-black text-primary italic">تذاكر الدعم الفني</h1>
        <p className="text-muted-foreground font-bold">إدارة استفسارات الزبائن الخاصة بفرعك الحالي.</p>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border dark:border-slate-800 overflow-hidden">
        <Table>
            <TableHeader className="bg-muted/50 dark:bg-slate-800/50">
            <TableRow>
                <TableHead className="font-black text-right">الزبون</TableHead>
                <TableHead className="font-black text-right w-[40%]">آخر رسالة</TableHead>
                <TableHead className="font-black text-right">الحالة</TableHead>
                <TableHead className="font-black text-center">إجراء</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {sortedTickets.map((ticket) => (
                <TableRow key={ticket.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-bold">{ticket.userName}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[200px]">
                    {ticket.history?.[ticket.history.length-1]?.content || '...'}
                </TableCell>
                <TableCell>
                    <Badge className={cn("rounded-lg font-black", ticket.isResolved ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700")}>
                        {ticket.isResolved ? "مغلقة" : "نشطة الآن"}
                    </Badge>
                </TableCell>
                <TableCell className="text-center">
                    <Button variant="outline" size="sm" onClick={() => setSelectedTicket(ticket)} className="rounded-xl font-bold h-9">
                       فتح المحادثة
                    </Button>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        {supportTickets.length === 0 && (
            <div className="text-center py-20 opacity-30 italic font-bold">لا توجد تذاكر دعم لهذا الفرع حالياً.</div>
        )}
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={(isOpen) => !isOpen && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl flex flex-col h-[90vh] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-background">
            <DialogHeader className="p-6 bg-primary text-white flex-row justify-between items-center space-y-0">
                <div className="text-right">
                    <DialogTitle className="text-2xl font-black">محادثة: {selectedTicket?.userName}</DialogTitle>
                    <p className="text-[10px] opacity-80 font-bold">نظام الدعم الجغرافي المفعل</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)} className="text-white hover:bg-white/10 rounded-full"><ArrowRight className="h-6 w-6 rotate-180"/></Button>
            </DialogHeader>
            
            <ScrollArea className="flex-1 p-6 bg-muted/5">
                <div className="space-y-6">
                {selectedTicket?.history?.map((message, index) => {
                    const isAdmin = message.role === "admin";
                    return (
                        <div key={index} className={cn("flex items-start gap-3", isAdmin ? "flex-row-reverse" : "flex-row")}>
                            <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                                <AvatarFallback className={cn("font-black", isAdmin ? "bg-primary text-white" : "bg-white text-primary")}>
                                    {isAdmin ? <ShieldCheck className="h-5 w-5"/> : <User className="h-5 w-5"/>}
                                </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                                "max-w-[80%] p-4 text-sm font-bold shadow-sm", 
                                isAdmin 
                                    ? "bg-primary text-white rounded-t-2xl rounded-bl-2xl" 
                                    : "bg-white dark:bg-slate-900 rounded-t-2xl rounded-br-2xl border dark:border-slate-800"
                            )}>
                                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                <span className={cn("text-[8px] opacity-60 block mt-2", isAdmin ? "text-left" : "text-right")}>
                                    {new Date(message.timestamp).toLocaleTimeString('ar-IQ', {hour:'2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        </div>
                    );
                })}
                </div>
            </ScrollArea>

            <DialogFooter className="p-6 bg-white dark:bg-slate-950 border-t flex-col gap-4">
                 {!selectedTicket?.isResolved ? (
                    <form onSubmit={handleReply} className="flex w-full items-center gap-3 bg-muted/40 p-2 rounded-[1.8rem] border-2 border-muted focus-within:border-primary/30 transition-all">
                        <Input 
                            placeholder="اكتب ردك هنا..." 
                            value={reply} 
                            onChange={(e) => setReply(e.target.value)} 
                            className="bg-transparent border-none shadow-none font-bold h-12 text-base" 
                        />
                        <Button type="submit" size="icon" disabled={isReplying || !reply.trim()} className="h-12 w-12 rounded-2xl shadow-lg shadow-primary/20 active:scale-75 transition-all">
                            {isReplying ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5"/>}
                        </Button>
                    </form>
                 ) : (
                    <div className="text-center p-4 bg-muted/20 rounded-2xl text-xs font-black text-muted-foreground flex items-center justify-center gap-2">
                        <Check className="h-4 w-4 text-green-600"/> تمت معالجة هذه التذكرة وإغلاقها.
                    </div>
                 )}
                 
                 <div className="flex w-full justify-between gap-4">
                    <Button variant="outline" onClick={() => setSelectedTicket(null)} className="rounded-xl font-black h-12 px-6">إغلاق</Button>
                    {!selectedTicket?.isResolved && (
                         <Button variant="secondary" onClick={handleResolveTicket} className="flex-1 rounded-xl font-black h-12 bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-100">
                            تم حل المشكلة وإغلاق التذكرة
                         </Button>
                    )}
                 </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
