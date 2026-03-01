import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Minus } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function FAQ() {
    const { t } = useTranslation();
    const sectionRef = useRef<HTMLDivElement>(null);
    const [openIdx, setOpenIdx] = useState<number | null>(0);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".faq-item", {
                y: 20,
                opacity: 0,
                duration: 0.6,
                stagger: 0.1,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top 85%",
                },
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    const faqs = [1, 2, 3, 4, 5, 6].map(num => ({
        q: t(`faq.q${num}`),
        a: t(`faq.a${num}`)
    }));

    const toggleOpen = (idx: number) => {
        setOpenIdx(openIdx === idx ? null : idx);
    };

    return (
        <section ref={sectionRef} className="py-24 md:py-32 px-6 max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl text-espresso font-heading mb-16 text-center tracking-tight">
                {t('faq.title')}
            </h2>

            <div className="space-y-4">
                {faqs.map((faq, idx) => (
                    <div
                        key={idx}
                        className="faq-item border-b border-mist hover:border-espresso/30 transition-colors"
                    >
                        <button
                            onClick={() => toggleOpen(idx)}
                            className="w-full py-6 flex justify-between items-center text-left"
                            aria-expanded={openIdx === idx}
                        >
                            <span className={`font-heading text-xl md:text-2xl transition-colors ${openIdx === idx ? 'text-espresso' : 'text-espresso/70'}`}>
                                {faq.q}
                            </span>
                            <span className="text-espresso/40 ml-2 shrink-0">
                                {openIdx === idx ? <Minus size={20} /> : <Plus size={20} />}
                            </span>
                        </button>
                        <div
                            className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${openIdx === idx ? 'max-h-60 opacity-100 pb-8' : 'max-h-0 opacity-0'}`}
                        >
                            <p className="font-body text-espresso/80 leading-relaxed max-w-2xl text-lg pr-8">
                                {faq.a}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
