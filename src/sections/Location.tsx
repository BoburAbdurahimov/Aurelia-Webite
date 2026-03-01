import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Navigation, Car, Train, ChevronDown } from 'lucide-react';

export default function LocationSection() {
    const { t } = useTranslation();

    return (
        <section id="location" className="py-16 md:py-32 px-4 sm:px-6 max-w-7xl mx-auto border-t border-espresso/10">
            <div className="flex flex-col md:flex-row justify-between items-start gap-10 md:gap-16">

                {/* Info Side */}
                <div className="w-full md:w-5/12">
                    <h2 className="text-4xl md:text-5xl text-espresso font-heading mb-12 tracking-tight">
                        {t('location.title')}
                    </h2>

                    <div className="mb-16">
                        <h3 className="text-sm font-body uppercase tracking-widest text-espresso/50 mb-6">
                            {t('location.nearby')}
                        </h3>
                        <ul className="space-y-4">
                            {[
                                { name: t('location.l1'), time: '5 min walk' },
                                { name: t('location.l2'), time: '8 min walk' },
                                { name: t('location.l3'), time: '12 min walk' },
                                { name: t('location.l4'), time: '15 min drive' },
                            ].map((loc, idx) => (
                                <li key={idx} className="flex justify-between items-center group cursor-default">
                                    <div className="flex items-center gap-3">
                                        <MapPin size={16} className="text-gold" />
                                        <span className="font-heading text-xl text-espresso group-hover:text-gold transition-colors">{loc.name}</span>
                                    </div>
                                    <span className="font-mono text-xs uppercase tracking-widest text-mist mix-blend-difference bg-espresso/5 px-2 py-1 rounded">
                                        {loc.time}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-body uppercase tracking-widest text-espresso/50 mb-6">
                            {t('location.gettingHere')}
                        </h3>
                        <AccordionItem
                            icon={<Car size={18} />}
                            title="From Fiumicino (FCO)"
                            content="Private transfer takes approximately 40 minutes depending on traffic. Flat rate taxi available at the terminal."
                        />
                        <AccordionItem
                            icon={<Train size={18} />}
                            title="From Termini Station"
                            content="A 10-minute taxi ride or 3 stops on the Metro A line to Barberini station."
                        />
                    </div>
                </div>

                {/* Map Panel Side */}
                <div className="w-full md:w-7/12 relative h-[300px] sm:h-[400px] md:h-[700px] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden group shadow-soft border border-espresso/10">
                    <div className="absolute inset-0 bg-espresso/5 z-10 pointer-events-none group-hover:bg-transparent transition-colors duration-700" />
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d11878.711802956247!2d12.47644177699318!3d41.9002874720974!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x132f6053278340d5%3A0xf676f1e1cc02bb34!2sPantheon!5e0!3m2!1sen!2sit!4v1700000000000!5m2!1sen!2sit"
                        width="100%"
                        height="100%"
                        style={{ border: 0, filter: 'grayscale(0.8) sepia(0.2) contrast(1.1) brightness(0.95)' }}
                        allowFullScreen={false}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Map of Rome"
                        className="group-hover:filter-none transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    ></iframe>
                    {/* Decorative Map Pin overlay */}
                    <div className="absolute bottom-8 right-8 bg-travertine/90 backdrop-blur-md px-6 py-4 rounded-2xl z-20 shadow-layered border border-white/20 flex gap-4 items-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 delay-200">
                        <div className="bg-gold p-2 rounded-full text-white">
                            <Navigation size={18} />
                        </div>
                        <div>
                            <p className="font-heading text-lg leading-tight text-espresso">Aurelia Grand</p>
                            <p className="font-mono text-xs uppercase text-espresso/60 tracking-wider mt-0.5">Centro Storico</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function AccordionItem({ icon, title, content }: { icon: React.ReactNode, title: string, content: string }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border-b border-espresso/10 last:border-0 overflow-hidden">
            <button
                className="w-full py-5 flex justify-between items-center text-left"
                onClick={() => setOpen(!open)}
            >
                <span className="flex items-center gap-3 font-heading text-xl text-espresso">
                    {icon} {title}
                </span>
                <ChevronDown size={18} className={`text-espresso/40 transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${open ? 'rotate-180' : ''}`} />
            </button>
            <div
                className={`transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] font-body text-espresso/70 leading-relaxed max-w-sm ${open ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                {content}
            </div>
        </div>
    )
}
