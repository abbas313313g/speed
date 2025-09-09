
"use client";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, ShieldCheck, UserCheck } from 'lucide-react';

export default function PrivacyPolicyPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-muted/20">
            <header className="p-4 border-b flex items-center justify-between bg-card shrink-0">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowRight className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold">الشروط وسياسة الخصوصية</h1>
                 <div className="w-9"></div>
            </header>
            <div className="flex-1 overflow-auto p-6 space-y-6">
                 <div className="text-center mb-8">
                     <FileText className="h-16 w-16 mx-auto text-primary mb-4"/>
                     <h2 className="text-2xl font-bold">سياسة الخصوصية لتطبيق سبيد شوب</h2>
                     <p className="text-muted-foreground">آخر تحديث: 20 يوليو 2024</p>
                 </div>

                 <div className="space-y-4">
                     <div className="p-4 bg-card rounded-lg shadow-sm">
                         <h3 className="font-bold text-lg flex items-center gap-2"><ShieldCheck className="text-primary"/> مقدمة</h3>
                         <p className="mt-2 text-muted-foreground">
                             نحن في سبيد شوب نلتزم بحماية خصوصيتك. توضح هذه السياسة كيفية جمعنا واستخدامنا وحمايتنا لمعلوماتك الشخصية عند استخدامك لتطبيقنا.
                         </p>
                     </div>
                      <div className="p-4 bg-card rounded-lg shadow-sm">
                         <h3 className="font-bold text-lg flex items-center gap-2"><UserCheck className="text-primary"/>المعلومات التي نجمعها</h3>
                         <ul className="mt-2 text-muted-foreground list-disc list-inside space-y-1">
                             <li>**معلومات التعريف:** اسمك، رقم هاتفك، وعناوين التوصيل.</li>
                             <li>**معلومات الموقع:** نستخدم موقعك لتحديد عناوين التوصيل وحساب المسافة من المتاجر.</li>
                             <li>**بيانات الطلبات:** سجل طلباتك والمنتجات التي تشتريها.</li>
                         </ul>
                     </div>
                      <div className="p-4 bg-card rounded-lg shadow-sm">
                         <h3 className="font-bold text-lg">كيف نستخدم معلوماتك؟</h3>
                         <ul className="mt-2 text-muted-foreground list-disc list-inside space-y-1">
                             <li>لتسهيل عملية توصيل طلباتك.</li>
                             <li>لتحسين خدماتنا وتجربتك داخل التطبيق.</li>
                             <li>للتواصل معك بخصوص طلباتك أو لتقديم الدعم الفني.</li>
                         </ul>
                     </div>
                     <div className="p-4 bg-card rounded-lg shadow-sm">
                         <h3 className="font-bold text-lg">مشاركة البيانات</h3>
                         <p className="mt-2 text-muted-foreground">
                             نحن لا نبيع أو نشارك بياناتك الشخصية مع أطراف ثالثة لأغراض تسويقية. قد نشارك اسمك وعنوانك ورقم هاتفك مع عمال التوصيل لإكمال طلبك فقط.
                         </p>
                     </div>
                 </div>
            </div>
        </div>
    );
}
