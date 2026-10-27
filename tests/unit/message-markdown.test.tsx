import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MessageMarkdown } from "@/app/components/message-markdown";

const render = (text: string) => renderToStaticMarkup(createElement(() => <MessageMarkdown>{text}</MessageMarkdown>));

describe("agent Markdown", () => {
  it("renders headings, lists, code, links, and GFM tables", () => {
    const html = render("## Answer\n\n**Bold** and `code`\n\n- First\n- Second\n\n```js\nconst x = 1;\n```\n\n[Docs](https://www.mongodb.com/docs/)\n\n| Key | Value |\n| --- | --- |\n| a | b |");
    expect(html).toContain("<h2>Answer</h2>");
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<ul>");
    expect(html).toContain('<pre><code class="language-js">');
    expect(html).toContain("<table>");
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("does not render raw HTML, dangerous links, or remote images", () => {
    const html = render('<script>alert(1)</script>\n\n[Bad](javascript:alert%281%29)\n\n![Tracking](https://example.com/pixel.png)');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<img");
    expect(html).toContain("[Image: Tracking]");
  });
});
