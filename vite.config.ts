import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Asset paths under GitHub Pages live at /car-cost-compare/.
// In `vite dev` we leave the base at "/" so the dev server still works
// from the root path.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/car-cost-compare/" : "/",
}));
