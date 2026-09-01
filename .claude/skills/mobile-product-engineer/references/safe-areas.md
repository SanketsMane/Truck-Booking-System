# Safe areas

Insets are read from the system, never guessed. A magic number here is a bug on some device you do not own.

## 1. The rule

```tsx
const insets = useSafeAreaInsets(); // react-native-safe-area-context
```

- **Backgrounds, images, headers, sheets, gradients** extend edge-to-edge, under the bars.
- **Content and touch targets** respect insets.
- Never hardcode 44, 47, 34, 24 or any device-specific value.
- Never wrap the whole app in `<SafeAreaView>` and call it done — it produces dead bands of background colour above and below, and it cannot express "background goes under, content does not".

## 2. `SafeAreaView` vs `useSafeAreaInsets`

| Use | When |
| --- | --- |
| `useSafeAreaInsets()` + explicit padding | Default. Full control over which edge, and whether padding or margin. |
| `<SafeAreaView edges={['top']}>` | Simple screens where a whole edge needs uniform inset |
| React Navigation's built-in header/tab insets | Already handled — do **not** add your own on top, or you double-pad |

Double-padding is the most common inset bug: a navigator header already applies the top inset, and the screen adds it again.

## 3. Common patterns

**Screen with a navigator header + tab bar:** the navigator handles top and bottom. Your screen adds only horizontal gutter and content padding.

**Full-bleed screen (no header):**
```tsx
<View style={{ flex: 1, paddingTop: insets.top }}>
```

**Bottom-pinned primary CTA:**
```tsx
paddingBottom: Math.max(insets.bottom, spacing.md)
```
The `max` matters: on devices with no home indicator `insets.bottom` is 0, and a CTA flush to the screen edge looks broken.

**Scroll view whose content must clear a pinned CTA or tab bar:**
```tsx
contentContainerStyle={{ paddingBottom: insets.bottom + CTA_HEIGHT + spacing.lg }}
```
The last list row must be fully readable and tappable, not tucked under the bar.

**Bottom sheet:** the sheet library usually handles the bottom inset — verify rather than assume. Content inside the sheet still needs its own bottom padding.

**Absolutely positioned floating elements** (FAB, banner, toast): offset by `insets.bottom` plus the height of any bar they sit above.

## 4. Horizontal insets

Landscape on notched devices produces non-zero `insets.left` / `insets.right`. If the app supports landscape or runs on tablets:

```tsx
paddingHorizontal: gutter + Math.max(insets.left, insets.right)
```

## 5. Keyboard interaction

When the keyboard is open, the bottom inset should effectively collapse — you do not want home-indicator padding *plus* keyboard height. `react-native-keyboard-controller` handles this; with `KeyboardAvoidingView`, subtract the inset from the offset. -> `keyboard-and-input.md`

## 6. Modals and portals

Content rendered in a native modal or a portal is often **outside** the provider tree. Ensure `SafeAreaProvider` wraps the app root, and that modal content re-reads insets. Sheets and modals commonly show inset bugs that the underlying screen does not.

## 7. Status bar

- Set `barStyle` per screen based on what is behind it — light content over a dark hero, dark content over a light canvas. Getting this wrong makes the clock invisible.
- Android: `translucent` + transparent background for edge-to-edge. -> `android.md`
- Changing screens must update the bar style; use the navigator's focus events or a `<StatusBar>` per screen.

## 8. Verify on

| Class | Why |
| --- | --- |
| iPhone SE (small, no notch, `insets.bottom === 0`) | Catches `max()` bugs and cramped layouts |
| iPhone with Dynamic Island | Largest top inset |
| Android gesture navigation | Small bottom inset |
| Android 3-button navigation | Large bottom inset |
| Tablet / foldable, landscape | Horizontal insets, max content width |

## 9. Failure signatures

| Symptom | Cause |
| --- | --- |
| Content under the clock | Top inset not applied on a headerless screen |
| Big empty band under the header | Double-applied top inset |
| CTA touching the screen bottom | `insets.bottom` is 0 and no `max()` floor |
| Last list item unreachable | Missing bottom `contentContainerStyle` padding |
| Home indicator overlapping a button | Bottom inset ignored on a pinned element |
| Invisible status bar clock | Wrong `barStyle` for the background behind it |
