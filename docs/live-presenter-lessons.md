# Teacher-led live lessons

Open **Studio → Live presenter → Prepare lesson & connect**, create a room, and open its controller. The **Scenes** tab is the default.

1. Open **Prepare / import**. Copy the ChatGPT prompt, replace the topic and generate your lesson.
2. Paste the JSON (or import a saved file), click **Validate**, then **Parse & load lesson**. Invalid data cannot load. Loading replaces the room's lesson and clears the current board.
3. Open the projector link from the room page. On a phone/tablet, open the same server's `/studio/live`, sign in and enter the room code.
4. Tap a scene or **Draw next scene**. Its text, code and diagram strokes draw sequentially on a fresh board. The completed scene stays visible; there is no automatic next slide. Notes appear only on the controller.
5. **Save lesson JSON** preserves the deck for another session. Draft JSON is saved on the editing device. Rooms expire after four hours of inactivity. **Commands → Download recording** exports the prepared lesson as a multi-scene Studio project, ready for Studio video export; without a lesson it exports the current live timeline.

## JSON contract

`version: 1`, `title`, and `scenes` (1–24) are required. A scene has a unique alphanumeric `id`, `title`, optional `notes`, and `actions` (1–12).

- Text: `{ "type": "text", "text": "Hello" }`
- Code: `{ "type": "code", "text": "const value = 1;" }`
- Diagram: `{ "type": "drawing", "drawing": { "strokes": [[{"x":0.1,"y":0.1},{"x":0.8,"y":0.8}]], "color":"#334155", "penWidth":1.2 } }`

Actions can use `region: {x,y,width,height}` to place content. All coordinates are normalized 0–1; regions must fit inside the board. Diagram polylines have 2–150 points, with at most 120 strokes and 4,000 points per drawing. Text/code is limited to 400 characters per action. Use several short scenes for readability. JSON is validated both in the controller and on the server; it is data, never executable instructions.

## Local Wi-Fi

Start the app on the classroom computer (`npm run studio`). Choose **Connection → Local Wi-Fi → Test connection**. Open the displayed private LAN address on both screens and pair there. The test makes three authenticated requests and reports average round-trip latency. Test on the phone as well; a desktop result cannot prove phone reachability. A guest network, access-point isolation or firewall may block local access.

Cloud and local rooms are separate. Same Wi-Fi does not automatically move a cloud room to the local server. HTTP LAN connections support buttons, drawing and typing; mobile microphone access needs HTTPS. Authentication and controller tokens remain required.

## Playback

Clients ignore duplicate/out-of-order state revisions. Clock corrections are eased at up to 8% playback speed; selecting/replaying a scene explicitly resets the playback epoch. Local rooms use immediate server events; Cloudflare uses D1-backed state with polling. The presenter keeps fixed-length arm bones, filters small pen motions out of its body stance, and travels between commands without snapping the pen.
