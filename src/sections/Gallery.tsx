import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { siteConfig } from '../components/ContentModel';

gsap.registerPlugin(ScrollTrigger);

export default function Gallery() {
    const { t } = useTranslation();
    const sectionRef = useRef<HTMLDivElement>(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const images = siteConfig.images.gallery;

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIdx((prev) => (prev + 1) % images.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [images.length]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".gallery-header", {
                y: 40,
                opacity: 0,
                duration: 1.5,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top 80%",
                },
            });
        }, sectionRef);
        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionRef} className="py-16 md:py-32 bg-marble border-t border-espresso/10">
            <div className="px-4 sm:px-6 max-w-7xl mx-auto mb-8 md:mb-12 gallery-header flex justify-between items-end">
                <h2 className="text-3xl md:text-5xl text-espresso font-heading tracking-tight">
                    {t('gallery.title')}
                </h2>
                <div className="hidden md:flex gap-4">
                    {images.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIdx(idx)}
                            className={`h-px transition-all duration-700 ${activeIdx === idx ? 'w-12 bg-espresso' : 'w-6 bg-espresso/20 hover:bg-espresso/50'}`}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            </div>

            <div className="px-4 sm:px-6 max-w-7xl mx-auto">
                <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-[75vh] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden bg-espresso/5 shadow-soft border border-espresso/10">
                    {images.map((url, idx) => (
                        <div
                            key={idx}
                            className={`absolute inset-0 transition-all duration-[1.5s] ease-[cubic-bezier(0.25,1,0.5,1)] ${activeIdx === idx
                                ? 'opacity-100 translate-x-0 scale-100 z-10'
                                : activeIdx > idx
                                    ? 'opacity-0 -translate-x-12 scale-105 z-0'
                                    : 'opacity-0 translate-x-12 scale-105 z-0'
                                }`}
                        >
                            <img
                                src={url}
                                alt={`Gallery image ${idx}`}
                                className="w-full h-full object-cover"
                                onLoad={(e) => e.currentTarget.classList.add('loaded')}
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-espresso/80 via-transparent to-transparent opacity-60" />

                            <div className="absolute bottom-10 left-10 md:bottom-16 md:left-16">
                                <p className="text-marble font-accent italic text-2xl md:text-4xl shadow-sm">
                                    Visual {idx + 1}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Mobile indicators */}
                <div className="flex justify-center gap-3 mt-8 md:hidden">
                    {images.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIdx(idx)}
                            className={`h-1.5 rounded-full transition-all duration-700 ${activeIdx === idx ? 'w-8 bg-espresso' : 'w-2 bg-espresso/20 hover:bg-espresso/50'}`}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
