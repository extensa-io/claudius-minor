"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useState } from "react";
import { MessageMarkdown } from "@/app/components/message-markdown";

const REPO_URL = "https://github.com/extensa-io/claudius-minor";
const siteTitle = <a href={REPO_URL} target="_blank" rel="noopener noreferrer">Claudius Minor</a>;
const siteFooter = <footer className="site-footer">Built by Néstor Daza · <a href="https://www.extensa.io" target="_blank" rel="noopener noreferrer">www.extensa.io</a> · <a href={REPO_URL} target="_blank" rel="noopener noreferrer">GitHub repo</a></footer>;

type Persona = { id: string; name: string };
type Conversation = { id: string; title: string };
type Memory = { id: string; content: string; category: string; importance: number; status: string; supersededBy?: string; supersedes?: string };

export default function Home() {
  const [code, setCode] = useState("");
  const [accessCode, setAccessCode] = useState<string>();
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const lock = useCallback(() => setAccessCode(undefined), []);
  async function unlock() {
    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/users", { headers: { "x-access-code": code } });
      if (!response.ok) {
        setError(response.status === 401 ? "Enter a valid access code." : "Demo access is unavailable. Check the server configuration.");
        return;
      }
      setAccessCode(code);
      setCode("");
    } catch {
      setError("Could not connect. Try again.");
    } finally {
      setChecking(false);
    }
  }
  if (accessCode === undefined) return <main className="access-screen"><form className="access-form" onSubmit={(event) => { event.preventDefault(); void unlock(); }}><h1>{siteTitle}</h1><p>This demo requires a presenter access code.</p><label htmlFor="access-code">Access code</label><input id="access-code" type="password" autoComplete="off" required value={code} onChange={(event) => setCode(event.target.value)} /><button disabled={checking || !code}>{checking ? "Checking..." : "Open demo"}</button>{error && <p role="alert">{error}</p>}{siteFooter}</form></main>;
  return <ChatApp accessCode={accessCode} lock={lock} />;
}

