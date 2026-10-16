# Run the verification spikes

Add credentials to `.env` only. `CHAT_MODEL` and `EXTRACTION_MODEL` must use the exact identifiers returned by the DigitalOcean model list endpoint. The empty values in `.env.example` stay unset until verified.

Each spike requires one credential group only. The DigitalOcean scripts need `DO_MODEL_ACCESS_KEY` and the model IDs. The Atlas scripts need `MONGODB_URI`. No DigitalOcean secret is needed to test Atlas Automated Embedding.

Run `pnpm spike:do-model-list` first to capture the service's exact model identifiers, then set the chat and extraction model IDs. Run `pnpm spike:do-chat`, `pnpm spike:do-tools`, `pnpm spike:do-structured`, `pnpm spike:atlas-index`, `pnpm spike:atlas-lag`, and `pnpm spike:atlas-calibration` as credentials become available. An Atlas test collection named `spike_memories` is used. Review and remove its records and vector index after running the spikes.
