# eng-learn — Screen Design Spec (v1)

> **Source status:** Mobbin MCP worked (authenticated, returned results). All references below that have a link came from Mobbin searches run on 2026-09-15. Mobbin's catalog did not return screens for **Praktika, Elsa Speak, Busuu, Anki/AnkiDroid or Memrise**. Where a pattern is credited to one of those apps, it is marked **(general knowledge, not Mobbin-sourced)**.
>
> Stack assumptions: Next.js App Router + Tailwind + shadcn/ui. Tokens below map directly to shadcn CSS variables. Icons: `lucide-react`.

---

## 0. Overall visual direction — "Red Pen, Warm Paper"

**Idea:** a friendly editor, not a cartoon mascot and not a sterile SaaS dashboard. The app feels like a notebook that a kind teacher has written in: warm paper background, ink-blue actions, a **coral "red-pen" underline** for mistakes, **sage green** for fixed text, and a **highlighter yellow** for new vocabulary. These three annotation colors are the brand. They mean the same thing on every screen: coral = mistake, sage = corrected/success, yellow = new word.

Personality rules:
- Short, warm, slightly playful copy ("Nice catch — that one's tricky"). Never punish, never shame.
- Handwritten-style touches only as accents: marker underlines, a squiggle under the section title, "sticky-note" cards for tips. No mascot in v1. The tutor avatar is a simple ink-blue circle with a speech-mark glyph.
- Pressable buttons with a 3px darker bottom edge that squashes when pressed (borrowed from **Duolingo** CTAs, see onboarding flow). This gives the app its tactile feel.
- CEFR levels get their own color ramp and show up as small monospace "level stamps" (`B1`).

### 0.1 Color palette

| Token (shadcn var) | Role | Light | Dark |
|---|---|---|---|
| `--background` | paper | `#FBF8F3` | `#14131C` |
| `--card` / `--popover` | surface | `#FFFFFF` | `#1D1C28` |
| `--muted` | sunken surface, track | `#F3EEE6` | `#262434` |
| `--foreground` | ink text | `#1C1B29` | `#F1EEE8` |
| `--muted-foreground` | secondary text | `#6B6878` | `#A29FB0` |
| `--border` / `--input` | hairlines | `#E6DFD3` | `#34313F` |
| `--primary` | ink blue (CTA, links, focus) | `#3346D3` | `#8C9BFF` |
| `--primary-foreground` | | `#FFFFFF` | `#14131C` |
| `--primary-edge` (custom) | 3px pressable bottom edge | `#2433A3` | `#5E6BD6` |
| `--ring` | focus ring | `#3346D3` | `#8C9BFF` |
| `--mistake` (custom) | red-pen coral: underline, "Again" | `#E4572E` | `#FF7A55` |
| `--mistake-soft` | coral wash | `#FDE8E1` | `#3A1F1A` |
| `--correct` (custom) | sage: corrected text, "Good", success | `#2F9E6E` | `#4FC98F` |
| `--correct-soft` | sage wash | `#DDF3E8` | `#16322A` |
| `--highlight` (custom) | highlighter: new words, "Easy" | `#FFD84D` | `#FFD84D` |
| `--highlight-soft` | | `#FFF4C2` | `#3A3218` |
| `--streak` (custom) | flame, "Hard" | `#FF8A1F` | `#FFA24D` |
| `--destructive` | real errors (network, delete) | `#C8322B` | `#FF6B63` |

**CEFR ramp** (level stamps, charts): A1 `#7CC6FE` · A2 `#4FA3F0` · B1 `#5B6CF0` · B2 `#8A5CF0` · C1 `#B84FD6` · C2 `#E0457B`. On dark, use the same hues with text `#14131C` on top.

**Skill colors** (charts; checked for color-blind separation, always paired with a label or icon): Speaking `#3346D3`, Listening `#2F9E6E`, Reading `#FF8A1F`, Writing `#B84FD6`, Grammar `#E4572E`, Vocabulary `#C9A100` (dark: `#FFD84D`).

Contrast: body text on paper is 15.9:1. Primary on white is 6.9:1. Coral is **never used as text on white at body size**. Mistake text keeps the ink color and gets a coral wavy underline plus a soft wash.

### 0.2 Typography (Google Fonts)

| Use | Font | Weights | Notes |
|---|---|---|---|
| Display / headings | **Bricolage Grotesque** | 600, 700, 800 | Big numbers (streak, CEFR), screen titles. `opsz` axis at larger sizes. |
| UI + body + chat | **Figtree** | 400, 500, 600, 700 | Friendly, very legible for learners. Chat body is 16px min (17px on mobile). |
| Level stamps, counters, IPA | **JetBrains Mono** | 500 | `B1`, `12/40`, `/ˈθɔːt/` |

Scale (rem): 0.75 / 0.875 / 1 / 1.125 / 1.25 / 1.5 / 2 / 3 / 4.5 (hero numbers). Line-height: 1.5 for body, 1.15 for display. Tracking: -0.02em on display ≥ 2rem.

### 0.3 Shape, spacing, elevation, motion

- **Radius:** `--radius: 0.875rem` (14px) for cards. Buttons and inputs 12px. Chips and pills `9999px`. Bottom sheets 24px on top corners. Flashcard 24px.
- **Spacing:** 4px base, Tailwind default scale. Page gutter 16px on mobile, 24px on tablet, 32px on desktop. Card padding 16px (mobile) / 20–24px (desktop). Vertical rhythm between sections: 24px mobile, 32px desktop.
- **Max widths:** reading/chat column `max-w-2xl` (672px). Dashboard `max-w-6xl`.
- **Elevation:** mostly flat, using 1px `--border`. Only pressable surfaces get the 3px bottom edge (`box-shadow: 0 3px 0 var(--primary-edge)`), and it collapses to 0 with `translateY(3px)` on `:active`. Sheets and popovers use `0 12px 32px rgb(28 27 41 / .12)`.
- **Motion:** 150ms for UI, 250ms for sheets, 400ms spring for the flashcard flip. Honor `prefers-reduced-motion`: the flip becomes a crossfade and confetti is disabled.
- **Texture:** optional 2%-opacity paper-grain SVG on `--background` (light mode only).

### 0.4 Iconography (lucide)

