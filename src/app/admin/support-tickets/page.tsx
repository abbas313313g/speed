

"use client";

import { useContext, useState, FormEvent } from 'react';
import { AppContext } from '@/contexts/AppContext';
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
import { Check, MessageSquare, Send, ShieldCheck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

export default function AdminSupportTicketsPage() {
  const context = useContext(AppContext);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  if (!context || context.isLoading) return <div>جار التحميل...</div>;

  const { supportTickets, resolveSupportTicket, addMessageToTicket } = context;

  const sortedTickets = [...supportTickets].sort((a,b) => {
    if (a.isResolved !== b.isResolved) {
      return a.isResolved ? 1 : -1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  });

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !selectedTicket) return;
    setIsReplying(true);

    const adminMessage: Message = {
      role: 'admin',
      content: reply,
      timestamp: new Date().toISOString()
    };
    
    await addMessageToTicket(selectedTicket.id, adminMessage);
    
    setReply("");
    setIsReplying(false);
  }

  const handleOpenDialog = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReply("");
  }


  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">تذاكر الدعم الفني</h1>
        <p className="text-muted-foreground">مراجعة والرد على مشاكل الزبائن.</p>
      </header>

      <Card>
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>العميل</TableHead>
                <TableHead className="w-[40%]">آخر رسالة</TableHead>
                <TableHead>تاريخ الإرسال</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراء</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {sortedTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                <TableCell className="font-medium">{ticket.userName || 'غير معروف'}<br/><span className="text-xs text-muted-foreground">{ticket.userId.substring(0,8)}</span></TableCell>
                <TableCell className="text-muted-foreground">{ticket.history[ticket.history.length-1]?.content}</TableCell>
                <TableCell>{new Date(ticket.createdAt).toLocaleString('ar-IQ')}</TableCell>
                <TableCell>
                    <Badge variant={ticket.isResolved ? "secondary" : "destructive"}>
                        {ticket.isResolved ? "تم الحل" : "مفتوحة"}
                    </Badge>
                </TableCell>
                <TableCell className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(ticket)}>
                       <MessageSquare className="ml-2 h-4 w-4"/>
                       متابعة المحادثة
                    </Button>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
      </Card>
      {supportTickets.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد تذاكر دعم حالياً.</p>}

      <Dialog open={!!selectedTicket} onOpenChange={(isOpen) => !isOpen && setSelectedTicket(null)}>
        <DialogContent className="max-w-lg flex flex-col h-[90vh]">
            <DialogHeader>
                <DialogTitle>محادثة مع {selectedTicket?.userName}</DialogTitle>
                <DialogDescription>
                    هذا هو سجل المحادثة الكامل. يمكنك الرد على المستخدم من هنا.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-grow border rounded-md p-4">
                <div className="space-y-6">
                {selectedTicket?.history?.map((message: Message, index: number) => (
                    <div
                    key={index}
                    className={cn(
                        "flex items-start gap-3",
                        message.role === "admin" ? "justify-end" : "justify-start"
                    )}
                    >
                    {message.role !== "admin" && (
                        <Avatar className="h-8 w-8">
                        <AvatarFallback>
                            <User />
                        </AvatarFallback>
                        </Avatar>
                    )}
                    <div
                        className={cn(
                        "max-w-[85%] rounded-lg p-3 text-sm",
                        message.role === "admin"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                    >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === "admin" && (
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                                <ShieldCheck />
                            </AvatarFallback>
                        </Avatar>
                    )}
                    </div>
                ))}
                </div>
            </ScrollArea>
            <DialogFooter className="flex-col gap-4">
                 {!selectedTicket?.isResolved && (
                    <form onSubmit={handleReply} className="flex w-full items-center gap-2">
                        <Input 
                            placeholder="اكتب ردك هنا..."
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            disabled={isReplying}
                        />
                        <Button type="submit" size="icon" disabled={isReplying || !reply.trim()}>
                            <Send className="h-4 w-4"/>
                        </Button>
                    </form>
                 )}
                 <div className="flex w-full justify-between">
                     <DialogClose asChild>
                        <Button variant="outline">إغلاق النافذة</Button>
                    </DialogClose>
                    {!selectedTicket?.isResolved && (
                         <Button variant="secondary" onClick={() => selectedTicket && resolveSupportTicket(selectedTicket.id)}>
                            <Check className="ml-2 h-4 w-4"/>
                            وضع علامة "تم الحل"
                         </Button>
                    )}
                 </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
