import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, MapPin, ConciergeBell, Plane } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function TrustStrip() {
    const { t } = useTranslation();
    const stripRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".trust-item", {
                y: 20,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: stripRef.current,
                    start: "top 95%",
                },
            });
        }, stripRef);
        return () => ctx.revert();
    }, []);

    const items = [
        { icon: <Star size={20} strokeWidth={1.5} />, text: t('trust.rating') },
        { icon: <MapPin size={20} strokeWidth={1.5} />, text: t('trust.location') },
        { icon: <ConciergeBell size={20} strokeWidth={1.5} />, text: t('trust.concierge') },
        { icon: <Plane size={20} strokeWidth={1.5} />, text: t('trust.transfer') },
    ];

    return (
        <section ref={stripRef} className="w-full bg-marble py-10 md:py-16 border-b border-espresso/5">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                {items.map((item, index) => (
                    <div key={index} className="trust-item flex flex-col items-center justify-center text-center gap-3 group">
                        <div className="w-12 h-12 rounded-full border border-espresso/10 bg-travertine flex items-center justify-center text-espresso group-hover:bg-cypress group-hover:text-marble group-hover:border-cypress transition-colors duration-500">
                            {item.icon}
                        </div>
                        <span className="font-heading text-espresso/80 text-sm tracking-wider uppercase font-medium">
                            {item.text}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}
