# Studio AI Command

The source for Studio AI Command, the Cloudflare Worker at https://studioflowandsystems.app (worker `studio-intelligence-core-cb9c`). Data lives in Supabase; secrets live in Cloudflare (never in this repo).

## How a version is made
- `worker-original-backup.mjs` is the original baseline. `build-worker.py` applies every `patch-vNN.py` in order to produce `worker.mjs`.
- Each feature has its own source files (for example `v55-team.js` for server code, `v55-ui.js` / `v55-ui.css` for the app), plus a patch that wires it in and a test in `test/`.
- `bash scripts/test-all.sh` builds and runs every test.

## Deploying (safe)
GitHub > Actions > **Deploy Command** > Run workflow > type `DEPLOY`. It:
1. Builds and runs every test. If anything fails, it stops.
2. Downloads the live version as a backup.
3. Uploads only the new code. Bindings, secrets, variables, crons and routes stay exactly as they are.
4. Checks the live app serves the new version and is healthy. If not, it restores the backup automatically.

The backup and the new worker are kept as a download on the run for 90 days.

Needs two repository secrets: `CLOUDFLARE_API_TOKEN` (Cloudflare token from the "Edit Cloudflare Workers" template) and `CLOUDFLARE_ACCOUNT_ID`.

Manual fallback: paste `worker.mjs` (from the run's download) into the Cloudflare editor.

## Client copies
`kit/` holds the white-label client tools (new client, update all clients).
