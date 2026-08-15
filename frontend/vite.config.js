import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["icons/icon-32.png", "icons/icon-180.png"],
            // Web push (FR-09) needs a `push`/`notificationclick` listener,
            // which the default generateSW strategy has no hook for — hence
            // a hand-written service worker source (src/sw.js) built via
            // injectManifest instead of a fully auto-generated one.
            strategies: "injectManifest",
            srcDir: "src",
            filename: "sw.js",
            injectManifest: {
                // mapbox-gl alone is well over a megabyte minified, pushing the
                // app-shell bundle past Workbox's 2 MiB default precache limit —
                // that's not a real problem (this js file is loaded normally on
                // first paint regardless of the service worker), just a config
                // default that needs raising to match this app's actual shell
                // size, or the production build fails outright.
                maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
            },
            manifest: {
                name: "ShareTruck",
                short_name: "ShareTruck",
                description: "Truck capacity sharing marketplace",
                theme_color: "#ffffff",
                background_color: "#ffffff",
                display: "standalone",
                start_url: "/",
                icons: [
                    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
                    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
                    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
                ],
            },
            // No runtimeCaching entries: only the app shell (JS/CSS/HTML) gets
            // precached, matching the NFR's "basic offline shell" — not full
            // offline transactions. The API lives on a different origin
            // (VITE_API_URL) and is never cached, so trip/booking data is
            // always live when the network is actually available.
        }),
    ],
});
