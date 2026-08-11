/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        "secondary-bg": "hsl(var(--secondary-bg))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          bright: "hsl(var(--primary-bright))",
          dark: "hsl(var(--primary-dark))",
          foreground: "#052e16",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary-bg))",
          foreground: "hsl(var(--foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--input))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--primary-bright))",
          foreground: "hsl(var(--foreground))",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
