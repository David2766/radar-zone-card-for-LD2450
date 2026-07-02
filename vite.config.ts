import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: "src/index-ha.ts",
      name: "RadarZoneCard",
      formats: ["es"],
      fileName: () => "radar-zone-card.js"
    },
    rollupOptions: {
      output: {
        codeSplitting: false
      }
    }
  }
});
