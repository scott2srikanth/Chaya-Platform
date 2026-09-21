# Cloudflare Workers deployment

Motion Explainer Studio is pinned to Next.js **14.2.35** as requested. Deploy the dynamic app to **Workers with OpenNext**, not a static Pages export. Studio uses D1 for accounts, session revocation, rate limits, and shared live presenter rooms. Local `npm run dev` / `npm start` still use embedded SQLite for accounts.

## Version limitation

Next.js 14.2.35 has known security advisories and requires an older OpenNext adapter (1.15.1). Newer adapter releases no longer support Next.js 14. The exact version requirement has been preserved, but this is not a clean security audit. Upgrade Next.js and the adapter together to supported patched releases before a public production launch. See `npm audit` and the [OpenNext support policy](https://opennext.js.org/cloudflare). The older adapter's [path-normalization advisory](https://github.com/advisories/GHSA-c7mq-gh6q-6q7c) describes both the platform mitigation and the recommended adapter upgrade.

## One-time account setup

Use Node **22.13+** (Node 22 LTS recommended), then:

```sh
npm ci
npx wrangler login
npx wrangler d1 create chaya-studio
```

Copy the returned database ID into `d1_databases[0].database_id` in `wrangler.jsonc`, replacing the all-zero placeholder. Keep the binding name **STUDIO_DB**. Do not commit API keys, local SQLite files, or Cloudflare tokens.

```sh
npm run cf:migrate:remote
npm run cf:deploy
```

Open the resulting HTTPS Workers URL and create an account at `/signup`. There is no default account. Local accounts/projects are not automatically uploaded: cloud accounts start empty; export/import Studio project JSON to move a project between browser origins.

For Workers GitHub integration, connect `scott2srikanth/Chaya-Platform`, branch `main`, with build command `npm run cf:build` and deploy command `npx wrangler deploy`. Configure the real D1 ID and apply the migration first. Do not use the old Netlify configuration or Pages static output settings.

## Local Workers verification

```sh
npm run cf:migrate:local
npm run cf:build
npm run cf:preview
```

This runs the real Workers runtime with a local D1 database under `.wrangler/`, independent of `data/studio.sqlite`. The migrations are idempotent through Wrangler. `npm run test:studio` includes concurrent-command/retry/expiry tests for shared room storage.

## Live projector/tablet behavior

All devices use the same deployed HTTPS URL and log in before pairing. D1 keeps rooms shared between Worker instances and across restarts. Updates stream through SSE; each display checks the shared state every 500 ms. Streams reconnect every minute, preserving playback timing. Commands use revision checks and request IDs to prevent lost or duplicate actions. Room codes are eight characters; rooms expire four hours after the last command. The controller token remains in the URL fragment and is required for mutations and recording export.

Each connected display performs about two D1 reads per second, plus session checks. Account for D1 query usage and Worker CPU limits when selecting a plan; password hashing may require a paid Workers CPU allowance. Projector clocks still depend on device/network timing.

## Features outside this deployment

- Studio project editing data remains in browser IndexedDB; D1 stores accounts and live rooms, not the entire project library.
- MP4 rendering and recorded narration still use the separate Node/FFmpeg renderer at `127.0.0.1:4319`. Workers does not run that service. Cloud-hosted rendering requires a separately deployed render service and authenticated integration.
- Automatic AI drawing remains restricted to local Studio. Built-in drawing templates, drag drawings, and pasted ChatGPT drawing JSON work in the cloud without an API key.
- Legacy video hosting, courses, and billing still use the original Supabase/Stripe modules. Those are not migrated by the Studio D1 setup.

No Cloudflare resources are created by `npm run cf:build`. Remote database creation, migration, and deployment are explicit commands above.

## Worker name and self-reference binding

The deployed Worker is named `chaya-platform`. In `wrangler.jsonc`, both top-level `name` and `services[].service` for `WORKER_SELF_REFERENCE` must be `chaya-platform`. Keep the Cloudflare Workers GitHub project name aligned with this name. A stale reference to `chaya-studio` causes deployment error 10143. The D1 database can still be named `chaya-studio`; it is a separate resource and its existing database ID should be retained.

If you rename the Worker again, update both values together. See the [OpenNext configuration guide](https://opennext.js.org/cloudflare/get-started).
