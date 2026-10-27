"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useState } from "react";

type Persona = { id: string; name: string };
type Conversation = { id: string; title: string };
type Memory = { id: string; content: string; category: string; importance: number; status: string; supersededBy?: string; supersedes?: string };

export default function Home() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [userId, setUserId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [conversationId, selectConversation] = useState<string>();
  const [input, setInput] = useState("");
  const refresh = useCallback(async () => {
    const [conversationResponse, memoryResponse] = await Promise.all([fetch("/api/conversations"), fetch("/api/memories")]);
    setConversations(((await conversationResponse.json()) as { conversations: Conversation[] }).conversations);
    setMemories(((await memoryResponse.json()) as { memories: Memory[] }).memories);
  }, []);
  const { messages, sendMessage, setMessages, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: items, body }) => ({
        body: { message: items.at(-1)?.parts.filter((part) => part.type === "text").map((part) => part.text).join("") ?? "", conversationId: body?.conversationId },
      }),
    }),
    onData: (part) => {
      if (part.type === "data-conversation" && typeof part.data === "object" && part.data !== null && "id" in part.data && typeof part.data.id === "string") selectConversation(part.data.id);
    },
  });
  useEffect(() => {
    void fetch("/api/users").then((response) => response.json()).then((data: { users: Persona[]; currentUserId: string | null }) => {
      setPersonas(data.users);
      setUserId(data.currentUserId ?? "");
      if (data.currentUserId) window.setTimeout(() => void refresh(), 0);
    });
  }, [refresh]);
  useEffect(() => {
    if (status === "ready" && messages.length > 0) window.setTimeout(() => void refresh(), 500);
  }, [status, messages, refresh]);
  async function switchPersona(id: string) {
    await fetch("/api/users/switch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: id }) });
    window.location.reload();
  }
  async function openConversation(id: string) {
    const response = await fetch(`/api/conversations/${id}`);
    const data = await response.json() as { messages?: Array<{ role: "user" | "assistant"; content: string }> };
    selectConversation(id);
    setMessages((data.messages ?? []).map((message, index): UIMessage => ({ id: `${id}-${index}`, role: message.role, parts: [{ type: "text", text: message.content }] })));
  }
  async function removeMemory(id: string) {
    await fetch(`/api/memories/${id}`, { method: "DELETE" });
    await refresh();
  }
  return <main className="shell">
    <aside className="sidebar"><h1>Claudius Minor</h1><label>Persona<select value={userId} onChange={(event) => void switchPersona(event.target.value)}><option value="">Choose persona</option>{personas.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}</select></label><button className="new-chat" onClick={() => { selectConversation(undefined); setMessages([]); }}>New conversation</button><h2>Conversations</h2>{conversations.map((conversation) => <button className="conversation" key={conversation.id} onClick={() => void openConversation(conversation.id)}>{conversation.title}</button>)}</aside>
    <section className="chat"><header><strong>Chat</strong><span>MongoDB-backed agent memory</span></header><div className="messages">{messages.map((message) => <article className={message.role === "user" ? "user-message" : "assistant-message"} key={message.id}>{message.parts.map((part, index) => part.type === "text" ? <p key={index}>{part.text}</p> : part.type === "dynamic-tool" ? <small key={index}>Searching the web...</small> : part.type === "data-memories" ? <small key={index}>Used memory to personalize this answer</small> : null)}</article>)}</div><form onSubmit={(event) => { event.preventDefault(); if (input.trim()) { void sendMessage({ text: input }, { body: { conversationId } }); setInput(""); } }}><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Claudius Minor something..." /><button disabled={!userId || status === "streaming" || status === "submitted"}>Send</button></form></section>
    <aside className="memory-panel"><h2>Memory</h2><p>Memories belong to {personas.find((persona) => persona.id === userId)?.name ?? "this persona"}.</p>{memories.map((memory) => <article className={memory.status === "superseded" ? "memory old-memory" : "memory"} key={memory.id}><div><b>{memory.category}</b><span>Importance {memory.importance.toFixed(1)}</span></div><p>{memory.content}</p>{memory.supersededBy && <small>Replaced by a newer memory</small>}<button onClick={() => void removeMemory(memory.id)}>Delete</button></article>)}</aside>
  </main>;
}
