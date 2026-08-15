import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Input } from "./Form";
import { searchCities } from "../../api/meta";

const Wrap = styled.div`
  position: relative;
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
  max-height: 260px;
  overflow-y: auto;
`;

const Option = styled.li`
  padding: 9px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 14px;
  cursor: pointer;
  background: ${({ theme, $active }) => ($active ? theme.color.surfaceRaised : "transparent")};

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
  }
`;

const EmptyOption = styled.li`
  padding: 9px 10px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.textFaint};
`;

const DEBOUNCE_MS = 220;

// Type-ahead for the fromCity/toCity fields, backed by our own /meta/cities
// endpoint (a bundled India cities dataset — no external API, no rate
// limit). A thin wrapper around the plain <Input>, so it drops into
// <Field> exactly like one (Field clones its child and passes `id` down,
// which this forwards to the real input for label association).
export const CityAutocomplete = ({ id, value, onChange, placeholder, autoFocus }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);
  const skipNextFetch = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return undefined;
    }

    const query = value.trim();
    if (!query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setOpen(false);
      return undefined;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { cities } = await searchCities(query);
        setSuggestions(cities || []);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [value]);

  const selectCity = (city) => {
    skipNextFetch.current = true;
    onChange(city);
    setOpen(false);
    setSuggestions([]);
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
      selectCity(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Wrap ref={wrapRef}>
      <Input
        id={id}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-listbox`}
        aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.trim() && suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && (loading || suggestions.length > 0) && (
        <Dropdown role="listbox" id={`${id}-listbox`}>
          {loading && suggestions.length === 0 ? (
            <EmptyOption>Searching…</EmptyOption>
          ) : suggestions.length === 0 ? (
            <EmptyOption>No matching cities</EmptyOption>
          ) : (
            suggestions.map((city, i) => (
              <Option
                key={city}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                $active={i === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectCity(city)}
              >
                {city}
              </Option>
            ))
          )}
        </Dropdown>
      )}
    </Wrap>
  );
};

export default CityAutocomplete;
