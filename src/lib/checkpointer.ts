import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { DATABASE_NAME, getClient } from "@/lib/db";

const globalSaver = globalThis as typeof globalThis & { checkpointSaver?: Promise<MongoDBSaver> };

export async function getCheckpointer(): Promise<MongoDBSaver> {
  globalSaver.checkpointSaver ??= (async () => new MongoDBSaver({ client: await getClient(), dbName: DATABASE_NAME }))();
  return globalSaver.checkpointSaver;
}
