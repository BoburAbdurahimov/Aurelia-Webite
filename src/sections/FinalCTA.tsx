import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Mail, Phone, ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { siteConfig } from '../components/ContentModel';
import { Button } from '../components/Button';

gsap.registerPlugin(ScrollTrigger);

export default function FinalCTA() {
    const { t } = useTranslation();
    const ctaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".cta-content", {
                y: 60,
                opacity: 0,
                duration: 1.2,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: ctaRef.current,
                    start: "top 75%",
                },
            });
        }, ctaRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={ctaRef} className="py-20 md:py-48 px-4 sm:px-6 bg-espresso text-marble relative overflow-hidden flex flex-col items-center justify-center min-h-[70vh] md:min-h-[80vh]">
            {/* Background accents */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-gold/10 blur-[120px] rounded-full pointer-events-none" />
            <div
                className="absolute inset-0 bg-mist/5 pointer-events-none opacity-[0.03] mix-blend-overlay"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />

            <div className="cta-content relative z-10 w-full max-w-4xl mx-auto text-center flex flex-col items-center">
                <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-heading mb-8 md:mb-10 leading-[1.1] text-balance">
                    {t('cta.title')}
                </h2>

                <div className="relative group overflow-hidden rounded-full mb-20">
                    <Button variant="secondary" onClick={() => document.getElementById('suites')?.scrollIntoView({ behavior: 'smooth' })} className="px-12 py-5 text-sm md:text-base gap-3">
                        {t('cta.btn')} <ArrowRight size={18} className="group-hover:translate-x-1 outline-none transition-transform" />
                    </Button>
                    <div className="absolute inset-0 bg-white translate-y-full mix-blend-difference opacity-0 group-hover:translate-y-0 group-hover:opacity-10 transition-all duration-700 pointer-events-none" />
                </div>

                {/* Contact Chips */}
                <div className="flex flex-wrap justify-center gap-4 text-xs font-mono uppercase tracking-widest">
                    <a href={`tel:${siteConfig.contact.whatsapp}`} className="flex items-center gap-2 px-6 py-3 rounded-full border border-marble/20 hover:border-gold hover:text-gold transition-colors backdrop-blur-md bg-white/5">
                        <MessageCircle size={14} /> WhatsApp
                    </a>
                    <a href={`mailto:${siteConfig.contact.email}`} className="flex items-center gap-2 px-6 py-3 rounded-full border border-marble/20 hover:border-gold hover:text-gold transition-colors backdrop-blur-md bg-white/5">
                        <Mail size={14} /> Email
                    </a>
                    <a href={`tel:${siteConfig.contact.phone}`} className="flex items-center gap-2 px-6 py-3 rounded-full border border-marble/20 hover:border-gold hover:text-gold transition-colors backdrop-blur-md bg-white/5">
                        <Phone size={14} /> Call
                    </a>
                </div>
            </div>
        </section>
    );
}
