import { type Collection, type Document, ObjectId } from "mongodb";

export const vectorDefinition = {
  fields: [
    {
      type: "autoEmbed",
      modality: "text",
      path: "content",
      model: "voyage-4",
      similarity: "cosine",
    },
    { type: "filter", path: "userId" },
    { type: "filter", path: "status" },
  ],
};

export async function ensureVectorIndex(collection: Collection, name: string) {
  const indexes = (await collection.listSearchIndexes().toArray()) as Array<{
    name: string;
    latestDefinition?: Document;
  }>;
  const existing = indexes.find((index) => index.name === name);
  if (!existing)
    await collection.createSearchIndex({
      name,
      type: "vectorSearch",
      definition: vectorDefinition,
    });
  else {
    const fields = existing.latestDefinition?.fields as Document[] | undefined;
    if (
      !fields ||
      vectorDefinition.fields.some(
        (expected) =>
          !fields.some((field) =>
            Object.entries(expected).every(
              ([key, value]) => field[key] === value,
            ),
          ),
      )
    ) {
      throw new Error(
        `Existing index ${name} has a different definition. Inspect it explicitly before replacing it.`,
      );
    }
  }
  const deadline = Date.now() + 600_000;
  while (Date.now() < deadline) {
    const indexes = (await collection.listSearchIndexes().toArray()) as Array<{
      name: string;
      status?: string;
      queryable?: boolean;
    }>;
    const index = indexes.find((index) => index.name === name);
    if (index?.status === "FAILED")
      throw new Error(`Index ${name} failed to build.`);
    if (index?.status === "READY" && index.queryable) return;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error(`Timed out waiting for index ${name}.`);
}

export function vectorQuery(
  index: string,
  text: string,
  userId: ObjectId,
  limit = 1,
): Document[] {
  return [
    {
      $vectorSearch: {
        index,
        path: "content",
        query: { text },
        numCandidates: Math.max(20, limit * 20),
        limit,
        filter: { userId: { $eq: userId }, status: { $eq: "active" } },
      },
    },
    { $addFields: { score: { $meta: "vectorSearchScore" } } },
  ];
}

export async function waitForDocument(
  collection: Collection,
  index: string,
  text: string,
  userId: ObjectId,
  id: ObjectId,
) {
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    const hits = await collection
      .aggregate(vectorQuery(index, text, userId, 10))
      .toArray();
    if (hits.some((hit) => hit._id.equals(id))) return Date.now() - started;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    "Inserted document did not become searchable within 120 seconds; no successful lag measurement recorded.",
  );
}
