# Livestream presentation

## Open and present

Run `pnpm dev`, then open `http://localhost:3000/slides`. This route redirects to `/presentation/index.html` so keyboard navigation and speaker notes work without iframe focus issues. The same route works on the existing DigitalOcean deployment without another service or API credentials.

Use the bottom-left arrow buttons to navigate and **Speaker notes (S)** to open the separate presenter window. Allow popups for this site. Notes intentionally do not appear on audience slides. Before sharing the audience window, click **Hide controls (P)**; press `P` to show them again.

- Arrow keys or Space advance slides.
- Home and End jump to the beginning and end.
- `S` opens speaker notes, upcoming slide, and timer. Allow popups.
- `F` toggles fullscreen.
- Escape opens the overview.
- Append `#/8` for the data model, `#/9` for the graph, `#/10` for the demo introduction, or `#/13` for the first coding checkpoint. URL hashes and visible counters both use 1-based numbering, including the title. The counter shows the slide number out of 21.

In MLH StreamYard, share only the audience slide window. Keep speaker notes and credentials on a separate, unshared window. Switch the shared surface to the app or editor for demos. Rehearse the switch with the host before going live.

Keep this deck running from the prepared repository while live coding in a separate worktree. Checking out the older livestream tags in the presentation worktree can remove `/slides` and its assets. These changes do not rewrite the existing livestream tags or move the `final` tag.

## Offline and PDF backup

All presentation scripts, fonts, images, and styles live under `public/presentation`. No CDN requests or service credentials are needed to render the standalone deck. The chat app's global font stylesheet does not apply inside it.

To present without Next.js, run `python3 -m http.server 3101 --directory public/presentation` and open `http://localhost:3101`. Avoid opening `index.html` as a `file://` URL because speaker-view browser security expects an HTTP origin.

For a PDF, open `/presentation/index.html?print-pdf` directly in Chromium, wait for fonts, then print to PDF with background graphics enabled and margins set to none. The presenter controls are excluded from printing. The deck contains 21 landscape slides. Notes stay out of the audience PDF.

## Edit and maintain

- `public/presentation/index.html` holds 21 slides and presenter notes.
- `public/presentation/theme.css` holds the template layout and typography.
- `public/presentation/presentation.js` configures Reveal.js.
- `src/app/slides/page.tsx` provides the public app route.
- `tests/unit/presentation.test.ts` protects the sequence, notes, concept coverage, CTA, and asset references.

The Reveal.js package is a development dependency because runtime files are vendored as static assets. After deliberately upgrading it, copy `dist/reveal.js`, `dist/reveal.css`, `dist/plugin/notes.js`, `dist/plugin/highlight.js`, and `LICENSE` into `public/presentation/vendor`, then check navigation, speaker view, and PDF export. Preserve the vendor and font licenses. Do not copy the assessment screenshots or intake contact information into public assets.

## Template fidelity

Reference: `.assets/2026 10 MongoDB Presentation Template.pdf`, 720 × 405 PDF points. The HTML canvas is 1080 × 607.5, a direct 1.5× scale. Layout coordinates and font specifications were extracted from the PDF.

| HTML layout | Reference pages | Preserved structure |
|---|---|---|
| Title | 6 | Left-aligned condensed headline, eyebrow, subtitle, navy background |
| Three columns | 31, 32, 38 | Headline at x54/y61; columns at x54, x418, x783; numbered feature hierarchy |
| Split explanation | 29 | Text at x54/y47; complementary content on the right |
| Graph | 100 | Left headline and medium-weight lead with diagram in the content area |
| Coding checkpoints | 85 | Large chapter number at x54/y0 and condensed chapter heading at x54/y192 |
| Badge CTA | 132 | Left visual/QR area; right headline at x629/y57 and supporting information |

Use the same Special Gothic font family, Special Gothic Condensed One heading font, Source Code Pro code font, navy `#001E2B`, green `#00ED64`, paper `#FDFFF5`, and forest `#00684A`. Fonts come from Google Fonts with their OFL licenses. Text, code, diagram content, and line breaks necessarily replace the template's placeholders. Logos, slogans, company wordmarks, and corporate footer content are absent. Slide 2 recreates the supplied introduction's wording and right-hand text composition using native HTML text, the deck fonts, and a left-hand SVG coding/chat illustration. It includes the presenter affiliation but no company logo. It does not enlarge the low-resolution reference image.

The template is not published as a slide background. This avoids accidentally retaining a logo or slogan inside a raster asset. Browser text rasterization may differ from PDF rendering. An exact pixel-for-pixel claim would be misleading for replaced content and different rendering engines.

## Timing and badge coverage

