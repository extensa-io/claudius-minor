import { tavily } from "@tavily/core";
import { requiredEnv } from "@/lib/env";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  try {
    const response = await tavily({
      apiKey: requiredEnv("TAVILY_API_KEY"),
    }).search(query, { maxResults: 5, searchDepth: "basic" });
    return response.results.map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.content.slice(0, 1500),
    }));
  } catch {
    throw new Error("Web search is temporarily unavailable.");
  }
}
