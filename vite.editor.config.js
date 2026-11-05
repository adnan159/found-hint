import { v4wp } from "@kucrut/vite-for-wp";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * The block editor's GBP Posting popup (src/editor). Its own build and
 * output folder, so the admin bundle never loads outside FoundHint's page
 * and the editor never gets the admin's page-wide CSS reset.
 */
export default {
  plugins: [
    tailwindcss(),
    v4wp({
      input: "src/editor/main.jsx",
      outDir: "assets/build/editor",
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
};
