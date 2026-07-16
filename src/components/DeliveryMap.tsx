
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Bike, Store, Home, AlertTriangle } from 'lucide-react';
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
    
    // التحقق مما إذا كان المفتاح موجوداً أو مجرد نص افتراضي
    if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY_HERE" || apiKey.length < 20) {
        setError("مفتاح الخرائط غير صحيح. يرجى ضبط NEXT_PUBLIC_GOOGLE_MAPS_API_KEY في إعدادات Vercel.");
        setIsLoading(false);
        return;
    }

    const initMap = () => {
        if (!mapRef.current) return;

        try {
            // تعريف دالة للتعامل مع أخطاء جوجل العالمية (مثل المفتاح غير صالح)
            (window as any).gm_authFailure = () => {
                setError("فشل التحقق من مفتاح الخرائط (Invalid Key). يرجى التأكد من تفعيل الميزانية في جوجل.");
                setIsLoading(false);
            };

            const map = new google.maps.Map(mapRef.current, {
                center: origin,
                zoom: 14,
                styles: [
                    { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{ "color": "#7c93a3" }, { "lightness": "-10" }] },
                    { "featureType": "administrative.country", "elementType": "geometry", "stylers": [{ "visibility": "on" }] },
                    { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }, { "lightness": "20" }] },
                    { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }, { "lightness": "21" }] },
                    { "featureType": "road.highway", "elementType": "geometry.fill", "stylers": [{ "color": "#ffffff" }, { "lightness": "17" }] },
                    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#e9e9e9" }, { "lightness": "17" }] }
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
                    } else {
                        console.error("Directions request failed:", status);
                    }
                    setIsLoading(false);
                }
            );

            // Custom Markers
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
                    anchor: new google.maps.Point(12, 12)
                },
                title: "المتجر"
            });

            new google.maps.Marker({
                position: destination,
                map: map,
                icon: {
                    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
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
            console.error("Map initialization failed", e);
            setError("حدث خطأ أثناء تشغيل الخريطة.");
            setIsLoading(false);
        }
    };

    const loadMapScript = () => {
        if (window.google && window.google.maps) {
            initMap();
            return;
        }

        const existingScript = document.getElementById('google-maps-script');
        if (existingScript) {
            existingScript.addEventListener('load', initMap);
            return;
        }

        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,drawing,places`;
        script.async = true;
        script.defer = true;
        script.onload = initMap;
        script.onerror = () => {
            setError("فشل تحميل مكتبة الخرائط. تأكد من اتصال الانترنت.");
            setIsLoading(false);
        };
        document.head.appendChild(script);
    };

    loadMapScript();
  }, [origin, destination]);

  return (
    <div className={cn("relative w-full h-full rounded-[2.5rem] overflow-hidden bg-muted/20 border-4 border-white shadow-inner", className)}>
        {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
                <Bike className="h-14 w-14 text-primary animate-bounce mb-3" />
                <p className="font-black text-sm text-primary animate-pulse">جاري رسم مسار التوصيل...</p>
            </div>
        )}
        {error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center bg-white/90 backdrop-blur-md">
                <AlertTriangle className="h-12 w-12 text-destructive mb-3" />
                <p className="text-destructive font-black text-xs leading-relaxed">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 text-[10px] font-black underline text-primary">تحديث الصفحة</button>
            </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
        
        {/* Floating Legend */}
        {!error && !isLoading && (
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-2xl flex justify-around items-center border border-primary/10">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <span className="text-[10px] font-black">المتجر</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-[10px] font-black">الزبون</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-1 w-8 bg-primary/60 rounded-full" />
                    <span className="text-[10px] font-black">المسار</span>
                </div>
            </div>
        )}
    </div>
  );
}
