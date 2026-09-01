# Example — Profile / settings screen

The screen most often ruined by over-carding. It is a list. Treat it as one.

---

## Phase 1 — Understand

**Requirement:** "A profile screen with the user's settings."

| Question | Answer |
| --- | --- |
| One job | Let the user find and change one specific thing, fast |
| User | Arrives with a *specific* intent ("turn off notifications", "change my PIN", "log out") — almost never browsing |
| Most important information | Identity confirmation (this is my account) + the settings list |
| Primary action | None. This screen has no single CTA — it is a directory. |
| Secondary actions | Every row |
| Destructive | Log out, delete account |
| Edge cases | No avatar; unverified account; long name; a section only visible to some users; a setting that fails to save |

**Key insight:** a settings screen with a prominent CTA is a design error. Findability is the entire job.

## Phase 2 — UX architecture

```
1  Identity header           name, masked identifier, avatar, verification state
2  Account & security        personal details, bank accounts, PIN, biometrics, sessions
3  Preferences               notifications, language, theme, currency
4  Support                   help, contact, report a problem
5  Legal                     terms, privacy, licences
6  Sign out                  separated, last
7  App version               small, muted, at the very bottom
```

Ordering principle: **frequency of use, descending**, with destructive actions last and visually separated.

Navigation: root tab or pushed from a header avatar. Every row pushes a screen or opens a sheet; nothing important happens inline except toggles.

States:

| State | Behaviour |
| --- | --- |
| Loading | Skeleton the identity header only. The settings list is static — render it immediately. |
| Error (profile failed) | Identity header shows a retry; the settings list still works. Never block settings on a failed profile fetch. |
| Toggle saving | Optimistic switch + a subtle inline indicator; revert with a toast on failure |
| Unverified account | An inline banner in the identity area with a "Verify now" action — not a modal on every visit |

## Phase 3 — Visual design

| Element | Decision |
| --- | --- |
| Identity header | Avatar 64 (initials fallback with a deterministic colour), name in `title` 22, masked phone/email in `bodySmall` `text.secondary`, a verification chip if relevant. Full-bleed section, **not a card**. |
| Sections | Label in `label` 13 `text.secondary`, 24 above / 8 below. Rows grouped in one `surface.default` container per section with 12 radius and hairline dividers between rows. |
| Rows | 56 tall. Icon 20 in `text.secondary` · label `body` 16 `text.primary` · optional value or chevron right. Value text `body` `text.secondary`. |
| Toggles | Platform switch, right-aligned, applying immediately. **No Save button anywhere on this screen.** |
| Destructive | "Log out" in `status.error.text` as its own single-row group, separated by 32. "Delete account" inside Account settings, not on the main list. |
| Version | `caption` 12 `text.tertiary`, centred, 24 below the last group. Tappable 7× for a debug menu if the project wants one. |
| Icons | One consistent set, one weight, `text.secondary` — not brand-coloured. Coloured icons on every row is a classic noise failure. |
| Spacing | Gutter 16, section gap 24, list bottom padding clears the tab bar. |

**Rejected:**
- One card per row — 18 cards on a screen, the single most recognisable over-carding failure.
- Coloured icon backgrounds per row — decoration that slows scanning.
- A big "Edit profile" CTA — the rows *are* the actions.
- Log out as a red full-width button at the top — the most destructive action in the most reachable position.
- An avatar hero with a gradient — this is a utility screen.

## Phase 4 — Platform adaptation

| | Android | iOS |
| --- | --- | --- |
| Header | Small top app bar "Profile" | Large title "Profile", collapsing |
| Row feedback | Bounded ripple | Opacity + chevron |
| Switch | Material switch | iOS switch |
| Section style | Label above a grouped container | Grouped-list feel, same structure |
| Log out confirm | Material dialog: [Cancel] [Log out] | `Alert` with `destructive` style |
| Chevron | Optional on Android (ripple implies tappability) | Expected on iOS |
| Theme setting | Include a Light/Dark/System row if the app offers an override | Same |

## Phase 5 — Implementation notes

- One `SettingsRow` component with variants: `navigation` (chevron), `toggle` (switch), `value` (text + chevron), `destructive`. Everything on the screen is that one component — this is what keeps it consistent.
- Sections defined as **data**, not JSX, so visibility rules (feature flags, KYC state, role) are declarative and testable.
- Rendered with a `SectionList` for free sticky headers and virtualisation.
- Toggles are optimistic with rollback + toast on failure.
- Log out clears secure storage, cached queries and in-memory state before navigating. -> `security-ux.md`
- Accessibility: each row is one node with `accessibilityRole="button"` (or `"switch"` with `checked` state); the identity header is a `header`.

## Phase 6 — Visual QA findings

| Found | Fix |
| --- | --- |
| Every row was its own card — 18 cards | Grouped into 5 section containers |
| Log out was a red button at the top | Moved to its own group at the bottom, text style |
| Switches paired with a Save button | Save removed; toggles apply immediately |
| Long names overlapped the verification chip | Name truncates to 1 line; chip moved below |
| At 2.0× font scale rows clipped at fixed height 56 | `minHeight: 56` and let content grow |
| Avatar initials had no fallback for a single-word name | Fallback handles 1-word and empty names |
| Version text was `text.primary` and competed with rows | Moved to `text.tertiary` `caption` |

## Rules for any settings screen

1. It is a list. Sections, not cards-per-row.
2. Order by frequency of use.
3. Destructive actions last, separated, never primary-styled.
4. Toggles apply immediately — never a Save button.
5. One row component, variant-driven.
6. Sections as data, so visibility rules stay declarative.
7. No hero CTA.
8. `minHeight`, never fixed height.
