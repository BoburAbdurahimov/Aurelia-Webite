import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize2, Users, X, ArrowRight, Calendar, Info, Check } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '../components/Button';
import { addLandingBooking, saveSocialProfile } from '../guestStore';
import SocialAuthButtons from '../components/SocialAuthButtons';
import type { SocialUser } from '../lib/socialAuth';


gsap.registerPlugin(ScrollTrigger);

// ── 4 Room Types (not individual rooms)
const FALLBACK_IMG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMmMzZTUwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJHZW9yZ2lhIiBmb250LXNpemU9IjI0IiBmaWxsPSIjYjc3ZjNkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj5BdXJlbGlhIEdyYW5kIEhvdGVsPC90ZXh0Pjwvc3ZnPg==';

// Note: using picsum.photos which is a public, hotlink-friendly CDN — no referrer restrictions.
// Seeds are chosen for their luxury/interior aesthetic.
const ROOM_TYPES = [
    {
        id: 'standard',
        name: 'Standard Room',
        type: 'Standard',
        size: '28 m²',
        guests: 2,
        price: 120,
        description: 'Elegantly appointed with Florentine-inspired decor, featuring premium bedding, en-suite marble bathroom, and city views.',
        amenities: ['Free Wi-Fi', 'Flat-screen TV', 'Air conditioning', 'Private bathroom', 'Daily housekeeping', 'In-room safe'],
        image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=800&auto=format&fit=crop',
        available: 18,
        color: 'from-slate-900',
    },
    {
        id: 'deluxe',
        name: 'Deluxe Room',
        type: 'Deluxe',
        size: '38 m²',
        guests: 3,
        price: 200,
        description: 'Spacious rooms offering panoramic city or garden views, featuring a refined Italian aesthetic with premium amenities and minibar.',
        amenities: ['Free Wi-Fi', 'Minibar', 'City/Garden View', 'King bed', 'Room service', 'Coffee machine', 'Bathrobe & slippers'],
        image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=800&auto=format&fit=crop',
        available: 20,
        color: 'from-amber-950',
    },
    {
        id: 'suite',
        name: 'Suite',
        type: 'Suite',
        size: '65 m²',
        guests: 4,
        price: 350,
        description: 'Indulge in a separate living room, Jacuzzi, and curated art — the quintessential Florentine luxury experience.',
        amenities: ['Separate living room', 'Jacuzzi', 'Panoramic view', 'Butler service', 'Minibar', 'Smart TV 65"', 'Complimentary breakfast'],
        image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=800&auto=format&fit=crop',
        available: 7,
        color: 'from-neutral-900',
    },
    {
        id: 'executive',
        name: 'Executive Suite',
        type: 'Executive',
        size: '120 m²',
        guests: 4,
        price: 480,
        description: 'The pinnacle of luxury — a private terrace, personal plunge pool, concierge, and bespoke butler service exclusively for you.',
        amenities: ['Private terrace', 'Plunge pool', 'Personal concierge', 'Airport transfer', 'Home theatre', 'Turndown service', 'Chef on request'],
        image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=800&auto=format&fit=crop',
        available: 5,
        color: 'from-stone-900',
    },
];

const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = FALLBACK_IMG;
};



