// Small hand-rolled CSV serializer — the admin reports (FR-11.8/SRS-10.5)
// are simple flat rows, not worth a dependency for.
//
// User-controlled values (names, cities) flow into these exports. A cell
// starting with =, +, -, or @ is a live formula to Excel/Sheets on open —
// prefixing with a tab neutralizes that (still round-trips as the same
// visible text) without touching values that don't start with one of those.
const FORMULA_TRIGGER = /^[=+\-@]/;

const escapeCell = (value) => {
  let str = value === null || value === undefined ? "" : String(value);
  if (FORMULA_TRIGGER.test(str)) {
    str = `\t${str}`;
  }
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const toCsv = (rows, columns) => {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(",")).join("\n");
  return `${header}\n${body}`;
};

module.exports = { toCsv };
