import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ Configuración compatible con Vercel
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