function ChatApp({ accessCode, lock }: { accessCode: string; lock: () => void }) {
  const apiFetch = useCallback(async (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set("x-access-code", accessCode);
    const response = await fetch(url, { ...init, headers });
    if (response.status === 401 || response.status === 503) lock();
    if (!response.ok) throw new Error("The request failed.");
    return response;
  }, [accessCode, lock]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [userId, setUserId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [conversationId, selectConversation] = useState<string>();
  const [input, setInput] = useState("");
  const [requestError, setRequestError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const refresh = useCallback(async () => {
    try {
      const [conversationResponse, memoryResponse] = await Promise.all([apiFetch("/api/conversations"), apiFetch("/api/memories")]);
      setConversations(((await conversationResponse.json()) as { conversations: Conversation[] }).conversations);
      setMemories(((await memoryResponse.json()) as { memories: Memory[] }).memories);
    } catch {
      setRequestError("Could not load conversations or memories.");
    }
  }, [apiFetch]);
  const { messages, sendMessage, setMessages, status, error: chatError } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: { "x-access-code": accessCode },
      prepareSendMessagesRequest: ({ messages: items, body }) => ({
        body: { message: items.at(-1)?.parts.filter((part) => part.type === "text").map((part) => part.text).join("") ?? "", conversationId: body?.conversationId },
      }),
    }),
    onData: (part) => {
      if (part.type === "data-conversation" && typeof part.data === "object" && part.data !== null && "id" in part.data && typeof part.data.id === "string") selectConversation(part.data.id);
    },
  });
  useEffect(() => {
    void apiFetch("/api/users").then((response) => response.json()).then((data: { users: Persona[]; currentUserId: string | null }) => {
      setPersonas(data.users);
      setUserId(data.currentUserId ?? "");
      if (data.currentUserId) window.setTimeout(() => void refresh(), 0);
    }).catch(() => setRequestError("Could not load personas."));
  }, [refresh, apiFetch]);
  useEffect(() => {
    if (status === "ready" && messages.length > 0) window.setTimeout(() => void refresh(), 500);
  }, [status, messages, refresh]);
  async function switchPersona(id: string) {
    await apiFetch("/api/users/switch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: id }) });
    setUserId(id);
    selectConversation(undefined);
    setMessages([]);
    await refresh();
  }
  async function openConversation(id: string) {
    const response = await apiFetch(`/api/conversations/${id}`);
    const data = await response.json() as { messages?: Array<{ role: "user" | "assistant"; content: string }> };
    selectConversation(id);
    setMessages((data.messages ?? []).map((message, index): UIMessage => ({ id: `${id}-${index}`, role: message.role, parts: [{ type: "text", text: message.content }] })));
  }
  async function removeMemory(id: string) {
    await apiFetch(`/api/memories/${id}`, { method: "DELETE" });
    await refresh();
  }
  async function resetPersona() {
    setResetting(true);
    setRequestError("");
    try {
      await apiFetch("/api/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation }) });
      selectConversation(undefined);
      setMessages([]);
      setInput("");
      setConversations([]);
      setMemories([]);
      setResetOpen(false);
      setConfirmation("");
      await refresh();
    } catch {
      setRequestError("Reset failed. Try again or check the server logs.");
    } finally {
      setResetting(false);
    }
  }
  const busy = resetting || status === "streaming" || status === "submitted";
  return <main className="shell">
    <aside className="sidebar"><h1>{siteTitle}</h1><label>Persona<select disabled={busy || resetOpen} value={userId} onChange={(event) => void switchPersona(event.target.value)}><option value="">Choose persona</option>{personas.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}</select></label><button className="new-chat" disabled={busy || resetOpen} onClick={() => { selectConversation(undefined); setMessages([]); }}>New conversation</button><h2>Conversations</h2>{conversations.map((conversation) => <button className="conversation" disabled={busy || resetOpen} key={conversation.id} onClick={() => void openConversation(conversation.id)}>{conversation.title}</button>)}</aside>
    <section className="chat"><header><strong className="chat-title"><span className="desktop-chat-title">Chat</span><span className="mobile-site-title">{siteTitle}</span></strong><div className="chat-header-actions"><span>MongoDB-backed agent memory</span><button className="reset-demo" disabled={!userId || busy} onClick={() => { setConfirmation(""); setResetOpen(true); }}>Reset persona</button><button className="lock-demo" onClick={lock} title="Clear the access code and return to the entry screen">Lock demo</button></div></header><div className="messages">{messages.map((message) => <article className={message.role === "user" ? "user-message" : "assistant-message"} key={message.id}>{message.parts.map((part, index) => part.type === "text" ? message.role === "assistant" ? <MessageMarkdown key={index}>{part.text}</MessageMarkdown> : <p className="user-text" key={index}>{part.text}</p> : part.type === "dynamic-tool" ? <small key={index}>Searching the web...</small> : part.type === "data-memories" ? <small key={index}>Used memory to personalize this answer</small> : null)}</article>)}{requestError && <p role="alert">{requestError}</p>}{chatError && <p role="alert">Chat failed. Check your access code or server logs.</p>}</div><form onSubmit={(event) => { event.preventDefault(); if (input.trim() && userId && !busy && !resetOpen) { void sendMessage({ text: input }, { body: { conversationId } }); setInput(""); } }}><textarea disabled={busy || resetOpen} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Claudius Minor something..." /><button disabled={!userId || busy || resetOpen}>Send</button></form></section>
    <aside className="memory-panel"><h2>Memory</h2><p>Memories belong to {personas.find((persona) => persona.id === userId)?.name ?? "this persona"}.</p>{memories.map((memory) => <article className={memory.status === "superseded" ? "memory old-memory" : "memory"} key={memory.id}><div><b>{memory.category}</b><span>Importance {memory.importance.toFixed(1)}</span></div><p>{memory.content}</p>{memory.supersededBy && <small>Replaced by a newer memory</small>}<button disabled={busy || resetOpen} onClick={() => void removeMemory(memory.id)}>Delete</button></article>)}</aside>
    {siteFooter}
    {resetOpen && <div className="reset-backdrop"><section className="reset-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-title"><h2 id="reset-title">Reset {personas.find((persona) => persona.id === userId)?.name}</h2><p>This permanently deletes all conversations, saved messages, and memories for this persona. Other personas stay untouched.</p><p>Wait for any background memory extraction to finish before resetting.</p><form onSubmit={(event) => { event.preventDefault(); if (confirmation === "RESET" && !busy) void resetPersona(); }}><label htmlFor="reset-confirmation">Type RESET to confirm</label><input id="reset-confirmation" autoFocus autoComplete="off" value={confirmation} disabled={resetting} onChange={(event) => setConfirmation(event.target.value)} /><div className="reset-actions"><button type="button" disabled={resetting} onClick={() => setResetOpen(false)}>Cancel</button><button className="confirm-reset" disabled={confirmation !== "RESET" || busy}>{resetting ? "Resetting..." : "Delete persona data"}</button></div></form>{requestError && <p role="alert">{requestError}</p>}</section></div>}
  </main>;
}
