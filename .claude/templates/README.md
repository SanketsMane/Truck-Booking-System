# Templates

A drop-in starting point for a **new** project that has no design system yet.
It is the reference implementation of the token contract in
`../skills/mobile-product-engineer/references/design-system.md` — same names, same values.

**Do not paste these into a project that already has tokens or components.** Read
`../skills/mobile-product-engineer/references/project-integration.md` instead and use what
exists. Introducing a second design system is worse than living with an imperfect first one.

## Files

| File | Purpose |
| --- | --- |
| `theme/tokens.ts` | Spacing, layout, radius, type (incl. money styles), elevation, motion, sizing — plus the **private** raw palette |
| `theme/theme.ts` | `lightTheme` / `darkTheme`: semantic colour built from the palette, merged with the scales. Both satisfy one `Theme` type, so a missing dark value is a compile error |
| `theme/ThemeProvider.tsx` | `ThemeProvider`, `useTheme()`, `useThemedStyles()` |
| `components/Screen.tsx` | Safe areas, responsive gutter, max content width and scroll behaviour, solved once |
| `components/Button.tsx` | Default / pressed / disabled / loading, correct on both platforms |
| `components/states.tsx` | `Skeleton`, `EmptyState`, `ErrorState` |

## Adopting

1. Copy `theme/` into `src/theme/`.
2. Replace the `palette` literals in `tokens.ts` with your brand ramp. **Keep every token name
   in `theme.ts` unchanged.** `references/colors.md` explains how to derive a full accessible
   palette from a single brand hex.
3. Wrap the app: `<SafeAreaProvider>` → `<ThemeProvider>`.
4. Copy `components/`, then build the first screen on top of them.

## Usage

```tsx
const styles = useThemedStyles(({ color, spacing, radius, type }) => ({
  card: {
    backgroundColor: color.surface.raised,
    borderRadius: radius.lg,
    padding: spacing[5],
    gap: spacing[3],
  },
  title: { ...type.subtitle, color: color.text.primary },
  amount: { ...type.amountM, color: color.money.positive },
}));
```

No component contains a literal colour, size or duration. If you need a value that is not in
the theme, add it to the theme first — that is the whole point.

## Dependencies

- `react-native-safe-area-context` — required by `Screen`
- `react-native-reanimated` — used by `Skeleton`; drop the pulse if the project lacks it

Nothing else. Adapt the naming to the project's conventions rather than importing verbatim —
this is a starting point, not a library.
