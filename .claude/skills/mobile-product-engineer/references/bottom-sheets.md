# Bottom Sheets

The most over-used component in modern mobile UI. Powerful when the user must keep context; noise when it is a lazy container.

## 1. When to use one

**Yes:**
- A short sub-task where the underlying screen matters (choose an account while seeing the amount).
- Selecting one option from 4-10.
- A contextual action menu for a specific item (long-press a transaction).
- A confirmation that needs more than a title and two buttons (a payment summary).
- Progressive disclosure of detail without leaving the list.

**No:**
- Content longer than ~70% of the screen -> use a full screen.
- A multi-step flow -> use a modal stack.
- A blocking yes/no decision -> alert dialog.
- Purely informational -> toast, banner or inline text.
- Something the user will return to often -> a real screen with a route.
- Anything that must be deep-linkable or shareable.

**Never stack sheets.** A sheet opening another sheet is a structural mistake: either the first should have been a screen, or the second should replace the first's content with a back affordance inside the same sheet.

## 2. Anatomy

```
[scrim: surface.scrim, fades in over base duration, tappable to dismiss]
[sheet: surface.raised, top radius xl-xxl (20-28), elevation 3]
   [handle: 36x4, radius pill, border.default, 12 top margin]      <- only if draggable
   [header: title (subtitle 17/600) + optional close icon 24]
   [content: 20 horizontal padding, scrollable if needed]
   [footer: primary CTA, 16 top, 16 + insets.bottom bottom]
```

- Bottom padding always includes `insets.bottom` - a CTA sitting on the home indicator is a classic defect.
- The handle is a promise: show it only if the sheet is actually draggable.
- A close button is required when the sheet is not dismissible by tapping the scrim.

## 3. Detents (snap points)

- Prefer **content height** for short sheets - do not stretch a 3-option list to 50%.
- Two detents maximum for most cases: e.g. `['50%', '90%']` for a list with search.
- Never a detent above ~92% - leave visible context, otherwise use a full-screen modal.
- The first detent must show the primary action or make it obviously reachable.
- Snapping is spring-based and follows the finger; velocity decides the destination detent.

## 4. Behaviour

| Behaviour | Rule |
| --- | --- |
| Dismiss | Scrim tap, swipe down, close button, Android hardware back - all four unless the sheet is blocking |
| Blocking sheets | Only for in-progress operations (payment processing); disable all dismissal and say why |
| Unsaved input | Confirm before dismissing |
| Keyboard | Sheet moves with the keyboard; the focused field and CTA stay visible (`android:windowSoftInputMode="adjustResize"`, `keyboardBehavior="interactive"`) |
| Scroll | Content scrolls internally; dragging from the top of a scrolled-to-top list drags the sheet |
| Rotation / resize | Re-measure; do not leave the sheet at a stale height |
| Background | The screen behind may scale/dim slightly on iOS-style sheets; keep it subtle |

## 5. Motion

- Enter: `base`-`slow` (220-320 ms) with `decelerate` easing, or a spring (`damping 20, stiffness 180`).
- Exit: `base` (220 ms) with `accelerate`.
- Scrim fades in parallel, never after.
- Gesture-driven movement follows the finger 1:1 with rubber-banding past the top detent.
- Interruptible: a new drag during the close animation takes over.
- Under reduce-motion, fade the sheet in place instead of sliding.

## 6. Implementation

Preferred: `@gorhom/bottom-sheet` (mature, gesture-handler + Reanimated based) or React Navigation's native bottom-sheet/formSheet presentation for route-level sheets.

```tsx
<BottomSheetModal
  ref={ref}
  snapPoints={snapPoints}              // or enableDynamicSizing
  backdropComponent={Backdrop}         // pressBehavior="close"
  handleIndicatorStyle={{ backgroundColor: color.border.default }}
  backgroundStyle={{ backgroundColor: color.surface.raised, borderRadius: radius.xxl }}
  keyboardBehavior="interactive"
  android_keyboardInputMode="adjustResize"
  enablePanDownToClose
  accessible
  accessibilityViewIsModal
/>
```

Requirements:
- Root must be wrapped in `GestureHandlerRootView` and `BottomSheetModalProvider`.
- Use `BottomSheetScrollView` / `BottomSheetFlatList` for scrollable content, never a plain one - the gesture handoff breaks otherwise.
- Handle Android hardware back to close the sheet, not the screen.
- Render sheets above tab bars and inside the navigation tree so they participate in navigation state.

Do **not** hand-roll a sheet with `Modal` + `Animated.View` unless the project genuinely cannot take the dependency; hand-rolled sheets consistently fail on keyboard, gesture handoff, and back handling.

## 7. Accessibility

- `accessibilityViewIsModal` (iOS) and `importantForAccessibility="no-hide-descendants"` on the background (Android), so the reader cannot wander behind the sheet.
- Move focus to the sheet title on open; return focus to the trigger on close.
- Announce the sheet ("Choose account, dialog").
- The close button has a real label; the scrim is not the only way out.
- Reduce-motion respected.

## 8. Common defects

| Defect | Fix |
| --- | --- |
| CTA under the home indicator | `paddingBottom: insets.bottom + 16` |
| Keyboard covers the field inside the sheet | `keyboardBehavior="interactive"` + adjustResize |
| Hardware back closes the screen instead of the sheet | Handle back in the sheet |
| Sheet opens another sheet | Restructure to one sheet with internal navigation, or a screen |
| Sheet at 95% height | Use a full-screen modal |
| Handle shown but the sheet cannot be dragged | Remove the handle or enable dragging |
| Sheet content jumps when the keyboard opens | Fixed snap points + interactive keyboard behaviour |
| Scrim missing so the background looks interactive | Always dim, 40-50% |
