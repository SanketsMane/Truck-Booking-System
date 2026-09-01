# Haptics

Haptics confirm that the system registered something meaningful. Overused, they become noise and users disable them.

## 1. Rules

1. Haptics **accompany** feedback; they never replace visual feedback.
2. Fire on **discrete, meaningful** events — not on scroll, not per keystroke, not on every render.
3. Respect the system setting and any in-app toggle. Never force haptics on.
4. Never a haptic without a corresponding visual change.
5. Android devices vary enormously in actuator quality — do not build an experience that depends on a subtle waveform.

## 2. Vocabulary

Using `expo-haptics` (or `react-native-haptic-feedback` on bare RN):

| Type | Use for |
| --- | --- |
| `Selection` | Value changed within a set: segmented control, picker wheel, tab, chip, stepper |
| `Impact.Light` | Small confirmation: toggle, checkbox, chip select, threshold crossed |
| `Impact.Medium` | Meaningful commit: sheet snap, long-press activation, item picked up for reorder |
| `Impact.Heavy` | Rare. A significant, deliberate commit — use sparingly |
| `Notification.Success` | Payment succeeded, verification passed, account added |
| `Notification.Warning` | A cautionary state the user must notice |
| `Notification.Error` | Payment failed, wrong PIN, validation blocked submission |

## 3. Mapping by event

| Event | Haptic |
| --- | --- |
| Standard button tap | **none** — visual press feedback is enough |
| Primary CTA that commits money | Impact Medium on tap, Notification Success/Error on result |
| Toggle / checkbox | Impact Light |
| Segmented control / tab / picker | Selection |
| Long-press activated | Impact Medium, at the threshold |
| Swipe action threshold crossed | Impact Light |
| Sheet snapped to a detent | Impact Light |
| Pull-to-refresh triggered | Impact Light |
| Drag pick-up / drop | Medium / Light |
| OTP filled, auto-submitting | Impact Light |
| Form validation failed on submit | Notification Error |
| Transaction succeeded | Notification Success |
| Transaction failed / declined | Notification Error |
| Biometric prompt succeeded | Notification Success (if the OS did not already) |
| Copy to clipboard | Impact Light |
| Item deleted (with undo available) | Impact Light |

**Do not** haptic on: scrolling, list rendering, screen transitions, keyboard keys, toast appearance, tab bar scroll-to-top, or anything happening more than a few times per minute.

## 4. Platform reality

- **iOS**: Taptic Engine is precise and consistent. The vocabulary above maps directly. Silent mode does not disable haptics; Settings → Sounds & Haptics does.
- **Android**: quality ranges from excellent to a coarse buzz. Prefer the shorter, lighter types. `Notification.*` may be synthesised as a pattern. Requires the `VIBRATE` permission (normal, no runtime prompt). Very old or budget devices may only manage a blunt vibration — never rely on distinguishing Light from Medium.

Wrap haptics in one small module so the mapping lives in one place and can be globally disabled:

```ts
// haptics.ts — single source of truth
export const haptic = {
  select: () => run(Haptics.selectionAsync),
  light:  () => run(() => Haptics.impactAsync(Light)),
  medium: () => run(() => Haptics.impactAsync(Medium)),
  success:() => run(() => Haptics.notificationAsync(Success)),
  error:  () => run(() => Haptics.notificationAsync(Error)),
};
```

`run` checks the user preference and swallows errors — a device without an actuator must never throw.

## 5. Settings and accessibility

- Offer a Haptics toggle in settings for apps that use them heavily; persist and honour it everywhere.
- Some users rely on haptics as their primary confirmation channel — for them, the money-movement haptics matter most. Keep those; trim the decorative ones.
- Never use a haptic as the *only* indication of an error.

## 6. Fintech specifics

- Success/error on a payment result is high value: the user often looks away while it processes.
- Never a celebratory haptic burst on a routine transfer.
- Never haptic feedback on each digit of an amount.
- A distinct error haptic on a wrong PIN/biometric failure is helpful and expected.

## 7. QA

- [ ] Test on a real device — simulators do not vibrate
- [ ] Test on a low-end Android device
- [ ] Nothing fires repeatedly during scroll or typing
- [ ] Every haptic has a paired visual change
- [ ] Respects the system/app setting
- [ ] No crash on a device with no vibration hardware
