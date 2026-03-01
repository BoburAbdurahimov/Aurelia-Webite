import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { siteConfig } from './ContentModel';
import { Button } from './Button';
import { cn } from './Button';

// ✏️ CRM deployed URL — update only if the Vercel alias changes
const CRM_URL = 'https://aurelia-crm-tau.vercel.app/login';

export default function Navbar() {
    const { t } = useTranslation();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { key: 'hotel', label: t('nav.hotel') },
        { key: 'suites', label: t('nav.suites') },
        { key: 'amenities', label: t('nav.amenities') },
        { key: 'location', label: t('nav.location') },
    ];

    return (
        <>
            <nav
                className={cn(
                    "fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl transition-all duration-700 ease-in-out rounded-full flex items-center justify-between px-6 py-4",
                    scrolled
                        ? "bg-mist/80 backdrop-blur-xl border border-white/20 shadow-layered text-espresso"
                        : "bg-transparent text-marble"
                )}
            >
                <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold tracking-wide text-xl uppercase">
                        {siteConfig.hotelName}
                    </span>
                </div>

                <div className="hidden md:flex items-center gap-8 text-sm font-medium tracking-widest uppercase">
                    {navLinks.map((link) => (
                        <a key={link.key} href={`#${link.key}`} className="relative group overflow-hidden">
                            <span className="block transition-transform duration-300 group-hover:-translate-y-full">{link.label}</span>
                            <span className="absolute inset-0 block translate-y-full transition-transform duration-300 group-hover:translate-y-0 text-gold">{link.label}</span>
                        </a>
                    ))}
                </div>

                <div className="hidden md:flex items-center gap-4">
                    <LanguageSwitcher />
                    <a
                        href={CRM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            "px-4 py-2 text-xs font-medium tracking-widest uppercase border rounded-full transition-colors",
                            scrolled ? "border-espresso/30 text-espresso hover:bg-espresso hover:text-marble" : "border-marble/40 text-marble hover:bg-white/10"
                        )}
                    >
                        Staff Portal
                    </a>
                    <Button
                        onClick={() => document.getElementById('suites')?.scrollIntoView({ behavior: 'smooth' })}
                        className={cn("px-6 py-2.5 text-xs", scrolled ? "" : "bg-marble text-espresso hover:bg-white")}
                    >
                        {t('nav.book')}
                    </Button>
                </div>

                <button
                    className="md:hidden p-2 rounded-full"
                    onClick={() => setMobileOpen(true)}
                >
                    <Menu size={24} />
                </button>
            </nav>

            {/* Mobile Menu Slide-down Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-[60] bg-travertine/95 backdrop-blur-2xl transition-transform duration-700 ease-in-out flex flex-col",
                    mobileOpen ? "translate-y-0" : "-translate-y-full"
                )}
            >
                <div className="flex items-center justify-between p-6 mt-4">
                    <span className="font-heading font-semibold tracking-wide text-xl uppercase text-espresso">
                        {siteConfig.hotelName}
                    </span>
                    <button onClick={() => setMobileOpen(false)} className="p-2 text-espresso">
                        <X size={28} />
                    </button>
                </div>
                <div className="flex flex-col items-center justify-center flex-1 gap-8 text-2xl font-heading text-espresso">
                    {navLinks.map((link) => (
                        <a
                            key={link.key}
                            href={`#${link.key}`}
                            onClick={() => setMobileOpen(false)}
                            className="hover:text-gold transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}
                    <div className="mt-8 flex flex-col items-center gap-6">
                        <LanguageSwitcher />
                        <a
                            href={CRM_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setMobileOpen(false)}
                            className="text-sm tracking-widest uppercase border border-espresso/30 text-espresso px-6 py-2.5 rounded-full hover:bg-espresso hover:text-marble transition-colors"
                        >
                            Staff Portal
                        </a>
                        <Button onClick={() => { setMobileOpen(false); document.getElementById('suites')?.scrollIntoView({ behavior: 'smooth' }) }} className="px-8 py-4">
                            {t('nav.book')}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
