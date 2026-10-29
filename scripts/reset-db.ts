import { clearDemoData, DemoResetBusyError } from "../src/lib/database-reset";
import { DATABASE_NAME, getClient, getDb } from "../src/lib/db";

async function main() {
  const client = await getClient();
  try {
    const deleted = await clearDemoData(await getDb());
    console.log(`Cleared demo data in ${DATABASE_NAME}. Users, collections, and indexes are preserved.`);
    console.log(deleted);
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof DemoResetBusyError ? error.message : "Demo reset failed and may be partial. Verify database permissions and retry. No connection details are logged.");
  process.exitCode = 1;
});
