import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";

/** Stamps the current UTC build time into the HTML for cache-debugging. */
function buildTimestamp(): Plugin {
  return {
    name: "build-timestamp",
    transformIndexHtml(html) {
      return html.replace("__BUILD_TIMESTAMP__", new Date().toISOString());
    },
  };
}

export default defineConfig({
  base: "/Skill-Guru-India-Education/",

  plugins: [react(), tailwindcss(), buildTimestamp()],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("react-router-dom")) {
            return "router";
          }

          if (id.includes("react") || id.includes("react-dom")) {
            return "react";
          }

          if (
            id.includes("gsap") ||
            id.includes("framer-motion") ||
            id.includes("lenis")
          ) {
            return "animation";
          }

          if (id.includes("@supabase/supabase-js")) {
            return "supabase";
          }

          if (
            id.includes("three") ||
            id.includes("@react-three/fiber") ||
            id.includes("@react-three/drei")
          ) {
            return "three";
          }

          if (id.includes("swiper")) {
            return "sliders";
          }
        },
      },
    },
  },
});