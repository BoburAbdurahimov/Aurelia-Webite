import React from 'react';
import { useTranslation } from 'react-i18next';
import { siteConfig } from './ContentModel';

export default function Footer() {
    const { t } = useTranslation();

    return (
        <footer className="pt-16 md:pt-24 pb-8 px-4 sm:px-6 bg-marble border-t border-mist rounded-t-[2rem] md:rounded-t-[3rem] -mt-12 relative z-20">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12 md:mb-20">
                    {/* Hotel Column */}
                    <div className="col-span-2 md:col-span-1 flex flex-col gap-6">
                        <span className="font-heading font-semibold tracking-wide text-2xl uppercase text-espresso">
                            {siteConfig.hotelName}
                        </span>
                        <p className="font-body text-sm text-espresso/60 leading-relaxed max-w-xs">
                            A bespoke boutique experience offering quiet opulence in the eternal city.
                        </p>
                    </div>

                    {/* Explore */}
                    <div className="flex flex-col gap-4">
                        <h4 className="font-mono text-xs uppercase tracking-widest text-espresso/40 mb-2">{t('footer.explore')}</h4>
                        <a href="#hotel" className="font-body text-sm font-medium hover:text-gold transition-colors w-max">Hotel</a>
                        <a href="#suites" className="font-body text-sm font-medium hover:text-gold transition-colors w-max">Suites</a>
                        <a href="#amenities" className="font-body text-sm font-medium hover:text-gold transition-colors w-max">Amenities</a>
                        <a href="#location" className="font-body text-sm font-medium hover:text-gold transition-colors w-max">Location</a>
                    </div>

                    {/* Policies */}
                    <div className="flex flex-col gap-4 text-sm font-medium text-espresso/80">
                        <h4 className="font-mono text-xs uppercase tracking-widest text-espresso/40 mb-2">{t('footer.policies')}</h4>
                        {siteConfig.policies.map((p, i) => (
                            <span key={i} className="text-espresso/70">{p}</span>
                        ))}
                    </div>

                    {/* Social */}
                    <div className="flex flex-col gap-4">
                        <h4 className="font-mono text-xs uppercase tracking-widest text-espresso/40 mb-2">{t('footer.social')}</h4>
                        <a href="#" className="font-body text-sm font-medium hover:text-gold transition-colors w-max">Instagram</a>
                        <a href="#" className="font-body text-sm font-medium hover:text-gold transition-colors w-max">Pinterest</a>
                        <a href="#" className="font-body text-sm font-medium hover:text-gold transition-colors w-max">LinkedIn</a>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-espresso/10">
                    <p className="text-xs font-mono uppercase tracking-widest text-espresso/40">
                        &copy; {new Date().getFullYear()} {siteConfig.hotelName}. All rights reserved.
                    </p>

                    <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md px-4 py-2 border border-espresso/5 rounded-full">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cypress opacity-40"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cypress"></span>
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-espresso/60 font-medium">
                            {t('footer.status') || 'Booking engine: Operational'}
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
