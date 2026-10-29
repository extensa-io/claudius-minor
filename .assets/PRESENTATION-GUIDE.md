# Presentation maintenance guide

This document covers the deck's controls, implementation, visual design, and learning coverage. For environment setup, checkpoint commands, event timing, and recovery, use [LIVESTREAM-GUIDE.md](LIVESTREAM-GUIDE.md).

## Open and navigate

Open `/slides` on the local app or deployment. It redirects to `/presentation/index.html`, avoiding iframe focus issues. The hosted deck is https://claudius-minor-opf4x.ondigitalocean.app/slides.

- Arrow buttons, arrow keys, and Space navigate.
- Home and End jump to the beginning and end; Escape opens the overview.
- **Speaker notes (S)** opens explanatory notes, upcoming slide, and timer. Allow popups.
- `F` toggles fullscreen; `P` toggles the visible controls.
- URL hashes and visible counters use 1-based numbering. `#/8` opens the data model, `#/9` the graph, `#/10` the demo introduction, and `#/11` the tools checkpoint. `#/14` opens durable conversations.

The deck contains 22 slides. Notes are public learning material, not a presenter script: keep them free of personal reminders, timing cues, rehearsal instructions, and assessment answers.

## Standalone serving and PDF

Scripts, fonts, slide images, and styles live under `public/presentation`; they do not depend on a CDN, service credentials, or the chat UI stylesheet.

```bash
python3 -m http.server 3101 --directory public/presentation
```

Open `http://localhost:3101`. Use an HTTP origin rather than `file://` for speaker-view browser security. The favicon references the app's `/icon.svg`, so it is available through the Next.js deployment, not a server restricted to the presentation folder alone.

For PDF export, open `/presentation/index.html?print-pdf` in Chromium, wait for fonts, then print with background graphics enabled and margins set to none. Notes and presenter controls are excluded.

## Source files and maintenance

| File | Responsibility |
|---|---|
| `public/presentation/index.html` | Slide content and attendee-friendly notes |
| `public/presentation/theme.css` | Fonts, colors, layout, and printing styles |
| `public/presentation/presentation.js` | Reveal.js configuration and controls |
| `public/presentation/vendor/` | Bundled Reveal.js runtime and plugins |
| `public/presentation/fonts/` | Font files and OFL licenses |
| `src/app/slides/page.tsx` | Redirect to the standalone deck |
| `tests/unit/presentation.test.ts` | Sequence, notes, coverage, CTA, and assets |

When adding or removing slides, update the tests, README count, badge map below, and runbook slide references. Keep visible numbering and URL hashes aligned. All non-divider content slides use a consistent heading and body grid; title, intro, demo, checkpoint, badge, and closing layouts are intentional exceptions.

Reveal.js is a development dependency because runtime assets are vendored. After upgrading it, copy `dist/reveal.js`, `dist/reveal.css`, `dist/plugin/notes.js`, `dist/plugin/highlight.js`, and `LICENSE` into the vendor folder, then verify controls and PDF export. Preserve vendor and font licenses. Keep assessment screenshots and intake contact information out of public assets.

## Visual design

Reference: `.assets/2026 10 MongoDB Presentation Template.pdf`, 720 × 405 PDF points. The canvas is 1080 × 607.5, a 1.5× scale. Fonts and initial coordinates came from the PDF; subsequent layout refinements follow the approved deck.

- Special Gothic body text, Special Gothic Condensed One headings, Source Code Pro code.
- Navy `#001E2B`, green `#00ED64`, paper `#FDFFF5`, forest `#00684A`.
- Standard content heading at x54/y61 and body starting at y164.
- Three-column positions at x54, x418, and x783.
- Split-content columns at x54 and x567.
- Checkpoint dividers use large left-hand type and right-hand explanation/code.
- Badge CTA uses a large left-hand headline, a discrete supplied skill-badge image, and right-hand QR/link.
- Introduction uses native text and SVG rather than the low-resolution reference slide image.
- Presentation uses the app's `/icon.svg` favicon.

Do not introduce corporate logos, slogans, or branded footers. Technical product names, the presenter affiliation, and the specifically requested skill-badge artwork are allowed. Do not publish the template as raster backgrounds. Different text and browser rendering prevent a literal pixel-perfect PDF match.

## Badge coverage

Primary attendee link: https://mdb.link/hacktoberfest-2026-badge. The supplied QR was decoded and verified against that URL. Course: https://learn.mongodb.com/courses/ai-agents-with-mongodb.

| Reference questions | Slides | Concepts |
|---|---|---|
| 1 | 5, 20 | Reasoning, tools, memory |
| 2 | 6, 20 | Adaptive multi-step tasks versus fixed validation |
| 3 | 7, 20 | Plan tasks, data, and tools |
| 4 | 7, 9, 11, 20 | Tools as callable external-interaction functions |
| 5 | 7, 12, 17, 20 | APIs, database queries, and vector retrieval |
| 6 | 5, 9, 11, 20 | LLM selects actions; code executes |
| 7 | 9, 11, 20 | Cyclical graph and tool-result loop |
| 8 | 13, 17, 19, 20 | Cross-thread personalization, not retraining |
| 9 | 13, 14, 20 | Earlier discussion within a session |
| 10 | 13, 14, 20 | Ordered session turns and thread-keyed checkpoints |

Teach concepts rather than reproducing assessment questions or an answer key. Attendance alone does not guarantee completion or a pass.

## Content accuracy

- Slide 3 draws from [the Claudius introduction](https://dev.to/mongodb/im-building-my-own-claude-based-chatbot-powered-by-mongodb-42j8). The article's planned phases are not proof of completed features.
- Slide 4 describes gpt-oss-120b for both chat and extraction through DigitalOcean. Open weights does not imply free inference, public training data, or local execution. Voyage voyage-4 serves the separate embedding role.
- Slides 8 and 9 link to the [data model](https://dev.to/mongodb/no-messages-table-the-data-model-behind-my-own-claude-based-chatbot-54jp) and [graph](https://dev.to/mongodb/an-agent-is-a-graph-43h0) articles. Minor does not inherit all of Claudius's collections or Bedrock model switching.
- `start` has no model-callable tools, tool execution node, or search instruction. Its agent routes directly to END. Step 1 adds `web_search`, model binding, and the tool-result loop. Memory queries remain automatic graph work, not model-callable tools.
- Slide 9 shows the target graph. Slides 10–11 contrast parametric knowledge with live evidence. Wrong answers are possible, not guaranteed; search results also require verification.
- Short-term memory describes thread scope, not storage lifetime. MongoDBSaver restores graph state using `thread_id`, not a custom messages-table query.
- `start` and Step 1 use in-process MemorySaver; Step 2 introduces MongoDBSaver.
- Step 5 restores the completed app's recent-write checks and LLM relation comparison. Similarity is not proof of contradiction, and lineage updates are not atomic. The rebuilt `step-5` and `final` trees match the reference `main` commit.
- Profile retrieval can work before vector indexing catches up. Persistence alone does not demonstrate semantic recall.

## Verify a deck change

Run `pnpm check`. In a browser, check affected slides at the intended capture resolution, title/body alignment, text overflow, keyboard and button navigation, notes popup, numbering, links, QR readability, and favicon. Export a PDF to inspect page count and layout.

Earlier Chromium checks covered rendering, navigation, notes, and PDF export; they do not prove every later edit or live-service behavior. Recheck affected layouts after changes. No rendering test establishes event timing or pixel-perfect correspondence with the reference PDF.
