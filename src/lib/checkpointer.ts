import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { getClient } from "@/lib/db";

const globalSaver = globalThis as typeof globalThis & { checkpointSaver?: Promise<MongoDBSaver> };

export async function getCheckpointer(): Promise<MongoDBSaver> {
  globalSaver.checkpointSaver ??= (async () => new MongoDBSaver({ client: await getClient(), dbName: "claudius_minor" }))();
  return globalSaver.checkpointSaver;
}
