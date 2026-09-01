# Microcopy

Copy is interface. Vague words make a screen feel unfinished faster than any visual flaw.

## 1. Principles

1. **Say what happens.** "Send ₹500" beats "Submit". "Delete account" beats "OK".
2. **Front-load the meaning.** Users scan the first two words.
3. **Second person, active voice, present tense.** "You'll get a receipt by email."
4. **No jargon and no internal vocabulary.** Not "KYC pending" → "Verify your identity to continue".
5. **Never blame the user.** "That code didn't match" not "You entered an invalid code".
6. **Sentence case** for everything except brand names. No Title Case Buttons, no ALL CAPS shouting.
7. **No exclamation marks** in a financial app, except a genuine one-off celebration.
8. **Numerals as digits** ("3 days", not "three days") — faster to scan.

## 2. Buttons

| Bad | Good |
| --- | --- |
| Submit | Send money |
| OK | Got it / Delete / Continue |
| Yes / No | Delete account / Keep account |
| Confirm | Confirm transfer of ₹5,000 |
| Click here | Add a bank account |
| Cancel (as the only exit from a destructive dialog) | Keep it |

Rules: verb-first, 1–3 words where possible, and the label must make sense **read alone** by a screen reader. In a confirmation dialog, both buttons state their outcome — never "Yes"/"No" against a question the user has stopped reading.

## 3. Errors

Three parts: **what happened → why (if useful) → what to do next.**

| Bad | Good |
| --- | --- |
| Error 500 | Something went wrong on our side. Try again in a moment. |
| Invalid input | Enter a 10-digit mobile number. |
| Transaction failed | Payment declined by your bank. No money was taken. Try another method. |
| Network error | You're offline. We'll retry when you're back. |
| Insufficient funds | You need ₹250 more. Add money to continue. |

Financial errors must **always** answer "was I charged?". Silence there is the single most damaging copy failure in a fintech app. -> `error-states.md`

Never show raw error codes as the whole message. A code may appear as small supporting text next to a Copy button for support.

## 4. Empty states

Explain **why** it is empty and give **one** clear next step.

| Context | Copy |
| --- | --- |
| No transactions yet | "No transactions yet — your payments will appear here." + [Send money] |
| No search results | "No results for 'xyz'. Check the spelling or try a different name." + [Clear search] |
| Filtered to nothing | "No transactions match these filters." + [Clear filters] |
| First-run list | Describe the value, then the action. Never just "No data". |

Never: "Nothing to see here", "Oops!", "It's lonely in here". Cute copy is friction when someone is looking for their money. -> `empty-states.md`

## 5. Loading and success

- Loading: "Sending…", "Checking your details…" — say what is happening. "Please wait" says nothing.
- Long waits: set expectations. "This usually takes about 10 seconds."
- Success: state the outcome and the consequence. "₹5,000 sent to Priya. She'll get it within 2 hours."
- Don't say "Success!" and leave the user to work out what succeeded. -> `success-states.md`

## 6. Labels and form fields

- Visible labels, always. Placeholders are hints, not labels.
- Label = the thing ("Mobile number"). Placeholder = the format ("9876543210").
- Helper text explains the constraint **before** the error, not after.
- Mark optional fields "(optional)" rather than marking every required field.
- Never a lone red asterisk with no legend.
- Explain **why** you need sensitive data, at the point you ask: "We use this to verify your identity. We never share it."

-> `forms-and-inputs.md`

## 7. Financial vocabulary

Be exact and consistent. Pick one term per concept and never vary it.

| Concept | Use |
| --- | --- |
| Money you can spend now | **Available balance** |
| Money not yet settled | **Pending** (with an expected date if known) |
| Money leaving | **Sent** / **Paid** / **Debited** — pick one and keep it |
| Money arriving | **Received** / **Added** / **Credited** |
| A failed payment | **Failed** or **Declined** — never "unsuccessful" |
| Money returned | **Refunded** |
| Reversal in progress | **Reversal in progress**, with a date |

Always state the currency explicitly on the first amount on a screen. Always show a date **and** a time for a transaction, in the user's local timezone.

-> `fintech-ux.md`

## 8. Confirmation and destructive copy

- Title = the question: "Delete this beneficiary?"
- Body = the consequence: "You'll need to add their details again to send them money."
- Buttons = the outcomes: [Delete] [Keep]
- Irreversible actions say so, in words: "This can't be undone."
- Never use "Are you sure?" as the entire body.

## 9. Permissions

State the value **before** the system prompt fires.

> "Turn on notifications to get an alert the moment money arrives." → [Turn on] [Not now]

Never "Allow notifications?" with no reason. Never re-prompt immediately after a decline. -> `notifications.md`

## 10. Tone

- Neutral and clear by default. Warm on success. Calm and specific on failure.
- Serious about money: no jokes on a transaction screen.
- Never dark patterns: no "No thanks, I don't want to save money", no shaming a decline.
- Legal text stays legally accurate — do not paraphrase compliance copy.

## 11. Length

| Element | Target |
| --- | --- |
| Button | 1–3 words |
| Field label | 1–3 words |
| Error message | ≤ 2 short sentences |
| Empty state | Title ≤ 6 words, body ≤ 2 lines |
| Toast | ≤ 1 line |
| Screen title | 1–4 words |
| Section header | 1–3 words |

If copy does not fit, shorten the words — do not shrink the type.

## 12. Checklist

- [ ] Every button names its action
- [ ] Every error says what to do next
- [ ] Financial errors state whether money moved
- [ ] Empty states offer one action
- [ ] Labels visible, not placeholder-only
- [ ] Sentence case throughout
- [ ] One term per concept, used consistently
- [ ] Currency, date and time always explicit
- [ ] Destructive actions name the consequence
- [ ] No jargon, no error codes as messages, no blame
- [ ] Reads correctly aloud (screen-reader test)
