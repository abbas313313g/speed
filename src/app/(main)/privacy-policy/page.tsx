
"use client";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function PrivacyPolicyPage() {
    const router = useRouter();
    const privacyPolicyUrl = "https://www.e-droid.net/privacy.php?ida=3706700&idl=en";

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            <header className="p-4 border-b flex items-center justify-between bg-card">
                <h1 className="text-xl font-bold">سياسة الخصوصية</h1>
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowRight className="h-5 w-5" />
                </Button>
            </header>
            <div className="flex-1 overflow-auto">
                <iframe
                    src={privacyPolicyUrl}
                    className="w-full h-full border-none"
                    title="Privacy Policy"
                />
            </div>
        </div>
    );
}
