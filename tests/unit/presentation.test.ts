import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve("public/presentation");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const slides = [...html.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g)].map(([section]) => section);

describe("livestream presentation", () => {
  it("keeps 21 slides, a native introduction second, and notes on every slide", () => {
    expect(slides).toHaveLength(21);
    expect(slides[1]).toContain("HELLO, I’M<br>NÉSTOR");
    expect(slides[1]).toContain("Developer advocate at MongoDB");
    expect(slides[1]).toContain("https://www.extensa.io/");
    expect(slides[1]).not.toContain('href="https://github.com/extensa-io/claudius-minor"');
    expect(slides[2]).toContain("https://github.com/extensa-io/claudius-minor");
    expect(slides[1]).toContain("<svg");
    expect(slides[1]).not.toContain("<img");
    expect(slides[2]).toContain("WHAT WE’RE BUILDING TODAY");
    expect(slides[2]).toContain("Claudius Minor");
    expect(slides[2]).toContain('href="/"');
    expect(slides[2]).toContain('href="https://www.askclaudius.dev"');
    expect(slides[2]).toContain("dev.to/mongodb/im-building-my-own-claude-based-chatbot-powered-by-mongodb-42j8");
    expect(slides[3]).toContain("OPEN-WEIGHT MODELS");
    expect(slides[3]).toContain("gpt-oss-120b");
    expect(slides[3]).toContain("Generative model: gpt-oss-120b");
    expect(html).not.toContain("gpt-oss-20b");
    expect(slides[3]).toContain("DigitalOcean Serverless Inference");
    expect(slides[5]).toContain("Non-deterministic Workflow");
    expect(slides[5]).toContain('workflow-row deterministic');
    expect(slides[5]).toContain('workflow-row non-deterministic');
    expect(slides[7]).toContain("NO MESSAGES TABLE");
    expect(slides[7]).toContain("https://dev.to/mongodb/no-messages-table-the-data-model-behind-my-own-claude-based-chatbot-54jp");
    expect(slides[8]).toContain("AN AGENT IS A GRAPH");
    expect(slides[8]).toContain("https://dev.to/mongodb/an-agent-is-a-graph-43h0");
    expect(slides[9]).toContain("LET’S MEET<br>CLAUDIUS MINOR");
    expect(slides[9]).toContain('href="/"');
    expect(slides[9]).toContain("The starting application already supports streamed chat");
    expect(slides[10]).toContain("MONGODB MEMORY, POWERED BY VOYAGE AI");
    expect(slides[10]).toContain("Atlas Automated Embedding");
    expect(slides[10]).toContain("No embedding SDK in this app");
    expect(slides[12]).toContain("@langchain/langgraph-checkpoint-mongodb");
    for (const slide of slides) expect(slide).toContain('class="notes"');
    for (const index of [2, 5, 7, 11, 15]) expect(slides[index]).toMatch(/<h2>[^<]+<\/h2>/);
    const notes = [...html.matchAll(/<aside class="notes">([\s\S]*?)<\/aside>/g)].map(([, text]) => text);
    for (const note of notes) {
      expect(note).not.toMatch(/\d{2}:\d{2}|Badge Q|INCLUDING live coding|worktree|rehearsed|Keep this|End by|Introduce yourself|Protect the badge/);
    }
    expect(slides.at(-2)).toContain("complete the course requirements");
    expect(slides.at(-1)).toContain("THANK YOU");
    expect(html).not.toContain("SCAN TO GET STARTED");
  });

  it("teaches every badge concept without publishing the assessment screenshots", () => {
    for (const concept of [
      "Reasoning", "Tools", "Memory", "fixed workflow", "TASKS, DATA, AND TOOLS",
      "callable function", "APIs, database queries", "Vector Search", "The LLM selects",
      "Application code", "cyclical graph", "across", "session ID", "ordered turns", "thread_id",
    ]) expect(html).toContain(concept);
    expect(html).not.toContain("Screenshot");
    expect(html).not.toContain("BUILD ANYTHING. CHANGE EVERYTHING.");
  });

  it("uses the attendee link and locally available assets", () => {
    const closing = slides.at(-2)!;
    expect(closing).toContain("https://mdb.link/hacktoberfest-2026-badge");
    expect(closing).toContain('src="badge-qr.png"');
    expect(closing).toContain('src="skill-badge.png"');
    expect(closing).toContain("EARN YOUR<br>BUILD AGENTS<br>WITH MONGODB<br>SKILL BADGE");
    for (const [, asset] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      if (!asset.startsWith("https://") && !asset.startsWith("/")) expect(existsSync(resolve(root, asset)), asset).toBe(true);
    }
    expect(html).not.toMatch(/https:\/\/.*(?:\.js|\.css|\.ttf)/);
  });
});
