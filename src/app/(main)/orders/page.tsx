
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, CookingPot, Bike, Home } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Mock data for current and past orders
const currentOrder = {
  id: "ORD-12345",
  status: "preparing",
  estimatedDelivery: "30-40 دقيقة",
  total: 25500,
  items: [
    { name: "برجر لحم كلاسيك", quantity: 2 },
    { name: "بطاطا مقلية", quantity: 1 },
  ],
};

const pastOrders = [
  { id: "ORD-12344", date: "2024-05-20", total: 15000, status: "delivered" },
  { id: "ORD-12342", date: "2024-05-18", total: 32000, status: "delivered" },
];

const orderStatusSteps = [
    { id: 'confirmed', label: 'تم التأكيد', icon: CheckCircle, progress: 10 },
    { id: 'preparing', label: 'تحضير الطلب', icon: CookingPot, progress: 40 },
    { id: 'on_the_way', label: 'في الطريق', icon: Bike, progress: 80 },
    { id: 'delivered', label: 'تم التوصيل', icon: Home, progress: 100 },
];

export default function OrdersPage() {
    const currentStep = orderStatusSteps.find(s => s.id === currentOrder.status) || orderStatusSteps[0];
    const currentProgress = currentStep.progress;
    
  return (
    <div className="p-4 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">متابعة طلباتك</h1>
        <p className="text-muted-foreground">تتبع طلبك الحالي واطلع على طلباتك السابقة.</p>
      </header>

      <section>
        <h2 className="text-xl font-bold mb-4">طلبك الحالي</h2>
        <Card>
          <CardHeader>
            <CardTitle>طلب رقم: {currentOrder.id}</CardTitle>
            <CardDescription>الوقت المتوقع للتوصيل: {currentOrder.estimatedDelivery}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              {currentOrder.items.map(item => (
                <div key={item.name} className="flex justify-between">
                  <span>{item.name} <span className="text-muted-foreground text-sm">(x{item.quantity})</span></span>
                </div>
              ))}
              <hr className="my-2"/>
              <div className="flex justify-between font-bold">
                <span>المجموع</span>
                <span>{formatCurrency(currentOrder.total)}</span>
              </div>
            </div>

            <div>
              <Progress value={currentProgress} className="w-full h-2" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                {orderStatusSteps.map(step => {
                    const isCompleted = orderStatusSteps.indexOf(step) <= orderStatusSteps.indexOf(currentStep);
                    return (
                        <div key={step.id} className={`flex flex-col items-center ${isCompleted ? 'text-primary font-semibold' : ''}`}>
                            <step.icon className="h-5 w-5 mb-1" />
                            <span>{step.label}</span>
                        </div>
                    )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">الطلبات السابقة</h2>
        <div className="space-y-4">
          {pastOrders.map(order => (
             <Card key={order.id}>
                <CardContent className="p-4 flex justify-between items-center">
                    <div>
                        <p className="font-semibold">طلب رقم: {order.id}</p>
                        <p className="text-sm text-muted-foreground">بتاريخ: {order.date}</p>
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-primary">{formatCurrency(order.total)}</p>
                        <p className="text-sm text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            <span>تم التوصيل</span>
                        </p>
                    </div>
                </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
