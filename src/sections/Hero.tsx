import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Calendar, Users, Percent, Search } from 'lucide-react';
import { siteConfig } from '../components/ContentModel';
import { Button } from '../components/Button';

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
    const { t } = useTranslation();
    const heroRef = useRef<HTMLDivElement>(null);
    const bgRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);

    const [checkIn, setCheckIn] = useState('2026-10-14');
    const [checkOut, setCheckOut] = useState('2026-10-18');
    const [guests, setGuests] = useState('2');
    const [promo, setPromo] = useState('AURELIA');

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Background Parallax
            gsap.to(bgRef.current, {
                yPercent: 30,
                ease: "none",
                scrollTrigger: {
                    trigger: heroRef.current,
                    start: "top top",
                    end: "bottom top",
                    scrub: true,
                },
            });

            // Staggered reveal
            gsap.from(".hero-reveal", {
                y: 60,
                opacity: 0,
                duration: 1.2,
                stagger: 0.15,
                ease: "power3.out",
                delay: 0.2, // after initial load
            });
        }, heroRef);

        return () => ctx.revert();
    }, []);

    return (
        <section id="hotel" ref={heroRef} className="relative w-full h-[100dvh] overflow-hidden flex items-end">
            {/* Background Layer */}
            <div
                ref={bgRef}
                className="absolute -inset-y-[15%] inset-x-0 w-full h-[130%] bg-cover bg-center"
                style={{ backgroundImage: `url(${siteConfig.images.hero[0]})` }}
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-hero-gradient z-0" />
            {/* Subtle Noise handled globally, but can overlay here if needed */}
            <div className="absolute inset-0 bg-black/10 z-0 mix-blend-overlay" />

            {/* Content */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pb-10 md:pb-24 grid md:grid-cols-12 gap-8 md:gap-10 items-end">

                {/* Copy */}
                <div ref={textRef} className="md:col-span-7 lg:col-span-6 flex flex-col gap-4 md:gap-6">
                    <h1 className="hero-reveal text-marble text-4xl sm:text-5xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight text-balance">
                        {t('hero.title')}
                    </h1>
                    <p className="hero-reveal text-travertine/90 text-base md:text-xl font-body max-w-lg font-light">
                        {t('hero.subtitle')}
                    </p>
                    <div className="hero-reveal flex flex-wrap gap-3 mt-1 md:mt-2">
                        <Button variant="primary" onClick={() => document.getElementById('suites')?.scrollIntoView({ behavior: 'smooth' })}>
                            {t('hero.checkAvailability')}
                        </Button>
                        <Button variant="outline" className="border-mist text-marble hover:bg-mist hover:text-espresso" onClick={() => document.getElementById('suites')?.scrollIntoView({ behavior: 'smooth' })}>
                            {t('hero.exploreSuites')}
                        </Button>
                    </div>
                </div>

                {/* Booking Instrument */}
                <div className="hero-reveal md:col-span-5 lg:col-span-5 lg:col-start-8">
                    <div className="bg-travertine/95 backdrop-blur-2xl rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-layered">
                        <div className="grid grid-cols-2 gap-4">
                            <label className="col-span-1 border border-espresso/10 p-3 rounded-xl bg-white/50 flex flex-col hover:bg-white transition-colors cursor-pointer group">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-espresso/60 mb-1">{t('hero.checkIn')}</span>
                                <div className="flex items-center gap-2 text-sm font-mono text-espresso">
                                    <Calendar size={16} className="text-espresso/50 group-hover:text-gold transition-colors" />
                                    <input
                                        type="date"
                                        value={checkIn}
                                        onChange={(e) => setCheckIn(e.target.value)}
                                        className="bg-transparent border-none p-0 focus:ring-0 outline-none w-full text-espresso"
                                    />
                                </div>
                            </label>
                            <label className="col-span-1 border border-espresso/10 p-3 rounded-xl bg-white/50 flex flex-col hover:bg-white transition-colors cursor-pointer group">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-espresso/60 mb-1">{t('hero.checkOut')}</span>
                                <div className="flex items-center gap-2 text-sm font-mono text-espresso">
                                    <Calendar size={16} className="text-espresso/50 group-hover:text-gold transition-colors" />
                                    <input
                                        type="date"
                                        value={checkOut}
                                        onChange={(e) => setCheckOut(e.target.value)}
                                        min={checkIn}
                                        className="bg-transparent border-none p-0 focus:ring-0 outline-none w-full text-espresso"
                                    />
                                </div>
                            </label>

                            <label className="col-span-1 border border-espresso/10 p-3 rounded-xl bg-white/50 flex flex-col hover:bg-white transition-colors cursor-pointer group">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-espresso/60 mb-1">{t('hero.guests')}</span>
                                <div className="flex items-center gap-2 text-sm font-mono text-espresso">
                                    <Users size={16} className="text-espresso/50 group-hover:text-gold transition-colors" />
                                    <select
                                        value={guests}
                                        onChange={(e) => setGuests(e.target.value)}
                                        className="bg-transparent border-none p-0 focus:ring-0 outline-none w-full text-espresso appearance-none"
                                    >
                                        <option value="1">1 Guest</option>
                                        <option value="2">2 Guests</option>
                                        <option value="3">3 Guests</option>
                                        <option value="4">4 Guests</option>
                                        <option value="5">5+ Guests</option>
                                    </select>
                                </div>
                            </label>

                            <label className="col-span-1 border-b border-dashed border-espresso/20 p-3 flex flex-col justify-end pb-2 cursor-text hover:border-espresso/50 transition-colors group">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-espresso/60 mb-0.5">{t('hero.promo')}</span>
                                <div className="flex items-center gap-2 text-xs font-mono text-espresso/50">
                                    <Percent size={14} className="group-hover:text-gold transition-colors" />
                                    <input
                                        type="text"
                                        value={promo}
                                        onChange={(e) => setPromo(e.target.value)}
                                        placeholder="Optional"
                                        className="bg-transparent border-none p-0 focus:ring-0 outline-none w-full text-espresso uppercase"
                                    />
                                </div>
                            </label>

                            <div className="col-span-2 mt-2">
                                <button onClick={() => document.getElementById('suites')?.scrollIntoView({ behavior: 'smooth' })} className="w-full bg-cypress hover:bg-[#1a2f27] text-marble py-4 rounded-xl font-body uppercase text-sm font-medium tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95 duration-200">
                                    <Search size={16} />
                                    {t('hero.search')}
                                </button>
                                <p className="text-center text-[10px] font-medium text-espresso/50 mt-3 pt-1 uppercase tracking-widest">
                                    {t('hero.guarantee')}
                                </p>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}
