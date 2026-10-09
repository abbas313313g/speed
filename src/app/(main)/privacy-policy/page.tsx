
"use client";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, ShieldCheck, UserCheck, Instagram } from 'lucide-react';

export default function PrivacyPolicyPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#f8fafc] dark:bg-slate-950">
            <header className="p-5 border-b flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 flex-row-reverse shadow-sm rounded-b-[2.5rem]">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-2xl h-12 w-12 bg-slate-50">
                    <ArrowRight className="h-6 w-6 text-primary" />
                </Button>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white">الخصوصية والشروط</h1>
                 <div className="w-12"></div>
            </header>
            <div className="flex-1 overflow-auto p-6 space-y-8 text-right">
                 <div className="text-center mb-10">
                     <div className="p-8 bg-primary/10 rounded-[3rem] w-fit mx-auto mb-6 border-2 border-primary/5 shadow-inner">
                        <FileText className="h-20 w-20 text-primary animate-pulse"/>
                     </div>
                     <h2 className="text-3xl font-black text-slate-800 dark:text-white italic">سياسة خصوصية سبيد</h2>
                     <p className="text-muted-foreground font-black mt-2 uppercase tracking-[0.3em] text-[10px] opacity-60">آخر تحديث: يوليو ٢٠٢٤</p>
                 </div>

                 <div className="space-y-6">
                     <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-white dark:border-slate-800">
                         <h3 className="font-black text-xl flex items-center gap-3 justify-end text-primary">مقدمة <ShieldCheck className="h-6 w-6"/></h3>
                         <p className="mt-4 text-slate-600 dark:text-slate-400 font-bold leading-relaxed text-sm">
                             نحن في سبيد شوب نلتزم بحماية خصوصيتك. توضح هذه السياسة كيفية جمعنا واستخدامنا وحمايتنا لمعلوماتك الشخصية عند استخدامك لتطبيقنا.
                         </p>
                     </div>
                      <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-white dark:border-slate-800">
                         <h3 className="font-black text-xl flex items-center gap-3 justify-end text-primary">المعلومات التي نجمعها <UserCheck className="h-6 w-6"/></h3>
                         <ul className="mt-5 text-slate-600 dark:text-slate-400 font-bold space-y-4 text-sm">
                             <li className="flex items-center gap-3 justify-end"><span className="bg-primary/10 p-2 rounded-xl text-xs font-black text-primary border border-primary/10">اسمك، هاتف، عناوين</span> :معلومات التعريف</li>
                             <li className="flex items-center gap-3 justify-end"><span className="bg-primary/10 p-2 rounded-xl text-xs font-black text-primary border border-primary/10">موقعك الجغرافي (GPS)</span> :معلومات الموقع</li>
                             <li className="flex items-center gap-3 justify-end"><span className="bg-primary/10 p-2 rounded-xl text-xs font-black text-primary border border-primary/10">سجل الطلبات والبحث</span> :بيانات العمليات</li>
                         </ul>
                     </div>
                      <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-white dark:border-slate-800">
                         <h3 className="font-black text-xl text-slate-800 dark:text-white">كيف نستخدم معلوماتك؟</h3>
                         <p className="mt-4 text-slate-600 dark:text-slate-400 font-bold leading-relaxed text-sm">
                             نستخدم بياناتك لتسهيل عملية توصيل طلباتك، ولتحسين خدماتنا وتجربتك داخل التطبيق، وللتواصل معك بخصوص طلباتك أو لتقديم الدعم الفني اللازم.
                         </p>
                     </div>
                     <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-white dark:border-slate-800">
                         <h3 className="font-black text-xl text-slate-800 dark:text-white">مشاركة البيانات</h3>
                         <p className="mt-4 text-slate-600 dark:text-slate-400 font-bold leading-relaxed text-sm">
                             نحن لا نبيع أو نشارك بياناتك الشخصية مع أطراف ثالثة لأغراض تسويقية. قد نشارك اسمك وعنوانك ورقم هاتفك مع عمال التوصيل لإكمال طلبك فقط.
                         </p>
                     </div>
                 </div>

                 <div className="pt-16 pb-32 text-center space-y-6">
                    <p className="text-[11px] text-muted-foreground font-black uppercase tracking-[0.4em] opacity-30">حقوق الملكية الفكرية محفوظة © سبيد</p>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3.5rem] shadow-2xl border-2 border-primary/10 inline-block px-12 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700" />
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-6 relative z-10">
                            تطوير وبرمجة: <span className="text-primary italic">عباس المهدوي</span>
                        </h3>
                        <a 
                            href="https://instagram.com/0ap_4i" 
                            target="_blank" 
                            className="flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-pink-100 active:scale-90 transition-all relative z-10"
                        >
                            <Instagram className="h-7 w-7" />
                            <span>@0ap_4i</span>
                        </a>
                    </div>
                 </div>
            </div>
        </div>
    );
}
