import { v4wp } from "@kucrut/vite-for-wp";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default {
  plugins: [
    tailwindcss(),
    v4wp({
      input: "src/admin/main.jsx",
      outDir: "assets/build/admin",
    }),
    react(),
  ],
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 2024,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/admin"),
    },
  },
  server: {
    cors: true,
  },
};
