const fs = require('fs');
const path = require('path');

const languages = ['en', 'it', 'fr', 'es', 'de', 'pt', 'ru', 'tr', 'ar', 'zh', 'ja', 'ko', 'nl', 'pl', 'uk', 'hi'];

const baseTranslations = {
    "nav": {
        "hotel": "Hotel",
        "suites": "Suites",
        "amenities": "Amenities",
        "location": "Location",
        "book": "Book Now"
    },
    "hero": {
        "title": "Rome, made quiet.",
        "subtitle": "A boutique sanctuary steps from the historic heart of the city.",
        "checkAvailability": "Check Availability",
        "exploreSuites": "Explore Suites",
        "checkIn": "Check-in",
        "checkOut": "Check-out",
        "guests": "Guests",
        "promo": "Promo Code",
        "search": "Search",
        "guarantee": "Best rate guaranteed. Flexible cancellation."
    },
    "trust": {
        "rating": "4.9/5 Guest Rating",
        "location": "Central Rome Location",
        "concierge": "Concierge 24/7",
        "transfer": "Airport Transfer"
    },
    "suites": {
        "title": "Suites",
        "from": "from €",
        "book": "Reserve Suite",
        "aurelia": {
            "name": "Aurelia Suite",
            "size": "65 m²",
            "occupancy": "Up to 3 guests",
            "highlight": "Panoramic terrace"
        },
        "travertine": {
            "name": "Travertine Deluxe",
            "size": "45 m²",
            "occupancy": "Up to 2 guests",
            "highlight": "Freestanding marble tub"
        },
        "cypress": {
            "name": "Cypress Junior Suite",
            "size": "50 m²",
            "occupancy": "Up to 3 guests",
            "highlight": "Private garden view"
        },
        "pantheon": {
            "name": "Pantheon View Room",
            "size": "35 m²",
            "occupancy": "2 guests",
            "highlight": "City view"
        }
    },
    "amenities": {
        "title": "Amenities",
        "concierge": "Concierge Timeline",
        "spa": "Spa Atmosphere Meter",
        "breakfast": "Breakfast Craft",
        "t1": "Dinner booking",
        "t2": "Private tour",
        "t3": "Car service",
        "s1": "Calm",
        "s2": "Restore",
        "s3": "Unwind",
        "b1": "Fresh pastries...",
        "b2": "Italian espresso...",
        "b3": "Seasonal fruit..."
    },
    "gallery": {
        "title": "The Aurelia Visuals"
    },
    "location": {
        "title": "Location",
        "nearby": "Nearby",
        "gettingHere": "Getting Here",
        "l1": "Trevi Fountain",
        "l2": "Pantheon",
        "l3": "Spanish Steps",
        "l4": "Trastevere"
    },
    "reviews": {
        "title": "Guest Reviews"
    },
    "faq": {
        "title": "Frequently Asked Questions",
        "q1": "What are the check-in and check-out times?",
        "a1": "Check-in is from 3:00 PM and check-out is until 11:00 AM.",
        "q2": "What is the cancellation policy?",
        "a2": "We offer flexible cancellation up to 48 hours prior to arrival.",
        "q3": "Do you provide airport transfer?",
        "a3": "Yes, we arrange private transfers from Fiumicino and Ciampino airports.",
        "q4": "Is breakfast included?",
        "a4": "A complimentary artisanal breakfast is included in all direct bookings.",
        "q5": "What is the pet policy?",
        "a5": "We welcome small dogs under 10kg with prior notice.",
        "q6": "Is there parking available?",
        "a6": "We offer private valet parking nearby for a daily fee."
    },
    "cta": {
        "title": "Your Roman stay, refined.",
        "btn": "Check Availability"
    },
    "footer": {
        "status": "Booking engine: Operational",
        "policies": "Policies",
        "social": "Social",
        "explore": "Explore"
    }
};

const localesDir = path.join(__dirname, 'public', 'locales');
if (!fs.existsSync(localesDir)) {
    fs.mkdirSync(localesDir, { recursive: true });
}

languages.forEach(lang => {
    const langDir = path.join(localesDir, lang);
    if (!fs.existsSync(langDir)) {
        fs.mkdirSync(langDir, { recursive: true });
    }

    // Note: For a real app, these would be properly translated using an API.
    // Here we use English defaults to ensure exact property access works without throwing,
    // but we can add a simple language marker so we know it's working.

    let translated = JSON.parse(JSON.stringify(baseTranslations));
    if (lang !== 'en') {
        translated.hero.title = `[${lang.toUpperCase()}] Rome, made quiet.`;
        translated.nav.book = `[${lang.toUpperCase()}] Book Now`;
    }

    // Create real translations for Italian
    if (lang === 'it') {
        translated.hero.title = "Roma, resa silenziosa.";
        translated.hero.subtitle = "Un santuario boutique a pochi passi dal cuore storico della città.";
        translated.nav.book = "Prenota Ora";
        translated.nav.suites = "Suite";
        translated.suites.title = "Le Nostre Suite";
        translated.cta.title = "Il tuo soggiorno romano, raffinato.";
        translated.cta.btn = "Verifica Disponibilità";
    }

    fs.writeFileSync(path.join(langDir, 'common.json'), JSON.stringify(translated, null, 2));
});

console.log('Locales generated successfully.');
