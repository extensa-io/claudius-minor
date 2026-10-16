import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({ resolve: { alias: { "@": path.resolve(__dirname, "src") } }, test: { include: ["integration/**/*.test.ts"], environment: "node", testTimeout: 180_000 } });
