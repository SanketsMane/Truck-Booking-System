# Typography

Type does most of the hierarchy work. Values are fixed by `design-system.md`; this file is how to apply them.

## 1. The scale, and what each role means

| Role | Size/LH/Weight | Use it for | Never |
| --- | --- | --- | --- |
| `display` 34/40/700 | One hero number or onboarding statement | Body text |
| `headline` 28/34/700 | Large-title screen headers | More than once per screen |
| `title` 22/28/700 | Dialog titles, section heroes, empty-state titles | Row titles |
| `subtitle` 17/24/600 | Nav bar title, card title, emphasised row title | Long paragraphs |
| `body` 16/24/400 | The default. Paragraphs, row primary text | Metadata |
| `bodyStrong` 16/24/600 | The one line in a block that matters | Whole paragraphs |
| `bodySmall` 14/20/400 | Secondary row text, descriptions, helper prose | Primary content |
| `label` 13/18/600 | Field labels, tab labels, badges, small buttons | Sentences |
| `caption` 12/16/400 | Timestamps, footnotes, helper text | Anything actionable |
| `overline` 11/14/700 +0.8 caps | Section headers | More than 3 words |

**Per-screen budget: at most 5 roles. Per component: at most 3.**

## 2. Numeric type

Money and any column of numbers use the `amount*` roles with tabular figures:

```tsx
<Text style={{ ...type.amountL, fontVariant: ['tabular-nums'], color: color.text.primary }}>
```

- Tabular figures stop digits jitter during count-ups and keep columns aligned.
- Right-align amounts in lists so decimals line up.
- Currency symbol at `0.6-0.7x` the amount size, aligned to the cap height, in `text.secondary` when the number is the hero.
- Decimals may be de-emphasised (smaller and/or `text.secondary`) on a hero balance, but never dropped or hidden.
- Never let an amount shrink to fit; wrap the layout instead. Never truncate money with an ellipsis.

## 3. Weight, not just size

- Two weights carry most designs (400 and 600) plus 700 for heroes. Avoid 300 and below - thin weights look weak and fail contrast perception on OLED.
- On Android, `fontWeight: '600'` may fall back to 400 or 700 unless the font family has that face. Register named families (`Inter-SemiBold`) and map weight -> family, or use a variable font.
- Do not fake bold with `letterSpacing` or borders.

## 4. Line height and tracking

- Line height is baked into the type token; never override it ad hoc.
- Body text: 1.5x size. Headings: 1.15-1.25x. Single-line labels may go 1.2x.
- Negative tracking on large text (-0.2 to -0.6) makes headings look intentional. Positive tracking (+0.2 to +0.8) only on small caps/overline.
- Never set `lineHeight` smaller than the font size - it clips descenders on Android.

## 5. Fonts

- Prefer one family with 3-4 weights. Two families maximum (one for numerals/display, one for UI) and only with a reason.
- System fonts (`San Francisco` on iOS, `Roboto` on Android) are a legitimate premium choice: they are optimised, free, and load instantly. Use `Platform.select` or leave `fontFamily` undefined.
- A custom family must be loaded before first paint (`expo-font` + splash hold, or `react-native.config.js` asset linking). Never allow a font swap flash.
- Verify the family includes: the currency symbols you need, tabular figures, and the scripts of your locales.
- Fallback stack always ends at the system font.

## 6. Colour and contrast

| Text token | Minimum contrast on its background |
| --- | --- |
| `text.primary` | 7:1 target, 4.5:1 absolute floor |
| `text.secondary` | 4.5:1 |
| `text.tertiary` | 3:1 - metadata only, never essential |
| `text.disabled` | Exempt, but must still be legible enough to read the label |
| Text on `brand.primary` | 4.5:1 - check both light and dark themes |

Never place body text on an image or gradient without a scrim or verified contrast at every stop.

## 7. Truncation and overflow

- Names, merchants, titles: `numberOfLines={1}` with `ellipsizeMode="tail"`, and give the row a flexible width so the amount never gets pushed off.
- Two-line clamp for descriptions; three lines is the practical maximum in a list.
- Never truncate: amounts, statuses, dates, error messages, CTA labels.
- Long single words (emails, IDs, UPI handles) need `flexShrink: 1` on the text and `minWidth: 0` on the flex parent, or they push siblings off-screen.
- Provide the full value somewhere: detail screen, long-press to copy, or accessibility label.

## 8. Dynamic type / font scaling

- Respect the OS font-size setting. Test at 130% and 200%.
- Do **not** set `allowFontScaling={false}` globally. Restrict it to genuinely fixed-geometry elements (a tab bar label, a badge count), and even then prefer `maxFontSizeMultiplier`.
- Recommended caps: headings `1.3`, body `1.6`, labels/badges `1.2`.
- Layouts must reflow, not clip: rows grow taller, buttons wrap to two lines or stack vertically, and horizontal row layouts switch to vertical at large scales.
- Fixed heights break under scaling. Use `minHeight` for rows and buttons instead of `height`.

## 9. Writing style in UI (see `microcopy.md`)

- Sentence case for everything except `overline`. Never Title Case Every Word.
- No ALL CAPS body text; caps are for `overline` only.
- No trailing colons on field labels.
- Numbers, dates and currencies always via `Intl` formatters with the user's locale, never hand-concatenated.

## 10. React Native implementation

```tsx
// Central Text component - the only place raw <Text> is allowed
export function Text({ variant = 'body', color = 'primary', ...rest }: TextProps) {
  const t = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={SCALE_CAP[variant]}
      {...rest}
      style={[t.type[variant], { color: t.color.text[color] }, rest.style]}
    />
  );
}
```

Rules:
- Ban raw `<Text>` outside this component via lint if possible.
- Never put `fontSize` in a screen file.
- Set `includeFontPadding: false` and `textAlignVertical: 'center'` on Android for precise vertical centring of single-line text in fixed-height rows.
- Avoid nesting `<Text>` inside `<Text>` for styling more than one level deep on Android; it interacts badly with line height.
