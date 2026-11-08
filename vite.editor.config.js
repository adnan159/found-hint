import { v4wp } from "@kucrut/vite-for-wp";
import { wp_scripts } from "@kucrut/vite-for-wp/plugins";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { forwardRefs } from "./vite/forward-refs.js";
import { wpRequire } from "./vite/wp-require.js";

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
    // React, ReactDOM and @wordpress/* come from WordPress, not the bundle
    // (Plugin Directory guideline 13). react-dom/client is ReactDOM there.
    wp_scripts({ extraScripts: { "react-dom/client": "ReactDOM" } }),
    wpRequire(),
    forwardRefs(),
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
