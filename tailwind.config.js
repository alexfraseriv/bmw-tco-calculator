/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f8fafc",
        fg: "#0f172a",
        panel: "#ffffff",
        panel2: "#f1f5f9",
        line: "#e2e8f0",
        muted: "#64748b",
        accent: "#059669",
        warn: "#dc2626",
        bmw: "#2563eb",
        ioniq: "#059669",
        polestar: "#d97706",
        tesla: "#dc2626",
        i4: "#7c3aed",
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
