# Live presenter

Choose **Live presenter** on the Studio home screen. A blank whiteboard opens with its presenter selected. Speak through **Start microphone**, or type a request and choose **Send command**.

- `write Hello everyone` writes a sentence.
- Computer, browser, server, and their connections draw immediately using local templates.
- `draw` uses the local drawing library: house/home, tree/plant, cloud/internet, database/db, phone/mobile, person/user, circle, rectangle/box, triangle, arrow and star, alongside computer/browser/server. Unsupported names show a library message instead of triggering an AI request. New strokes are appended and recorded for playback/export.
- Generation includes loading, cancellation and explicit failure states. Nothing is applied if the project, scene or board changes while waiting.
- **Reset live board** clears recorded live commands and restores the manual board. Undo can recover it.

## Optional AI endpoint (custom integrations)

In the project root, add a server-only `.env.local`:

```
OPENAI_API_KEY=your-key
STUDIO_DRAWING_MODEL=gpt-4o
```

Restart the Next.js server. Never use `NEXT_PUBLIC_` for the key. The local-only endpoint `/api/studio/draw` sends the description and existing board strokes to OpenAI, requests structured JSON, validates coordinates/complexity and returns pen paths. It stores no key or credentials in projects. This endpoint deliberately rejects non-local hosts; hosted deployment requires authentication and appropriate usage controls.

Implementation follows [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). The model can be overridden with another Responses model supporting the schema.

## Custom drawings with ChatGPT JSON

Enter a request and expand **Draw with ChatGPT JSON**. Copy the drawing prompt, paste it into ChatGPT, then paste its complete JSON answer into **Drawing JSON** and choose **Validate & draw**. The prompt includes existing ink to help place new objects. Only bounded numeric strokes are accepted, never executable SVG/HTML/code.

Voice recognition depends on the browser and its microphone permission. Typed commands and JSON import work without microphone access.

## Dictation and erasing

Say `write`, then speak a sentence; subsequent utterances keep writing until `stop writing`. Say `draw`, then a library name. Commands also work as single utterances (`draw house`, `write Hello world`).

`delete`, `remove` and `undo` erase the most recent visible item. `remove house` and `remove Hello world` target a named drawing or exact text (case-insensitive). Missing or ambiguous names report an error. Erasure is a recorded two-second pen-path wipe with an eraser at the hand; replay/scrubbing/export retain the drawing before its erasure. Up to 120 recorded actions; three text rows and six generic drawing slots. Removed rows and slots can be reused.

The board is taller and wider, and the presenter rests at the extreme left, moving to the ink while writing or erasing.

## Action timeline and live playback

**Live mode** stays enabled while the presenter is waiting. Each write, draw and erase command adds a separate named timeline track. Tracks open automatically when commands are recorded. In live mode, a new command starts playback at the action (or continues the current action if commands are queued), then pauses after the last action and the presenter’s return to the side. The microphone can remain listening while the timeline is paused. Browser microphone support still applies.

Click an action bar to preview that action; click its row label to select the presenter and seek to its start. The main Play button replays the project normally. Disable **Live mode** for ordinary continuous playback when entering commands.

**Export presenter timeline** opens export scoped to the current scene, ending three seconds after its final recorded action. Writes, drawings and erasures are rendered in order. The export panel can also select **Entire project**. Intersecting project audio is trimmed and rebased to the standalone scene; the source project is not modified.

## Vertical ML / DL architecture

Open **Vertical ML / DL architecture** in the presenter panel, or say:

1. `draw first layer` — dataset collection.
2. `draw second layer` — data pre-processing.
3. `draw third layer` — algorithm/architecture identification and ML/DL model design.
4. `draw fourth layer` — model training and optimizer selection.
5. `draw fifth layer` — evaluation matrix/metrics and model accuracy.
6. `draw sixth layer` — model ready for cloud deployment.

Each command draws a labeled box in its fixed top-to-bottom position, with downward flow arrows. `draw layer 1` and `draw 1st layer` are also recognized. Layers can be added out of order without moving existing ones. Use a clear board for this full-height layout. `draw vertical architecture diagram` draws all six in one action. Individual layer commands create individual action tracks and support removal by name (e.g. `remove first layer`); the all-six command is a single drawing item, removed as `remove vertical architecture diagram`.
