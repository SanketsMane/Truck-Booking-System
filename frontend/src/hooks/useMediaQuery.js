import { useEffect, useState } from "react";

// Tracks whether a CSS media query currently matches — for the rare case a
// component needs to branch in JS (e.g. swapping placeholder text), not for
// layout/spacing, which should stay in styled-components' own @media blocks.
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
};

export default useMediaQuery;