Target 58 minutes; reserve two minutes for delays. Notes include the coding and demo time, not just slide narration. Protect the badge CTA at minute 56. Do not add a planned Q&A extension.

| Minutes | Segment |
|---|---|
| 0–3 | Title and native presenter introduction |
| 3–5 | What we are building and the open-weight model stack |
| 5–8 | Agent concepts and planning |
| 8–9 | Slide 8, access-pattern modeling and no messages table |
| 9–10 | Slide 9, graph, history, and streaming boundaries |
| 10–13 | Slide 10 introduces the starting-app demo |
| 13–16 | Data backend and memory scopes |
| 16–23 | Step 1, durable chat state |
| 23–30 | Step 2, memory extraction |
| 30–37 | Step 3, owner-filtered recall |
| 37–44 | Step 4, changing facts |
| 44–51 | End-to-end proof |
| 51–54 | Flexible buffer; cover caveats during the relevant demos |
| 54–56 | Concept recap |
| 56–58 | Badge CTA |
| 58 | Brief Thank You sign-off |

| Badge questions | Slides | Concepts |
|---|---|---|
| 1 | 5, 19 | Reasoning, tools, memory |
| 2 | 6, 19 | Adaptive multi-step tasks versus fixed validation |
| 3 | 7, 19 | Plan tasks, data, and tools |
| 4 | 7, 9, 19 | A tool is a callable external-interaction function |
| 5 | 7, 11, 16, 19 | APIs, database queries, and vector retrieval |
| 6 | 5, 9, 19 | LLM selects actions; application code executes |
| 7 | 9, 19 | Cyclical graph and tool-result loop |
| 8 | 12, 16, 18, 19 | Cross-session personalization, not model retraining |
| 9 | 12, 13, 19 | Earlier discussion within a session |
| 10 | 12, 13, 19 | Ordered turns keyed by session; checkpoint implementation keyed by thread |

The assessment screenshots stay private to the authoring reference. Slides teach concepts, not copied questions or an answer key. Attendance does not guarantee a pass or course completion.

Primary CTA: https://mdb.link/hacktoberfest-2026-badge. The supplied QR was decoded and verified to contain that exact URL. Underlying course: https://learn.mongodb.com/courses/ai-agents-with-mongodb. Share the repository separately in event chat so the final slide has one primary action.

## Accuracy and verification

Slide 3 draws from [the Claudius introduction article](https://dev.to/mongodb/im-building-my-own-claude-based-chatbot-powered-by-mongodb-42j8). It describes the larger project's scope without treating the article's planned phases as completed features. Slide 4 contrasts Claudius's Claude/Bedrock model layer with Minor's single gpt-oss-120b model for both chat and extraction on DigitalOcean. Actual model IDs must be verified against the endpoint; open weights do not imply open training data, free inference, or local execution.

Slides 8 and 9 link to the [data-model article](https://dev.to/mongodb/no-messages-table-the-data-model-behind-my-own-claude-based-chatbot-54jp) and [graph article](https://dev.to/mongodb/an-agent-is-a-graph-43h0). They teach access patterns, lightweight thread headers, checkpoint-owned messages, Zod validation, the tool loop, authoritative server history, and visible streaming before the demo. At start, MemorySaver holds state in process memory; MongoDBSaver arrives at Step 1. The larger project's extra collections and model switching are not Minor features.

The deck distinguishes automatic memory loading from model-callable tools. Only `web_search` is model-callable in this app. Database queries and vector retrieval are tool examples in other designs.

Short-term memory describes thread scope, not whether storage survives a restart. A general transcript implementation queries by session and orders turns by timestamp. This app delegates graph-state storage to MongoDBSaver and restores by `thread_id`.

The historical step-4 tag uses a category/similarity heuristic. Current `main` uses recent-write checks and an LLM relation comparison to distinguish duplicate, changed, and coexisting facts. Notes flag this boundary. Neither version makes two-document lineage updates atomic. Do not repeat outdated claims about current-main batch handling from the older livestream guide.

Verification performed:

- `pnpm check`: typecheck, lint, unit suite, and production build.
- Chromium: all slides rendered before this removal, no page or HTTP errors, no checked text/code boxes outside the canvas or horizontally overflowing.
- Chromium: keyboard navigation and speaker-view popup. The `/slides` route now redirects to the standalone deck instead of embedding it.
- Chromium: PDF export verified before this removal; the current deck contains 21 slides.
- Native QR decoding: attendee URL matches the supplied CTA.

The browser checks used temporary Playwright tooling outside the repo. They verify rendering and controls, not live inference, Atlas behavior, event timing, or a subjective pixel-perfect visual match. Rehearse the presentation at the actual StreamYard capture resolution and compare the selected layouts against the template before the event.
