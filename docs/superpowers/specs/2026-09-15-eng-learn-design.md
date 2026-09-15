# eng-learn — Design Spec

Date: 2026-09-15
Status: Approved (sections 1–3 in chat; screens from Mobbin research in `docs/design/screens.md`)

## Goal
An AI English tutor web app with many activity types, for all levels (A1–C2) and all goals
(conversation, business, exam, pronunciation). Built for a single user first, structured to become
a public product (auth, billing) without rework.

## Architecture
Turborepo monorepo, pnpm workspaces, Next.js App Router as a thin shell; all logic lives in packages.

```
apps/web                 Next.js app: pages, UI wiring, route handlers
packages/core            Pure TS domain: CEFR, skills, SRS (ts-fsrs), level estimation, types
packages/config          Env validation (zod), model-role routing config
packages/ai              AIProvider interface + Anthropic and OpenAI(-compatible) adapters
packages/voice           STT/TTS: OpenAI adapter (server) + browser Web Speech fallback (client)
packages/db              Prisma schema, client, repository functions
packages/activities      Activity modules: placement, tutor-chat, flashcards
packages/ui              Shared React components (Tailwind)
packages/typescript-config, packages/eslint-config
```

Dependency direction (no cycles):
- web → activities, ui, db, voice, config, core
- activities → ai, core, db
- ai, voice, db → core, config
- core → nothing

Internal packages export TypeScript source (JIT internal packages); only the app builds.

## AI layer (`packages/ai`)
```ts
interface AIProvider {
  chat(req: ChatRequest): Promise<ChatResponse>
  stream(req: ChatRequest): AsyncIterable<ChatChunk>
  structured<T>(req: ChatRequest, schema: ZodType<T>): Promise<T>
}
```
- Adapters: Anthropic (`@anthropic-ai/sdk`), OpenAI (`openai`, supports custom `baseURL` for any
  OpenAI-compatible endpoint).
- Role routing via env: `AI_TUTOR`, `AI_GRADER`, `AI_GENERATOR` as `provider:model`.
  Activities request a role, never a model.
- Structured output validated with zod; one retry on validation failure.

## Activity contract (`packages/activities`)
```ts
interface Activity<Input, Output, Result> {
  id: string
  buildPrompt(ctx: LearnerContext, input: Input): ChatRequest
  outputSchema: ZodType<Output>
  evaluate(output: Output, ctx: LearnerContext): Result
}
```
`LearnerContext`: level, goals, weak areas, recent mistakes, native language.
Every activity yields an `ActivityResult`: score, mistakes (typed), new vocabulary — which feeds
progress and auto-creates flashcards.

Tutor chat: streamed reply + structured analysis of the user's last message
(`corrections[]` original→corrected+explanation, `newWords[]`).

## Data model (`packages/db`)
User, ActivitySession, Message, Mistake, VocabItem (FSRS state), SkillScore — as approved in chat.
Every row is user-scoped. Single default user seeded until auth is added.
Weak areas computed by grouping recent Mistakes by category.

## v1 scope
1. Onboarding + placement test → CEFR level
2. Tutor chat with inline corrections, text + optional voice
3. Vocabulary flashcards with FSRS; words auto-added from chat
4. Progress dashboard
5. Settings

Later, in order: grammar drills, reading, writing feedback, listening, pronunciation scoring,
exam/business packs, auth + billing.

## Error handling
- Missing provider key → settings/health banner, activity disabled with explanation (no crash).
- AI call failure → user-visible retry; structured-output validation retried once then surfaced.
- Voice unavailable (no OpenAI key / unsupported browser) → mic hidden or falls back to Web Speech.

## Testing
- Vitest unit tests for `core` (SRS, level estimation), `activities` (prompt building, evaluate),
  `ai` (adapters with mocked SDK clients).
- Typecheck + lint via turbo across all packages.
