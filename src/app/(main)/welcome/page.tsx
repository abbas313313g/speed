
"use client";

import { useContext } from "react";
import Link from "next/link";
import { AppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PartyPopper, ArrowLeft } from "lucide-react";

export default function WelcomePage() {
    const context = useContext(AppContext);

    return (
        <div className="flex items-center justify-center h-full p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <PartyPopper className="h-16 w-16 mx-auto text-primary" />
                    <CardTitle className="text-3xl mt-4">
                        مرحباً بك، {context?.user?.name.split(" ")[0] || 'زبوننا العزيز'}!
                    </CardTitle>
                    <CardDescription className="text-lg mt-2">
                        تم تسجيل دخولك بنجاح.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-6">
                        أنت الآن جاهز لتصفح أفضل المنتجات والطلب بسهولة.
                    </p>
                    <Button asChild size="lg" className="w-full text-lg">
                        <Link href="/home">
                            ابدأ التسوق الآن
                            <ArrowLeft className="mr-2 h-5 w-5" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

    