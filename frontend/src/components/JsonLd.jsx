// Renders a schema.org JSON-LD block. dangerouslySetInnerHTML is safe here
// specifically because `data` is always a plain object this app builds
// itself (branding fields, FAQ copy) — never raw user input — and
// JSON.stringify can't produce a `</script>`-breaking sequence the way
// naively concatenating strings could.
export const JsonLd = ({ data }) => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
);

export default JsonLd;
