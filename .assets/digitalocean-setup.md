# DigitalOcean Inference setup

This guide configures DigitalOcean Serverless Inference for Claudius Minor using the current DigitalOcean Inference documentation. It explains how to create a model access key, discover the exact model IDs available to that key, configure the repository, and run its service checks.

Do not guess model IDs. The successful `/v1/models` response from your key is the source of truth for which IDs the application can use.

## What Claudius Minor uses

Claudius Minor uses LangChain's `ChatOpenAI` client against DigitalOcean's OpenAI-compatible Serverless Inference API. The configured base URL defaults to:

```text
https://inference.do-ai.run/v1
```

The application uses two model IDs:

- `CHAT_MODEL` for chat and tool-calling requests.
- `EXTRACTION_MODEL` for structured memory extraction.

Both use `DO_MODEL_ACCESS_KEY` and the same inference endpoint. MongoDB Atlas and Tavily use separate credentials.

DigitalOcean documents Serverless Inference separately from its control-plane API. This application calls `https://inference.do-ai.run`, not `https://api.digitalocean.com`.

## Create a model access key

1. Sign in to the [DigitalOcean Control Panel](https://cloud.digitalocean.com/) and open [Model Access Keys](https://cloud.digitalocean.com/model-studio/manage-keys).
2. Choose **Create model access key** and give the key a descriptive name, such as a local development key for this app.
3. On **Foundation models**, choose all models or explicitly select models. If you select models, make sure the key includes the models you intend to use for both chat and extraction. You can revisit this choice after discovering which model IDs the key can access.
4. Choose the VPC restriction appropriate for where the app will run. For local development without a VPC requirement, choose **No VPC network**. If you restrict the key to a VPC, requests must originate from that VPC, and DigitalOcean requires its VPC-local DNS resolver for Serverless Inference from VPC resources.
5. Create the key and copy the secret immediately. DigitalOcean displays the secret only once at creation. Store it securely.

DigitalOcean documents both model access keys and personal access tokens for Serverless Inference. The model access key is the recommended option for this setup because it can be scoped to models and a VPC. The current app environment validation accepts the model access key prefix (`sk-do-`) and DigitalOcean personal access token prefixes (`dop_v1_` and `doo_v1_`). Do not use an agent endpoint key, which authenticates to a different service.

Model access keys are secrets and requests can incur usage charges. Review the current [Inference pricing](https://docs.digitalocean.com/products/inference/details/pricing/) and any account balance or prepayment requirements before testing. DigitalOcean also supports per-key spend thresholds for eligible accounts. A spend threshold with pausing enabled can block requests after the limit is reached.

The prefix validation checks only the credential's format. It does not prove that a key or token is active, authorized for Serverless Inference, correctly scoped, or funded. DigitalOcean's access token prefixes identify credential types, but a `doo_v1_` token can still require the necessary Serverless Inference access.

## Configure `.env`

Run commands from the repository root. If `.env` does not exist, create it from the example:

```sh
cp .env.example .env
```

Edit `.env` locally:

```dotenv
DO_MODEL_ACCESS_KEY=your-real-digitalocean-credential
DO_INFERENCE_BASE_URL=https://inference.do-ai.run/v1
CHAT_MODEL=
EXTRACTION_MODEL=
```

Replace the key placeholder with your actual model access key. Keep the model IDs empty until the model-list request succeeds. Do not commit `.env` or paste the key into a command, issue, screenshot, or chat. `.env.example` is a template and must not contain real credentials.

Keep the base URL at the repository default unless you have a specific, verified compatible endpoint. Do not append `/models` to `DO_INFERENCE_BASE_URL`; the spike adds that path itself.

## Retrieve the model IDs

DigitalOcean documents the Serverless Inference model-list endpoint as `GET https://inference.do-ai.run/v1/models`. It returns models and their IDs. The repository spike calls the equivalent URL using `DO_INFERENCE_BASE_URL`:

```sh
pnpm spike:do-model-list
```

Read the resulting JSON and copy the exact model ID strings from the successful response into `.env`. Do not use a display name, provider name, model family, dedicated deployment name, or ID copied from an old example. Available models may change, and the model access key's scope may limit which IDs the request returns.

### Running the spike

The spike command loads `.env` with Node's env-file option and uses a compatible asynchronous entry point. No manual export or module-format change is needed.

Do not set `CHAT_MODEL` or `EXTRACTION_MODEL` until the spike completes an authenticated request successfully and prints the actual response. If it fails with an HTTP status, investigate key validity, model scope, account status, endpoint, or connectivity before retrying. Never record a failed request as successful model discovery.

## Set the model IDs

After a successful model-list response, edit `.env` and replace the empty values with exact IDs from the response:

```dotenv
CHAT_MODEL=<exact ID returned by the endpoint>
EXTRACTION_MODEL=<exact ID returned by the endpoint>
```

The angle-bracket values are placeholders, not literal IDs. Replace each with an exact response value. You can use the same ID for both variables only if the endpoint returned that ID and the key permits its use. A separate model for extraction is also valid if its exact ID appears in the response and the key's scope includes it.

The model catalog can help you compare model capabilities and pricing, but use the exact ID returned for your key by `/v1/models` when configuring these variables.

## Run DigitalOcean checks

Run the checks sequentially. If a credential-backed check fails, stop and investigate before relying on it or continuing to dependent checks. These requests can incur usage charges.

### Chat response

```sh
pnpm spike:do-chat
```

This streams a short response with `CHAT_MODEL`. A successful run verifies a basic request for the configured key, URL, and model ID. It does not establish response quality or production reliability.

### Tool calling

```sh
pnpm spike:do-tools
```

This asks `CHAT_MODEL` to call a demonstration tool named `web_search`. Check that the model returned the expected tool call and that the local stub ran. The stub returns canned text and does not perform a web search. A non-error response without the expected tool call is not a passing tool-call check.

### Structured output

```sh
pnpm spike:do-structured
```

The spike evaluates 20 personal-detail transcripts in each of JSON Schema and function-calling modes using the same extraction prompt as the app. It validates schema conformance and rejects empty memories for these inputs. It reports per-case failures and mode totals. Both modes passed 20 out of 20 in the verification run; this is a small evaluation, not a guarantee for arbitrary conversations.

The credential-gated integration test also checks structured output once and a tool-call round trip once. A passing integration test is not a substitute for the multi-transcript reliability evaluation.

## Integration suite

After both model IDs come from a successful model-list response, run:

```sh
pnpm test:integration
```

Check the summary carefully. A skipped test did not verify the service. This suite also contains Atlas and Tavily tests that need their own credentials. A passing single structured-output test does not verify reliability; a passing tool-call test covers only that test request.

## Troubleshooting

- **`doctl apps create` returns `GitHub user not authenticated`:** `doctl auth init` only authenticates the CLI to your DigitalOcean account. Separately connect GitHub to App Platform in the DigitalOcean Control Panel by starting **Create App**, choosing GitHub, and authorizing the integration for this repository. Confirm the repository is available and your GitHub account has Owner or Maintainer access, then retry the `doctl` command.
- **Script startup error:** Use the repository's current pnpm scripts, which load `.env` and use compatible async entry points. Do not use an older spike script with top-level await under CommonJS.
- **Missing or invalid key:** Confirm `.env` is in the repository root and `DO_MODEL_ACCESS_KEY` is present. The app accepts model access keys beginning `sk-do-` and DigitalOcean personal access tokens beginning `dop_v1_` or `doo_v1_`. Never print the value for debugging.
- **Unauthorized or forbidden response:** Confirm the key is a model access key, is active, and has access to the selected foundation models. Check whether it is restricted to a VPC and whether the request originates from that network. Check for a paused key, account billing or balance issues, or spend threshold enforcement.
- **Model not found or unavailable:** Rerun a successful model-list request and copy an exact returned ID. Check the model access key's model scope. Do not guess or alter an ID.
- **Rate limit, quota, or billing error:** Check the current DigitalOcean account limits, inference balance or prepayment, pricing, and key spend settings. Stop testing until resolved.
- **Connection failure or timeout:** Verify the base URL and network path. A timeout or interrupted request is failed or inconclusive, not a pass.
- **Structured-output parse or schema failure:** Record the mode and input that failed. A pass in one mode does not count as a pass in the other mode.

## Keep credentials safe

- Store model access keys only in ignored local environment files or an approved secrets manager.
- Never commit `.env`, put the key in source code, or expose it to browser-side code.
- Do not put real keys in `.env.example`, documentation, test fixtures, screenshots, or deployment templates.
- Regenerating a key immediately invalidates the old key. Update the app configuration promptly to avoid service interruption.
- If a key is exposed, revoke or regenerate it and update all places that use it.
- For deployment, configure the key as a platform secret. Review `.do/app.yaml` and the deployment instructions before setting production secrets.

## Deploy on DigitalOcean App Platform

The repository includes two App Platform specifications:

- `.do/app.yaml` is a complete App Spec for the `extensa-io/claudius-minor` GitHub repository on `main`. Use it with `doctl` or as a reference when configuring an app in the control panel.
- `.do/deploy.template.yaml` wraps the same service settings in the `spec:` format required by a Deploy to DigitalOcean button. Do not pass this template to `doctl apps create`; use `.do/app.yaml` for that command.

### Prepare MongoDB Atlas

1. Create or choose the Atlas cluster for the deployment. The app uses the `claudius-minor-app` database.
2. Add a database user and prepare its connection string. URL-encode special characters in the username or password. Keep the URI private.
3. Add `0.0.0.0/0` to the Atlas project's network access list so App Platform can reach the cluster. This allows connections from any IP and is a security limitation of this setup, not a recommended production network policy.
4. From the repository root, put the deployment's URI in local `.env` as `MONGODB_URI`, then run:

   ```sh
   pnpm install
   pnpm db:setup
   ```

   The setup command creates the required collections and indexes, waits for the `memories_vector` index to become ready, and seeds Angela, Betty, and Caroline. Confirm it succeeds before deploying. It only needs `MONGODB_URI`; run it with the same Atlas database the deployed app will use.

### Create and configure the App Platform app

1. Push the app and `.do/app.yaml` to the GitHub branch you want to deploy. The checked-in spec points to `extensa-io/claudius-minor` on `main`. If you deploy a fork or a different branch, update the `github.repo` and `github.branch` fields in a copy of the spec first.
2. Install `doctl`, the official DigitalOcean command-line client. Follow DigitalOcean's [installation guide](https://docs.digitalocean.com/reference/doctl/how-to/install/) for your operating system. On macOS with Homebrew, you can run:

   ```sh
   brew install doctl
   ```

3. Create a DigitalOcean personal access token with the permissions needed to manage apps. Authenticate `doctl` with it, then verify the account connection:

   ```sh
   doctl auth init
   doctl account get
   ```

   When prompted, paste the token. Treat it as a secret and do not commit it or place it in the app's environment variables. You can also supply it through the `DIGITALOCEAN_ACCESS_TOKEN` environment variable rather than saving it in the local `doctl` configuration. This authenticates `doctl` to your DigitalOcean account; it does not connect GitHub to App Platform.
4. Connect your GitHub account to App Platform before creating the app. In the [DigitalOcean Control Panel](https://cloud.digitalocean.com/), start **Create App**, choose **GitHub** as the source, and follow the authorization prompts to install or authorize DigitalOcean's GitHub integration. Grant it access to `extensa-io/claudius-minor` (or your fork) and confirm the repository appears in the repository list. You need Owner or Maintainer access to the GitHub repository. You can then leave the creation flow and create the app from the spec with `doctl`.
5. From the repository root, create the app:

   ```sh
   doctl apps create --spec .do/app.yaml --wait
   ```

   This spec builds with `pnpm install --frozen-lockfile && pnpm build`, starts the app with `pnpm start`, and exposes port `3000`. The checked-in spec sets `deploy_on_push: false`, so later code changes require a manual deployment unless you enable automatic deployments.
6. In the DigitalOcean Control Panel, open the new app and add these **runtime** environment variables in its Settings:

   | Variable | Value |
   | --- | --- |
   | `MONGODB_URI` | The Atlas URI for `claudius-minor-app` |
   | `DO_MODEL_ACCESS_KEY` | The model access key configured and tested above |
   | `CHAT_MODEL` | The exact verified model ID for chat |
   | `EXTRACTION_MODEL` | The exact verified model ID for memory extraction |
   | `TAVILY_API_KEY` | Your Tavily API key |

   Mark each credential/value as encrypted or secret. `.do/app.yaml` already sets `DO_INFERENCE_BASE_URL` to `https://inference.do-ai.run/v1`; keep it unless you have a verified alternative. Do not add these secrets to the spec file, Git, or build-time variables.
7. Save the environment changes and trigger a deployment from the app's **Deployments** page if one is not already running. Wait for the deployment to complete successfully, then open the app's public URL.
8. Choose Angela, Betty, or Caroline in the persona switcher and send a test message. Try a web-search request as a separate check. Confirm the app responds and check the deployment logs for configuration or service errors. Memory extraction runs after the chat response, so give it a moment before checking for a new memory.

To deploy a later change with automatic deployment still disabled, use the app ID shown by the Control Panel:

```sh
doctl apps create-deployment <APP_ID> --wait
```

Do not put an actual ID in committed documentation or scripts. For a failing deployment, check the build and runtime logs, confirm every required runtime variable is set, verify Atlas network access and credentials, and rerun the DigitalOcean model checks if inference calls fail. `pnpm test:integration` can provide additional credential-backed checks before or after deployment, but it does not replace a live smoke test.

Official App Platform references:

- [Create apps](https://docs.digitalocean.com/products/app-platform/how-to/create-apps/)
- [App specification reference](https://docs.digitalocean.com/products/app-platform/reference/app-spec/)
- [Environment variables](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/)
- [doctl apps create](https://docs.digitalocean.com/reference/doctl/reference/apps/create/)

## Record verification results

Record non-secret outcomes only:

| Check | Record |
| --- | --- |
| Model-list request | Pass or fail and HTTP outcome |
| Chat smoke check | Pass or fail and selected model ID |
| Tool-call check | Pass or fail and whether the expected tool was called |
| Structured-output evaluation | For each mode, transcript count, passes, failures, and failure details |
| Integration suite | Passed, failed, and skipped counts with reasons |

Do not mark model IDs verified until an authenticated model-list request succeeds and the exact IDs are copied from its response. Do not claim structured-output reliability until the representative evaluation runs and reports its failures.

## Official DigitalOcean references

- [Inference product documentation](https://docs.digitalocean.com/products/inference/)
- [Inference quickstart](https://docs.digitalocean.com/products/inference/getting-started/quickstart/)
- [Create and manage model access keys](https://docs.digitalocean.com/products/inference/how-to/manage-model-access-keys/)
- [Retrieve available models](https://docs.digitalocean.com/products/inference/how-to/retrieve-available-models/)
- [Serverless Inference endpoints](https://docs.digitalocean.com/products/inference/how-to/si-endpoints/)
- [Available models](https://docs.digitalocean.com/products/inference/details/models/)
- [Inference pricing](https://docs.digitalocean.com/products/inference/details/pricing/)
