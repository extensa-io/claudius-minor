import {
  ObjectId,
  type Collection,
  type Filter,
  type UpdateFilter,
} from "mongodb";
import type { ConversationRecord } from "@/lib/db";

type RecordWithId = ConversationRecord & { _id: ObjectId };
type Store = Pick<
  Collection<ConversationRecord>,
  "findOne" | "find" | "insertOne" | "updateOne" | "deleteMany"
>;

// Keep headers through browser refreshes, but never through a server restart.
export function createTransientConversationStore(): Store {
  const records = new Map<string, RecordWithId>();
  function matches(record: RecordWithId, filter: Filter<ConversationRecord>) {
    if (filter.userId && !record.userId.equals(filter.userId as ObjectId))
      return false;
    if (filter._id instanceof ObjectId && !record._id.equals(filter._id))
      return false;
    if (filter._id && !(filter._id instanceof ObjectId)) {
      const ids = (filter._id as { $in?: ObjectId[] }).$in;
      if (!ids || !ids.some((id) => record._id.equals(id))) return false;
    }
    if (
      typeof filter.extractionWatermark === "number" &&
      record.extractionWatermark !== filter.extractionWatermark
    )
      return false;
    return true;
  }
  const selected = (filter: Filter<ConversationRecord>) =>
    [...records.values()].filter((record) => matches(record, filter));
  const store = {
    async findOne(filter: Filter<ConversationRecord>) {
      return selected(filter)[0] ?? null;
    },
    find(filter: Filter<ConversationRecord>) {
      const cursor = {
        sort() {
          return cursor;
        },
        async toArray() {
          return selected(filter).sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
          );
        },
      };
      return cursor;
    },
    async insertOne(record: ConversationRecord) {
      const _id = record._id ?? new ObjectId();
      records.set(_id.toString(), { ...record, _id });
      return { acknowledged: true, insertedId: _id };
    },
    async updateOne(
      filter: Filter<ConversationRecord>,
      update: UpdateFilter<ConversationRecord>,
    ) {
      const record = selected(filter)[0];
      if (record) Object.assign(record, update.$set);
      return {
        acknowledged: true,
        matchedCount: record ? 1 : 0,
        modifiedCount: record ? 1 : 0,
        upsertedCount: 0,
        upsertedId: null,
      };
    },
    async deleteMany(filter: Filter<ConversationRecord>) {
      const owned = selected(filter);
      for (const record of owned) records.delete(record._id.toString());
      return { acknowledged: true, deletedCount: owned.length };
    },
  };
  // This adapter implements only the collection operations used by the demo routes.
  return store as unknown as Store;
}

const processStore = globalThis as typeof globalThis & {
  transientConversations?: Store;
};
export async function getTransientConversationStore(): Promise<Store> {
  processStore.transientConversations ??= createTransientConversationStore();
  return processStore.transientConversations;
}
