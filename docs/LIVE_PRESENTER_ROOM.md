# Projector and tablet live presenter

Open `/studio/live`, or choose **Connect projector & tablet** in the Studio presenter panel. The Studio button opens a new page and seeds the room with its recorded presenter actions; the editor stays open.

1. On the computer running Studio, choose **Create live session**.
2. Open **projector display** and move that browser window to the room projector. Use the display's Fullscreen control (bottom right on hover or keyboard focus). This page contains only the animated board; a connection message appears only when disconnected.
3. Connect the tablet/iPad/Samsung device to the same reachable network. Open the address shown under **Connect your screens**, for example `http://<computer-Wi-Fi-IP>:3000/studio/live`.
4. Enter the eight-character pairing code and join the controller. No tablet installation is required.
5. Tap library/architecture buttons or send `write`, `draw`, `remove` and other existing presenter commands. Writes, drawings and erasures appear on the display through server-sent events. Several displays may use the same display link. Several paired controllers share the same command queue.

The controller offers pause, resume, replay, a live preview and the recorded action list. **Download recording** saves a Studio project JSON containing this timeline. Open that JSON in Studio to edit or export video.

## Network and voice

Keep the Studio host running and reachable from both devices. The room page lists the host's network addresses; choose its Wi-Fi/LAN address. `localhost` on a tablet points to the tablet itself and cannot reach the computer. Guest Wi-Fi device isolation or a host firewall may prevent connection.

Touch/text commands work over LAN HTTP. Browser speech recognition on remote devices generally requires a trusted HTTPS origin plus browser support and microphone permission; the controller disables microphone input when the page is not a secure context. It does not bypass permissions or install a certificate. Speech may use the browser vendor's recognition service.

## State and hosting

This version uses a **single running Next.js server** with in-memory room state and SSE broadcasting. Each room has a random display ID, a pairing code, and a controller token. Mutation requests require that token and matching browser origin/host. A repeated command request ID is idempotent. Controller tokens remain in the URL fragment and are sent only in the request header, not the display link.

Clients receive a full current snapshot on connection/reconnection and animate against a server playback anchor. Slow/background displays catch up when the browser resumes. Live playback clamps at the end of the latest action; it does not advance while idle.

Sessions expire four hours after their last command and disappear on server restart. Download recordings before ending a session. For multi-worker/serverless/public hosting, replace the in-memory room store and broadcaster with shared persistence/pub-sub and add deployment-specific access controls. This implementation is intended for the local room/single-server setup.

## Drag-to-draw canvas

The controller includes **Draw on the board** with freehand pen, line, arrow, rectangle and ellipse tools. Drag with a mouse, finger or stylus and release to send the stroke. Pointer capture keeps the gesture together; the canvas does not scroll under your finger. A cancelled gesture is discarded.

The canvas previews the completed action queue. Each submitted stroke becomes `draw sketch 1`, `draw sketch 2`, etc., appended after existing text/drawing actions and animated by the presenter on connected displays. It is included in the downloadable recording. `remove` erases the latest visible item, and `remove sketch 1` targets a named sketch. Coordinates and complexity are validated on the server; retries use the same command ID to avoid duplicates.

## Login required

Studio and every live-room page now require an authenticated app account. Sign in separately on the projector browser and each tablet/browser origin before pairing. A room code alone no longer grants access without login. All `/api/studio/*` endpoints require a server-verified SQLite account session; unauthenticated requests return 401.

Studio authentication uses embedded SQLite; no Supabase configuration is required. Run Node 22.13 or newer and create an account at `/signup`. Passwords are hashed with scrypt. Random session tokens are stored as hashes, sent in HttpOnly cookies, checked on protected requests, and revoked on logout. Sessions expire after seven days.

The database defaults to `data/studio.sqlite` (excluded from Git). Set `STUDIO_DB_PATH` to use another persistent location. Back up the database with SQLite's backup facilities; do not copy only the main file while WAL writes are active. Deploy on a Node server with persistent writable storage. Separate server replicas need a shared database service instead of independent SQLite files.

This replaces Studio authentication. Existing legacy video/billing modules still use their original Supabase integration; Studio projects continue using browser storage. The loopback-only rendering worker remains a local development utility.

## Cloudflare Workers

Cloud deployments use D1 for authentication and shared live room state, with revision-safe commands and 500 ms SSE polling. Local Node rooms still use process memory. See [deployment instructions](CLOUDFLARE_DEPLOYMENT.md) for database setup and feature/version limitations.
