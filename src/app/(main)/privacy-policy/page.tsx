
"use client";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, ShieldCheck, UserCheck, Instagram } from 'lucide-react';

export default function PrivacyPolicyPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950">
            <header className="p-4 border-b flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 flex-row-reverse">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
                    <ArrowRight className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-black">الخصوصية والشروط</h1>
                 <div className="w-9"></div>
            </header>
            <div className="flex-1 overflow-auto p-6 space-y-6 text-right">
                 <div className="text-center mb-8">
                     <div className="p-6 bg-primary/10 rounded-[2.5rem] w-fit mx-auto mb-4">
                        <FileText className="h-16 w-16 text-primary"/>
                     </div>
                     <h2 className="text-2xl font-black text-slate-800 dark:text-white">سياسة خصوصية سبيد</h2>
                     <p className="text-muted-foreground font-bold mt-1 uppercase tracking-widest text-[10px]">آخر تحديث: يوليو ٢٠٢٤</p>
                 </div>

                 <div className="space-y-5">
                     <div className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                         <h3 className="font-black text-lg flex items-center gap-2 justify-end">مقدمة <ShieldCheck className="text-primary h-5 w-5"/></h3>
                         <p className="mt-3 text-muted-foreground font-medium leading-relaxed">
                             نحن في سبيد شوب نلتزم بحماية خصوصيتك. توضح هذه السياسة كيفية جمعنا واستخدامنا وحمايتنا لمعلوماتك الشخصية عند استخدامك لتطبيقنا.
                         </p>
                     </div>
                      <div className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                         <h3 className="font-black text-lg flex items-center gap-2 justify-end">المعلومات التي نجمعها <UserCheck className="text-primary h-5 w-5"/></h3>
                         <ul className="mt-3 text-muted-foreground font-medium space-y-3">
                             <li className="flex items-center gap-2 justify-end"><span className="bg-primary/10 p-1 rounded-md text-[10px] font-black text-primary">اسمك، رقم هاتفك، وعناوين التوصيل</span> :معلومات التعريف</li>
                             <li className="flex items-center gap-2 justify-end"><span className="bg-primary/10 p-1 rounded-md text-[10px] font-black text-primary">موقعك الجغرافي لحساب المسافات</span> :معلومات الموقع</li>
                             <li className="flex items-center gap-2 justify-end"><span className="bg-primary/10 p-1 rounded-md text-[10px] font-black text-primary">سجل الطلبات والمنتجات</span> :بيانات العمليات</li>
                         </ul>
                     </div>
                      <div className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                         <h3 className="font-black text-lg text-slate-800 dark:text-white">كيف نستخدم معلوماتك؟</h3>
                         <p className="mt-3 text-muted-foreground font-medium leading-relaxed">
                             نستخدم بياناتك لتسهيل عملية توصيل طلباتك، ولتحسين خدماتنا وتجربتك داخل التطبيق، وللتواصل معك بخصوص طلباتك أو لتقديم الدعم الفني اللازم.
                         </p>
                     </div>
                     <div className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                         <h3 className="font-black text-lg text-slate-800 dark:text-white">مشاركة البيانات</h3>
                         <p className="mt-3 text-muted-foreground font-medium leading-relaxed">
                             نحن لا نبيع أو نشارك بياناتك الشخصية مع أطراف ثالثة لأغراض تسويقية. قد نشارك اسمك وعنوانك ورقم هاتفك مع عمال التوصيل لإكمال طلبك فقط.
                         </p>
                     </div>
                 </div>

                 <div className="pt-12 pb-24 text-center space-y-4">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] opacity-40">حقوق الملكية الفكرية محفوظة © سبيد</p>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[3rem] shadow-xl border-2 border-primary/10 inline-block px-10">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-4">
                            تطوير وبرمجة: <span className="text-primary italic">عباس المهدوي</span>
                        </h3>
                        <a 
                            href="https://instagram.com/0ap_4i" 
                            target="_blank" 
                            className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-pink-100 active:scale-90 transition-all"
                        >
                            <Instagram className="h-5 w-5" />
                            <span>@0ap_4i</span>
                        </a>
                    </div>
                 </div>
            </div>
        </div>
    );
}
