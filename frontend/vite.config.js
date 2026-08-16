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
                // Routes are code-split (see routing/Routing.jsx), so the app
                // shell is no longer one oversized bundle — but mapbox-gl still
                // lands in its own single ~1.8 MiB chunk (LiveTruckMap/admin
                // LiveTracking only), which still exceeds Workbox's 2 MiB
                // default per-file precache limit on its own. 3 MiB gives that
                // chunk headroom without going back to the old blanket 4 MiB
                // that was sized for the pre-split single-bundle build.
                maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
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
