

"use client";

import { useContext, useState } from 'react';
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
import { Check, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
} from '@/components/ui/card';
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
import { Bot, User } from 'lucide-react';

export default function AdminSupportTicketsPage() {
  const context = useContext(AppContext);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  if (!context || context.isLoading) return <div>جار التحميل...</div>;

  const { supportTickets, resolveSupportTicket } = context;

  const sortedTickets = [...supportTickets].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">تذاكر الدعم الفني</h1>
        <p className="text-muted-foreground">مراجعة وحل المشاكل التي يرسلها الزبائن.</p>
      </header>

      <Card>
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead className="w-[50%]">السؤال/المشكلة</TableHead>
                <TableHead>تاريخ الإرسال</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراء</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {sortedTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                <TableCell className="font-medium">{ticket.question}</TableCell>
                <TableCell>{new Date(ticket.createdAt).toLocaleString('ar-IQ')}</TableCell>
                <TableCell>
                    <Badge variant={ticket.isResolved ? "secondary" : "destructive"}>
                        {ticket.isResolved ? "تم الحل" : "مفتوحة"}
                    </Badge>
                </TableCell>
                <TableCell className="space-x-2">
                    {ticket.history && ticket.history.length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => setSelectedTicket(ticket)}>
                           <MessageSquare className="ml-2 h-4 w-4"/>
                           عرض المحادثة
                        </Button>
                    )}
                    {!ticket.isResolved && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveSupportTicket(ticket.id)}
                        >
                            <Check className="ml-2 h-4 w-4" />
                            وضع علامة "تم الحل"
                        </Button>
                    )}
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
      </Card>
      {supportTickets.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد تذاكر دعم حالياً.</p>}

      <Dialog open={!!selectedTicket} onOpenChange={(isOpen) => !isOpen && setSelectedTicket(null)}>
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle>مراجعة المحادثة</DialogTitle>
                <DialogDescription>
                    هذا هو سجل المحادثة الكامل بين المستخدم والمساعد الذكي.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[50vh] border rounded-md p-4">
                <div className="space-y-6">
                {selectedTicket?.history?.map((message: Message, index: number) => (
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
                        "max-w-[85%] rounded-lg p-3 text-sm",
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
            <DialogFooter>
                 <Button variant="outline" onClick={() => setSelectedTicket(null)}>إغلاق</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    