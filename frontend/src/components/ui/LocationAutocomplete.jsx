import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { MapPin, Loader2, CircleCheck, X } from "lucide-react";
import { Input } from "./Form";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";

const LOCATIONIQ_TOKEN = import.meta.env.VITE_LOCATIONIQ_TOKEN || "";
const GEOCODING_UNAVAILABLE = !LOCATIONIQ_TOKEN;

const Wrap = styled.div`
  position: relative;
`;

const IconLeft = styled.span`
  position: absolute;
  top: 50%;
  left: 13px;
  transform: translateY(-50%);
  display: flex;
  color: ${({ theme, $confirmed }) => ($confirmed ? theme.color.success : theme.color.textFaint)};
  pointer-events: none;
`;

const IconRight = styled.span`
  position: absolute;
  top: 50%;
  right: 13px;
  transform: translateY(-50%);
  display: flex;
  color: ${({ theme }) => theme.color.textFaint};
  pointer-events: none;

  svg {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LocationInput = styled(Input)`
  padding-left: 40px;
  padding-right: 40px;
`;

// A real button (not the pointer-events:none IconRight wrapper the loading
// spinner uses) — sits in the same top-right slot, shown instead of the
// spinner once a request isn't in flight, so there's only ever one thing
// there at a time.
const ClearButton = styled.button`
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: ${({ theme }) => theme.color.textFaint};
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
    color: ${({ theme }) => theme.color.text};
  }
`;

const Dropdown = styled.ul`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 30;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  box-shadow: ${({ theme }) => theme.shadow.popover};
  max-height: 280px;
  overflow-y: auto;
`;

const Option = styled.li`
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 9px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  background: ${({ theme, $active }) => ($active ? theme.color.surfaceRaised : "transparent")};

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
  }
`;

const OptionMain = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.color.text};
`;

const OptionSecondary = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textFaint};
`;

const EmptyOption = styled.li`
  padding: 9px 10px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.textFaint};
`;

const Preview = styled.div`
  margin-top: 8px;
  border-radius: ${({ theme }) => theme.radius.sm};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.border};
  line-height: 0;
`;

const PreviewImg = styled.img`
  display: block;
  width: 100%;
  height: 110px;
  object-fit: cover;
`;

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 3;

// Splits LocationIQ's display_name ("Hadapsar, Pune, Maharashtra, India")
// into a main line (the first, most specific segment) and a secondary line
// (the rest) — mirrors how most address-autocomplete UIs present a result.
const splitPlaceName = (displayName) => {
  const [main, ...rest] = displayName.split(",");
  return { main: main.trim(), secondary: rest.join(",").trim() };
};

const staticPreviewUrl = (lat, lng) =>
  `https://maps.locationiq.com/v3/staticmap?key=${LOCATIONIQ_TOKEN}&center=${lat},${lng}` +
  `&zoom=14&size=640x220&format=png&markers=icon:large-red-cutout|${lat},${lng}`;

// Pulls the city-level name out of a LocationIQ result's `address` object.
// normalizecity=1 (see the fetch below) makes LocationIQ consistently fill
// `address.city` instead of the raw OSM data's inconsistent city/town/
// village/municipality split — the fallback chain only matters for the rare
// result normalizecity doesn't cover. Callers that only care about
// city-level search (e.g. Home.jsx's route search, which still matches
// trips by exact fromCity/toCity) use this via onResolve instead of
// widening what onChange itself sends — onChange's {address, lat, lng}
// shape is also what gets persisted straight into Trip.pickupPoint/dropPoint
// (see PostTrip.jsx/ManageTrip.jsx), and the backend's Joi schema for that
// rejects unknown keys, so it must stay exactly as-is.
const extractCity = (result) => {
  const a = result.address || {};
  return a.city || a.town || a.village || a.county || a.state_district || result.display_name.split(",")[0].trim();
};

