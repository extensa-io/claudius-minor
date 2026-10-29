# Claudius Minor livestream guide

This is the single event runbook for the prepared checkpoint walkthrough. Show each small code diff, load the next Git tag, and demonstrate the new behavior. No live typing or deployment between steps is required.

For slide controls, source files, PDF export, and badge coverage, see [PRESENTATION-GUIDE.md](PRESENTATION-GUIDE.md). For provider setup, see [digitalocean-setup.md](digitalocean-setup.md).

## Working environments

| Environment | Purpose |
|---|---|
| [Completed DigitalOcean app](https://claudius-minor-opf4x.ondigitalocean.app) | Finished-app showcase and fallback |
| [Hosted slides](https://claudius-minor-opf4x.ondigitalocean.app/slides) | Audience presentation, independent of local tag switches |
| Separate local worktree | Load and demonstrate the prepared checkpoints |
| Demo Atlas cluster | Shared disposable data with the hosted app, or a separate cluster for isolation |

The slide links open the completed hosted app. Use a pre-opened localhost tab for the starting-state walkthrough. DigitalOcean still serves inference when Next.js runs locally; the model does not run on the laptop.

## Checkpoints and version boundaries

| Tag | Behavior added |
|---|---|
| `start` | Streamed chat with no tools; conversation headers and MemorySaver messages stay in process memory; personal memory remains TODOs |
| `step-1` | Web-search tool binding, execution, and the tool-result loop |
| `step-2` | MongoDB conversation headers and MongoDBSaver make the entire conversation durable |
| `step-3` | Extraction reads new conversation text and inserts memories |
| `step-4` | Owner-filtered profile and vector recall supply prompt context |
| `step-5` | Duplicate decisions and supersession lineage replace insert-only persistence |
| `final` | Completed reference app snapshot, not a sixth lesson |

The rebuilt checkpoints use the current app's UI, dependencies, credential validation, scripts, and safeguards throughout. All five lesson capabilities are withheld at `start`. Step 5 restores the reference app's recent-write checks and structured memory-relation comparison. The checkpoints include the latest slides, lock-aware `db:reset`, and access-code validation with no minimum length. Use the hosted slides during the event so tag switching cannot interrupt the presentation. `step-5`, `final`, and the reference `main` commit have identical file trees. Lineage writes are not an atomic multi-document transaction.

## Prepare the local worktree

### Replace an existing worktree

Stop its dev server. Move the terminal to the original repository before removing the live folder. For this machine:

```bash
cd /Users/nestor.daza/Massive/Repos/claudius-minor
```

Use your own original-repository path on another machine. Inspect the worktree before removal:

```bash
git -C ../claudius-minor-live status --short
```

Save any work you want to retain. Back up its `.env` privately outside the worktree; Git does not preserve ignored credentials. Remove the worktree from the original repository with:

```bash
git worktree remove ../claudius-minor-live
```

Git may refuse because `.env` or other untracked files remain. After backing them up, remove only those files deliberately and retry; do not use `--force` to discard unreviewed work.

If you already deleted the folder using the file browser, or `pnpm` reports `ENOENT` / `uv_cwd`, the terminal may still reference the deleted directory. Recover from an existing directory:

```bash
cd /Users/nestor.daza/Massive/Repos/claudius-minor
git worktree prune
git fetch origin --tags --force
git worktree list
```

If the live worktree is absent, recreate it using the next section. If it already exists, skip `git worktree add` and enter the folder again. Even a recreated folder at the same path requires a fresh `cd`; the old terminal directory reference is no longer valid.

### Create the fresh worktree

From the existing repository, after confirming the live worktree is absent:

```bash
cd /Users/nestor.daza/Massive/Repos/claudius-minor
git fetch origin --tags --force
git worktree add ../claudius-minor-live start
cd /Users/nestor.daza/Massive/Repos/claudius-minor-live
pnpm install --frozen-lockfile
```

Adjust the absolute path on another machine. Restore `.env` privately afterward. Recreating the worktree does not reset Atlas data. For a clean rehearsal database, use `pnpm db:reset` from current `main` as described under **Clear demo data**; the apps may stay online, but no chat or extraction may hold the mutation lock.

Choose another path if this worktree already exists. Detached HEAD is intentional: this walkthrough loads snapshots without creating new commits. Keep the original `main` folder untouched, including any unrelated local changes. Use Node 22 or newer and the package manager declared by the checkpoint.

Configure VS Code using **Configure VS Code diffs once** below, then inspect each transition visually before rehearsal. Run one command at a time and close its diff tabs before moving on:

```bash
git difftool --tool=vscode start step-1 -- src/lib/agent.ts src/lib/prompt.ts
git difftool --tool=vscode step-1 step-2 -- src/lib/agent.ts src/lib/conversation-store.ts
git difftool --tool=vscode step-2 step-3
git difftool --tool=vscode step-3 step-4 -- src/lib/agent.ts
git difftool --tool=vscode step-4 step-5
```

### Credentials and database isolation

The new worktree does not inherit `.env`. Restore your private walkthrough backup to this folder, or create `.env` from `.env.example` and populate it privately. Verify the path is `claudius-minor-live/.env`, not the original repo's file. Never display, commit, or copy credentials into public notes.

- `MONGODB_URI`: the demo Atlas cluster. Sharing the hosted app's database is acceptable when all records are disposable; both apps share personas, memories, usage counters, and the mutation lock.
- `DO_MODEL_ACCESS_KEY`: DigitalOcean model access key.
- `DO_INFERENCE_BASE_URL`: normally `https://inference.do-ai.run/v1`.
- `CHAT_MODEL` and `EXTRACTION_MODEL`: the same verified gpt-oss-120b endpoint identifier.
- `TAVILY_API_KEY`: web-search credentials.

The database accessor and MongoDBSaver explicitly select `claudius-minor-app`. Changing only the URI's database suffix does not isolate two apps on the same cluster. A separate cluster provides isolation; when sharing the database, reset affects both apps and concurrent mutations compete for the shared lock. Allow connections from the presenter's network and confirm Atlas supports the required Automated Embedding index.

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

Run the complete credential-backed integration checks at `final` during preflight, then return to `start` before rehearsing:

```bash
git switch --detach final
pnpm check
pnpm test:integration
git switch --detach start
pnpm dev
```

Do not run the full integration suite at `start`: extraction and memory-flow tests expect capabilities that are intentionally stubbed there. These test files live under `tests/integration`, not the obsolete `integration` directory. Credential validation accepts the same key formats as the completed app. Integration checks use real services and may consume inference and search credits.

Skipped tests do not verify a service. Unit tests do not prove provider behavior, memory persistence, vector retrieval, or end-to-end isolation. Rehearse the actual app at every checkpoint. Measure embedding visibility in the demo cluster; do not use an invented latency or treat a successful profile query as proof of vector recall.

## Event schedule

This is the authoritative schedule. The 24-slide deck uses 1-based numbering, including the title. Public slide notes explain concepts and resources; they contain no presenter instructions.

| Minutes | Slides and activity |
|---|---|
| 0–3 | 1–4, title, personal introduction, badge announcement, and resources QR |
| 3–5 | 5–6, app purpose and open-weight model stack |
| 5–8 | 7–9, reasoning, tools, memory, and planning |
| 8–10 | 10–11, access-pattern modeling and graph architecture |
| 10–13 | 12, starting-app demo |
| 13–18 | 13, Step 1, tools and current-evidence demonstration |
| 18–21 | 14–15, data backend and memory scopes |
| 21–27 | 16, Step 2 and restart demonstration |
| 27–33 | 17, Step 3 and extraction demonstration |
| 33–39 | 18–19, Step 4 and owner-filtered recall |
| 39–45 | 20, Step 5 and supersession |
| 45–51 | 21, end-to-end proof |
| 51–54 | Flexible buffer; discuss caveats with the relevant demos |
| 54–56 | 22, concept recap |
| 56–58 | 23, badge CTA |
| 58 | 24, brief Thank You sign-off |

Keep the event below 60 minutes. Protect the badge CTA rather than extending the coding segments or adding an unbounded Q&A.

## Checkpoint-switching process

### Configure VS Code diffs once

In the live worktree terminal:

```bash
git config --local diff.tool vscode
git config --local difftool.vscode.cmd 'code --wait --diff "$LOCAL" "$REMOTE"'
git config --local difftool.prompt false
```

If `code` is not found, open VS Code's Command Palette with Cmd+Shift+P and run **Shell Command: Install 'code' command in PATH**. Open a new terminal and verify `code --version`. Alternatively, on macOS:

```bash
git config --local difftool.vscode.cmd '"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --wait --diff "$LOCAL" "$REMOTE"'
```

VS Code displays the previous checkpoint on the left and the next checkpoint on the right. For multiple files, close the current diff tab to advance to the next file. These settings affect local Git configuration, not tracked source files. Difftool only displays changes; it does not load the next checkpoint. Increase the editor font size and keep comparisons side-by-side for screen sharing.

### Repeat at each checkpoint

Run `pnpm check` at every checkpoint during preflight, not during the broadcast. Before starting the walkthrough, inspect the worktree once:

```bash
git status --short
```

Review any tracked edits before proceeding. At each on-air step:

1. Explain the missing capability.
2. Open the prepared diff in VS Code using `git difftool`. Close each diff tab to advance through files.
3. Wait for chat and extraction to finish, then stop the local dev server with Control+C, not Command+C on macOS.
4. Run the step's single switch-and-start command below.
5. Refresh localhost and demonstrate the result.

The `&&` starts the server only if switching succeeds. If Git refuses a switch, run `git status --short` and inspect the edits then. Do not force a switch or reset away unexpected edits. `git switch --detach` replaces tracked files with the prepared snapshot. It does not deploy anything or reset Atlas data. The untracked `.env` and ignored dependencies remain in place. Dependency files do not change between these `start` and `step-5` tags, so installation is not needed at every transition.

### Starting-app demonstration

The chat header shows the snapshot's checkpoint and capability, such as `start · No tools · transient chat` or `step-2 · Durable conversations`. Check this indicator after each switch and browser refresh. The completed `step-5`, `final`, and `main` trees share the `step-5 / final · Completed app` label to preserve their identical source trees.

```bash
pnpm dev
```

At localhost on `start`, select Angela and ask a stable knowledge question, such as `Why does the Moon have phases?` Show streamed text and the empty memory panel. Then ask one rehearsed current-event question. There is no web-search tool, no search activity, and no live evidence. Compare the answer against a trusted source prepared privately during rehearsal. It may be stale, wrong, or honestly uncertain; do not promise a hallucination or demand one.

Choose a recent, settled fact shortly before the event, for example the winner of a sporting final held last weekend or a product version released this week. Ask for the event date and source links. Verify the expected answer and retain the source URL and date in private rehearsal notes. Avoid ambiguous questions, future events, and volatile counts. If the model knows the answer by chance, it still cannot verify the fact with a live tool. Never present invented source links as evidence.

Connect this to slides 10 and 11: the sidebar reads in-process conversation headers; the current thread reads MemorySaver messages. The browser sends new text and a conversation ID, not an authoritative transcript. Browser refresh does not restart the server, so both remain visible. Stop and restart the server, refresh localhost, and confirm both the sidebar entries and messages disappear. Neither is stored in MongoDB before Step 2. Users, access controls, operation locks, and usage counters still use MongoDB.

### Step 1, introduce tools

Display:

```bash
git difftool --tool=vscode start step-1 -- src/lib/agent.ts src/lib/prompt.ts
```

Explain the tool schema, model binding, conditional routing, ToolNode execution, result loop, and four-result search bound. Stop the server, then:

```bash
git switch --detach step-1 && pnpm dev
```

Refresh localhost and start a fresh conversation. Repeat the same current-event question without pasting the answer or earlier output. Show the search indicator, returned source links, and answer. Inspect the sources against the privately verified event date and fact. Tool execution does not prove accuracy; sources can be weak or stale. The model may choose not to search, so rehearse a clear request to search for current evidence. If search fails, label the failure and follow the recovery policy. Restarting discarded the previous in-process headers and transcript; no state migration occurs yet.

### Step 2, durable conversations

Display:

```bash
git difftool --tool=vscode step-1 step-2 -- src/lib/agent.ts src/lib/conversation-store.ts
```

Close each diff tab when finished. Explain how the conversation-store accessor switches from process memory to MongoDB and the graph switches to MongoDBSaver with a stable `thread_id`. Stop the server, then:

```bash
git switch --detach step-2 && pnpm dev
```

Create a new conversation after loading Step 2. Send a message, restart the server, and reopen it. Earlier transient headers and MemorySaver messages do not automatically migrate to MongoDB. The application must verify conversation ownership before returning checkpoint-derived history.

### Step 3, personal-memory extraction

Display:

```bash
git difftool --tool=vscode step-2 step-3
```

Close each diff tab to advance through the changed files. Explain the extraction watermark, human/assistant text filtering, structured-output validation, and owner-scoped inserts. Stop the server, then:

```bash
git switch --detach step-3 && pnpm dev
```

Tell Angela: `I live in Toronto and I am learning pottery.` Wait for extraction and show the memory record. Tool calls and results must not become personal facts. The watermark advances only after successful processing. Use synthetic data and acknowledge that extraction can make mistakes.

### Step 4, relevant recall

Display:

```bash
git difftool --tool=vscode step-3 step-4 -- src/lib/agent.ts
```

Close the diff tab when finished. Explain profile queries, vector search with owner/active-status pre-filters, context de-duplication, and retrieval failure handling. Stop the server, then:

```bash
git switch --detach step-4 && pnpm dev
```

Ask Angela a pottery-related question in a fresh conversation. Inspect the memories-used indicator. Switch to Betty and confirm Angela's facts are absent. Distinguish profile recall from vector recall: a document query may find a fact before its embedding becomes searchable. The persona cookie is a demo switcher, not authentication.

### Step 5, changed facts and lineage

Display:

```bash
git difftool --tool=vscode step-4 step-5
```

Close each diff tab to advance through the implementation and test changes. Explain insert, skip, supersede, and the lineage pointers. The prepared diff enables previously skipped action tests; no manual test editing is required. Stop the server, then:

```bash
git switch --detach step-5 && pnpm dev
```

Tell Angela: `I now live in Montréal instead of Toronto.` After extraction and indexing catch up, inspect the new active record and the superseded record's lineage. Semantic neighbors and recent writes supply comparison candidates. Exact duplicates are skipped, and a structured model comparison distinguishes replacement from compatible facts. The lineage update is not an atomic transaction.

## End-to-end proof and close

Use the completed local checkpoint to demonstrate durability, fresh-thread recall, persona isolation, and supersession. The hosted app is a fallback, not the next checkpoint. The completed checkpoint matches the reference app code; databases and runtime configuration remain separate.

On slide 23, keep the QR visible and direct attendees to https://mdb.link/hacktoberfest-2026-badge for the Build Agents with MongoDB Skill Badge. The course is https://learn.mongodb.com/courses/ai-agents-with-mongodb. Attendance alone does not earn the badge. Advance to Thank You for the brief sign-off.

## Clear demo data

From the current `main` worktree, run:

```bash
pnpm db:reset
```

Apps can stay running. Reset acquires the shared exclusive mutation lock and refuses if chat, extraction, or another reset is active. Wait and retry; do not clear another worker's lock. A stale crash lock requires the documented `demo:unlock` procedure.

This irreversibly clears conversations, memories, checkpoints, checkpoint writes, and usage counters. It preserves users, collections, indexes, and other workers' locks in `claudius-minor-app`. No setup or vector-index rebuild is needed. It uses the current app's `DATABASE_NAME`, not the URI suffix. Back up anything needed first and refresh open app tabs afterward. Vector-search deletion visibility may lag briefly; a database failure can leave partial cleanup. The reset command is included in every rebuilt checkpoint. No reset is performed by switching tags.

## Preflight and recovery

Before the event:

- Rehearse all five switches in the actual live worktree with real-service checks.
- Confirm the selected cluster and database. If shared with the hosted app, keep all data disposable and synthetic, and avoid concurrent hosted chats.
- Open hosted slides, localhost, the live-worktree editor, and the hosted fallback.
- Allow slide-view popups and test navigation and notes.
- In MLH StreamYard, share only the audience surface; keep notes and credentials unshared.
- Rehearse switching between slides, app, and editor with the host.
- Keep the worktree clean and run only reviewed commands.

If a provider or search fails, retry once, then use the labeled fallback or continue the explanation without claiming success. If extraction or vector recall is delayed, use the rehearsed wait and inspect stored records rather than repeatedly generating duplicates. A stored record proves persistence, not vector retrieval. If a checkpoint fails, explain the failure and move only to a rehearsed working checkpoint after stopping the server and preserving any local edits. Never force tags or discard unreviewed work.

No DigitalOcean deployments occur between steps. Keep the hosted slides independent of local tag switches, use the rebuilt tags, and leave the completed deployment ready as the fallback.
