# Spacing & Layout

Spacing is structure. Values come from `design-system.md`; this is how to apply them.

## 1. The scale

`0 · 2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`

Nothing between these values. If 14 feels right, the correct answer is 12 or 16 - the difference is invisible, the inconsistency is not.

## 2. Screen gutter

```
width < 400 dp  -> 16
width >= 400 dp -> 20
width >= 600 dp -> 24, and cap content width at 640, centred
```

Every element aligns to this left edge: header title, section labels, body text, row content, buttons. Exceptions, and only these:
- Full-bleed images and carousels (start at the gutter, bleed off the right edge).
- Dividers that intentionally run edge-to-edge (list separators between rows usually inset to the content start instead, e.g. after an avatar).
- Sticky headers with a background that must reach the screen edges (their *content* still respects the gutter).

## 3. Vertical rhythm

| Relationship | Gap |
| --- | --- |
| Icon to its label | 4-8 |
| Label to its value | 2-4 |
| Lines within a paragraph block | 4 |
| Between items in a group (form fields, rows) | 12-16 |
| Between sub-groups | 24 |
| Between major sections | 32 |
| Above a full-width primary CTA | 24-32 |
| Below the header, before first content | 16-24 |
| Bottom of scroll content | `16 + insets.bottom (+ tabBarHeight)` |

Pick the gaps once per screen and repeat them. Three different section gaps on one screen reads as sloppiness even to non-designers.

## 4. Component padding

| Component | Padding |
| --- | --- |
| Card | 16 (compact) / 20 (comfortable) |
| Grouped row container | 0 outer; each row 16 horizontal, 12-16 vertical |
| List row | 16 horizontal, vertical derived from row height |
| Button | horizontal 16-24, vertical derived from height; icon-to-label 8 |
| Input | horizontal 16, vertical to reach 52 height |
| Chip | horizontal 12, vertical 6-8 |
| Badge | horizontal 8, vertical 2-4 |
| Bottom sheet | 20 horizontal, 12 top (below handle), 16 + inset bottom |
| Dialog | 24 all round |
| Empty state | 32 horizontal, 48 vertical |

## 5. Use `gap`, not margins

React Native supports `gap`, `rowGap`, `columnGap` in flex containers. Prefer them:

```tsx
// good - the container owns the rhythm
<View style={{ gap: spacing[4] }}>{children}</View>

// avoid - every child owns a piece of the rhythm, and the last one is wrong
<View>{items.map(i => <Row style={{ marginBottom: 12 }} />)}</View>
```

Benefits: no trailing margin, no margin collapse confusion, no conditional `isLast` logic. For lists use `ItemSeparatorComponent` or `contentContainerStyle.gap`.

Never mix: a container with `gap` whose children also have margins produces values that are not on the scale.

## 6. Touch targets and spacing

- Minimum interactive area 48x48, even when the visual is 24x24 - expand with padding or `hitSlop`.
- Minimum 8 between adjacent targets; 12 for destructive actions next to safe ones.
- Icon buttons in headers: 48x48 hit area, icon 24, so the visual gap between two header icons should be 4-8 while the hit areas remain non-overlapping.
- Full-width rows are targets: the whole row is pressable, not just the text.

## 7. Alignment discipline

- One left edge per screen. Sub-content indents only when it is genuinely subordinate (a nested item under a parent), by exactly one step (16 -> 32).
- Right-edge elements (amount, chevron, switch) align to the gutter on the right too.
- Icon + text rows: align icon centre to the first line's optical centre, not to the whole text block, when text can wrap to two lines.
- Numbers align right; text aligns left. Never centre-align columns of data.
- Centre-alignment is for: empty states, success screens, onboarding, dialog titles, and nothing else.

## 8. Section structure

```
[32 gap]
Section label            <- overline or label, text.secondary, gutter-aligned
[8-12 gap]
Section content
[32 gap]
Next section label
```

Section labels are optional; if a section is self-evident (a balance card), skip the label rather than inventing one.

## 9. Scroll content

- `contentContainerStyle` carries the padding, never the `ScrollView`'s `style` - otherwise the scrollbar insets and the bounce background look wrong.
- Top padding after the header: 16-24. Bottom padding: `16 + insets.bottom + (tabs ? tabBarHeight : 0) + (stickyFooter ? footerHeight : 0)`.
- Add `keyboardShouldPersistTaps="handled"` on any scroll view containing inputs or buttons.
- Never nest vertical scrolls. Horizontal carousels inside a vertical scroll are fine.

## 10. Common spacing defects

| Defect | Fix |
| --- | --- |
| Values like 14, 18, 22, 30 | Snap to the scale |
| Last item flush against the tab bar | Add `insets.bottom + tabBarHeight` to content padding |
| Equal gaps between everything | Vary 12 / 24 / 32 to express grouping |
| Padding on both a wrapper and its child | Decide which owns the space; remove the other |
| Symmetric padding on an asymmetric row | Rows with a trailing chevron often need 12 right, 16 left |
| Huge empty screen with a tiny form | Increase rank-1 size or centre the block vertically; do not just add padding |
| Different card padding across the app | One card padding token, applied everywhere |
