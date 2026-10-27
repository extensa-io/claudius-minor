import { MongoClient, ObjectId } from "mongodb";
import { env } from "@/lib/env";

export const DATABASE_NAME = "claudius-minor-app";

const globalDb = globalThis as typeof globalThis & { mongoClient?: Promise<MongoClient> };

export async function getClient(): Promise<MongoClient> {
  if (!env.MONGODB_URI) throw new Error("Set MONGODB_URI to connect to Atlas.");
  globalDb.mongoClient ??= new MongoClient(env.MONGODB_URI).connect();
  return globalDb.mongoClient;
}

export async function getDb() {
  return (await getClient()).db(DATABASE_NAME);
}

export const collections = {
  users: async () => (await getDb()).collection<UserRecord>("users"),
  conversations: async () => (await getDb()).collection<ConversationRecord>("conversations"),
  memories: async () => (await getDb()).collection<MemoryRecord>("memories"),
};

export interface UserRecord { _id: ObjectId; name: string }
export interface ConversationRecord {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  extractionWatermark: number;
}
export interface MemoryRecord {
  _id?: ObjectId;
  userId: ObjectId;
  content: string;
  category: "fact" | "preference" | "context";
  importance: number;
  sourceConversationId: ObjectId;
  createdAt: Date;
  status: "active" | "superseded";
  supersededBy?: ObjectId;
  supersedes?: ObjectId;
}
