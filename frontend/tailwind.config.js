/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#CC5500", // Burnt Orange - reserved for action/alert, used sparingly
                secondary: "#FFFFFF", // White
                dark: "#000000", // Black
                accent: "#008080", // Teal - verified/secondary state
                ink: "#161311", // near-black warm ink, replaces flat black as the structural color
                paper: "#F7F3EC", // warm ledger-paper background, replaces flat gray-50
                line: "#E4DCCB", // hairline/divider color on paper
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['"Space Grotesk"', 'sans-serif'],
                mono: ['"IBM Plex Mono"', 'monospace'],
            },
            backgroundImage: {
                'dot-grid': 'radial-gradient(circle, #16131118 1px, transparent 1px)',
            },
            backgroundSize: {
                'dot-grid': '18px 18px',
            },
            container: {
                center: true,
                padding: '1rem',
            },
        },
    },
    plugins: [],
}