const formatPrice = (p: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(p);

interface BookingStep { step: 1 | 2 | 3 }

export default function Suites() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [nights, setNights] = useState(1);
    const [pax, setPax] = useState(1);
    const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
    const [checkIn, setCheckIn] = useState('');
    const [confirmCode, setConfirmCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reservationId, setReservationId] = useState('');
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', specials: '' });

    // Social auth for booking quick-fill
    const [socialUser, setSocialUser] = useState<SocialUser | null>(null);
    const [socialError, setSocialError] = useState('');

    const handleSocialFill = useCallback((user: SocialUser) => {
        setSocialUser(user);
        setSocialError('');
        saveSocialProfile({
            provider: user.provider,
            providerId: user.providerId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
        });
        setFormData(f => ({
            ...f,
            firstName: user.firstName || f.firstName,
            lastName: user.lastName || f.lastName,
            email: user.email || f.email,
        }));
    }, []);

    const handleSocialError = useCallback((msg: string) => {
        setSocialError(msg);
        setTimeout(() => setSocialError(''), 4000);
    }, []);

    const activeRoom = ROOM_TYPES.find(r => r.id === activeId);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.suite-card', {
                y: 80, opacity: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out',
                scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
            });
        }, sectionRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        if (activeId) {
            document.body.style.overflow = 'hidden';
            setNights(1); setPax(1); setBookingStep(1);
            setFormData({ firstName: '', lastName: '', email: '', phone: '', specials: '' });
            setCheckIn('');
            setSocialUser(null); setSocialError('');
            gsap.fromTo('.modal-content', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' });
        } else {
            document.body.style.overflow = '';
        }
    }, [activeId]);

    const basePrice = (activeRoom?.price || 0) * nights;
    const taxAmount = basePrice * 0.15;
    const discount = nights > 3 ? basePrice * 0.1 : 0;
    const totalPrice = basePrice + taxAmount - discount;

    const handleConfirm = async () => {
        if (!formData.firstName || !formData.email || !checkIn || !activeRoom) return;
        setIsSubmitting(true);
        try {
            const checkInDate = new Date(checkIn);
            const checkOutDate = new Date(checkInDate);
            checkOutDate.setDate(checkOutDate.getDate() + nights);
            const resId = await addLandingBooking({
                guest: `${formData.firstName} ${formData.lastName}`.trim(),
                email: formData.email,
                phone: formData.phone,
                checkIn: checkIn,
                checkOut: checkOutDate.toISOString().slice(0, 10),
                roomType: activeRoom.type,
                pax,
                totalAmount: Math.round(totalPrice),
                nights,
                channel: 'Website',
                status: 'Pending',
            });
            setReservationId(resId);
            setConfirmCode(`AGH-${String(Date.now()).slice(-4)}`);
            setBookingStep(3);
        } finally {
            setIsSubmitting(false);
        }
    };

    const today = new Date().toISOString().slice(0, 10);

    return (
        <section id="suites" ref={sectionRef} className="py-16 md:py-32 px-4 sm:px-6 max-w-7xl mx-auto border-t border-espresso/10">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                <div>
                    <h2 className="text-4xl md:text-6xl text-espresso font-heading leading-tight mb-4">Room Collection</h2>
                    <p className="text-espresso/60 font-body max-w-lg">
                        Four categories of distinction — from classic elegance to unparalleled luxury. Each room bookable directly from this page.
                    </p>
                </div>
                <a href="/guest-portal" className="group flex items-center gap-2 text-sm font-semibold text-espresso/60 hover:text-espresso transition-colors shrink-0 border border-espresso/20 px-4 py-2 rounded-full">
                    Already booked? <span className="text-gold">Guest Portal →</span>
                </a>
            </div>

            {/* 4 Room Type Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {ROOM_TYPES.map(room => (
                    <div key={room.id} onClick={() => setActiveId(room.id)}
                        className="suite-card group relative h-[480px] rounded-2xl overflow-hidden cursor-pointer shadow-md border border-espresso/5 bg-marble">
                        <div className="absolute inset-0 transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105">
                            <img src={room.image} alt={room.name} className="w-full h-full object-cover" onError={handleImgError} loading="lazy" />
                        </div>
                        {/* Availability badge */}
                        <div className="absolute top-5 right-5 z-20">
                            {room.available === 0 ? (
                                <span className="bg-red-500/90 text-white backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">Sold Out</span>
                            ) : room.available <= 3 ? (
                                <span className="bg-gold/90 text-espresso backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">Only {room.available} Left</span>
                            ) : (
                                <span className="bg-cypress/90 text-marble backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">Available</span>
                            )}
                        </div>
                        <div className={`absolute inset-0 bg-gradient-to-t ${room.color}/90 via-black/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-700`} />
                        <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end translate-y-6 group-hover:translate-y-0 transition-transform duration-700">
                            <h3 className="text-marble text-xl font-heading mb-2">{room.name}</h3>
                            <div className="flex gap-3 text-marble/70 text-xs uppercase tracking-widest mb-4">
                                <span className="flex items-center gap-1"><Maximize2 size={11} /> {room.size}</span>
                                <span className="flex items-center gap-1"><Users size={11} /> Up to {room.guests}</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-marble/20 pt-3 mb-3">
                                <span className="text-marble/60 text-[10px] uppercase tracking-widest">Per night from</span>
                                <span className="text-gold font-mono text-lg">{formatPrice(room.price)}</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex justify-between items-center text-marble/80 font-accent italic text-sm">
                                <span>View & book this room</span>
                                <ArrowRight size={16} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Booking Modal */}
            {activeRoom && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 py-8 md:p-10">
                    <div className="absolute inset-0 bg-espresso/90 backdrop-blur-2xl" onClick={() => setActiveId(null)} />
                    <div className="modal-content relative w-full max-w-5xl max-h-[92vh] bg-marble rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row z-10">

                        {/* Left: Image + info */}
                        <div className="w-full lg:w-[42%] relative flex-shrink-0">
                            <img src={activeRoom.image} alt={activeRoom.name} className="w-full h-48 sm:h-64 lg:h-full object-cover" onError={handleImgError} />
                            <button onClick={() => setActiveId(null)} className="absolute top-4 left-4 p-2 rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50 transition-colors lg:hidden">
                                <X size={18} />
                            </button>
                            <div className="absolute inset-0 bg-gradient-to-t from-espresso/80 via-transparent to-transparent hidden lg:block" />
                            <div className="absolute bottom-6 left-6 right-6 hidden lg:block">
                                <h3 className="text-marble text-3xl font-heading mb-3">{activeRoom.name}</h3>
                                <p className="text-marble/70 text-xs leading-relaxed mb-4">{activeRoom.description}</p>
                                <div className="space-y-1.5">
                                    {activeRoom.amenities.slice(0, 5).map(a => (
                                        <div key={a} className="flex items-center gap-2 text-marble/80 text-xs">
                                            <Check size={12} className="text-gold shrink-0" /> {a}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right: Booking engine */}
                        <div className="w-full lg:w-[58%] p-6 md:p-10 overflow-y-auto flex flex-col">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-heading text-espresso">{activeRoom.name}</h3>
                                    <div className="flex gap-4 text-xs text-espresso/50 uppercase tracking-widest mt-1">
                                        <span className="flex items-center gap-1"><Maximize2 size={12} /> {activeRoom.size}</span>
                                        <span className="flex items-center gap-1"><Users size={12} /> Max {activeRoom.guests} guests</span>
                                    </div>
                                </div>
                                <button onClick={() => setActiveId(null)} className="hidden lg:flex p-2 rounded-full bg-mist/50 hover:bg-black/5 transition-colors">
                                    <X size={22} className="text-espresso" />
                                </button>
                            </div>

                            {/* Step 1: Configure */}
                            {bookingStep === 1 && (
                                <div className="flex-1 flex flex-col">
                                    <div className="bg-travertine/40 border border-espresso/10 rounded-2xl p-5 mb-6 space-y-4">
                                        <h4 className="font-heading text-lg text-espresso">Configure Your Stay</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-espresso/50 mb-1.5 flex items-center gap-1.5"><Calendar size={12} /> Check-in Date</label>
                                                <input type="date" min={today} value={checkIn}
                                                    onChange={e => setCheckIn(e.target.value)}
                                                    className="w-full bg-white/70 border border-espresso/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-espresso/30 transition-colors" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-espresso/50 mb-1.5">Nights</label>
                                                <div className="flex items-center gap-2 border border-espresso/20 rounded-xl px-3 py-2 bg-white/70">
                                                    <button onClick={() => setNights(Math.max(1, nights - 1))} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-mist transition font-bold">−</button>
                                                    <span className="flex-1 text-center font-bold text-espresso text-sm">{nights}</span>
                                                    <button onClick={() => setNights(nights + 1)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-mist transition font-bold">+</button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-espresso/50 mb-1.5">Guests</label>
                                                <div className="flex items-center gap-2 border border-espresso/20 rounded-xl px-3 py-2 bg-white/70">
                                                    <button onClick={() => setPax(Math.max(1, pax - 1))} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-mist transition font-bold">−</button>
                                                    <span className="flex-1 text-center font-bold text-espresso text-sm">{pax}</span>
                                                    <button onClick={() => setPax(Math.min(activeRoom.guests, pax + 1))} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-mist transition font-bold">+</button>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Price breakdown */}
                                        <div className="space-y-2 font-mono text-sm text-espresso/70 border-t border-espresso/10 pt-4">
                                            <div className="flex justify-between"><span>Base Rate ({nights} {nights === 1 ? 'night' : 'nights'})</span><span>{formatPrice(basePrice)}</span></div>
                                            <div className="flex justify-between"><span>Taxes & City Fees (15%)</span><span>{formatPrice(taxAmount)}</span></div>
                                            {discount > 0 && <div className="flex justify-between text-cypress font-bold"><span>Extended Stay Discount (10%)</span><span>−{formatPrice(discount)}</span></div>}
                                            <div className="flex justify-between border-t border-espresso/10 pt-2 font-bold text-espresso text-base">
                                                <span>Total</span><span className="text-gold">{formatPrice(totalPrice)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant={activeRoom.available === 0 ? 'outline' : 'primary'}
                                        disabled={activeRoom.available === 0 || !checkIn}
                                        onClick={() => setBookingStep(2)} className="w-full">
                                        {activeRoom.available === 0 ? 'Sold Out' : !checkIn ? 'Select a check-in date' : 'Continue to Guest Details →'}
                                    </Button>
                                </div>
                            )}

                            {/* Step 2: Guest Details */}
                            {bookingStep === 2 && (
                                <div className="flex-1 flex flex-col space-y-4">
                                    <h4 className="font-heading text-lg text-espresso">Guest Details <span className="text-xs font-sans text-espresso/40 ml-2">Step 2 of 3</span></h4>

                                    {/* Social quick-fill bar */}
                                    <div className="bg-travertine/40 border border-espresso/10 rounded-xl p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-espresso/50 mb-2">
                                            {socialUser ? '✓ Details filled from your account' : 'Quick-fill from social account'}
                                        </p>
                                        {socialUser ? (
                                            <div className="flex items-center gap-2">
                                                {socialUser.avatar
                                                    ? <img src={socialUser.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-espresso/10" />
                                                    : <div className="w-8 h-8 rounded-full bg-espresso/20 flex items-center justify-center text-espresso font-bold text-xs">{socialUser.firstName[0]}</div>
                                                }
                                                <div>
                                                    <p className="text-xs font-semibold text-espresso">{socialUser.firstName} {socialUser.lastName}</p>
                                                    <p className="text-[10px] text-espresso/50">{socialUser.email}</p>
                                                </div>
                                                <span className="ml-auto text-[9px] bg-espresso/10 text-espresso/60 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                                                    {socialUser.provider}
                                                </span>
                                                <button onClick={() => setSocialUser(null)} className="text-espresso/30 hover:text-espresso/60 text-xs ml-1">✕</button>
                                            </div>
                                        ) : (
                                            <SocialAuthButtons onSuccess={handleSocialFill} onError={handleSocialError} compact />
                                        )}
                                        {socialError && <p className="text-red-600 text-xs mt-2">{socialError}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-espresso/50 mb-1">First Name *</label>
                                            <input type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                                className="w-full bg-white/60 border border-espresso/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-espresso/30 transition-colors" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-espresso/50 mb-1">Last Name</label>
                                            <input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                                className="w-full bg-white/60 border border-espresso/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-espresso/30 transition-colors" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold uppercase tracking-widest text-espresso/50 mb-1">Email Address *</label>
                                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-white/60 border border-espresso/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-espresso/30 transition-colors" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold uppercase tracking-widest text-espresso/50 mb-1">Phone</label>
                                            <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full bg-white/60 border border-espresso/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-espresso/30 transition-colors" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold uppercase tracking-widest text-espresso/50 mb-1">Special Requests</label>
                                            <textarea rows={2} value={formData.specials} onChange={e => setFormData({ ...formData, specials: e.target.value })}
                                                className="w-full bg-white/60 border border-espresso/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-espresso/30 transition-colors resize-none" />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-auto pt-2">
                                        <Button variant="ghost" disabled={isSubmitting} onClick={() => setBookingStep(1)}>← Back</Button>
                                        <Button variant="primary" className="flex-1" disabled={!formData.firstName || !formData.email || isSubmitting} onClick={handleConfirm}>
                                            {isSubmitting ? 'Processing...' : 'Confirm Booking →'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Confirmation */}
                            {bookingStep === 3 && (
                                <div className="flex-1 flex flex-col justify-center text-center bg-cypress rounded-2xl p-8 text-marble space-y-5">
                                    <div className="w-16 h-16 rounded-full bg-marble/10 mx-auto flex items-center justify-center">
                                        <Check size={28} className="text-gold" />
                                    </div>
                                    <h4 className="font-heading text-3xl">Reservation Confirmed!</h4>
                                    <p className="text-marble/70 font-light text-sm">Thank you, {formData.firstName}. Save your reservation ID to access the Guest Portal.</p>
                                    <div className="bg-marble/10 rounded-xl p-5 text-left space-y-3 border border-marble/10">
                                        <div className="flex justify-between font-mono text-sm">
                                            <span className="text-marble/60">Confirmation Code</span>
                                            <span className="font-bold text-gold text-lg tracking-widest">{confirmCode}</span>
                                        </div>
                                        <div className="flex justify-between font-mono text-sm">
                                            <span className="text-marble/60">Reservation ID</span>
                                            <span className="font-bold text-marble text-sm">{reservationId}</span>
                                        </div>
                                        <div className="flex justify-between font-mono text-sm">
                                            <span className="text-marble/60">{activeRoom.name} · {nights}nts</span>
                                            <span className="font-bold">{formatPrice(totalPrice)}</span>
                                        </div>
                                    </div>
                                    <p className="text-marble/50 text-xs">Use your Reservation ID + email to access the <strong className="text-marble/80">Guest Portal</strong> for room service, receipts, and more.</p>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <a href="/guest-portal" className="flex-1 py-3 rounded-xl bg-gold text-espresso font-bold text-sm text-center hover:opacity-90 transition-opacity">
                                            Open Guest Portal →
                                        </a>
                                        <Button variant="secondary" onClick={() => setActiveId(null)} className="flex-1 bg-marble/10 text-marble hover:bg-marble/20">
                                            Close
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
