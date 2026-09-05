import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  base: mode === "github" ? "/mela/" : "/",
  plugins: [react()],
  server: { proxy: { "/api/recap": "http://127.0.0.1:8082" } },
}));
