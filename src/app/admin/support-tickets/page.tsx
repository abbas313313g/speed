

"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export default function AdminSupportTicketsPage() {
  const context = useContext(AppContext);

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
                <TableHead className="w-[60%]">السؤال/المشكلة</TableHead>
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
                <TableCell>
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
    </div>
  );
}
