# Claudius Minor livestream guide

This is the single event runbook for the prepared checkpoint walkthrough. Show each small code diff, load the next Git tag, and demonstrate the new behavior. No live typing or deployment between steps is required.

For slide controls, source files, PDF export, and badge coverage, see [PRESENTATION-GUIDE.md](PRESENTATION-GUIDE.md). For provider setup, see [digitalocean-setup.md](digitalocean-setup.md).

## Working environments

| Environment | Purpose |
|---|---|
| [Completed DigitalOcean app](https://claudius-minor-opf4x.ondigitalocean.app) | Finished-app showcase and fallback |
| [Hosted slides](https://claudius-minor-opf4x.ondigitalocean.app/slides) | Audience presentation, independent of local tag switches |
| Separate local worktree | Load and demonstrate the prepared checkpoints |
| Separate Atlas cluster | Isolate local walkthrough data from the hosted app |

The slide links open the completed hosted app. Use a pre-opened localhost tab for the starting-state walkthrough. DigitalOcean still serves inference when Next.js runs locally; the model does not run on the laptop.

## Checkpoints and version boundaries

| Tag | Behavior added |
|---|---|
| `start` | Chat and web search; MemorySaver holds state in process memory; personal memory remains TODOs |
| `step-1` | MongoDBSaver makes graph state durable |
| `step-2` | Extraction reads new conversation text and inserts memories |
| `step-3` | Owner-filtered profile and vector recall supply prompt context |
| `step-4` | Duplicate decisions and supersession lineage replace insert-only persistence |
| `final` | Historical completed snapshot, not a fifth lesson |

The rebuilt checkpoints use the current app's UI, dependencies, credential validation, scripts, and safeguards throughout. Only the four lesson capabilities are withheld at `start`. Step 4 restores the current recent-write checks and structured memory-relation comparison. `step-4`, `final`, and the reference `main` commit have identical file trees. Lineage writes are not an atomic multi-document transaction.

## Prepare the local worktree

From the existing repository:

```bash
git fetch origin --tags
git worktree add ../claudius-minor-live start
cd ../claudius-minor-live
pnpm install --frozen-lockfile
```

Choose another path if this worktree already exists. Detached HEAD is intentional: this walkthrough loads snapshots without creating new commits. Keep the original `main` folder untouched, including any unrelated local changes. Use Node 22 or newer and the package manager declared by the checkpoint.

Inspect the actual transitions before rehearsal:

```bash
git show -s --format='%h %s' start step-1 step-2 step-3 step-4 final
git diff --stat start..step-1
git diff --stat step-1..step-2
git diff --stat step-2..step-3
git diff --stat step-3..step-4
```

### Credentials and database isolation

Configure this worktree's `.env` privately. Never display, commit, or copy credentials into public notes.

- `MONGODB_URI`: a separate Atlas walkthrough cluster.
- `DO_MODEL_ACCESS_KEY`: DigitalOcean model access key.
- `DO_INFERENCE_BASE_URL`: normally `https://inference.do-ai.run/v1`.
- `CHAT_MODEL` and `EXTRACTION_MODEL`: the same verified gpt-oss-120b endpoint identifier.
- `TAVILY_API_KEY`: web-search credentials.

The tagged database accessor and MongoDBSaver explicitly select `claudius_minor`. Changing only the URI's database suffix does not isolate two apps on the same cluster. A separate cluster avoids modifying the hosted app's personas, conversations, and memories. Allow connections from the presenter's network and confirm Atlas supports the required Automated Embedding index.

The checkpoint scripts load `.env` explicitly, matching the completed app:

```bash
pnpm spike:do-model-list
```

Set both model variables to the exact verified gpt-oss-120b ID. Then verify streaming, tool calling, and structured output:

```bash
pnpm spike:do-chat
pnpm spike:do-tools
pnpm spike:do-structured
```

Prepare the walkthrough database:

```bash
pnpm db:setup
pnpm check
```

The setup script creates collections and indexes, waits for vector-index readiness, and seeds Angela, Betty, and Caroline. Confirm it succeeds before demonstrating the app.

Run the credential-backed integration checks:

```bash
pnpm test:integration
```

These test files live under `tests/integration`, not the obsolete `integration` directory. Credential validation accepts the same key formats as the completed app. End-to-end memory checks require the completed checkpoint; earlier stages intentionally omit those capabilities.

Skipped tests do not verify a service. Unit tests do not prove provider behavior, memory persistence, vector retrieval, or end-to-end isolation. Rehearse the actual app at every checkpoint. Measure embedding visibility in the demo cluster; do not use an invented latency or treat a successful profile query as proof of vector recall.

## Event schedule

This is the authoritative schedule. The 21-slide deck uses 1-based numbering, including the title. Public slide notes explain concepts and resources; they contain no presenter instructions.

| Minutes | Slides and activity |
|---|---|
| 0–3 | 1–2, title and introduction |
| 3–5 | 3–4, app purpose and open-weight model stack |
| 5–8 | 5–7, reasoning, tools, memory, and planning |
| 8–10 | 8–9, access-pattern modeling and graph architecture |
| 10–13 | 10, starting-app demo |
| 13–16 | 11–12, data backend and memory scopes |
| 16–23 | 13, Step 1 and restart demonstration |
| 23–30 | 14, Step 2 and extraction demonstration |
| 30–37 | 15–16, Step 3 and owner-filtered recall |
| 37–44 | 17, Step 4 and supersession |
| 44–51 | 18, end-to-end proof |
| 51–54 | Flexible buffer; discuss caveats with the relevant demos |
| 54–56 | 19, concept recap |
| 56–58 | 20, badge CTA |
| 58 | 21, brief Thank You sign-off |

Keep the event below 60 minutes. Protect the badge CTA rather than extending the coding segments or adding an unbounded Q&A.

## Checkpoint-switching process

At each step:

1. Explain the missing capability.
2. Display the diff. `git diff` does not apply it.
3. Stop the local dev server with Ctrl+C.
4. Confirm the worktree has no tracked edits.
5. Load the next tag, run checks, and restart.
6. Refresh localhost and demonstrate the result.

```bash
git status --short
```

Do not force a switch or reset away unexpected edits. `git switch --detach` replaces tracked files with the prepared snapshot. It does not deploy anything or reset Atlas data. The untracked `.env` and ignored dependencies remain in place. Dependency files do not change between these `start` and `step-4` tags, so installation is not needed at every transition.

### Starting-app demonstration

```bash
pnpm dev
```

At localhost, select Angela, send a greeting, and request current information to trigger web search. Show streamed text, inspect search sources, and point out the conversation list and empty memory panel.

Connect this to slides 8 and 9: the sidebar reads conversation headers; the current thread reads graph-state messages. The browser sends new text and a conversation ID, not an authoritative transcript. MemorySaver does not survive a restart yet.

### Step 1, durable conversations

Display:

```bash
git diff start..step-1 -- src/lib/agent.ts
```

Explain the existing MongoDBSaver accessor and stable `thread_id`. Stop the server, then:

```bash
git status --short
git switch --detach step-1
pnpm typecheck
pnpm test
pnpm dev
```

Create a new conversation after loading Step 1. Send a message, restart the server, and reopen it. Earlier MemorySaver messages do not automatically migrate to MongoDBSaver. The application must verify conversation ownership before returning checkpoint-derived history.

### Step 2, personal-memory extraction

Display:

```bash
git diff step-1..step-2
```

Explain the extraction watermark, human/assistant text filtering, structured-output validation, and owner-scoped inserts. Stop the server, then:

```bash
git status --short
git switch --detach step-2
pnpm typecheck
pnpm test
pnpm dev
```

Tell Angela: `I live in Toronto and I am learning pottery.` Wait for extraction and show the memory record. Tool calls and results must not become personal facts. The watermark advances only after successful processing. Use synthetic data and acknowledge that extraction can make mistakes.

### Step 3, relevant recall

Display:

```bash
git diff step-2..step-3
```

Explain profile queries, vector search with owner/active-status pre-filters, context de-duplication, and retrieval failure handling. Stop the server, then:

```bash
git status --short
git switch --detach step-3
pnpm typecheck
pnpm test
pnpm dev
```

Ask Angela a pottery-related question in a fresh conversation. Inspect the memories-used indicator. Switch to Betty and confirm Angela's facts are absent. Distinguish profile recall from vector recall: a document query may find a fact before its embedding becomes searchable. The persona cookie is a demo switcher, not authentication.

### Step 4, changed facts and lineage

Display:

```bash
git diff step-3..step-4
```

Explain insert, skip, supersede, and the lineage pointers. The prepared diff enables previously skipped action tests; no manual test editing is required. Stop the server, then:

```bash
git status --short
git switch --detach step-4
pnpm typecheck
pnpm test
pnpm dev
```

Tell Angela: `I now live in Montréal instead of Toronto.` After extraction and indexing catch up, inspect the new active record and the superseded record's lineage. Semantic neighbors and recent writes supply comparison candidates. Exact duplicates are skipped, and a structured model comparison distinguishes replacement from compatible facts. The lineage update is not an atomic transaction.

## End-to-end proof and close

Use the completed local checkpoint to demonstrate durability, fresh-thread recall, persona isolation, and supersession. The hosted app is a fallback, not the next checkpoint. The completed checkpoint matches the reference app code; databases and runtime configuration remain separate.

On slide 20, keep the QR visible and direct attendees to https://mdb.link/hacktoberfest-2026-badge for the Build Agents with MongoDB Skill Badge. The course is https://learn.mongodb.com/courses/ai-agents-with-mongodb. Attendance alone does not earn the badge. Advance to Thank You for the brief sign-off.

## Preflight and recovery

Before the event:

- Rehearse all four switches in the actual live worktree with real-service checks.
- Confirm local data is isolated from the hosted app and contains only synthetic facts.
- Open hosted slides, localhost, the live-worktree editor, and the hosted fallback.
- Allow slide-view popups and test navigation and notes.
- In MLH StreamYard, share only the audience surface; keep notes and credentials unshared.
- Rehearse switching between slides, app, and editor with the host.
- Keep the worktree clean and run only reviewed commands.

If a provider or search fails, retry once, then use the labeled fallback or continue the explanation without claiming success. If extraction or vector recall is delayed, use the rehearsed wait and inspect stored records rather than repeatedly generating duplicates. A stored record proves persistence, not vector retrieval. If a checkpoint fails, explain the failure and move only to a rehearsed working checkpoint after stopping the server and preserving any local edits. Never force tags or discard unreviewed work.

No DigitalOcean deployments occur between steps. Keep the hosted slides independent of local tag switches, use the rebuilt tags, and leave the completed deployment ready as the fallback.
