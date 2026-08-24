const { sanitizeBody, htmlToText, readingMinutes } = require("../../utils/sanitizeContent");

describe("sanitizeBody", () => {
  it("removes a <script> tag and its content entirely, not just the tag", () => {
    const result = sanitizeBody('<p>ok</p><script>alert(1)</script>');
    expect(result).toBe("<p>ok</p>");
    expect(result).not.toMatch(/<script/i);
    expect(result).not.toContain("alert(1)");
  });

  it("strips event-handler attributes", () => {
    expect(sanitizeBody('<p onclick="steal()">hi</p>')).not.toMatch(/onclick/i);
  });

  it("strips a javascript: href", () => {
    const result = sanitizeBody('<a href="javascript:alert(1)">x</a>');
    expect(result).not.toContain("javascript:");
  });

  it("drops a data: image URI instead of allowing it", () => {
    expect(sanitizeBody('<img src="data:text/html;base64,PHNjcmlwdD4=">')).toBe("");
  });

  it("drops an insecure http:// image URI", () => {
    expect(sanitizeBody('<img src="http://insecure.com/x.png">')).toBe("");
  });

  it("keeps a same-origin /files/ image", () => {
    expect(sanitizeBody('<img src="/files/abc123" alt="cover">')).toContain('src="/files/abc123"');
  });

  it("keeps a real https:// image", () => {
    expect(sanitizeBody('<img src="https://cdn.example.com/x.png">')).toContain("https://cdn.example.com/x.png");
  });

  it("forces nofollow/noopener/noreferrer + target=_blank on an external link", () => {
    const result = sanitizeBody('<a href="https://evil.com">x</a>');
    expect(result).toContain('rel="nofollow noopener noreferrer"');
    expect(result).toContain('target="_blank"');
  });

  it("does NOT force rel/target on an internal (relative) link", () => {
    const result = sanitizeBody('<a href="/blog/another-post">see also</a>');
    expect(result).not.toMatch(/rel=/);
    expect(result).not.toMatch(/target=/);
  });

  it("strips class/style/id/data-* from every tag", () => {
    const result = sanitizeBody('<p class="foo" style="color:red" id="x" data-track="y">styled</p>');
    expect(result).toBe("<p>styled</p>");
  });

  it("unwraps a disallowed-but-benign tag to its text content", () => {
    // The page's own <h1> is the post title — an author-inserted <h1>
    // inside the body must not survive as a second h1, but the words
    // themselves should still show up (folded into surrounding flow).
    expect(sanitizeBody("<h1>Should not survive as h1</h1>")).toBe("Should not survive as h1");
  });

  it("returns an empty string, not a crash, for empty/undefined input", () => {
    expect(sanitizeBody("")).toBe("");
    expect(sanitizeBody(undefined)).toBe("");
    expect(sanitizeBody(null)).toBe("");
  });

  it("keeps ordinary table markup intact", () => {
    const result = sanitizeBody("<table><tr><td>cell</td></tr></table>");
    expect(result).toContain("<table>");
    expect(result).toContain("cell");
  });
});

describe("htmlToText", () => {
  it("strips tags and decodes entities into a single whitespace-collapsed line", () => {
    expect(htmlToText("<p>Hello &nbsp; <strong>world</strong></p>")).toBe("Hello world");
  });

  it("returns an empty string for empty input", () => {
    expect(htmlToText("")).toBe("");
    expect(htmlToText(undefined)).toBe("");
  });
});

describe("readingMinutes", () => {
  it("is never less than 1, even for empty text", () => {
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes(undefined)).toBe(1);
  });

  it("rounds to the nearest minute at 200 words/minute", () => {
    expect(readingMinutes(Array(200).fill("word").join(" "))).toBe(1);
    expect(readingMinutes(Array(600).fill("word").join(" "))).toBe(3);
    expect(readingMinutes(Array(1000).fill("word").join(" "))).toBe(5);
  });
});
