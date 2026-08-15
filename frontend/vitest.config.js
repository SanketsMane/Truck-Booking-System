import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Deliberately separate from vite.config.js rather than merging test
// config into it — that file's VitePWA plugin (injectManifest strategy,
// see vite.config.js's own comment) has no business running during a
// component test and isn't safe to even import outside a real build.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.js"],
    globals: false,
  },
});
