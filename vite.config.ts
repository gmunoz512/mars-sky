import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const base =
  process.env.VITE_BASE ??
  (process.env.GITHUB_ACTIONS === "true" ? "/mars-sky/" : "/");

export default defineConfig({
  base,
  plugins: [react()],
});
