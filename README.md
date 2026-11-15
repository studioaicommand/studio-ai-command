# Studio AI Command

The source for Studio AI Command, the Cloudflare Worker at https://studioflowandsystems.app (worker `studio-intelligence-core-cb9c`). Data lives in Supabase; secrets live in Cloudflare (never in this repo).

## How a version is made (from v109)
- `src/` is the source of truth: 46 organised files, joined in the order listed in `src/ORDER`. Edit the file you need directly.
- `python3 build.py` joins them into `worker.mjs` (the file Cloudflare runs).
- Every change gets a test in `test/`. `bash scripts/test-all.sh` builds and runs every test.
- Add a `RELEASE_NOTES` entry for anything the agents should learn, so the Update Announcer teaches every bot after the deploy.
- `legacy/` keeps the old patch chain (`worker-original-backup.mjs` + `patch-v01..v108.py` + `build-worker.py`) as history only. It is no longer built.

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

## Teaching the team about changes
Every patch that changes how the AI team should behave adds an entry to `RELEASE_NOTES` (patch-v106.py onward): the rules to teach, an optional `retire` regex for old rules/strategy memories it replaces, and `studio_only` when it does not apply to client Commands. After deploy, the Update Announcer pins those rules into the shared rulebook and tells Ty on Telegram.
