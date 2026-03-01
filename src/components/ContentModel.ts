/**
 * CONTENT MODEL
 * Clients can easily swap images, names, locations, and other dynamic configurations here.
 */

export const siteConfig = {
    hotelName: "Aurelia Grand Hotel",
    contact: {
        whatsapp: "+39 333 123 4567",
        email: "reservations@aureliagrand.com",
        phone: "+39 06 1234 5678",
    },
    images: {
        hero: [
            "https://images.unsplash.com/photo-1549294413-26f195200c16?q=80&w=2070&auto=format&fit=crop", // Rome setting / golden hour (replaced broken url)
            "https://images.unsplash.com/photo-1542314831-c6a4d27ce66b?q=80&w=2070&auto=format&fit=crop", // Boutique hotel view
        ],
        suites: [
            { id: "s1", name: "Aurelia Signature Suite", size: "65 m²", guests: 3, price: 1250, available: 1, image: "https://images.unsplash.com/photo-1549294413-26f195200c16?q=80&w=2070&auto=format&fit=crop" },
            { id: "s2", name: "Travertine Master Suite", size: "85 m²", guests: 4, price: 1800, available: 0, image: "https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?q=80&w=2070&auto=format&fit=crop" },
            { id: "s3", name: "Cypress Garden Suite", size: "55 m²", guests: 2, price: 950, available: 3, image: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=2070&auto=format&fit=crop" },
            { id: "s4", name: "Pantheon View Room", size: "40 m²", guests: 2, price: 650, available: 5, image: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=1900&auto=format&fit=crop" },
            { id: "s5", name: "Colosseum Penthouse", size: "120 m²", guests: 6, price: 3500, available: 1, image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1900&auto=format&fit=crop" },
            { id: "s6", name: "Roman Classic Room", size: "35 m²", guests: 2, price: 450, available: 8, image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1900&auto=format&fit=crop" },
            { id: "s7", name: "Piazza Navona Suite", size: "70 m²", guests: 3, price: 1400, available: 2, image: "https://images.unsplash.com/photo-1554647286-f365d7defc2d?q=80&w=1900&auto=format&fit=crop" },
            { id: "s8", name: "Trevi Fountain Balcony", size: "45 m²", guests: 2, price: 850, available: 0, image: "https://images.unsplash.com/photo-1542314831-c6a4d27ce66b?q=80&w=1900&auto=format&fit=crop" },
            { id: "s9", name: "Borghese Villa Suite", size: "90 m²", guests: 4, price: 2100, available: 1, image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1900&auto=format&fit=crop" },
            { id: "s10", name: "Vatican Skyline Loft", size: "100 m²", guests: 4, price: 2400, available: 2, image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=1900&auto=format&fit=crop" },
            { id: "s11", name: "Spanish Steps Studio", size: "30 m²", guests: 2, price: 550, available: 6, image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1900&auto=format&fit=crop" },
            { id: "s12", name: "Trastevere Bohemian", size: "50 m²", guests: 2, price: 750, available: 4, image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1900&auto=format&fit=crop" },
            { id: "s13", name: "Appian Way Retreat", size: "60 m²", guests: 3, price: 1100, available: 1, image: "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?q=80&w=1900&auto=format&fit=crop" },
            { id: "s14", name: "Palatine Hill Suite", size: "80 m²", guests: 4, price: 1650, available: 0, image: "https://images.unsplash.com/photo-1505693314120-0d443867d91e?q=80&w=1900&auto=format&fit=crop" },
            { id: "s15", name: "Capitoline Luxury", size: "75 m²", guests: 2, price: 1550, available: 2, image: "https://images.unsplash.com/photo-1566438480900-0609be27a4be?q=80&w=1900&auto=format&fit=crop" },
            { id: "s16", name: "Testaccio Culinary Suite", size: "65 m²", guests: 3, price: 1200, available: 3, image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1900&auto=format&fit=crop" },
            { id: "s17", name: "Imperial Forum Studio", size: "38 m²", guests: 2, price: 600, available: 5, image: "https://images.unsplash.com/photo-1559841644-08984562005a?q=80&w=1900&auto=format&fit=crop" },
            { id: "s18", name: "Aventine Hill Room", size: "42 m²", guests: 2, price: 700, available: 4, image: "https://images.unsplash.com/photo-1598928506311-c55dd1b31bb1?q=80&w=1900&auto=format&fit=crop" },
            { id: "s19", name: "Campo de' Fiori Deluxe", size: "55 m²", guests: 2, price: 900, available: 2, image: "https://images.unsplash.com/photo-1560185016-339275e0166d?q=80&w=1900&auto=format&fit=crop" },
            { id: "s20", name: "Esquiline Family Room", size: "85 m²", guests: 5, price: 1350, available: 1, image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1900&auto=format&fit=crop" }
        ],
        gallery: [
            "https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=2000&auto=format&fit=crop", // marble detail
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=2000&auto=format&fit=crop", // elegant bedroom
            "https://images.unsplash.com/photo-1554647286-f365d7defc2d?q=80&w=2000&auto=format&fit=crop", // roman streets warm lighting
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2000&auto=format&fit=crop", // boutique hotel interior
            "https://images.unsplash.com/photo-1542314831-c6a4d27ce66b?q=80&w=2070&auto=format&fit=crop", // warm light
        ]
    },
    reviews: [
        { name: "Eleanor V.", country: "United Kingdom", rating: 5, type: "Couple", quote: "An absolute sanctuary. The marble details and quiet mornings are unforgettable." },
        { name: "Julian M.", country: "France", rating: 5, type: "Business", quote: "The concierge went above and beyond for my dinner meetings. Perfect discretion." },
        { name: "Sophia R.", country: "United States", rating: 5, type: "Couple", quote: "Waking up to the golden Roman light here feels like a dream." },
        { name: "Matteo D.", country: "Italy", rating: 4.9, type: "Family", quote: "Impeccable taste and truly central. My family loved every moment." },
        { name: "Hiroshi T.", country: "Japan", rating: 5, type: "Couple", quote: "Minimalist yet deeply luxurious. The breakfast craft is exquisite." },
        { name: "Elena K.", country: "Germany", rating: 5, type: "Business", quote: "The location is perfect, and the spa meter is such a nice touch to unwind." }
    ],
    policies: [
        "Flexible cancellation up to 48 hours",
        "Check-in at 3PM, Check-out by 11AM",
        "No smoking within the premises"
    ]
};
