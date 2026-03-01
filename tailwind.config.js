/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                marble: '#F6F2EA',
                travertine: '#EFE7DA',
                espresso: '#1B1A18',
                gold: '#C8A45D',
                cypress: '#244036',
                mist: 'rgba(255,255,255,0.55)',
                brand: {
                    primary: '#244036', // Espresso
                    secondary: '#3a6657',
                    accent: '#cbae66', // Gold
                    surface: '#f3ece3', // Marble
                    bg: '#fcfcfc',
                },
            },
            fontFamily: {
                heading: ['"Playfair Display"', 'serif'],
                body: ['"Plus Jakarta Sans"', 'sans-serif'],
                accent: ['"Cormorant Garamond"', 'serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            borderRadius: {
                '2xl': '1.75rem',
                '3xl': '2.5rem',
            },
            boxShadow: {
                'soft': '0 4px 40px rgba(27, 26, 24, 0.04)',
                'layered': '0 2px 10px rgba(0,0,0,0.02), 0 10px 40px rgba(0,0,0,0.04)',
            },
            backgroundImage: {
                'hero-gradient': 'linear-gradient(to top, rgba(27, 26, 24, 0.95) 0%, rgba(27, 26, 24, 0.4) 40%, rgba(27, 26, 24, 0) 100%)',
            }
        },
    },
    plugins: [],
}
