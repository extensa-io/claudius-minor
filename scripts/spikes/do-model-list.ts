import { env, requiredEnv } from "../../src/lib/env";

async function main() {
  const response = await fetch(`${env.DO_INFERENCE_BASE_URL}/models`, { headers: { Authorization: `Bearer ${requiredEnv("DO_MODEL_ACCESS_KEY")}` } });
  if (!response.ok) throw new Error(`Model list request failed with status ${response.status}.`);
  const payload: unknown = await response.json();
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error: unknown) => {
  console.error("DigitalOcean model-list spike failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
