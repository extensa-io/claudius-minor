import { extractMemories } from "../../src/lib/extraction";

const transcripts = [
  "I live in Toronto and work as a nurse.",
  "I prefer TypeScript examples and short answers.",
  "My daughter Maya starts school in September.",
  "I have been vegetarian for six years.",
  "My coffee order is an oat milk latte without sugar.",
  "I adopted a cat named Juniper last month.",
  "I am training for a half marathon and run before work.",
  "My brother Alex lives in Seattle.",
  "I am learning Japanese because my partner lives in Osaka.",
  "Please avoid meetings before 10 a.m.",
  "I have celiac disease, so recipes must be gluten-free.",
  "I volunteer at the food pantry on Saturdays.",
  "I illustrate children's books as a freelancer.",
  "I commute by bicycle when it isn't raining.",
  "I prefer quiet restaurants.",
  "My project deadline is October 18.",
  "I grew up in New Mexico and miss green chile.",
  "I am allergic to penicillin.",
  "I use a standing desk because sitting hurts my back.",
  "I used to live in Boston; I now live in Denver.",
].map(
  (text) =>
    `Human: ${text}\nAssistant: Thanks for sharing.\nExtract only durable personal memories stated by the human.`,
);

async function main() {
  let failed = 0;
  for (const method of ["jsonSchema", "functionCalling"] as const) {
    let passed = 0;
    for (const [index, transcript] of transcripts.entries()) {
      try {
        const result = await extractMemories(transcript, method);
        if (!result.memories.length)
          throw new Error(
            "No memories returned for a personal-fact transcript.",
          );
        passed += 1;
      } catch (error) {
        failed += 1;
        console.error(
          JSON.stringify({
            mode: method,
            transcript: index + 1,
            error: error instanceof Error ? error.message : "unknown error",
          }),
        );
      }
    }
    console.log(
      JSON.stringify({
        mode: method,
        transcripts: transcripts.length,
        passed,
        failed: transcripts.length - passed,
      }),
    );
  }
  if (failed) throw new Error(`${failed} structured-output cases failed.`);
}
main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Structured-output check failed.",
  );
  process.exitCode = 1;
});
