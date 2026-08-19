import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { toast } from "react-toastify";
import { MapPin, Loader2, CircleCheck, X, LocateFixed } from "lucide-react";
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

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
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
    animation: ${spin} 0.8s linear infinite;
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

// A real <button>, not a clickable <li> like Option — this is an action
// ("do something"), not a selection from a list of results, and native
// button semantics give it correct keyboard/screen-reader behavior for
// free. Wrapped in a plain <li> since a <ul> only accepts <li> as a direct
// child.
const GeolocateRow = styled.li`
  list-style: none;
  padding: 0;
`;

const GeolocateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.accent};
  text-align: left;

  svg {
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.accentSoft};
  }

  &:disabled {
    color: ${({ theme }) => theme.color.textFaint};
    cursor: default;
  }

  svg.spin {
    animation: ${spin} 0.8s linear infinite;
  }
`;

const OptionsDivider = styled.li`
  list-style: none;
  height: 1px;
  margin: 5px 4px;
  background: ${({ theme }) => theme.color.border};
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

// Turns a browser-reported {lat,lng} into the same shape a picked
// suggestion has (a LocationIQ result with display_name/address), so
// "use my current location" can feed straight into selectSuggestion-style
// handling. Only called when a LocationIQ token is configured — GPS
// coordinates themselves don't need one, but naming them does.
const reverseGeocode = async (lat, lng) => {
  const url =
    `https://api.locationiq.com/v1/reverse?key=${LOCATIONIQ_TOKEN}&lat=${lat}&lon=${lng}` +
    `&format=json&normalizecity=1&addressdetails=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Reverse geocoding failed");
  const data = await res.json();
  if (!data || !data.display_name) throw new Error("No address found for this location");
  return data;
};

// A reverse-geocoded display_name leads with whatever's nearest the exact
// coordinates — often a specific building/POI ("Siddharth Free Reading
// Room & Library, Shivaji Road, Kasba Peth, Pune, ..."), which is accurate
// but not what anyone wants silently autofilled as their pickup address.
// Built from the structured `address` object instead (road, area, city,
// state + pincode), skipping named-place fields entirely, this reads like
// an address a person would actually type — "Shivaji Road, Kasba Peth,
// Pune, Maharashtra 411011". Only used for the GPS/current-location path;
// a suggestion the user explicitly searched for and picked by name (e.g.
// "Hadapsar Railway Station") keeps its real display_name in
// selectSuggestion — there the specific place name is exactly what they
// chose, not a side effect of raw coordinates.
const formatReverseAddress = (result) => {
  const a = result.address || {};
  const road = [a.house_number, a.road].filter(Boolean).join(" ");
  const area = a.suburb || a.neighbourhood || a.quarter || a.city_district;
  const city = a.city || a.town || a.village || a.county;
  const stateZip = [a.state, a.postcode].filter(Boolean).join(" ");

  const parts = [road, area, city, stateZip].filter(Boolean);
  // Drops a part that's identical to the one right before it (e.g. suburb
  // and city both resolving to "Pune") rather than repeating it.
  const deduped = parts.filter((part, i) => part !== parts[i - 1]);

  return deduped.length ? deduped.join(", ") : result.display_name;
};

// GeolocationPositionError codes (no named export on the global — the
// constants only exist on an actual error instance) — used to give a
// specific, actionable message instead of one generic failure toast.
const GEO_ERROR_MESSAGES = {
  1: "Location access was denied — enable it for this site in your browser or device settings, then try again.",
  2: "Your device couldn't determine your location right now. Try again, or type the address instead.",
  3: "Finding your location took too long. Try again, or type the address instead.",
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
//
// "Use my current location" is always available (a pinned first row,
// shown on focus, above any typed-search suggestions) — it needs the
// browser's Geolocation API only, not a LocationIQ token, so it still
// works when GEOCODING_UNAVAILABLE. Coordinates are reverse-geocoded into
// a real address when a token IS configured; if that lookup fails (or
// there's no token), the field falls back to a "lat, lng" string rather
// than blocking — exact coordinates are what actually matters for a
// pickup point, a human-readable name is a bonus.
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
  const [geoLoading, setGeoLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const skipNextFetch = useRef(false);
  const geoRequestId = useRef(0);

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

  const getPosition = (options) =>
    new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));

  // Browser Geolocation → (optionally) LocationIQ reverse geocoding →
  // the same {address, lat, lng} shape a picked suggestion produces.
  // Coordinates are the part that must succeed; naming them is a
  // best-effort layer on top, so a reverse-geocode failure (network,
  // rate limit, no token configured) still leaves the user with a
  // usable, precise pickup point instead of an error dead-end.
  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location access — type the address instead.");
      return;
    }
    // The Geolocation API silently refuses to work outside a secure
    // context (HTTPS), except on localhost — worth a specific message
    // rather than letting it fail as a generic POSITION_UNAVAILABLE.
    if (!window.isSecureContext) {
      toast.error("Location access needs a secure (HTTPS) connection.");
      return;
    }

    const requestId = ++geoRequestId.current;
    setGeoLoading(true);

    try {
      let position;
      try {
        // GPS-chip precision first — what a real phone has and what a
        // pickup point genuinely benefits from.
        position = await getPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
      } catch (highAccuracyError) {
        // A device with no real GPS (most laptops/desktops, some tablets)
        // routinely times out or fails outright asking for high-accuracy —
        // that's not the user's fault and shouldn't be a dead end. Retry
        // once with network-based positioning (Wi-Fi/cell), which is
        // faster and far more broadly supported, just less precise.
        // Skip the retry if permission was actually denied — that will
        // fail identically the second time.
        if (highAccuracyError.code === highAccuracyError.PERMISSION_DENIED) throw highAccuracyError;
        position = await getPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
      }
      if (requestId !== geoRequestId.current) return;

      const { latitude, longitude } = position.coords;
      try {
        if (GEOCODING_UNAVAILABLE) throw new Error("no token configured");
        const result = await reverseGeocode(latitude, longitude);
        if (requestId !== geoRequestId.current) return;
        skipNextFetch.current = true;
        onChange({ address: formatReverseAddress(result), lat: latitude, lng: longitude });
        onResolve?.(extractCity(result), result);
      } catch {
        if (requestId !== geoRequestId.current) return;
        // Still hand back exact coordinates — a named address is a nice-
        // to-have, not a requirement for a usable pickup point.
        skipNextFetch.current = true;
        onChange({ address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, lat: latitude, lng: longitude });
        toast.info("Got your location, but couldn't look up its address name.");
      }
      // Only a successful fix (with or without a resolved address) closes
      // the dropdown — on error it stays open so the user can immediately
      // hit "Use my current location" again without re-focusing the field.
      if (requestId === geoRequestId.current) setOpen(false);
    } catch (error) {
      if (requestId !== geoRequestId.current) return;
      toast.error(GEO_ERROR_MESSAGES[error.code] || "Couldn't get your location — type the address instead.");
    } finally {
      if (requestId === geoRequestId.current) setGeoLoading(false);
    }
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
    if (!open) return;
    // Checked before the "no suggestions" bail-out below — the dropdown
    // now opens on every focus (to surface "use my current location"),
    // so Escape must still close it even when there's nothing else in it.
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
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
        onFocus={() => setOpen(true)}
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
      {open && (
        <Dropdown role="listbox">
          <GeolocateRow>
            <GeolocateButton
              type="button"
              disabled={geoLoading}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleUseCurrentLocation}
            >
              {geoLoading ? <Loader2 size={15} className="spin" /> : <LocateFixed size={15} />}
              {geoLoading ? "Finding your location…" : "Use my current location"}
            </GeolocateButton>
          </GeolocateRow>
          {!loading && address.trim().length >= MIN_QUERY_LENGTH && (
            <>
              <OptionsDivider />
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
            </>
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