Stroke 2px (1.75px at 24px+). Sizes 16 / 20 / 24. Core set: `Flame` (streak), `Layers` (flashcards), `MessageCircle` (tutor), `Mic` / `MicOff` / `Square` (record/stop), `Volume2` (play audio), `Languages` (native-language explanation), `PenLine` (corrections), `Sparkles` (new words), `Target` (goals), `TrendingUp` (progress), `GraduationCap` (CEFR), `Settings2`, `RotateCcw` (again), `Check`, `X`, `ChevronRight`, `Clock`, `Cpu` (AI model), `KeyRound` (API key), `WifiOff` (error), `Loader2` (spinner).

### 0.5 App shell

- **Mobile (<768px):** top bar (56px) with title and contextual action. Bottom tab bar (64px + safe-area) with 4 tabs: Home (`House`), Tutor (`MessageCircle`), Review (`Layers`, badge = due count), Progress (`TrendingUp`). Settings lives in the avatar menu on the top bar. Hide the tab bar inside the chat composer focus state, flashcard session and onboarding.
- **Desktop (≥1024px):** 240px left sidebar with the same 4 items + Settings pinned at the bottom (pattern: **Duolingo web** left nav, [Practice](https://mobbin.com/screens/e1681332-12ea-4115-8cd1-54603e0006b7)). Top-right of content shows streak and level stamp.
- **Tablet (768–1023px):** 72px icon-only rail.

---

## 1. Onboarding + Placement Test

### References (Mobbin)
| App | Screen | What we borrow |
|---|---|---|
| Duolingo (iOS) | [Onboarding flow](https://mobbin.com/flows/b0b4f93f-5637-46ec-9d77-49ecda6b991d) — screens: "What would you like to learn?", "How much do you know?" (signal-bar options), "Daily goal 5/10/15/20 min", "Start from scratch / Find my level" | Thin progress bar + back arrow at the top. One question per screen. Full-width selectable rows with a light-blue selected state. Sticky bottom CTA that stays disabled until a choice is made. Signal-strength icons for self-rated level. Goal rows with right-aligned tag ("Casual / Regular / Serious / Intense"). |
| Duolingo (iOS) | [Second onboarding flow](https://mobbin.com/flows/ac9d2f58-868d-4fd3-a79c-9655ce6b1522) | "For [native] speakers" grouping, which maps to our native-language step. |
| Duolingo (iOS) | [Placement question: select translation, timer](https://mobbin.com/screens/faf99c88-e9a5-44ef-8e7d-3335018c4781), [Complete the sentence with word bank](https://mobbin.com/screens/fa963b87-61a6-40be-8192-3060fe947088) | Segmented progress bar with checkpoints. Large tappable answer tiles. Word-bank chips for gap-fill. "CHECK" CTA. |
| Speak (iOS) | [“Let's create your personalized lessons” — what I heard](https://mobbin.com/screens/f9aa3796-47d7-456f-93c9-30acff81da86), [“We have the perfect course for you”](https://mobbin.com/screens/facb1ee8-3297-4f8f-9cfb-397f7a0f6d29) | A short spoken/typed answer replayed back to the user as "What I heard". The result card names the course level with a lesson count. |
| Quizlet (iOS) | [Test result donut “You're learning!”](https://mobbin.com/screens/ed1ddb57-4ef7-47a5-a9f5-60aafbbf2014) | Result summary: big visual + "Next steps" primary/secondary CTAs + expandable answer review below. |
| Cleo AI (iOS) | [Score reveal with glow](https://mobbin.com/screens/8c905f3c-e573-42b4-a31e-faf44c7606f2) | A big central number on a soft radial glow, with a "Your summary" card sliding up underneath. Used for the CEFR reveal. |

### Flow (steps)
1. **Welcome.** Short value prop + "Get started" / "I already have an account".
2. **Native language.** Searchable list (shadcn `Command`). The top suggestion comes from `navigator.language`.
3. **Goals** (multi-select, max 3): Travel, Work & meetings, Exams (IELTS/TOEFL), Conversation, Study abroad, Just for fun.
4. **Daily time:** 5 / 10 / 15 / 20 min (single-select rows with tags).
5. **Self-rating** (signal-bar rows, 5 options). This seeds the adaptive test's starting difficulty.
6. **Start choice:** "Find my level (≈4 min)" [Recommended] or "Start from A1".
7. **Placement test:** 8–14 adaptive items. Mix: multiple choice (grammar), gap-fill with word bank (vocab), a short reading item, and 1–2 "Chat with the tutor" free-response turns (typed or voice).
8. **Analyzing** interstitial (1–3s).
9. **Result:** CEFR level reveal + skill breakdown + plan preview.
10. **Account/save** (if not signed in), then Home.

### Layout
- **Mobile:** single column with 16px gutters. Top: back `ChevronLeft` + progress bar (8px, rounded, fills with `--primary`) + skip/close. Question title (Bricolage 24/28px). Options stack. **Sticky bottom CTA** (full width, pressable, 56px) sits above the safe-area.
- **Desktop:** centered card column `max-w-xl`, CTA bar pinned to the bottom of the viewport with a top border and right-aligned button (Duolingo web pattern, [streak goal](https://mobbin.com/screens/ec3f87db-e37f-40f3-8787-6bb9a1a7d7f8)). A decorative left illustration panel is optional and hidden below 1280px.

### Components top → bottom (question screen)
1. `OnboardingHeader`: back button, `Progress` (segmented for the placement test, showing checkpoints at 25/50/75%), close `X` (confirms before exiting).
2. `TutorPrompt`: tutor avatar (32px) + speech-bubble card with the question text. This is Duolingo's owl-bubble layout without a mascot.
3. `QuestionBody`: one of `ChoiceList` (radio rows, 56px min height), `WordBank` (chips + dashed blanks), `ReadingSnippet` (card), `FreeResponse` (textarea + `Mic` button).
4. `StickyCTA`: "Continue" / "Check". Disabled until answered.
5. After "Check": a `FeedbackBar` slides up from the bottom. Sage for correct, coral for incorrect, with a one-line explanation. **During placement it shows neutral "Got it" with no right/wrong, so users don't get discouraged.**

### Components top → bottom (result screen)
1. Confetti burst (skipped on reduced motion).
2. `LevelReveal`: radial glow in the CEFR color, huge `B1` in Bricolage 800 (72–96px), and the label "Intermediate" under it (Cleo AI score pattern).
3. `CEFRScale`: a 6-segment horizontal bar A1…C2 with a marker on the user's level and "Next: B2" at the right end.
4. `SkillBreakdown` card: 4 rows (Grammar, Vocabulary, Reading, Speaking/Writing), each with a mini bar and a level stamp.
5. `PlanPreview` card: "Your plan: 15 min/day · Travel + Work". Lists the first 3 activities (Speak course "perfect course" card pattern).
6. CTAs: primary "Start learning", secondary ghost "Review my answers" (Quizlet next-steps pattern).

### States
- **Loading (between adaptive items):** keep the previous layout, disable the CTA, and show `Loader2` inside the button. Never blank the screen.
- **Analyzing:** a skeleton of the result with a rotating status line ("Checking grammar… Estimating vocabulary…").
- **Error (AI/network):** an inline coral-edged `Alert` above the CTA: "Couldn't load the next question. [Retry]". Answers are persisted locally, so progress is kept.
- **Mic permission denied:** replace the mic with a "Type instead" link and a tooltip explaining how to enable it.
- **Skip test:** confirm dialog → assign the self-rated level, marked "Estimated" with a "Take test later" chip on Home.
- **Resume:** if the test is abandoned, Home shows "Finish your placement test (6/12)".

---

## 2. Home / Dashboard

### References (Mobbin)
| App | Screen | What we borrow |
|---|---|---|
| Duolingo (web) | [Practice page with right sidebar: stats row, Daily Quests with progress bars](https://mobbin.com/screens/e1681332-12ea-4115-8cd1-54603e0006b7) | Desktop 3-zone layout: left nav, main column of big action cards, right rail with stats and quest cards. The "Your collections: Mistakes / Words" cards with count badges become our Weak areas + Due cards. |
| Duolingo (web) | [Quests page](https://mobbin.com/screens/e8d3d909-96ab-48cd-8ced-db789e429ec8) | Daily goal rows with an icon, label and chunky progress bar. |
| Noom (iOS) | [“Today's plan” with week strip and stacked task cards](https://mobbin.com/screens/726a894d-7bbb-4269-9e97-3007507cd4e4) | Week day strip at the top, then a "Today's plan" serif-ish heading, then a checklist of cards (continue / log / done state with a checkmark). |
| Duolingo (iOS) | [Streak screen — 6-day streak with week checkmarks](https://mobbin.com/screens/f6675d16-c6b5-4847-aa9f-fb66a2d61e88), [Streak calendar + streak goal](https://mobbin.com/screens/fbef2d10-7767-41e4-8a9f-825e022ead13) | Weekday circles with checks, big streak number with a flame, and a streak-goal milestone bar. Used for the streak card and its detail sheet. |
| Speak (iOS) | [Smart Review with “Start Smart Review” + concept mastery rows](https://mobbin.com/screens/f7e41ffd-1ce9-414d-8560-8b574d309bfc) | A review card with a single strong CTA, plus "Concepts" rows with circular mastery rings. Used for Weak areas. |
| pushr (iOS) | [This-week streak card](https://mobbin.com/screens/bd1913f9-cb73-4126-9c41-fb92dfe61b97) | A compact, bold weekly pill streak widget, for the mobile top card. |

### Layout
- **Mobile:** single column, sections in this order: greeting/streak → Today's plan → Due flashcards → Skill progress → Weak areas. The primary "Continue" action is also available as the first plan card.
- **Tablet:** 2-column grid. Plan spans both columns.
- **Desktop (≥1024px):** left sidebar (shell) + **main column (≈640px)** + **right rail (320px)**, Duolingo-web style. Main: Greeting, Today's plan, Weak areas. Right rail: Streak card, Due flashcards card, Skill progress card, Level stamp.

### Components top → bottom (mobile order)
1. **`HomeHeader`:** "Good evening, Sara" (Figtree 600 20px) + `LevelStamp` (`B1`, CEFR color) + avatar menu.
2. **`StreakCard`:** `Flame` + streak number (Bricolage 800 40px) + "day streak". A 7-day strip of circles (done = streak orange with check, today = ring, future = muted) and a small "Daily goal 8/15 min" progress ring. Tapping it opens a `Sheet` with the month calendar + streak goal milestones (Duolingo streak screen).
3. **`TodayPlan`:** heading "Today's plan" with the squiggle underline and "~15 min". A vertical list of 3–4 `PlanItemCard`s (Noom pattern):
   - Icon tile (40px, soft color) + title ("Review 24 cards", "Talk: ordering at a café", "Fix your top mistake: articles") + meta ("5 min") + state (`ChevronRight` / sage `Check` when done / "In progress 60%").
   - The first incomplete item has the primary pressable button "Start" (or "Continue").
   - Done items collapse to a single line with strikethrough-free muted text and a check.
4. **`DueCardsCard`:** `Layers` icon, "24 cards due" (big number), a split into "8 new · 16 review", and a "Review now" button. It shows a "Next due in 3h" empty variant.
5. **`SkillProgressCard`:** 6 rows (Speaking, Listening, Reading, Writing, Grammar, Vocabulary). Each row: skill icon, name, horizontal bar showing progress within the current level, and a mono level stamp. Footer link "See progress →".
6. **`WeakAreasCard`:** title "Watch out for" + 3 `WeakAreaRow`s (coral mini ring with mastery % + label "Articles (a/the)" + example "~~a~~ **the** best day" + "Practice" chip). Speak concept rows + Duolingo "Mistakes" collection.
7. Tab bar.

### Key interactions
- Plan item → deep links into Tutor (with a pre-seeded scenario), Review, or a targeted drill.
- Pull-to-refresh on mobile regenerates the plan only if it's a new day.
- Completing the day's plan swaps the plan card to a sage "Day complete" state with the next streak milestone.

### States
- **First day / empty:** the StreakCard shows "Start your streak today" with all circles muted. DueCards: "No cards yet — new words from tutor chats land here". WeakAreas: "We'll spot patterns after your first chat" + "Start a chat" CTA.
- **Loading:** skeletons matching card shapes (`Skeleton` from shadcn), with the streak number shimmer first. The plan is generated server-side, and 3 skeleton rows show while it loads.
- **Error:** each card fails independently with an inline `WifiOff` + "Retry". The page never shows a full-page error unless auth fails.
- **Streak at risk (after 6pm, no activity):** a streak-orange banner above the plan: "Keep your 12-day streak — 5 min is enough" + "Quick review" button.

---

## 3. AI Tutor Chat

### References (Mobbin)
| App | Screen | What we borrow |
|---|---|---|
| Speak (iOS) | [Warm-up conversation: suggested reply hint, message bubbles with audio/translate/hide icons, big mic button](https://mobbin.com/screens/fd3eca22-b486-45fd-b71e-e60dce3655ad) | **Primary reference.** Under each tutor bubble: an icon row of `Volume2` (play), `Languages` (translate to native), `EyeOff` (hide text for listening practice). A "Say: …" `Sparkles` hint line above the input. Section dividers inside the conversation ("QUESTION 4/9"). A large central round mic. |
| Claude (iOS) | [Streaming reply with composer + model chip](https://mobbin.com/screens/42340550-73a5-46d0-973d-21316812ae5c), [Voice mode listening pill](https://mobbin.com/screens/13cf4949-114a-4686-a9ef-9c80f694c801), [Voice transcript “Microphone off”](https://mobbin.com/screens/4fa45c9f-6f44-4d0d-9224-f768e556c9cc) | Unboxed tutor text at reading width (no bubble) for long replies. Floating rounded composer. "Scroll to bottom" `ArrowDown` pill. Voice mode as a wide pill with an animated waveform + close button. |
| Opera (iOS) | [AI answer with feedback icons + “Ask more” suggestions + composer with mic](https://mobbin.com/screens/29b1e003-fd89-40de-bc29-4f573e1c09f5) | Suggested follow-up prompts as a list/chips below the latest tutor reply. The mic sits inside the composer on the right. |
| Bumble (iOS) | [Hold-to-record with timer and “Slide to cancel”](https://mobbin.com/screens/3e64212d-2ae7-43ab-89e2-21e7a0b1b4c8) | Press-and-hold mic gesture with a red recording dot, timer and slide-left-to-cancel. |
| Descript (web) | [Transcript with dotted underlines on filler words](https://mobbin.com/screens/dcb7a1b2-20ed-4014-a6d8-724463114e70) | Inline wavy/dotted underline marks inside running text that can be clicked for an action, plus a right-side panel. This is the model for inline correction highlights. |
| Messages (iOS) | [Translate bottom sheet over conversation](https://mobbin.com/screens/dc4909db-9e9c-42f6-a39b-d6ec45c87e90) | A half-height sheet over the chat showing source → target text with a play button. This is the model for the mobile corrections sheet. |
| Gemini Notebook (web) | [3-pane: sources · chat · studio flashcards](https://mobbin.com/screens/34c51558-a1fa-4db3-a2c6-2ec7ef560b06) | Desktop layout with chat in the center and a collapsible right panel with its own header. Our right panel = Corrections / New words. |
| Praktika / Elsa Speak | *(general knowledge, not Mobbin-sourced)* | Praktika: scenario header with the tutor persona and topic. Elsa: per-word color-coded pronunciation score. The Elsa color coding is a v2 idea. |

### Layout
- **Mobile:** full-height screen with the tab bar hidden.
  - Top bar: back, tutor avatar + scenario title ("Free talk" / "Ordering at a café") + level stamp, then `PenLine` corrections button with a count badge and `MoreVertical`.
  - Message list, `max-w` full, 16px gutters.
  - Sticky composer at the bottom, with safe-area.
  - Corrections open as a **bottom `Sheet`** (snap points 50% / 90%), Messages-translate style.
- **Desktop (≥1024px):** shell sidebar collapsed to the icon rail. **Chat column centered `max-w-2xl`** + **right panel 360px** with `Tabs`: "Corrections (3)" | "New words (5)". The panel can be collapsed with `PanelRightClose`. Gemini Notebook 3-pane pattern.
- **Tablet:** the right panel becomes an overlay sheet from the right.

### Components top → bottom
1. **`ChatHeader`** (see above). The `MoreVertical` menu has: New chat, Change scenario, Voice replies on/off, Explanations in [native language] toggle, and Report issue.
2. **`ScenarioIntro`** (first message only): a sticky-note-style card with topic, goal ("Use past simple"), and 3 key phrases as yellow chips.
3. **`MessageList`:**
   - **Tutor message:** avatar (28px) + text rendered as markdown, unboxed, 17px Figtree. Beneath it, a `MessageActions` row (Speak pattern): `Volume2` play/pause (shows a progress ring while playing), `Languages` translate (expands an inline muted translation below), `Copy`, and `EyeOff` hide text (listening mode). **New words** in the tutor text get a yellow highlighter background. Tap one to get a `Popover` with definition, IPA, audio and "+ Add to flashcards".
   - **User message:** right-aligned ink-blue-soft bubble (`#E8EBFB` light / `#262A4D` dark) with 16px radius and a 4px tail corner. **Inline correction highlights:** each mistaken span gets a coral wavy underline (`text-decoration: wavy underline var(--mistake)`, 1.5px, offset 3px) and a `--mistake-soft` background. Tapping or hovering a span opens a `Popover` "~~goed~~ → **went** · Past tense of *go* is irregular" with a "See all" link that opens the panel/sheet on that item. Under the bubble: a small "3 fixes" `PenLine` chip (coral outline), or a sage "Perfect! ✓" chip if there are no mistakes.
   - Voice user message: a transcript bubble with a small `AudioLines` icon and a replay button.
   - **`NewWordsChips` row** after a tutor reply: horizontal scroll of yellow pill chips ("reluctant", "to be up for"), each with a `Plus`. It changes to a `Check` once added (added words go to flashcards).
   - **`SuggestedReplies`:** 2–3 outline chips after the latest tutor message ("Say: I'd like a latte, please"), `Sparkles` icon (Speak hint + Opera ask-more). Tapping fills the composer. It does not auto-send.
   - `ScrollToBottom` floating pill (Claude) when the user is scrolled up during streaming.
4. **`Composer`** (floating, 16px radius, border, shadow on scroll):
   - `Textarea` (auto-grow to 5 lines), placeholder "Reply in English…".
   - Left: `Plus` menu (Change scenario, Ask for a hint, Explain last correction).
   - Right: `Mic` button (44px round, ink blue) when empty; it becomes a `SendHorizontal` button when there is text. During streaming it becomes a `Square` stop button.
   - **Voice input modes:** tap = toggle recording, where the composer turns into a pill with a live waveform, timer, `X` cancel and `Check` done (Claude voice pill). Press-and-hold = walkie-talkie with "Slide to cancel" (Bumble). After recording, the transcript appears in the textarea for review before sending. This matters for learners, who should see what was heard.
5. **`CorrectionsPanel` / `CorrectionsSheet`:**
   - Header: "Corrections" + count + filter `Select` (All / Grammar / Vocabulary / Word choice / Spelling / Punctuation).
   - List of `CorrectionCard`s, newest first, grouped by message ("From: *Yesterday I goed to…*"):
     - Category tag (mono, colored dot).
     - **Original → Corrected:** "I ~~goed~~" (coral strikethrough on the soft coral wash) `ArrowRight` "I **went**" (sage text on the soft sage wash). On mobile the two lines stack vertically.
     - Explanation (2–3 lines, English). A `Languages` toggle shows the explanation in the native language (setting default).
     - Actions: `Volume2` hear the corrected sentence, "+ Flashcard", `ThumbsDown` "Not a mistake" (feedback).
   - A clicked inline span scrolls the panel to its card and flashes it with a 1s yellow outline.
   - **New words tab:** word, IPA, part of speech, short definition, example from the chat, and add/remove.

### Streaming & message states
- **Waiting for first token:** a tutor avatar with 3 bouncing dots (Noom chat pattern, [screen](https://mobbin.com/screens/6b9c88e2-07b2-43c6-8bdf-c35821f0ebbe)).
- **Streaming:** text appends with a blinking ink caret at the end. Actions row hidden. Corrections for the *user's* message arrive via a separate structured call. The underline fades in on the user bubble when ready, and until then the bubble shows a tiny "Checking…" `Loader2` under it.
- **Audio:** the play button shows `Loader2` while TTS is generating, then play. If "Voice replies" is on, it auto-plays after the stream completes, with a small toggle in the header.
- **Stopped:** a "Stopped" muted label + "Continue" link.
- **Error:** the tutor message turns into a coral-edged card (GitHub Copilot error pattern, [screen](https://mobbin.com/screens/5df22f1d-d7b4-4d81-aee0-241b4d94b11f)): "Something went wrong reaching the tutor. [Retry]". The user's message stays and the composer text is preserved. If the provider key is missing, show "Set up an AI provider in Settings →".
- **Mic states:** idle, requesting permission (dialog explainer first), recording (coral dot + waveform), transcribing (`Loader2` in the pill), denied (mic disabled with a tooltip + "How to enable").
- **Empty chat:** the scenario picker grid shows 6 cards (Free talk, Café, Job interview, Small talk, Travel problem, Describe your day), each with a level-fit badge, above the composer.
- **Offline:** banner "You're offline — messages will send when you reconnect". The send button is disabled.

---

## 4. Flashcards Review

### References (Mobbin)
| App | Screen | What we borrow |
|---|---|---|
| Quizlet (iOS) | [Card front with audio + star, “1/68” counter, known/learning tallies](https://mobbin.com/screens/80a4c6a5-566b-4005-a227-16ff5eac01e0), [Swipe feedback “Know” tilt](https://mobbin.com/screens/5dacac8f-b958-417c-bae8-e70c4ac3273f), [Completion donut 94% + next actions](https://mobbin.com/screens/f0707e72-e036-47fa-8f58-99e2387ba0ff) | Top bar with `X` + "n / total" + settings. Coral/sage tally pills pinned to the left and right edges. A big white card with `Volume2` top-left. The swipe tilt with a colored outline and label, which we use as an optional gesture. A completion screen with a donut, Know/Still-learning pills and stacked CTAs. |
| Headway (iOS) | [Word card with in-context sentence highlight + “Do you remember this?” No/Yes](https://mobbin.com/screens/e109ca23-95a1-4edd-94d8-704a97ad043b) | The card shows the word in a real sentence with the word highlighted (our yellow). Also a "Look up" button, a warm paper background, and a question above a bottom button row. |
| Babbel (iOS) | [Review card with audio + translation, No/Yes tinted buttons](https://mobbin.com/screens/2be4c469-11ee-4134-be4d-0e8a8d9b1cca) | Tinted rating buttons (coral-soft / sage-soft fill with a colored border) in a bottom tray on a slightly different surface. |
| Gemini Notebook (web) | [Flashcard on desktop with ← ✕0 1✓ → controls](https://mobbin.com/screens/34c51558-a1fa-4db3-a2c6-2ec7ef560b06) | A desktop control row under the card with a counter and circular nav buttons. |
| Anki / AnkiDroid | *(general knowledge, not Mobbin-sourced)* | The 4-button **Again / Hard / Good / Easy** row with the **next-interval label on each button** ("<1m", "6m", "10m", "4d"). "Show answer" as a single full-width button before the flip. |

### Layout
- **Mobile:** focus mode, with the tab bar hidden.
  - Top: `X` (confirm if mid-session), a segmented progress bar, and the counter `12 / 40` in mono.
  - Under it: 3 tally pills (Again coral, Hard orange, Good+Easy sage).
  - Card centered, filling ~60% of the height, 24px radius.
  - Bottom tray (surface `--muted`, 24px top radius): "Show answer" before the flip, and the 4 rating buttons in a 4-column grid after the flip.
- **Desktop:** card `max-w-lg` centered. Rating row under the card (not docked). Keyboard hint row: `Space` flip, `1 2 3 4` rate, `R` replay audio, `U` undo. Left/right edges show the tally.

### Components top → bottom
1. `SessionHeader`: `X`, `Progress`, counter, `Settings2` (auto-play audio, show IPA, reverse cards).
2. `SessionTallies` pills.
3. **`Flashcard`** (3D flip, `rotateY`, 400ms spring):
   - **Front:** card type label ("Word" / "Phrase" / "Your mistake"), the word or phrase (Bricolage 36–44px), a `Volume2` button, and optional IPA (mono, muted). For "mistake" cards: the original wrong sentence with a coral wavy underline and the prompt "Fix it".
   - **Back:** word + IPA + audio, part of speech, a definition (and a native-language gloss if enabled, marked with a `Languages` icon), 1–2 example sentences with the word in the yellow highlighter (Headway), and a source line ("From your chat · 3 days ago").
4. **`RevealButton`:** "Show answer" (full-width pressable primary).
5. **`RatingBar`** (after flip): 4 equal buttons, each with a label + interval sub-label (Anki):
   - Again: coral-soft fill / coral border · `<1m`
   - Hard: orange-soft · `6m`
   - Good: sage-soft · `1d`  ← visually emphasized (thicker border) as the default
   - Easy: yellow-soft · `4d`
   - Mobile: 4 columns at 64px height, with label 15px/600 and interval 12px mono.
6. Optional swipe gestures (mobile): left = Again, right = Good, with the Quizlet tilt + colored outline + label. Off by default, toggled in session settings.
7. `UndoToast`: "Rated Good · Undo" for 4s.

### Completion summary
- A header illustration: a stack of cards with a sage check and light confetti.
- "Session complete" (Bricolage 32px) + "40 cards · 9 min".
- **Stat trio** (Duolingo lesson-complete tiles, [screen](https://mobbin.com/screens/fe966528-929c-475b-b917-9b342e3868a5)): Accuracy `85%` (sage) · Time `9:12` (ink) · Streak `+1` (orange flame). Each tile has a colored header band and a white body.
- A donut (Quizlet) splitting Again/Hard/Good/Easy counts, with legend pills.
- "Tough ones" list: the words rated Again, each with a play button.
- CTAs: primary "Back to Home", secondary "Practice tough ones in chat" (sends those words to the tutor as a scenario), tertiary link "Review 6 more due".

### States
- **Nothing due:** an illustration + "All caught up! Next review in 3h 20m" + "Learn new words in chat" CTA + "Study ahead (10 cards)" ghost button.
- **Loading:** a card skeleton + disabled tray.
- **Rating save failed:** optimistic update. The rating is queued locally and a small `WifiOff` "Saving when back online" chip appears in the header. It never blocks the session.
- **Audio unavailable:** the play icon is muted with a tooltip "Audio unavailable".
- **Leaving mid-session:** an `AlertDialog` "Leave review? Your progress so far is saved."

---

## 5. Progress

### References (Mobbin)
| App | Screen | What we borrow |
|---|---|---|
| Oura (iOS) | [“Your scores over the year” multi-line chart with legend + Months/Days toggle](https://mobbin.com/screens/a941cbbe-8aa1-4a46-a93a-93d0d2b85ec9) | A multi-series smooth line chart with a dot legend at the top and a segmented time-range toggle under the chart. |
| Future Pro (iOS) | [Weight progress: line chart + “Most recent / vs previous / vs first” stats + history table](https://mobbin.com/screens/4d96c3e9-c7b8-4266-b086-ad92ec6c3c07) | A delta stat row under the chart ("This week +4 · vs last month +12 · since start +31"). |
| Noom (iOS) | [Prediction chart with goal marker](https://mobbin.com/screens/61bec45a-1a33-479a-8836-b7b9e0183384), Lifesum [goal projection](https://mobbin.com/screens/387e3e82-0f43-495e-b0c7-2596f690de3f) | A projected path to the next CEFR level with a dashed forecast line and a goal pin ("B2 by ~March"). |
| Quizlet (iOS) | [Progress rings: Not studied / Still learning / Mastered rows](https://mobbin.com/screens/439e68be-eb63-4fb8-985a-ab27b24e3ff2) | Vocabulary mastery rows with a ring + count + chevron. |
| Duolingo (iOS) | [Streak calendar](https://mobbin.com/screens/fbef2d10-7767-41e4-8a9f-825e022ead13) | A month activity calendar. |
| Elsa Speak | *(general knowledge, not Mobbin-sourced)* | Skill breakdown as a set of score rings with a trend arrow. |

### Layout
- **Mobile:** single column. A sticky `Tabs` row at the top: "Overview · Skills · Mistakes · Vocabulary" (horizontal scroll).
- **Desktop:** 12-col grid, `max-w-6xl`. Row 1: CEFR card (4 cols) + Skills-over-time chart (8 cols). Row 2: Mistake categories (6) + Vocabulary (6). Row 3: Activity calendar (12). Tabs are hidden on desktop, where all sections are shown.

### Components top → bottom
1. **`CEFRLevelCard`:**
   - The current `B1` stamp, large, in the CEFR color with a radial glow, plus the label "Intermediate".
   - The 6-segment CEFR ladder with the current fill % within B1 ("62% to B2").
   - **Projection mini-chart** (Noom/Lifesum): the actual solid line + dashed forecast to a B2 pin, "At 15 min/day: ~March 2027".
   - "Last assessed 12 days ago · Re-test" link.
2. **`SkillsOverTimeChart`** (Recharts via shadcn `Chart`):
   - A legend of dot chips for 6 skills that toggle series (Oura legend).
   - Smooth lines on a 0–100 score axis with CEFR band labels on the right axis (A2/B1/B2 as faint horizontal bands).
   - Range `ToggleGroup`: 7D · 30D · 90D · All (Oura toggle).
   - Delta stat row (Future Pro): "Speaking +6 this month", with the top improver and the weakest skill called out.
   - Mobile: chart height 220px, tap-and-drag tooltip, and the legend wraps to 2 rows.
3. **`SkillScoreGrid`:** 6 tiles (2 cols mobile / 3 desktop). Each has a skill icon, name, score ring, level stamp, and a trend arrow (`TrendingUp` sage / `TrendingDown` coral) with Δ.
4. **`MistakeCategoriesCard`:**
   - A horizontal bar chart ranked by frequency (last 30 days): Articles 34, Verb tense 21, Prepositions 18, Word order 9, Spelling 6. Bars are coral with opacity by rank.
   - Each row expands (`Collapsible`) to show 2 example corrections (original → corrected, same styling as chat) + "Practice this" button (tutor drill).
   - A trend pill per category: "↓ 40% vs last month" in sage = improving.
5. **`VocabularyCard`** (Quizlet rings): New · Learning · Mastered counts with rings + "Words learned this week: 23".
6. **`ActivityCalendar`:** a GitHub-style heatmap on desktop (last 6 months) and a month grid on mobile (Duolingo calendar). Cells are colored by minutes practiced, and the current streak is highlighted.

### States
- **Not enough data (<3 sessions):** charts show a faint sample outline + overlay text "Your chart appears after 3 sessions (1/3)" with a CTA to start a chat. The CEFR card still shows the placement result.
- **Loading:** skeleton blocks with fixed chart heights so the layout doesn't jump.
- **Error:** per-card inline retry.
- **No mistakes in range:** a sage empty state: "No mistakes logged in 7 days. Try a harder scenario?"

---

## 6. Settings

### References (Mobbin)
| App | Screen | What we borrow |
|---|---|---|
| Descript (web) | [Settings modal with left nav + “AI models” section: per-role rows with model select](https://mobbin.com/screens/149858f8-610d-45c7-bf97-f72bd2bfd6f1) | **Primary reference for AI provider/model per role.** Grouped rows ("Core", "Media generation") with a label on the left, a compact `Select` on the right, and "Reset to defaults". |
| Cofounder (web) | [AI Settings page: toggles with descriptions + model dropdown with provider logos and tags](https://mobbin.com/screens/37801342-be92-4580-a24e-81e6c9f35b3a) | A settings page with left section nav. Each row has title + helper text + control on the right. The model dropdown lists items with a provider icon, a speed/cost indicator and "NEW" tags. |
| Claude (iOS) | [Voice settings sheet: voice carousel, language, speed, mode](https://mobbin.com/screens/5021bb4f-ad32-48b5-be25-7f00bf7e6ca3) | The voice section: a voice picker, a speed select, and "Hands free / Push to talk" radio rows with descriptions. |
| Comet (iOS) | [Voice list with play previews + subtitles toggle + speaking rate slider](https://mobbin.com/screens/6fbdafc0-43ed-4272-bb35-d5f4962eeeeb) | A voice list with an inline `Play` preview per voice, a checkmark on the selected one, and a speaking rate slider. |

### Layout
- **Mobile:** a grouped list (iOS-settings style) of cards. Each group opens a sub-page (push navigation) with a back button. The top-level page lists the groups with an icon, title, current value summary and chevron.
- **Desktop:** a page with a **left section nav (220px, sticky)** + content `max-w-2xl` (Cofounder). Every section is on one scrollable page with anchor links, and the nav highlights the active section. A sticky "Unsaved changes · Discard · Save" bar appears only when a form is dirty. Toggles auto-save with a toast.

### Sections & components
1. **Learning profile** (`GraduationCap`)
   - Current level: `Select` A1–C2 with a level stamp preview + "Re-take placement test" link.
   - Goals: multi-select chips (same set as onboarding).
   - Daily goal: `ToggleGroup` 5/10/15/20 min.
   - Native language: `Command` combobox.
2. **Explanations** (`Languages`)
   - `Switch` "Explain corrections in my native language" + helper "Grammar notes in Urdu, examples stay in English". It shows a live preview `CorrectionCard` that updates when toggled.
   - `RadioGroup` correction strictness: Gentle (only major errors) / Balanced / Strict (every error).
   - `Switch` "Show corrections while I chat" (off = corrections only at the end of the session).
3. **Voice & audio** (`Volume2`) — Claude + Comet patterns
   - `Switch` Voice replies (auto-play tutor audio).
   - Tutor voice: a list with a `Play` preview per voice and a check on the selected one.
   - Speaking rate: `Slider` 0.75×–1.25× with ticks.
   - Mic mode: `RadioGroup` Tap to toggle / Push-to-talk (hold).
   - `Switch` Sound effects.
4. **AI models** (`Cpu`) — Descript + Cofounder patterns
   - **Provider connections** subsection: cards per provider (OpenAI, Anthropic, Google, OpenRouter, Local/Ollama). Each card has a logo, status badge (Connected sage / Not set muted / Invalid coral), a masked `KeyRound` API-key input with a "Test" button, and a base-URL field for custom providers.
   - **Models per role** table. Rows = roles, control = a two-part `Select` (provider → model) with capability tags:
     - Tutor conversation (tags: chat, streaming)
     - Corrections & grammar analysis (structured output)
     - Placement & level assessment
     - Flashcard / explanation generation
     - Speech-to-text (voice input)
     - Text-to-speech (tutor voice)
   - Each row has helper text describing the role, and a `RotateCcw` "Use default" icon button when overridden. Dropdown items show a provider icon, model name, speed/cost dots, and a "Recommended" tag (Cofounder dropdown).
   - "Reset all to defaults" (Descript) at the section footer.
   - Desktop shows the table as rows with label left / control right. Mobile stacks label above a full-width select.
5. **Notifications** (`Bell`): daily reminder time and streak-at-risk nudge.
6. **Account** (`User`): email, theme (`ToggleGroup` Light / Dark / System), export data, and a delete account button (destructive, in a separate "Danger zone" card).

### States
- **Key test:** `Loader2` in the button → sage "Connected · 142ms" or a coral inline error ("401 — key rejected").
- **Role configured with a disconnected provider:** the row shows a coral `AlertTriangle` + "Provider not connected — Connect". The tutor chat header shows the same warning.
- **Saving:** auto-save toggles with a `sonner` toast "Saved". Forms use the sticky save bar. Failure shows an inline error + revert.
- **Loading:** skeleton rows per section.
- **Voice preview playing:** the row's `Play` becomes `Pause` with a tiny progress bar, and only one preview plays at a time.

---

## Appendix — Mobbin references index

| # | App | Platform | Mobbin link | Used for |
|---|---|---|---|---|
| 1 | Duolingo | iOS | https://mobbin.com/flows/b0b4f93f-5637-46ec-9d77-49ecda6b991d | Onboarding flow |
| 2 | Duolingo | iOS | https://mobbin.com/flows/ac9d2f58-868d-4fd3-a79c-9655ce6b1522 | Onboarding (native language grouping) |
| 3 | Duolingo | iOS | https://mobbin.com/screens/faf99c88-e9a5-44ef-8e7d-3335018c4781 | Placement question + segmented progress |
| 4 | Duolingo | iOS | https://mobbin.com/screens/fa963b87-61a6-40be-8192-3060fe947088 | Word-bank gap fill |
| 5 | Speak | iOS | https://mobbin.com/screens/f9aa3796-47d7-456f-93c9-30acff81da86 | "What I heard" personalization |
| 6 | Speak | iOS | https://mobbin.com/screens/facb1ee8-3297-4f8f-9cfb-397f7a0f6d29 | Course/level result card |
| 7 | Quizlet | iOS | https://mobbin.com/screens/ed1ddb57-4ef7-47a5-a9f5-60aafbbf2014 | Test result + next steps |
| 8 | Cleo AI | iOS | https://mobbin.com/screens/8c905f3c-e573-42b4-a31e-faf44c7606f2 | Score reveal glow |
| 9 | Duolingo | web | https://mobbin.com/screens/e1681332-12ea-4115-8cd1-54603e0006b7 | Desktop home 3-zone layout |
| 10 | Duolingo | web | https://mobbin.com/screens/e8d3d909-96ab-48cd-8ced-db789e429ec8 | Daily quests progress rows |
| 11 | Duolingo | web | https://mobbin.com/screens/ec3f87db-e37f-40f3-8787-6bb9a1a7d7f8 | Desktop onboarding CTA bar |
| 12 | Noom | iOS | https://mobbin.com/screens/726a894d-7bbb-4269-9e97-3007507cd4e4 | Today's plan card list |
| 13 | Duolingo | iOS | https://mobbin.com/screens/f6675d16-c6b5-4847-aa9f-fb66a2d61e88 | Streak week checks |
| 14 | Duolingo | iOS | https://mobbin.com/screens/fbef2d10-7767-41e4-8a9f-825e022ead13 | Streak calendar + goal |
| 15 | Speak | iOS | https://mobbin.com/screens/f7e41ffd-1ce9-414d-8560-8b574d309bfc | Smart review + concept mastery |
| 16 | pushr | iOS | https://mobbin.com/screens/bd1913f9-cb73-4126-9c41-fb92dfe61b97 | Weekly streak widget |
| 17 | Speak | iOS | https://mobbin.com/screens/fd3eca22-b486-45fd-b71e-e60dce3655ad | Tutor chat bubbles + actions + mic |
| 18 | Claude | iOS | https://mobbin.com/screens/42340550-73a5-46d0-973d-21316812ae5c | Streaming reply + composer |
| 19 | Claude | iOS | https://mobbin.com/screens/13cf4949-114a-4686-a9ef-9c80f694c801 | Voice listening pill |
| 20 | Claude | iOS | https://mobbin.com/screens/4fa45c9f-6f44-4d0d-9224-f768e556c9cc | Voice transcript / mic off |
| 21 | Opera | iOS | https://mobbin.com/screens/29b1e003-fd89-40de-bc29-4f573e1c09f5 | Suggested follow-ups + mic in composer |
| 22 | Bumble | iOS | https://mobbin.com/screens/3e64212d-2ae7-43ab-89e2-21e7a0b1b4c8 | Hold-to-record, slide to cancel |
| 23 | Descript | web | https://mobbin.com/screens/dcb7a1b2-20ed-4014-a6d8-724463114e70 | Inline underline marks in text |
| 24 | Messages | iOS | https://mobbin.com/screens/dc4909db-9e9c-42f6-a39b-d6ec45c87e90 | Translate bottom sheet |
| 25 | Gemini Notebook | web | https://mobbin.com/screens/34c51558-a1fa-4db3-a2c6-2ec7ef560b06 | 3-pane chat + side panel; desktop flashcard controls |
| 26 | Noom | iOS | https://mobbin.com/screens/6b9c88e2-07b2-43c6-8bdf-c35821f0ebbe | Typing indicator |
| 27 | GitHub | iOS | https://mobbin.com/screens/5df22f1d-d7b4-4d81-aee0-241b4d94b11f | AI error message state |
| 28 | Quizlet | iOS | https://mobbin.com/screens/80a4c6a5-566b-4005-a227-16ff5eac01e0 | Flashcard front + tallies |
| 29 | Quizlet | iOS | https://mobbin.com/screens/5dacac8f-b958-417c-bae8-e70c4ac3273f | Swipe tilt feedback |
| 30 | Quizlet | iOS | https://mobbin.com/screens/f0707e72-e036-47fa-8f58-99e2387ba0ff | Completion donut |
| 31 | Headway | iOS | https://mobbin.com/screens/e109ca23-95a1-4edd-94d8-704a97ad043b | Word in context + remember? buttons |
| 32 | Babbel | iOS | https://mobbin.com/screens/2be4c469-11ee-4134-be4d-0e8a8d9b1cca | Tinted rating buttons tray |
| 33 | Duolingo | iOS | https://mobbin.com/screens/fe966528-929c-475b-b917-9b342e3868a5 | Lesson-complete stat tiles |
| 34 | Oura | iOS | https://mobbin.com/screens/a941cbbe-8aa1-4a46-a93a-93d0d2b85ec9 | Multi-line scores chart + toggle |
| 35 | Future Pro | iOS | https://mobbin.com/screens/4d96c3e9-c7b8-4266-b086-ad92ec6c3c07 | Chart + delta stats |
| 36 | Noom | iOS | https://mobbin.com/screens/61bec45a-1a33-479a-8836-b7b9e0183384 | Goal projection chart |
| 37 | Lifesum | iOS | https://mobbin.com/screens/387e3e82-0f43-495e-b0c7-2596f690de3f | Goal projection |
| 38 | Quizlet | iOS | https://mobbin.com/screens/439e68be-eb63-4fb8-985a-ab27b24e3ff2 | Mastery rings rows |
| 39 | Descript | web | https://mobbin.com/screens/149858f8-610d-45c7-bf97-f72bd2bfd6f1 | AI models per role settings |
| 40 | Cofounder | web | https://mobbin.com/screens/37801342-be92-4580-a24e-81e6c9f35b3a | AI settings page + model dropdown |
| 41 | Claude | iOS | https://mobbin.com/screens/5021bb4f-ad32-48b5-be25-7f00bf7e6ca3 | Voice settings sheet |
| 42 | Comet | iOS | https://mobbin.com/screens/6fbdafc0-43ed-4272-bb35-d5f4962eeeeb | Voice list previews + rate slider |

**Not found on Mobbin (patterns cited from general knowledge):** Anki/AnkiDroid (Again/Hard/Good/Easy with intervals), Praktika (scenario persona header), Elsa Speak (per-skill score rings, pronunciation color coding). Busuu and Memrise weren't needed.
