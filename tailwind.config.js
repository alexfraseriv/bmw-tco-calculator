/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0f17",
        panel: "#121826",
        panel2: "#0f1522",
        line: "#1f2937",
        muted: "#94a3b8",
        accent: "#34d399",
        warn: "#f87171",
        bmw: "#3b82f6",
        ioniq: "#34d399",
        polestar: "#f59e0b",
        tesla: "#ef4444",
        i4: "#8b5cf6",
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
