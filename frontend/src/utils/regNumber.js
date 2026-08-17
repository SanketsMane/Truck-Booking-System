// Mirrors backend/utils/regNumber.js — strips spaces/hyphens and uppercases
// so "DL 01 AB 7122" and "DL01AB7122" can never be typed as different
// values in the first place, rather than relying on the backend to catch
// it after the fact.
export const normalizeRegNumber = (value) => (value || "").replace(/[\s-]+/g, "").toUpperCase();

const REG_NUMBER_PATTERN = /^([A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$/;

export const isValidRegNumber = (value) => REG_NUMBER_PATTERN.test(normalizeRegNumber(value));
