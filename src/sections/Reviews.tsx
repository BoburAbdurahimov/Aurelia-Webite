import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Quote, Star } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { siteConfig } from '../components/ContentModel';

gsap.registerPlugin(ScrollTrigger);

export default function Reviews() {
    const { t } = useTranslation();
    const sectionRef = useRef<HTMLDivElement>(null);
    const carouselRef = useRef<HTMLDivElement>(null);

    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".review-card", {
                y: 40,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top 80%",
                },
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    // Simple auto-advance — 1 card per step
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % siteConfig.reviews.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section ref={sectionRef} className="py-24 md:py-32 px-6 bg-cypress text-marble border-t border-mist/5 relative overflow-hidden">
            {/* Decorative large quote */}
            <Quote size={400} className="absolute -top-20 -left-20 text-marble/5 rotate-180 pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <h2 className="text-4xl md:text-5xl font-heading mb-16 text-center tracking-tight text-marble">
                    {t('reviews.title')}
                </h2>

                <div className="overflow-hidden no-scrollbar" ref={carouselRef}>
                    <div
                        className="flex transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]"
                        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                    >
                        {siteConfig.reviews.map((review, idx) => (
                            <div key={idx} className="w-full shrink-0 px-2 sm:px-4 md:px-8 mb-8 review-card">
                                <div className="bg-marble/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-10 h-full flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-1 mb-6 text-gold">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Star key={star} size={16} fill="currentColor" className={star > Math.floor(review.rating) ? 'opacity-30' : ''} />
                                            ))}
                                        </div>
                                        <p className="font-accent text-2xl md:text-3xl italic leading-relaxed text-marble/90 mb-8">
                                            "{review.quote}"
                                        </p>
                                    </div>

                                    <div className="flex justify-between items-end border-t border-white/10 pt-6">
                                        <div>
                                            <h4 className="font-heading text-lg text-marble leading-none mb-1">{review.name}</h4>
                                            <p className="font-mono text-xs uppercase tracking-widest text-mist">{review.country}</p>
                                        </div>
                                        <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-marble/70">
                                            {review.type}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dots */}
                <div className="flex justify-center gap-3 mt-8">
                    {siteConfig.reviews.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveIndex(i)}
                            className={`w-2 h-2 rounded-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${i === activeIndex ? 'w-8 bg-gold' : 'bg-white/20 hover:bg-white/50'}`}
                            aria-label={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
