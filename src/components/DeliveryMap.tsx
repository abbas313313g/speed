
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Bike, Map as MapIcon } from 'lucide-react';
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
    
    if (!apiKey || apiKey === "" || apiKey.includes("YOUR_")) {
        setError("نظام التتبع المباشر يتطلب مفتاح Google Maps API. يرجى ضبطه في Vercel.");
        setIsLoading(false);
        return;
    }

    const initMap = () => {
        if (!mapRef.current) return;

        try {
            // منع التحميل المتكرر للمكتبة
            if (!(window as any).google) return;

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

            // أيقونة الدراجة (نقطة الانطلاق - المتجر)
            new google.maps.Marker({
                position: origin,
                map: map,
                icon: {
                    path: 'M15.5 19C15.5 20.1 14.6 21 13.5 21C12.4 21 11.5 20.1 11.5 19C11.5 17.9 12.4 17 13.5 17C14.6 17 15.5 17.9 15.5 19M7.5 17C6.4 17 5.5 17.9 5.5 19C5.5 20.1 6.4 21 7.5 21C8.6 21 9.5 20.1 9.5 19C9.5 17.9 8.6 17 7.5 17M15.1 15H19V17H17.4C16.8 15.8 15.5 15 14 15H13V13H15.3C16 13 16.6 12.6 16.9 12L18.4 9H20V7H17.4L16 11.5L14.4 7H11V9H13L14 11.5L12 15H7.5C5.8 15 4.5 16.3 4.5 18V21H2V23H22V21H20.5V18.1L19.4 15.4L18.1 12.8L15.1 15Z',
                    fillColor: '#00B358',
                    fillOpacity: 1,
                    strokeWeight: 0,
                    scale: 1.5,
                    anchor: new google.maps.Point(12, 12)
                },
                title: "موقع المتجر"
            });

            // أيقونة الزبون (نقطة الوصول)
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
                title: "موقع الزبون"
            });
        } catch (e) {
            setError("تعذر تشغيل الخريطة حالياً.");
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
                setError("يرجى التحقق من اتصال الانترنت وصحة مفتاح API.");
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
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                <p className="font-black text-xs text-primary animate-pulse italic">جاري رسم مسار التوصيل...</p>
            </div>
        )}
        {error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center bg-white/80 backdrop-blur-md">
                <div className="p-5 bg-primary/5 rounded-full mb-4">
                    <MapIcon className="h-12 w-12 text-primary/40" />
                </div>
                <p className="text-foreground font-black text-sm leading-relaxed">{error}</p>
                <p className="text-[10px] text-muted-foreground mt-2 font-bold">يمكن للمندوب استخدام زر "الموقع" لفتح خرائط جوجل الخارجية.</p>
            </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
