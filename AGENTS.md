# Claudius Minor conventions

## Project

Claudius Minor is a single-package Next.js 16 App Router chat agent. It uses React 19, strict TypeScript, LangGraph, MongoDB Atlas as its application database and checkpoint store, Atlas Automated Embedding with Voyage `voyage-4`, DigitalOcean Serverless Inference, and Tavily basic search. Node must be 22 or newer. pnpm manages dependencies. The project is an MIT-licensed learning repo.

## Layout

- `src/app` contains App Router pages and route handlers.
- `src/lib` contains environment parsing, MongoDB records and accessors, agent graph, memory operations, prompts, search, and request validation.
- `scripts` contains database setup and verification spikes.
- `integration` contains credential-gated live integration tests.
- `.do` contains DigitalOcean App Platform specs.

## Commands

- `pnpm install` installs dependencies.
- `pnpm spike:do-model-list` lists DigitalOcean model IDs so the `.env` values can be verified.
- `pnpm db:setup` creates collections and indexes, waits for the vector index, and seeds three personas.
- `pnpm dev` starts Next.js locally.
- `pnpm check` runs typecheck, lint, unit tests, then production build.
- `pnpm test:integration` runs real-service integration checks and skips them when credentials are absent.

## Data model

MongoDB database `claudius_minor` has `users`, `conversations`, `memories`, `checkpoints`, and `checkpoint_writes`. Seed only Angela, Betty, and Caroline. Conversations store their title, timestamps, user ID, and extraction watermark. Memories store the text in `content`, category, importance, owner, source conversation, status, and optional supersession pointers. `memories_vector` uses Atlas Automated Embedding with `voyage-4` and filters by `userId` and `status`. MongoDBSaver owns checkpoint records.

## Security and data handling

Resolve the current user only from the server-read switcher cookie. Never accept a user ID from a request body or model output. Every query over user data must filter by the authenticated-by-cookie user's `userId`. Verify ownership before returning a conversation, memory, or checkpoint-derived transcript. Extraction processes only new human and assistant text after the watermark. Exclude tool calls and tool results so search content never becomes a personal memory. Memory retrieval failures must not break a chat response.

## Tests

Vitest unit tests run without network access. Cover memory action decisions, extraction filtering, memory block de-duplication, search result mapping, environment and record schemas, and cookie-based user resolution. Integration tests use real Atlas, DigitalOcean, and Tavily only when credentials exist. Run `pnpm check` before calling a change complete.

## Livestream workflow

Keep the `main` branch complete. Build `livestream` from it with a linear set of commits tagged `start`, `step-1`, `step-2`, `step-3`, `step-4`, `step-5`, and `final`. Each step must have a small diff and make its corresponding failing tests pass. `start` has no tools or web-search instruction. Step 1 introduces tools; Steps 2–5 introduce durable checkpoints, extraction, recall, and action decisions. Memory retrieval, extraction persistence, and action decisions at `start` are deliberate readable TODO stubs. `final` must match `main`.

## Instructional code

Keep code exceptionally readable on a shared screen. Run `pnpm format` after edits. Use multiline objects, model configuration, pipelines, and chained calls rather than dense one-line expressions. Wrap prompts into short lines with blank lines between instruction groups. Keep each checkpoint transition focused on its lesson, not formatting churn.

## Writing rules

Use active voice. Do not use em dashes. Do not use colons in H1 titles. Keep comments brief and explain useful design choices. Do not add references to features removed from this project.
