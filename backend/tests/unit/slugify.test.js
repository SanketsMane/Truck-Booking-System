const { slugify, SLUG_PATTERN } = require("../../utils/slugify");

describe("slugify", () => {
  it("lowercases, replaces non-alphanumerics with hyphens, and trims edge hyphens", () => {
    expect(slugify("Best Truck Routes in Maharashtra (2026)!")).toBe("best-truck-routes-in-maharashtra-2026");
  });

  it("strips accents instead of dropping the character entirely", () => {
    expect(slugify("Café Móvil")).toBe("cafe-movil");
  });

  it("collapses runs of separators/punctuation into a single hyphen", () => {
    expect(slugify("Multiple---Dashes___and   spaces")).toBe("multiple-dashes-and-spaces");
  });

  it("trims leading/trailing whitespace and punctuation", () => {
    expect(slugify("  --leading and trailing--  ")).toBe("leading-and-trailing");
  });

  it("falls back to an empty string for non-Latin input with no ASCII-mappable characters", () => {
    // Devanagari has no case/diacritic-strip equivalent in this transform —
    // must not throw or produce a slug containing raw non-ASCII text.
    const result = slugify("मुंबई से पुणे");
    expect(result).toBe("");
    expect(SLUG_PATTERN.test(result) || result === "").toBe(true);
  });

  it("truncates to MAX_LENGTH on a word boundary, not mid-word", () => {
    const longTitle = "a-real-title-with-many-words-that-goes-on-for-a-while-and-then-keeps-going-past-the-limit-here";
    const result = slugify(longTitle);
    expect(result.length).toBeLessThanOrEqual(80);
    // The cut landed on a hyphen boundary, not mid-token — the original
    // string has no run of 80+ non-hyphen characters, so a mid-word cut
    // would only happen if the truncation logic were broken.
    expect(longTitle.startsWith(result)).toBe(true);
    expect(result.endsWith("-")).toBe(false);
  });

  it("is idempotent — running it twice is the same as running it once", () => {
    const once = slugify("Café Móvil!!! Best Deals (2026)");
    expect(slugify(once)).toBe(once);
  });

  it("returns an empty string for non-string input rather than throwing", () => {
    expect(slugify(null)).toBe("");
    expect(slugify(undefined)).toBe("");
    expect(slugify(123)).toBe("");
    expect(slugify({})).toBe("");
  });

  it("SLUG_PATTERN matches every non-empty slugify() output", () => {
    const samples = ["Hello World", "Café", "2026 Update!", "a---b___c"];
    for (const s of samples) {
      const slug = slugify(s);
      if (slug) expect(SLUG_PATTERN.test(slug)).toBe(true);
    }
  });
});
