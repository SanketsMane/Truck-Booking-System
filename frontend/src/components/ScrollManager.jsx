import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// This app uses plain BrowserRouter (main.jsx), not the data router, so
// there's no built-in <ScrollRestoration> — a client-side navigation
// otherwise just keeps whatever scroll position the previous page was at.
// That reads as a broken link whenever the two pages aren't the same
// height: e.g. clicking a footer link near the bottom of a tall page landed
// on whatever section of the (shorter) target page happened to sit at that
// same pixel offset — not the top, and not the "#how-it-works" anchor the
// link actually pointed to.
//
// Mounted once at the app root (App.jsx) so every navigation gets this,
// not just the pages that happened to add their own effect for it.
const MAX_WAIT_MS = 2000;

export const ScrollManager = () => {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Back/forward: leave it to the browser's own per-history-entry scroll
    // restoration rather than forcing a reset.
    if (navigationType === "POP") return;

    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }

    const id = hash.slice(1);
    const start = performance.now();
    let frame;

    // Most routes are lazy-loaded (routing/Routing.jsx) — navigating here
    // from another page can outrace the target chunk loading, so the
    // element isn't in the DOM yet on the first check. Poll briefly rather
    // than give up immediately; a genuinely nonexistent id still falls
    // back to top instead of leaving the scroll position wherever the
    // previous page left it.
    const tryScroll = () => {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (performance.now() - start < MAX_WAIT_MS) {
        frame = requestAnimationFrame(tryScroll);
      } else {
        window.scrollTo(0, 0);
      }
    };
    tryScroll();

    return () => cancelAnimationFrame(frame);
  }, [pathname, hash, navigationType]);

  return null;
};

export default ScrollManager;
