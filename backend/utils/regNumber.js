// Indian vehicle registration numbers are written inconsistently by users —
// "DL 01 AB 7122", "DL-01-AB-7122", "dl01ab7122" all refer to the same
// plate. Without normalizing before comparison, the uniqueness check in
// truckController.registerTruck (and the schema's own unique index) treats
// each spacing/casing variant as a different truck, letting the same
// vehicle be registered multiple times.
const normalizeRegNumber = (value) => (typeof value === "string" ? value.replace(/[\s-]+/g, "").toUpperCase() : value);

// Covers the standard state-code format (e.g. DL01AB1234, MH12AB1234 — 2
// letters, 1-2 digits, 1-3 letters, 4 digits) and the newer Bharat series
// (e.g. 22BH1234AB — 2 digits, "BH", 4 digits, 1-2 letters). Applied to the
// already-normalized (whitespace/hyphen-stripped, uppercased) value.
const REG_NUMBER_PATTERN = /^([A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$/;

module.exports = { normalizeRegNumber, REG_NUMBER_PATTERN };
