# Design Principles

The judgement layer. When a rule elsewhere does not cover your case, decide from these.

## 1. Why AI-generated mobile UI looks wrong

Web UI tolerates density, hover, wide canvases and mouse precision. Phones do not. The typical failure is not ugliness - it is *web thinking rendered on a 390 pt canvas*. Diagnose against this list first:

| Symptom | Root cause | Correction |
| --- | --- | --- |
| Everything in a rounded card | Cards used as the default container | Group with spacing and a section label; reserve cards for genuinely separable objects |
| Flat, nothing leads the eye | One text size, one weight, one colour | Assign a rank to every element; make ranks 1 and 2 visually obvious |
| Cramped or floaty | Arbitrary padding | One 4 pt scale, applied consistently |
| Cheap or toy-like | Emoji icons, oversized icons, saturated gradients | One icon set at 20/24, restrained colour, colour used for meaning |
| "Template" feel | Hero banner + 4 stat tiles + carousel | Design for the one job the screen does |
| Fine in the demo, broken in use | No empty/error/long-content states | Design all four states before coding |
| Doesn't feel native | Same UI on both platforms, no press feedback, no haptics, wrong header | Explicit Phase 4 platform pass |
| Unusable one-handed | Primary action at the top, controls at screen edges | Primary action in the bottom third |

## 2. The twelve principles

**1. One screen, one job.** If you cannot state the job in one sentence, the screen is two screens. Everything that does not serve that job is secondary, collapsible or on another screen.

**2. Hierarchy is the design.** Rank every element before styling anything. Rank 1 gets the most size, weight, contrast and space. If three things shout, nothing is heard.

**3. Content first, chrome last.** Real content - a real name, a real ₹-amount, a real timestamp - decides the layout. Never design around lorem ipsum, and never around the shortest possible string.

**4. Reduce, then arrange.** Delete before you decorate. Every border, shadow, icon and divider must justify its existence. The most common improvement to an AI-designed screen is removing 30% of it.

**5. Space is structure.** Proximity groups related things; distance separates unrelated things. Whitespace does the job that borders and cards are usually misused for.

**6. Consistency beats local optimisation.** A slightly worse component used consistently beats a slightly better one used once. Match the existing app even when you would have designed it differently.

**7. Feedback within 100 ms.** Every tap responds instantly - press state, haptic, optimistic update or spinner. A dead tap is read as a broken app.

**8. Design the unhappy path.** Loading, empty, error, offline, partial, expired, denied, long, zero, huge. These are most of real usage. They are not polish.

**9. Native, not imitative.** The app should feel at home on the platform while still looking like *your* product. Follow platform behaviour (back, gestures, sheets, keyboard, haptics); keep your own colour, type and personality.

**10. Motion explains, never entertains.** Animation shows where something came from, what changed or that work is happening. If it can be removed without losing meaning, remove it.

**11. Accessible by construction.** Targets, contrast, labels, dynamic type and reduced motion get decided while you write the element - never in a later pass.

**12. Trust is a visual property.** Especially with money. Clear numbers, honest states, no dark patterns, no fake progress, no decoration where confirmation belongs.

## 3. Mobile-first, not desktop-shrunk

- **Thumb zone.** The bottom third is easy, the middle is fine, the top corners are hard. Primary actions live low. Destructive actions never sit under the thumb by accident.
- **One hand, in motion.** Assume a moving user, one thumb, glare, a cracked screen and 4G. Design for a glance.
- **Vertical is cheap, horizontal is precious.** Scrolling down is natural; horizontal scrolling for primary content is not. Never introduce horizontal page scroll.
- **No hover.** Anything discoverable only by hovering does not exist. Affordances must be visible or standard (swipe, long-press) with a visible hint.
- **Interruption is normal.** Calls, notifications, backgrounding, OTP switching. Preserve state; never lose typed input.
- **Network is unreliable.** Optimistic where safe, cached where possible, honest where it fails.

## 4. Density: how much fits

Choose one density per screen and hold it.

| Density | Row height | Vertical gap | Use for |
| --- | --- | --- | --- |
| Comfortable | 64-72 | 16-24 | Home, wallet, dashboards, settings roots, onboarding |
| Standard | 56-64 | 12-16 | Transaction lists, search results, contacts, most lists |
| Compact | 44-52 | 8-12 | Long scannable data, statements, filter lists, pickers |

Never mix densities inside one scroll view. A comfortable header over a standard list is fine; three different row heights in one list is not.

## 5. The five-second test

Before implementing, imagine the built screen and answer:

1. What is this screen for? (Should be obvious in under a second.)
2. What is the most important number or fact? Is it visually first?
3. What do I do next? Is there exactly one obvious action?
4. Can I do it with my thumb without shifting my grip?
5. What happens if there is no data / it fails / the text is three lines?

Any "no" is a design defect, not a follow-up ticket.

## 6. When you must invent

You will often have no brand and no spec. Defaults in order:

1. **Existing project.** Tokens, components and patterns already in the repo win. Always.
2. **Platform convention.** How the OS does it is the users' existing mental model.
3. **Category convention.** How good apps in that category (banking, wallet, marketplace) do it - users bring those expectations.
4. **This skill's defaults.** The token contract and component rules here.

Never invent for novelty. "Modern" is not a justification. Every choice should survive the question *"what does this do for the user?"*

## 7. Signals of a premium mobile UI

Aim for these; they are what separates production apps from prototypes.

- Type is decisive: a big number, a clear title, quiet supporting text.
- The palette is mostly neutral. Brand colour appears rarely, and therefore means something.
- Spacing is on a grid, and optical alignment is corrected by eye where the grid lies.
- Surfaces are few: canvas, one surface level, one raised level. Not five.
- Icons are one set, one size, one weight, aligned to text baselines.
- Every press feels different from every non-press.
- Transitions are short, directional and interruptible.
- Empty and error states look designed, not forgotten.
- Numbers align on the decimal, with tabular figures.
- Nothing shifts, flickers or jumps after data loads.