// Address-level autocomplete for a pickup/drop point — the specific spot
// within a city, as opposed to CityAutocomplete's city-level search. Backed
// by LocationIQ's Autocomplete API (free tier: 5,000 requests/day, no
// credit card), restricted to India. Degrades to a plain free-text field
// when VITE_LOCATIONIQ_TOKEN isn't configured, or when a search comes back
// empty — this app has always accepted a freehand pickup/drop point, and a
// missing/failed geocode should never block that.
//
// value/onChange shape: { address: string, lat: number|null, lng: number|null }.
// lat/lng are only set once a suggestion is actually picked; typing without
// selecting one keeps them null, same as a plain text field.
//
// onResolve(city, feature) — optional, fires alongside onChange when a
// suggestion is picked, with the city-level name extracted from it. Doesn't
// change what onChange sends (see extractCity's comment above).
//
// showPreview — set false to skip the static map thumbnail once a
// suggestion is confirmed (default on; PostTrip/ManageTrip/TripDetail want
// it, a compact marketing search bar like Home.jsx's doesn't).
export const LocationAutocomplete = ({
  id,
  value,
  onChange,
  onResolve,
  placeholder,
  autoFocus,
  showPreview = true,
}) => {
  const address = value?.address || "";
  const confirmed = value?.lat != null && value?.lng != null;

  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const skipNextFetch = useRef(false);

  useOnClickOutside(wrapRef, () => setOpen(false));

  useEffect(() => {
    if (GEOCODING_UNAVAILABLE) return undefined;

    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return undefined;
    }

    const query = address.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setOpen(false);
      return undefined;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const url =
          `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_TOKEN}&q=${encodeURIComponent(query)}` +
          `&countrycodes=in&normalizecity=1&limit=6&format=json`;
        const res = await fetch(url);
        // A slower earlier request resolving after a faster later one would
        // otherwise clobber the suggestions for what's currently typed.
        if (requestId !== requestIdRef.current) return;
        // LocationIQ returns a plain JSON array on success, but a 404 +
        // {error: "..."} object when nothing matches — not an array either
        // way, so this also naturally covers that "zero results" case.
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        if (requestId === requestIdRef.current) setSuggestions([]);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [address]);

  const selectSuggestion = (result) => {
    skipNextFetch.current = true;
    onChange({ address: result.display_name, lat: Number(result.lat), lng: Number(result.lon) });
    onResolve?.(extractCity(result), result);
    setOpen(false);
    setSuggestions([]);
  };

  const handleTextChange = (text) => {
    onChange({ address: text, lat: null, lng: null });
  };

  // Clears both halves of this field's state — the address itself and
  // whatever city onResolve last resolved it to — so a parent (e.g. Home's
  // search form) can't act on a stale resolved city after the visible
  // field goes empty.
  const handleClear = () => {
    onChange({ address: "", lat: null, lng: null });
    onResolve?.("");
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Wrap ref={wrapRef}>
      <IconLeft $confirmed={confirmed}>
        {confirmed ? <CircleCheck size={16} /> : <MapPin size={16} />}
      </IconLeft>
      <LocationInput
        ref={inputRef}
        id={id}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={address}
        autoFocus={autoFocus}
        onChange={(e) => handleTextChange(e.target.value)}
        onFocus={() => address.trim().length >= MIN_QUERY_LENGTH && suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {loading ? (
        <IconRight>
          <Loader2 size={16} />
        </IconRight>
      ) : (
        address.length > 0 && (
          <ClearButton type="button" aria-label="Clear" onMouseDown={(e) => e.preventDefault()} onClick={handleClear}>
            <X size={15} strokeWidth={2.4} />
          </ClearButton>
        )
      )}
      {open && !loading && (suggestions.length > 0 || address.trim().length >= MIN_QUERY_LENGTH) && (
        <Dropdown role="listbox">
          {suggestions.length === 0 ? (
            <EmptyOption>No matching address — you can still use what you've typed</EmptyOption>
          ) : (
            suggestions.map((result, i) => {
              const { main, secondary } = splitPlaceName(result.display_name);
              return (
                <Option
                  key={result.place_id}
                  role="option"
                  aria-selected={i === activeIndex}
                  $active={i === activeIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(result)}
                >
                  <OptionMain>{main}</OptionMain>
                  {secondary && <OptionSecondary>{secondary}</OptionSecondary>}
                </Option>
              );
            })
          )}
        </Dropdown>
      )}
      {confirmed && showPreview && (
        <Preview>
          <PreviewImg src={staticPreviewUrl(value.lat, value.lng)} alt={`Map preview of ${address}`} loading="lazy" />
        </Preview>
      )}
    </Wrap>
  );
};

export default LocationAutocomplete;
