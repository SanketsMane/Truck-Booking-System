# Iconography

Icons are the fastest way to make an app look cheap. These rules are strict.

## 1. Hard rules

1. **Never use emoji as interface icons.** Emoji render differently per platform and OS version, do not respect your colour tokens, cannot be tinted, look like placeholders, and read badly to screen readers. The only acceptable emoji is user-generated content (a message, a note the user typed).
2. **One icon set for the whole app.** Mixing sets (outline + filled + duotone from different families) is the single most visible amateur signal.
3. **One weight and one style** - pick outline or filled and stay there, except where a filled variant marks a selected state (tab bars).
4. **Standard sizes only:** 16 (inline with small text), 20 (inline with body, list trailing), 24 (default UI icons, headers, tabs), 32 (feature/empty-state accents). Anything larger is an illustration, not an icon.
5. **Icons are never the only label** for a non-obvious action. Universal glyphs (back, close, search, share, add) may stand alone; everything else needs a label or at minimum an `accessibilityLabel`.

## 2. Choosing a set

Prefer, in order:
1. What the project already uses.
2. A single well-maintained set: Lucide (`lucide-react-native`), Phosphor, Feather, or the platform-flavoured Material Symbols / SF Symbols where the app is deliberately platform-native.
3. A custom SVG set exported at 24x24 on a consistent grid.

Implementation: `react-native-svg` based sets, tinted via `color` props from theme tokens. Avoid icon fonts (poor scaling, poor accessibility) and PNG icons (blurry, non-tintable) for UI chrome.

## 3. Sizing and alignment

- Icon and adjacent text share an optical centreline: for a 16/24 body line, a 20 icon usually sits 1 px above true centre. Nudge by eye.
- Icon-to-label gap: 8 (buttons, rows), 4 (dense chips, badges).
- Icons inside a container (a "category" circle) use a 40 container with a 20 icon, or a 48 container with 24. Never a 24 icon floating in a 64 box.
- In list rows, a leading icon container is 40x40 with `brand.primarySubtle` or `surface.sunken` background and radius `md`/`pill` - consistent across the list.

## 4. Colour

- Default `text.secondary`; `text.primary` when the icon is the main affordance; `brand.primary` for active/selected; `status.*.base` for status.
- Icons must reach 3:1 contrast when they carry meaning. Decorative icons are exempt but should still be visible.
- Never multi-colour an icon set for decoration. Category colour-coding is acceptable when the palette is defined and each category also has a distinct glyph.

## 5. Common misuse

| Misuse | Fix |
| --- | --- |
| 64 px icons above every menu row | 24 icon in a 40 container, or no icon at all |
| Emoji category icons | Real icon set with a tinted container |
| Two different sets in one screen | Standardise on one |
| Icon-only toolbar with 5 ambiguous glyphs | Labels, or fewer actions |
| A "back" arrow that is a left chevron on one screen and an arrow on another | One glyph app-wide, platform-appropriate |
| Icons scaled to non-standard sizes (18, 22, 27) | Snap to 16/20/24/32 |
| Icon buttons with a 24x24 hit area | 48x48 hit area, icon stays 24 |

## 6. Accessibility

```tsx
// Decorative - hidden from screen readers
<Icon name="chevron-right" accessibilityElementsHidden importantForAccessibility="no" />

// Meaningful, icon-only button
<Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
  <Icon name="x" size={24} color={color.text.primary} />
</Pressable>
```

- Decorative icons inside a labelled row must be hidden so the reader does not announce them.
- Never rely on a red/green icon colour alone - the glyph itself must differ (check vs cross vs clock).

## 7. App icon and splash (project setup)

- App icon: a single mark, legible at 48 px, no text, no screenshots, safe-area aware for Android adaptive icons (foreground within the centre 66%).
- Splash: brand mark on a solid brand or neutral background; must match the first frame of the app to avoid a visible jump. Configure for both platforms and both themes.
