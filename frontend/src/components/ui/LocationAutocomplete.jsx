import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { MapPin, Loader2, CircleCheck } from "lucide-react";
import { Input } from "./Form";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";
const GEOCODING_UNAVAILABLE = !MAPBOX_TOKEN;

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

// Splits Mapbox's place_name ("Hadapsar, Pune, Maharashtra, India") into a
// main line (the first, most specific segment) and a secondary line (the
// rest) — mirrors how most address-autocomplete UIs present a result.
const splitPlaceName = (placeName) => {
  const [main, ...rest] = placeName.split(",");
  return { main: main.trim(), secondary: rest.join(",").trim() };
};

const staticPreviewUrl = (lat, lng) =>
  `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+1d4ed8(${lng},${lat})/${lng},${lat},14,0/640x220@2x?access_token=${MAPBOX_TOKEN}`;

// Address-level autocomplete for a pickup/drop point — the specific spot
// within a city, as opposed to CityAutocomplete's city-level search. Backed
// by Mapbox's Geocoding API (same token already used for live tracking,
// see LiveTruckMap), restricted to India. Degrades to a plain free-text
// field when VITE_MAPBOX_TOKEN isn't configured, or when a search comes
// back empty — this app has always accepted a freehand pickup/drop point,
// and a missing/failed geocode should never block that.
//
// value/onChange shape: { address: string, lat: number|null, lng: number|null }.
// lat/lng are only set once a suggestion is actually picked; typing without
// selecting one keeps them null, same as a plain text field.
export const LocationAutocomplete = ({ id, value, onChange, placeholder, autoFocus }) => {
  const address = value?.address || "";
  const confirmed = value?.lat != null && value?.lng != null;

  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);
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
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
          `?access_token=${MAPBOX_TOKEN}&country=IN&types=address,poi,neighborhood,locality,place&limit=6`;
        const res = await fetch(url);
        const data = await res.json();
        // A slower earlier request resolving after a faster later one would
        // otherwise clobber the suggestions for what's currently typed.
        if (requestId !== requestIdRef.current) return;
        setSuggestions(data.features || []);
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

  const selectSuggestion = (feature) => {
    skipNextFetch.current = true;
    onChange({ address: feature.place_name, lat: feature.center[1], lng: feature.center[0] });
    setOpen(false);
    setSuggestions([]);
  };

  const handleTextChange = (text) => {
    onChange({ address: text, lat: null, lng: null });
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
      {loading && (
        <IconRight>
          <Loader2 size={16} />
        </IconRight>
      )}
      {open && !loading && (suggestions.length > 0 || address.trim().length >= MIN_QUERY_LENGTH) && (
        <Dropdown role="listbox">
          {suggestions.length === 0 ? (
            <EmptyOption>No matching address — you can still use what you've typed</EmptyOption>
          ) : (
            suggestions.map((feature, i) => {
              const { main, secondary } = splitPlaceName(feature.place_name);
              return (
                <Option
                  key={feature.id}
                  role="option"
                  aria-selected={i === activeIndex}
                  $active={i === activeIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(feature)}
                >
                  <OptionMain>{main}</OptionMain>
                  {secondary && <OptionSecondary>{secondary}</OptionSecondary>}
                </Option>
              );
            })
          )}
        </Dropdown>
      )}
      {confirmed && (
        <Preview>
          <PreviewImg src={staticPreviewUrl(value.lat, value.lng)} alt={`Map preview of ${address}`} loading="lazy" />
        </Preview>
      )}
    </Wrap>
  );
};

export default LocationAutocomplete;
