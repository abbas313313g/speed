
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

// Mock data for reviews
const reviews = [
  {
    id: 1,
    name: "علي كريم",
    avatar: "https://placehold.co/40x40.png",
    rating: 5,
    text: "تطبيق رائع وخدمة توصيل سريعة جدًا! المنتجات تصل بحالة ممتازة. شكرًا لكم.",
    date: "قبل يومين",
  },
  {
    id: 2,
    name: "فاطمة أحمد",
    avatar: "https://placehold.co/40x40.png",
    rating: 4,
    text: "تجربة جيدة جدًا، لكن أتمنى إضافة المزيد من المطاعم في منطقة زيونة.",
    date: "قبل ٥ أيام",
  },
  {
    id: 3,
    name: "أحمد محمد",
    avatar: "https://placehold.co/40x40.png",
    rating: 5,
    text: "الدعم الفني الذكي كان مفيدًا جدًا وساعدني في حل مشكلة في عنواني. فكرة ممتازة!",
    date: "قبل أسبوع",
  },
    {
    id: 4,
    name: "نور الهدى",
    avatar: "https://placehold.co/40x40.png",
    rating: 5,
    text: "أفضل تطبيق توصيل في بغداد حاليًا. أحب قسم الأكثر مبيعًا، دائمًا أجد فيه أشياء جديدة.",
    date: "قبل أسبوع",
  },
   {
    id: 5,
    name: "محمد عبدالله",
    avatar: "https://placehold.co/40x40.png",
    rating: 3,
    text: "التطبيق جيد لكن سائق التوصيل تأخر قليلاً عن الوقت المتوقع.",
    date: "قبل ١٠ أيام",
  },
];

const RatingStars = ({ rating } : { rating: number }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-amber-500 fill-amber-500" : "text-gray-300"
        }`}
      />
    ))}
  </div>
);

export default function ReviewsPage() {
  return (
    <div className="p-4 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">آراء عملائنا</h1>
        <p className="text-muted-foreground">
          ماذا يقول عملاؤنا عن تجربتهم مع سبيد شوب.
        </p>
      </header>

      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={review.avatar} alt={review.name} />
                    <AvatarFallback>{review.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{review.name}</CardTitle>
                     <p className="text-xs text-muted-foreground">{review.date}</p>
                  </div>
                </div>
                <RatingStars rating={review.rating} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{review.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
