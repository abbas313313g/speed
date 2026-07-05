
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
import { Check, MessageSquare, Send, ShieldCheck, User, Bot, Loader2, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSupportTickets } from '@/hooks/useSupportTickets';

export default function AdminSupportTicketsPage() {
  const { supportTickets, isLoading, resolveSupportTicket, addMessageToTicket } = useSupportTickets();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const { toast } = useToast();

  // Sync selected ticket with live data
  useEffect(() => {
    if (selectedTicket) {
      const liveTicket = supportTickets.find(t => t.id === selectedTicket.id);
      if (liveTicket && JSON.stringify(liveTicket.history) !== JSON.stringify(selectedTicket.history)) {
        setSelectedTicket(liveTicket);
      }
    }
  }, [supportTickets, selectedTicket]);

  if (isLoading) return <div className="p-8 text-center animate-pulse font-bold text-primary">جارِ تحميل محادثات الدعم...</div>;

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
        toast({ title: "تم إرسال الرد بنجاح" });
    } catch (e) {
        toast({ title: "فشل إرسال الرد", description: "يرجى التحقق من اتصال الإنترنت", variant: "destructive" });
    } finally {
        setIsReplying(false);
    }
  }

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    try {
        await resolveSupportTicket(selectedTicket.id);
        toast({ title: "تم إغلاق المحادثة بنجاح" });
    } catch (e) {
        toast({ title: "حدث خطأ أثناء الإغلاق", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-8 p-4">
      <header>
        <h1 className="text-3xl font-black text-primary">تذاكر الدعم الفني</h1>
        <p className="text-muted-foreground font-bold">متابعة محادثات الزبائن والرد على استفساراتهم بشكل لحظي</p>
      </header>

      <div className="bg-white rounded-[2rem] shadow-sm border overflow-hidden">
        <Table>
            <TableHeader className="bg-muted/50">
            <TableRow>
                <TableHead className="font-black">العميل</TableHead>
                <TableHead className="font-black w-[40%]">آخر رسالة</TableHead>
                <TableHead className="font-black">التاريخ</TableHead>
                <TableHead className="font-black">الحالة</TableHead>
                <TableHead className="font-black text-center">إجراء</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {sortedTickets.map((ticket) => (
                <TableRow key={ticket.id} className="hover:bg-muted/30">
                <TableCell className="font-bold">
                    {ticket.userName || 'مستخدم غير معروف'}
                    <div className="text-[10px] text-muted-foreground font-mono">{ticket.userId?.substring(0,8) || 'N/A'}</div>
                </TableCell>
                <TableCell className="text-muted-foreground font-medium truncate max-w-[200px]">
                    {ticket.history?.[ticket.history.length-1]?.content || 'لا توجد رسائل'}
                </TableCell>
                <TableCell className="text-xs font-bold">{new Date(ticket.createdAt).toLocaleDateString('ar-IQ')}</TableCell>
                <TableCell>
                    <Badge className={cn("rounded-lg", ticket.isResolved ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive")}>
                        {ticket.isResolved ? "تم الحل" : "بانتظار الرد"}
                    </Badge>
                </TableCell>
                <TableCell className="text-center">
                    <Button variant="outline" size="sm" onClick={() => setSelectedTicket(ticket)} className="rounded-xl font-bold border-2">
                       <MessageSquare className="ml-2 h-4 w-4"/>
                       فتح المحادثة
                    </Button>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        {supportTickets.length === 0 && (
            <div className="text-center py-20">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4"/>
                <p className="text-muted-foreground font-bold italic">لا توجد أي تذاكر دعم حالياً</p>
            </div>
        )}
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={(isOpen) => !isOpen && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl flex flex-col h-[90vh] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="p-6 bg-primary text-white">
                <div className="flex justify-between items-center">
                    <div className="text-right">
                        <DialogTitle className="text-2xl font-black">محادثة: {selectedTicket?.userName}</DialogTitle>
                        <DialogDescription className="text-white/80 font-bold">تاريخ البدء: {selectedTicket && new Date(selectedTicket.createdAt).toLocaleString('ar-IQ')}</DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            
            <ScrollArea className="flex-1 p-6 bg-muted/10">
                <div className="space-y-6">
                {selectedTicket?.history?.map((message: Message, index: number) => {
                    const isAdmin = message.role === "admin";
                    return (
                        <div key={index} className={cn("flex items-start gap-3", isAdmin ? "flex-row-reverse" : "flex-row")}>
                            <Avatar className="h-8 w-8 shadow-sm">
                                <AvatarFallback className={cn(isAdmin ? "bg-primary text-white" : "bg-white border text-primary")}>
                                    {isAdmin ? <ShieldCheck className="h-4 w-4"/> : <User className="h-4 w-4"/>}
                                </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                                "max-w-[80%] p-4 text-sm font-bold shadow-sm",
                                isAdmin ? "bg-primary text-white rounded-t-2xl rounded-bl-2xl" : "bg-white rounded-t-2xl rounded-br-2xl"
                            )}>
                                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                <span className="text-[8px] opacity-60 block mt-2">{new Date(message.timestamp).toLocaleTimeString('ar-IQ')}</span>
                            </div>
                        </div>
                    );
                })}
                </div>
            </ScrollArea>

            <DialogFooter className="p-6 bg-white border-t flex-col gap-4">
                 {!selectedTicket?.isResolved ? (
                    <form onSubmit={handleReply} className="flex w-full items-center gap-3 bg-muted/40 p-2 rounded-[1.5rem] border-2">
                        <Input 
                            placeholder="اكتب ردك هنا للزبون..."
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            disabled={isReplying}
                            className="bg-transparent border-none shadow-none focus-visible:ring-0 font-bold h-12"
                        />
                        <Button type="submit" size="icon" disabled={isReplying || !reply.trim()} className="h-12 w-12 rounded-2xl shadow-lg">
                            {isReplying ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5"/>}
                        </Button>
                    </form>
                 ) : (
                     <div className="text-center p-3 bg-muted rounded-xl text-xs font-bold text-muted-foreground">هذه التذكرة مغلقة ولا يمكن الرد عليها</div>
                 )}
                 <div className="flex w-full justify-between gap-4">
                    <Button variant="outline" onClick={() => setSelectedTicket(null)} className="flex-1 rounded-xl font-bold">إغلاق النافذة</Button>
                    {!selectedTicket?.isResolved && (
                         <Button variant="secondary" onClick={handleResolveTicket} className="flex-1 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600">
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
