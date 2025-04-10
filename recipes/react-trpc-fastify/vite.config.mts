import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
// @ts-ignore
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "src/",
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      "/trpc": {
        target: "http://localhost:3001",
      },
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
