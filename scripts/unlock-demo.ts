import { getDb, getClient } from "../src/lib/db";

async function main() {
  if (process.env.CONFIRM_DEMO_STOPPED !== "yes")
    throw new Error(
      "Stop every app instance first, then set CONFIRM_DEMO_STOPPED=yes. Clearing a live lock can corrupt reset isolation.",
    );
  const db = await getDb();
  const result = await db
    .collection<{ _id: string }>("demo_operations")
    .deleteOne({ _id: "exclusive" });
  console.log(`Removed ${result.deletedCount} stale operation lock.`);
  await (await getClient()).close();
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unlock failed.");
  process.exitCode = 1;
});
