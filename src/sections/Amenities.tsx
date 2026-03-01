import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Amenities() {
    const { t } = useTranslation();
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".artifact-card", {
                y: 60,
                opacity: 0,
                duration: 1,
                stagger: 0.2,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top 75%",
                },
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionRef} id="amenities" className="py-16 md:py-32 px-4 sm:px-6 max-w-7xl mx-auto border-t border-espresso/10">
            <h2 className="text-3xl md:text-5xl text-espresso font-heading mb-10 md:mb-16 text-center tracking-tight">
                {t('amenities.title')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                <ConciergeTimeline t={t} />
                <SpaMeter t={t} />
                <BreakfastCraft t={t} />
            </div>
        </section>
    );
}

// ARTIFACT 1: Concierge Timeline
function ConciergeTimeline({ t }: { t: any }) {
    const items = [t('amenities.t1'), t('amenities.t2'), t('amenities.t3')];
    const [activeIdx, setActiveIdx] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIdx((prev) => (prev + 1) % items.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [items.length]);

    return (
        <div className="artifact-card bg-travertine/50 rounded-[1.5rem] md:rounded-[2rem] p-7 md:p-10 flex flex-col justify-between shadow-soft border border-mist/20 min-h-[200px] md:aspect-square">
            <div>
                <h3 className="font-heading text-2xl text-espresso mb-8">{t('amenities.concierge')}</h3>
                <div className="relative pl-10 flex flex-col gap-6">
                    {/* Timeline Line */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-espresso/10 z-0"></div>

                    {/* Animated Indicator */}
                    <div
                        className="absolute left-[6px] w-[11px] h-[11px] rounded-full bg-cypress shadow-[0_0_10px_rgba(36,64,54,0.5)] transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] z-20"
                        style={{ top: `${activeIdx * 2.5 + 0.156}rem` }}
                    />

                    {items.map((item, idx) => (
                        <div key={idx} className="relative z-10 flex items-center h-4">
                            {/* Dot mapping background */}
                            <div className={`absolute -left-[32px] w-1.5 h-1.5 rounded-full transition-colors duration-500 z-10 ${activeIdx === idx ? 'bg-transparent' : 'bg-espresso/20'}`}></div>
                            <span className={`font-mono text-sm uppercase tracking-widest transition-colors duration-500 ${activeIdx === idx ? 'text-espresso font-bold' : 'text-espresso/40'}`}>
                                {item}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ARTIFACT 2: Spa Atmosphere Meter
function SpaMeter({ t }: { t: any }) {
    const states = [
        { label: t('amenities.s1'), value: 25 },
        { label: t('amenities.s2'), value: 65 },
        { label: t('amenities.s3'), value: 100 }
    ];
    const [activeIdx, setActiveIdx] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIdx((prev) => (prev + 1) % states.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [states.length]);

    const dashArray = 157; // 2 * pi * 25
    const dashOffset = dashArray - (dashArray * states[activeIdx].value) / 100;

    return (
        <div className="artifact-card bg-travertine/50 rounded-[1.5rem] md:rounded-[2rem] p-7 md:p-10 flex flex-col justify-between items-center text-center shadow-soft border border-mist/20 min-h-[200px] md:aspect-square">
            <h3 className="font-heading text-2xl text-espresso mb-6 self-start">{t('amenities.spa')}</h3>

            <div className="relative w-32 h-32 flex items-center justify-center mt-auto mb-auto">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 60 60">
                    <circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" strokeWidth="2" className="text-espresso/10" />
                    <circle
                        cx="30" cy="30" r="25" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashOffset}
                        className="text-gold transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-accent italic text-xl text-espresso">
                    {states[activeIdx].label}
                </div>
            </div>
        </div>
    );
}

// ARTIFACT 3: Breakfast Craft
function BreakfastCraft({ t }: { t: any }) {
    const phrases = [t('amenities.b1'), t('amenities.b2'), t('amenities.b3')];
    const [text, setText] = useState('');
    const [phraseIdx, setPhraseIdx] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        const currentPhrase = phrases[phraseIdx];

        if (isDeleting) {
            if (text.length > 0) {
                timeout = setTimeout(() => setText(text.slice(0, -1)), 30);
            } else {
                setIsDeleting(false);
                setPhraseIdx((prev) => (prev + 1) % phrases.length);
            }
        } else {
            if (text.length < currentPhrase.length) {
                timeout = setTimeout(() => setText(currentPhrase.slice(0, text.length + 1)), 80);
            } else {
                timeout = setTimeout(() => setIsDeleting(true), 2000);
            }
        }

        return () => clearTimeout(timeout);
    }, [text, isDeleting, phraseIdx, phrases]);

    return (
        <div className="artifact-card bg-espresso text-marble rounded-[1.5rem] md:rounded-[2rem] p-7 md:p-10 flex flex-col justify-between shadow-soft border border-black/10 min-h-[200px] md:aspect-square">
            <h3 className="font-heading text-2xl text-mist mb-8 tracking-wide">{t('amenities.breakfast')}</h3>

            <div className="mt-auto h-32 flex items-center">
                <p className="font-mono text-lg md:text-xl text-marble break-words leading-relaxed h-full flex items-center">
                    <span className="text-gold">&gt; </span>
                    {text}
                    <span className="w-2 h-5 bg-gold inline-block ml-1 animate-pulse align-middle"></span>
                </p>
            </div>
        </div>
    );
}
