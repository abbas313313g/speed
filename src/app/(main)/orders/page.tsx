
"use client";

import { useContext } from "react";
import { AppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, CookingPot, Bike, Home, ShoppingBag, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/lib/types";

const orderStatusSteps = [
    { id: 'confirmed', label: 'تم التأكيد', icon: CheckCircle, progress: 10 },
    { id: 'preparing', label: 'تحضير الطلب', icon: CookingPot, progress: 40 },
    { id: 'on_the_way', label: 'في الطريق', icon: Bike, progress: 80 },
    { id: 'delivered', label: 'تم التوصيل', icon: Home, progress: 100 },
];

function CurrentOrderCard({ order }: { order: Order }) {
    const currentStep = orderStatusSteps.find(s => s.id === order.status) || orderStatusSteps[0];
    const currentProgress = currentStep.progress;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>طلب رقم: {order.id}</CardTitle>
                <CardDescription>الوقت المتوقع للتوصيل: {order.estimatedDelivery}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    {order.items.map(item => (
                        <div key={item.product.id} className="flex justify-between">
                            <span>{item.product.name} <span className="text-muted-foreground text-sm">(x{item.quantity})</span></span>
                        </div>
                    ))}
                    <hr className="my-2"/>
                    <div className="flex justify-between font-bold">
                        <span>المجموع</span>
                        <span>{formatCurrency(order.total)}</span>
                    </div>
                </div>

                <div>
                    <Progress value={currentProgress} className="w-full h-2" />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        {orderStatusSteps.map(step => {
                            const isCompleted = orderStatusSteps.findIndex(s => s.id === order.status) >= orderStatusSteps.findIndex(s => s.id === step.id);
                            return (
                                <div key={step.id} className={`flex flex-col items-center w-16 text-center ${isCompleted ? 'text-primary font-semibold' : ''}`}>
                                    <step.icon className="h-5 w-5 mb-1" />
                                    <span>{step.label}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function PastOrderCard({ order }: { order: Order }) {
    const isDelivered = order.status === 'delivered';
    return (
        <Card>
            <CardContent className="p-4 flex justify-between items-center">
                <div>
                    <p className="font-semibold">طلب رقم: {order.id}</p>
                    <p className="text-sm text-muted-foreground">بتاريخ: {new Date(order.date).toLocaleDateString('ar-IQ')}</p>
                </div>
                <div className="text-left">
                    <p className="font-bold text-primary">{formatCurrency(order.total)}</p>
                    <p className={`text-sm flex items-center gap-1 ${isDelivered ? 'text-green-600' : 'text-red-600'}`}>
                        {isDelivered ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <span>{isDelivered ? 'تم التوصيل' : 'ملغي'}</span>
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

export default function OrdersPage() {
    const context = useContext(AppContext);

    if (!context) return null;

    const { orders } = context;
    const currentOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
    const pastOrders = orders.filter(o => o.status === 'delivered' || o.status === 'cancelled');

    return (
        <div className="p-4 space-y-8">
            <header>
                <h1 className="text-3xl font-bold">متابعة طلباتك</h1>
                <p className="text-muted-foreground">تتبع طلباتك الحالية واطلع على طلباتك السابقة.</p>
            </header>

            <section>
                <h2 className="text-xl font-bold mb-4">طلباتك الحالية</h2>
                {currentOrders.length > 0 ? (
                    <div className="space-y-4">
                        {currentOrders.map(order => <CurrentOrderCard key={order.id} order={order} />)}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <ShoppingBag className="h-16 w-16 mx-auto mb-2" />
                        <p>لا توجد طلبات حالية.</p>
                    </div>
                )}
            </section>

            <section>
                <h2 className="text-xl font-bold mb-4">الطلبات السابقة</h2>
                {pastOrders.length > 0 ? (
                    <div className="space-y-4">
                        {pastOrders.map(order => <PastOrderCard key={order.id} order={order} />)}
                    </div>
                 ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <ShoppingBag className="h-16 w-16 mx-auto mb-2" />
                        <p>لا توجد طلبات سابقة.</p>
                    </div>
                )}
            </section>
        </div>
    );
}
