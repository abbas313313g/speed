
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Bike, AlertTriangle } from 'lucide-react';
import { cn } from "@/lib/utils";

interface DeliveryMapProps {
  origin: { lat: number, lng: number };
  destination: { lat: number, lng: number };
  className?: string;
}

export function DeliveryMap({ origin, destination, className }: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    // إذا لم يتوفر المفتاح، سنعرض واجهة بديلة أنيقة بدلاً من رسالة الخطأ القاسية
    if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY_HERE" || apiKey.length < 10) {
        setError("نظام الخرائط قيد التهيئة البرمجية حالياً.");
        setIsLoading(false);
        return;
    }

    const initMap = () => {
        if (!mapRef.current) return;

        try {
            // معالجة خطأ المصادقة من جوجل
            (window as any).gm_authFailure = () => {
                setError("يرجى التأكد من تفعيل مفتاح Google Maps في لوحة التحكم.");
                setIsLoading(false);
            };

            const map = new google.maps.Map(mapRef.current, {
                center: origin,
                zoom: 15,
                styles: [
                    { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{ "color": "#7c93a3" }] },
                    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#e9e9e9" }] },
                    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
                    { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] }
                ],
                disableDefaultUI: true,
                zoomControl: true,
            });

            const directionsService = new google.maps.DirectionsService();
            const directionsRenderer = new google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: '#00B358',
                    strokeWeight: 6,
                    strokeOpacity: 0.8
                }
            });

            directionsService.route(
                {
                    origin: new google.maps.LatLng(origin.lat, origin.lng),
                    destination: new google.maps.LatLng(destination.lat, destination.lng),
                    travelMode: google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK && result) {
                        directionsRenderer.setDirections(result);
                    }
                    setIsLoading(false);
                }
            );

            // إضافة علامة المتجر
            new google.maps.Marker({
                position: origin,
                map: map,
                icon: {
                    path: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z',
                    fillColor: '#00B358',
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: '#FFFFFF',
                    scale: 1.5,
                },
                title: "المتجر"
            });

            // إضافة علامة الزبون
            new google.maps.Marker({
                position: destination,
                map: map,
                icon: {
                    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                    fillColor: '#EF4444',
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: '#FFFFFF',
                    scale: 1.5,
                    anchor: new google.maps.Point(12, 24)
                },
                title: "الزبون"
            });
        } catch (e) {
            setError("عذراً، تعذر تشغيل الخريطة التفاعلية حالياً.");
            setIsLoading(false);
        }
    };

    if (window.google && window.google.maps) {
        initMap();
    } else {
        const existingScript = document.getElementById('google-maps-script');
        if (!existingScript) {
            const script = document.createElement('script');
            script.id = 'google-maps-script';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,drawing,places`;
            script.async = true;
            script.onload = initMap;
            script.onerror = () => {
                setError("تأكد من اتصال الانترنت لتحميل الخريطة.");
                setIsLoading(false);
            };
            document.head.appendChild(script);
        } else {
            existingScript.addEventListener('load', initMap);
        }
    }
  }, [origin, destination]);

  return (
    <div className={cn("relative w-full h-full rounded-[2.5rem] overflow-hidden bg-muted/20 border-4 border-white shadow-2xl", className)}>
        {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
                <Bike className="h-16 w-16 text-primary animate-bounce mb-3" />
                <p className="font-black text-sm text-primary animate-pulse italic">جاري رسم مسار التوصيل...</p>
            </div>
        )}
        {error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-10 text-center bg-muted/10 backdrop-blur-md">
                <div className="p-5 bg-white rounded-full shadow-lg mb-4">
                    <AlertTriangle className="h-12 w-12 text-orange-500" />
                </div>
                <p className="text-foreground font-black text-sm leading-relaxed">{error}</p>
                <p className="text-[10px] text-muted-foreground mt-2">يمكنك استخدام زر الموقع لفتح الخرائط الخارجية</p>
            </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
