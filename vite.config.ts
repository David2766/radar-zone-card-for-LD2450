import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  if (mode === "web") {
    return {
      build: {
        outDir: "dist-web",
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
          input: "index.html"
        }
      }
    };
  }

  return {
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
  };
});
