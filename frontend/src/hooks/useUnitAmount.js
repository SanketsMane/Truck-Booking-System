import { useState } from "react";

const KG_PER_TON = 1000;

// Manages a numeric capacity/weight amount the user can enter in tons or
// kg, while every consumer (validation, price math, API payloads) works
// with a single canonical `tons` value — nobody downstream has to know or
// care which unit was actually typed. `displayValue` is the raw string in
// whichever unit is currently selected; switching units rescales it so the
// underlying tons amount is preserved (5 t -> switch to kg -> "5000").
export const useUnitAmount = (initialTons = "") => {
  const [unit, setUnit] = useState("t");
  const [displayValue, setDisplayValue] = useState(initialTons === "" || initialTons == null ? "" : String(initialTons));

  const numeric = displayValue === "" ? NaN : Number(displayValue);
  const tons = Number.isNaN(numeric) ? "" : unit === "kg" ? numeric / KG_PER_TON : numeric;

  const onValueChange = (e) => setDisplayValue(e.target.value);

  const onUnitChange = (e) => {
    const nextUnit = e.target.value;
    if (!Number.isNaN(numeric)) {
      const currentTons = unit === "kg" ? numeric / KG_PER_TON : numeric;
      const nextValue = nextUnit === "kg" ? currentTons * KG_PER_TON : currentTons;
      // Round off float noise (5 -> 5000 -> back to 4.999999999999).
      setDisplayValue(String(Math.round(nextValue * 1000) / 1000));
    }
    setUnit(nextUnit);
  };

  // For programmatic resets — prefilling from a loaded record, clearing a
  // form, etc. Always sets in tons; the display resets to the tons unit
  // too, since there's no "current unit" to preserve a foreign value into.
  const setTons = (newTons) => {
    setUnit("t");
    setDisplayValue(newTons === "" || newTons == null ? "" : String(newTons));
  };

  return { tons, displayValue, unit, onValueChange, onUnitChange, setTons };
};
