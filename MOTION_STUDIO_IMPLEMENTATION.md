# Motion Explainer Studio

The studio is a local, single-user motion editor at `/studio`. It stays within this repository's Next.js application, but does not require a login, Supabase, Stripe, or an AI service. The original audit in `MOTION_STUDIO_AUDIT.md` records the pre-implementation baseline.

## Run

```sh
npm ci
npm run studio
```

Open http://localhost:3000/studio. This starts the editor and a local render worker at `127.0.0.1:4319`. The first video render downloads Remotion's Chromium runtime; subsequent renders use the cached browser. Keep the worker running while exporting. Restart it after changing render-engine source. For production: `npm run build`, then run `npm start` and `npm run studio:renderer` in separate terminals.

Projects, reusable characters, imported assets and scene templates are stored in this browser's IndexedDB. Export a portable project JSON from the Export dialog for backups or transfer between browsers. Browser data can be cleared independently of the repository. Git origin remains configured to `scott2srikanth/Chaya-Platform`; these changes have not been pushed.

## Implemented workflows

| Area | Connected behavior |
|---|---|
| Projects and scenes | New/open/save/autosave, rename, add/remove/reorder scenes, 1080p/30fps defaults, editable dimensions/FPS, version-one migration, validated portable JSON |
| Canvas | Selection, move/resize/rotate, zoom/pan/grid, layer order, visibility/locking, drag-in characters/components |
| Motion | Position/dimensions/scale/rotation/opacity, easing, presets, color/stroke/blur keys, editable multi-point paths, stagger timing, object in/out points |
| Text | Typewriter and character/word/line reveals, multiline text, font sizing |
| Timeline | Full-project deterministic play/pause/reset/seek, loop/speed, scene/object/character/audio/camera tracks, sequential clips with start/duration/speed/easing/blend controls |
| Camera and transitions | Timed camera pan/zoom/rotation, focus on objects, cut/fade/crossfade/slide/zoom scene composition |
| Architecture | Browser, server, database, cloud, API, load balancer, queue, cache, container, terminal, code window, notification and device components; linked arrows, draw-on connectors, moving packets |
| Assets | Drag/drop or select SVG/PNG/JPEG/WebP, sprite sheets with named frame ranges, Lottie JSON, Rive files, audio; embedded portable data; rename/remove and reference checks |
| Audio | Voice/music/SFX tracks, waveform, trim/offset/start, gain/mute/fades, synchronized preview and export; local macOS per-character speech generation with portable WAV recordings |
| Export | Local Remotion/FFmpeg H.264 MP4 and VP9 WebM, draft/standard/high quality, progress/cancel/download; same scene renderer as preview |
| Characters | Reusable identity and instance model, create from a native rig or imported representation, persistent library, embedded character import/export, thumbnails, appearance and variants, per-instance overrides |
| Rig authoring | Bone creation/reparent/delete, cycle validation, local/world transforms, pivots/z-order/constraints, imported SVG/image parts and part sizing/offsets |
| Poses and animation | Pose/expression create/edit/duplicate/delete/save, selectable bones, translation/rotation/scale/opacity, two-bone IK, reusable animations, editable per-bone keys, pose interpolation, looping and playback controls |
| Actions and expression | Walk/run/point/look/turn/sit/stand/wave/talk/think/celebrate actions, timed expressions, procedural mouth/blink cycles; clip/action controls on instances |
| Templates | Eight explainer journeys, reusable saved scene templates, portable example projects, a 45-second website request demonstration |
| History and shortcuts | Undo/redo including character edits and grouped drags; Space play/pause, R reset, K clip key, P character editing, I/O object in/out, Delete, Cmd/Ctrl-Z and Shift-Z, Cmd/Ctrl-S |

## Source map

- `lib/studio/types.ts`, `project.ts`, `db.ts`, `store.ts`: project schema, migrations, local persistence and history.
- `lib/studio/animation-engine.ts`, `frame.ts`, `rig.ts`, `clip-engine.ts`: deterministic evaluation, actions, rigging and pose/clip interpolation.
- `components/studio/MotionStudio.tsx`, `StudioInspector.tsx`, `SceneTimeline.tsx`: scene editing and timeline UI.
- `components/studio/CharacterStudio.tsx`, `AssetStudio.tsx`: character and imported-media workspaces.
- `components/studio/render/ProjectFrame.tsx`, `ExternalAsset.tsx`, `SpriteAsset.tsx`: shared preview/export visuals.
- `lib/studio/render/index.tsx`, `scripts/studio/render-server.ts`: Remotion composition, audio and local export jobs.
- `examples/studio`: basic, text, camera, audio, character, architecture and website-request JSON projects.

## Validation

```sh
npm run typecheck
npm run test:studio
npm run build
# Start the app before the following commands:
npm run test:studio:browser
node --import tsx scripts/studio/frame-parity.ts
node --import tsx scripts/studio/performance.ts
node scripts/studio/smoke-export.mjs mp4 examples/studio/website-request.json high
node scripts/studio/smoke-export.mjs webm examples/studio/audio.json draft
```

The optional Rive browser test accepts `STUDIO_RIVE_FIXTURE=/absolute/path/to/sample.riv`; no third-party artwork is bundled. The tested fixture was the Rive runtime repository's `js/examples/_frameworks/parcel_example_canvas/birb.riv`. The Lottie fixture is an original moving-square animation.

Verified on this machine: 15 engine tests; production build; five browser acceptance tests including Rive, sprites and audio; native preview/export frame comparison at 4.25 seconds (0.3403% pixels exceeded RGB delta 30, mean channel error 0.290/255); 20 animated native characters with median and p95 frame intervals of 16.7ms over 120 frames; imported Rive/Lottie frame comparison (0.0033% changed pixels with software WebGL); full 45-second 1920×1080/30fps H.264 export; short audio exports containing AAC in MP4 and Opus in WebM.

## Practical boundaries

- Generate character voices in the Script inspector. The local service uses installed macOS voices and embeds WAV files in the project; preview and export use those same recordings. Other operating systems can use imported narration. Changed text or voice settings mark a recording stale until regenerated.
- Imported Lottie/Rive artwork uses its authored internal rig. Edit those internals in their source authoring tool, then reimport. Native rig editing supports embedded SVG/image parts. Rive currently uses the file's default artboard, authored animations and timed boolean/number/trigger inputs.
- Imported media must be self-contained. Remote SVG/Lottie images and hosted Rive resources are not a portable/offline workflow. Rive state machines replay fixed simulation steps for seeking; very complex or randomized external state machines may need separate asset-specific testing.
- The performance measurement covers native characters on this machine, not every browser, imported rig or graphics device.
- Repository-wide lint still reports seven pre-existing unescaped-text errors in the unrelated pricing page and HotspotEditor; studio lint has no errors. The production build retains the existing Supabase bundler warnings and optional Stripe configuration notices.
- The 3D conversation workflow adds a furnished room, procedural starter actors, GLB replacement models, named spatial cameras and script-driven cuts. It is a starter production workflow, not Sims 4 rendering quality: production-quality character art, physics and crowd simulation are not included. Generated speech now includes audio-recognized viseme timing. Imported GLB animation plays as embedded; supported jaw/viseme morphs receive the available mouth-shape channels.


## UI refinement — 2026-09-20

Reviewed the supplied earlier screen recording and restored its original presenter illustration style as an accessible library option. The updated editor has searchable Elements/Characters/Components categories, visual presenter cards, a centered auto-fitting canvas, a focus mode, a structured inspector, clearer timeline time labels, and a redesigned starter gallery. The Presenter story template pairs the original expressive character with a clean presentation layout. Multiline word reveals now preserve line breaks and original presenters follow script gestures. The existing native rig editor, imported formats, and saved scene templates remain available.

Verified at 1500×1000 and 1136×760; no horizontal page overflow. All six browser workflows and 15 engine tests pass. Presenter starter JSON: `examples/studio/presenter.json`.


## 3D conversation workflow

1. Open **3D conversation** from the project gallery.
2. Use **Scene → Set & cast** to position actors, change colours, or import a self-contained GLB under 30 MB. Models must include their textures; compressed GLBs requiring Draco/KTX decoders are not supported.
3. Use **Camera → Create cast cameras** to create a wide shot and medium/close shots for every actor. Edit camera position and look-at coordinates. This replaces the scene camera list; Undo restores it.
4. In **Script**, assign each line to a speaker, choose an installed voice and speed, then assign a camera (or choose automatic wide/medium/closeup coverage). Reorder lines and choose gestures and captions.
5. Click **Generate character voices**. Line lengths are fitted to the resulting WAV recordings. Dialogue and shots appear together in the timeline. Re-record after changing text or voice.
6. Preview, then export MP4/WebM. Generated speech is mixed into the file; no API key or cloud voice service is required.

The 3D scene uses dialogue-driven cameras and procedural gestures or imported GLB animation; the 2D rig clip editor does not animate imported 3D skeletons. Shapes and text remain screen-space overlays. The current room is a fixed starter set.

A reproducible voiced sample can be generated on macOS with `node --import tsx scripts/studio/generate-conversation.ts`, then rendered with `node scripts/studio/smoke-export.mjs mp4 artifacts/studio/conversation-voiced.json 1080p`. The verified sample contains 1920×1080 H.264 video and AAC speech, 14.33 seconds, two voices and four shots.

Validation for the conversation addition: production build; 21 engine tests; five browser regression tests passed (optional Rive fixture test skipped); manual 3D and voice UI verification; 1080p MP4 with H.264/AAC audio.


## Speech-aligned human performance

- The original procedural human cast now has tapered torsos, more human proportions, separate upper arms/forearms, articulated wrists, fingers, defined lips, eyes and blinks, and distinct hair silhouettes.
- Voice generation runs local Rhubarb 1.14.0 against the actual WAV and transcript. Mouth cues, 50 Hz speech energy and spaced emphasis beats are embedded in each script line; preview and export evaluate the same data. Recognition is approximate, not guaranteed frame-perfect phonetic alignment.
- Hands use bounded anticipation/emphasis/recovery movements. Waves perform once per line. The upper body makes restrained weight shifts while feet remain planted. These are authored procedural gestures, not motion capture or a full-body physics system.
- Silent intervals close the mouth. Old or edited recordings need **Generate character voices** again; missing/stale alignment never falls back to the former looping mouth animation.
- Imported GLB support includes `jawOpen` / `mouthOpen` / `viseme_aa`, plus supported pucker/funnel/PP/O/U morphs. A jaw-only model cannot express the complete set of phonetic shapes, and arbitrary imported skeletons are not automatically retargeted to the starter gestures.

Install once with `npm run studio:setup-lipsync`. On Apple Silicon the official Intel release is built natively from pinned upstream source using `cmake` and Boost (`brew install cmake boost`). Tools and model data stay in ignored `.studio-tools/`; alternatively set `STUDIO_RHUBARB_PATH`. The setup keeps the upstream license alongside the downloaded resources. No speech leaves the machine.

Engine: [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync), MIT licensed. This implementation uses audio recognition for timing, not text-character guesses or an endless sine-wave mouth cycle.

Validation: 24 engine tests pass, including closed-mouth pauses, lip shape changes, deterministic seeking, stale recording rejection, PCM energy and gesture spacing. Production build and changed-file lint pass. The updated four-line sample contains 87 recognized mouth cues.


## Direct 3D character editing

Click a character on the stage to select it. Use Move (G), Rotate (E), or Scale (S); drag a handle, or drag the character itself along the floor in Move mode. Rotation turns around the vertical axis and scale stays uniform. Scene → Set & cast provides exact X/Y/Z, rotation and scale values. Locked actors remain selectable but cannot be transformed.

Right-click the character → Pose to apply Neutral, Relaxed, Hands on hips, Arms folded, Point, Greeting, Thinking or Celebrate immediately. Right-click → Animation to preview Wave, Explain, Nod, Look around or Celebrate starting at the current scene time. Choose Use dialogue gestures to restore the speech-driven performance. These manual choices persist in the project and export; transforms group into one undo operation per drag. Handles and context menus are editor-only.

Imported GLBs list their embedded animation clips; their static option is the bind/first-frame pose. The native pose collection does not retarget arbitrary GLB skeletons. Direct editing applies to the 3D stage; the existing 2D element transform controls remain unchanged.

Validation: 26 engine checks; manual canvas picking, floor dragging, rotation, scaling (1.0 to 1.46), pose menu selection, animation preview and save checked in the running UI.

### Mixed explainer and human motion library

The home screen now offers **3D + 2D explainer**: three editable scenes with a 3D presenter, independent background colleague, animated graphic cards, a native 2D walkthrough, and dialogue/caption tracks. Run `node --import tsx scripts/studio/generate-mixed-explainer.ts` to generate a portable narrated sample with local lip alignment.

Set & cast exposes action, start/end, speed, looping and world-space travel controls. Native characters now have articulated hips/knees and 16 procedural actions. Actions and travel evaluate from the scene clock, including reverse scrubbing and export.

The complete free Quaternius Universal Animation Library Standard pack is bundled locally as a self-contained GLB: **46 clips including T-pose**, with CC0 license and pinned source recorded under `public/studio/animations/quaternius/`. Choose **Use animation mannequin · 46 clips** on an actor; this replaces that actor's model with the compatible library mannequin. Embedded clips appear in its right-click Animation menu and inspector. Projects embed the model for portable save/export. This does not retarget the clips to arbitrary uploaded skeletons, supply paid Pro/Source animations, or provide facial morphs absent from the original model. Existing native characters retain audio-driven lips.

The reference is visual direction, not a promise of matching its rendered character fidelity. Original starter models are simpler than the stylized character in the reference.

### Seated interview correction

The **Seated interview** starter loads a bundled, voiced project (`public/studio/examples/seated-interview.json`), generated by `scripts/studio/generate-interview.ts`. Four alternating lines have embedded WAV assets and Rhubarb mouth cues; no generation step is needed before first playback. A dedicated interview set replaces the living room with two chairs, a central conversation table, acoustic slats and floor lamps. Native actors use seated hip/knee articulation, restrained forearm gestures and seated-height camera coverage.

Existing scenes can use **Set & cast → Arrange seated interview**, preserving their text and voice assets. This arranges native characters across the table and removes manual motion overrides. Imported GLBs still require their own sitting animation because arbitrary skeleton retargeting is not implemented.

Corrected inward wave/point/celebration rotations. Native forearms and hands are sampled against a padded torso volume and use a forward, outward fallback when intersecting. This is a torso-clearance guard for the native rig, not a general full-body collision simulator. Automated coverage samples all native pose/action combinations; rendered seated wide and close shots are also checked.

### Preview audio and supplied face UV

Preview now uses native HTML audio elements directly. The previous Web Audio routing could leave media silent behind a suspended context, and rejected play requests were discarded. The new path reports playback failures and offers a user-gesture **Enable audio** retry; a scene without valid recorded tracks explicitly asks for voice generation. Live verification checks decoded media, unmuted state and advancing currentTime for both Alex and Sarah, including speaker switching. This confirms media playback, not the user's physical speaker volume.

The user-supplied face UV image is embedded in `lib/studio/male-face-texture.ts`, mapped by cylindrical longitude/linear height on native male heads, and awaited before export. **Set & cast → Use supplied face UV texture** toggles it. Existing cartoon eyes, eyebrows and hair meshes are suppressed to avoid duplicate facial features, and lips are aligned/tinted for the texture. This is an approximate UV fit on the starter head, not reconstruction of the original textured mesh; photographic eyes are static and not a full facial rig. The image is user-supplied; no third-party asset license is asserted.

### Lightweight Studio interface

The editor now starts with a large canvas, a single playback bar and a compact scene strip. **Add** opens the insert library; **Settings** toggles the right panel; **Show tracks** expands the detailed timeline. Focus mode preserves playback controls. Transform handles/toolbars appear only when a 3D character is selected.

The right panel separates Scene, Cast, Script, Camera and Object. Selection opens the relevant object/cast controls. Text editing comes before geometry fields, and 2D overlays are editable inside 3D scenes. Script cards show the speaker and line, with camera/gesture/timing and voice configuration behind expandable sections. Existing editing/export capabilities are retained.

`studio-refined.css` supplies neutral light surfaces, one blue action color, visible focus states, compact typography and desktop responsive layouts. This adds no packages, UI framework, web fonts, images, animation runtime or network requests. Tested manually at 1280×720 and 900×700 for insertion, undo, panel toggles, script access, timeline expansion and focus mode.

## Alex sculpted model upgrade — 2026-09-20

Replaced Alex's default procedural/photo-wrapped face with a locally bundled Quaternius CC0 humanoid. The build script preserves authored skin UVs and weights, adds the source parted hairstyle, a navy shirt and dark trousers/shoes, and compresses maps to 1K. The self-contained GLB is approximately 5.4 MB and loads only for Alex in a 3D scene.

Existing Alex scenes upgrade at render time without rewriting user projects. Explicit custom GLB imports take precedence. Cast → Alex appearance provides the sculpted model or simple starter. The source skeleton is driven from the existing native directing hierarchy, including seated legs and guarded arm gestures. Added two basic mouth morphs and a recessed oral cavity; this is not a full facial rig, and eyelid/expression animation remains future work.

Validation: 33 Studio unit tests pass (including legacy Alex migration/custom import preservation and embedded model structure), typecheck and touched-file lint pass. Inspected a voiced 1080p close-up and a seated wide shot; exported `artifacts/studio/alex-model-preview.mp4`. Source/license and rebuild instructions are in `public/studio/characters/alex/README.md`.

## Sarah sculpted model upgrade — 2026-09-20

Added the matching CC0 Quaternius female base and shoulder-length hairstyle for Sarah, with authored skin UVs, terracotta top, charcoal trousers/shoes and basic speech mouth shapes. Asset is approximately 6 MB and self-contained. The shared SculptedActor adapter now drives both characters; the builder accepts an optional `sarah` argument while preserving Alex's existing output.

Existing Sarah starter scenes upgrade automatically; explicit custom GLBs and simple-starter choices take precedence. Cast → Sarah appearance exposes the switch. Scene positions, recordings, scripts and character identities are preserved. Facial animation is still a basic mouth adaptation, without authored eyelid/expression animation.

Validation: 35 Studio tests pass, typecheck and touched-file lint pass. Inspected 1080p idle and speaking close-ups and checked the seated two-character layout. Preview: `artifacts/studio/sarah-model-preview.mp4`. Source and license: `public/studio/characters/sarah/README.md`.

## Character speech on Play — 2026-09-20

Play now checks every scripted line for a valid recording and mouth performance associated with that character's text and assigned voice. Missing/edited lines are recorded automatically through the local narration service before advancing the timeline; valid recordings are reused. Recorded durations update line timing and expand scene duration when needed, while preserving the selected line across timeline shifts. Reset/project replacement prevents late requests from restarting playback. Voice service errors keep playback paused and show an actionable message.

The existing Script voice selectors remain the character voice assignments. The separate generation button is now optional (“Prepare voices now”). Browser sound restrictions still expose the Enable audio button.

Validation: 38 Studio tests pass, including automatic first-play generation, voice association, cache reuse, changed-line regeneration, service failure and cancellation. Typecheck, touched-file lint and production build pass.

## 3D Character Designer — 2026-09-20

Character Designer now defaults to a real 3D cast editor for Alex and Sarah; the existing 2D rig editor is available under “2D characters & rigs”. Added orbit/zoom/pan, face/full-body framing, head size, face width, body width, height, skin/hair tint, top/trousser/shoe colours, and round/rectangular glasses with frame colour. Edits update the preview without reloading the GLB and persist in actor3d.appearance. An all-scenes toggle applies the appearance to matching character instances. Scene rendering and exports use the same appearance adapter.

Scope: face editing currently adjusts head proportions/colour, not individual sculpted features. Clothing controls recolour the fitted outfit; swapping garment meshes is not implemented. UI states these limitations.

Validation: production build and type checks pass, touched-file lint passes, 40 Studio tests pass including appearance serialization and validation. Visually checked Alex with round glasses and Sarah with rectangular glasses in the actual designer. Exported an appearance check showing head changes, blue top and glasses. No browser errors observed.

### 3D pose and animation workspace (2026-09-20)
- Character Designer → 3D characters now includes Pose and Animation panels for Alex and Sarah.
- Live orbit preview, skeleton overlay, standing/seated posture, 12 joint controls with XYZ rotations, preset poses and named saved pose capture/restore/delete.
- Saved poses capture the evaluated rig, including a paused animation frame. Scene-specific joint overrides persist in JSON and apply in Stage3D before the existing arm-clearance guard.
- Animation selection, speed, start/end, looping, play/pause/restart and absolute scene-time scrubbing. Automatic dialogue gestures can be restored.
- Context-menu poses/animations clear custom overrides. Native manual poses no longer accidentally evaluate an old animation.
- Validation: 43 Studio tests, TypeScript, focused lint, production build; browser checked Alex/Sarah, saved-pose restore and animated preview; exported one-second custom-pose MP4 at artifacts/studio/pose-workspace-check.mp4.
- Limits: rotation sliders rather than draggable IK handles; no custom keyframe/clip authoring or transfer of mannequin animation clips. Saved poses are scoped to the scene actor. Skeleton overlay is visual, not interactive.

### Custom poses inside Animation (2026-09-20)
- Animation now offers Apply custom pose and an expandable Edit animation pose editor, with the existing joint controls and named pose capture.
- Editing, saving or applying a pose inside Animation preserves the selected motion and its timing. Changing motion also preserves pose overrides. Clear custom pose releases all joints; Reset joint releases one.
- Overrides are static across the performance, not keyframes; saved full-body poses hold all saved joints until released.
- Verified browser flow: Wave → edit head → save Custom wave → clear → apply saved pose; Wave stays selected and head rotation restores, no console errors. 44 tests pass; TypeScript, focused lint and production build pass.

### Fix custom pose freezing animation (2026-09-20)
- Replaced absolute animated-joint overrides with offsets from the selected clip's first frame in the shared pose evaluator. Full-body saved poses now preserve clip movement instead of pinning every joint.
- Both workspace preview and Stage3D/export use this behavior. Static/manual poses still use absolute rotations.
- Added full-body saved-pose regression covering motion, reverse scrubbing and static pose behavior. 45 tests, typecheck and focused lint pass.

### Animation-specific custom poses (2026-09-21)
- Store pose/joint adjustments in actor.animationPoses keyed by animation name. Switching animation restores that animation's own pose, and animations without edits use their original posture.
- Migrate the previous shared pose to the currently selected animation on the first Animation-panel edit/switch. Preview and Stage3D/export resolve the same per-animation settings.
- Clearing or resetting a pose edits only the selected animation. Saved named poses remain reusable; applying one copies it into the selected animation's settings.
- Regression covers Wave → Walk isolation, distinct adjustments, switching back, save/load and clearing only one animation. 46 Studio tests pass, plus typecheck and focused lint.

### Preserve standing/seated posture when editing (2026-09-21)
- Applying saved poses in Pose or Animation no longer changes element.seated. Only the explicit Posture selector switches stance.
- Saved hip/knee rotations are rebased from their saved stance to the current stance; upper-body refinements are retained.
- Explicit posture changes rebase current static and per-animation joint overrides so saved leg angles do not fight the chosen stance. Named source poses retain their original stance metadata.
- Added seated/standing adaptation regression, immutable source and rendered seated hip-height checks. 47 tests, typecheck and focused lint pass.

### ChatGPT JSON project and room workflows (2026-09-21)
- Home → Build with ChatGPT, or editor → AI JSON. Complete project and Room & scenery modes expose description inputs, copyable ChatGPT JSON prompts, response textarea, Validate and gated Parse.
- Strict versioned schemas: chaya-project-1, chaya-room-response-1 / chaya-room-1. Rooms accept box/sphere/cylinder/cone parts, center positions in metres, XYZ degree rotations, full dimensions, material colours/roughness/metalness, ambient and directional/point lights. Limits: 250 objects, 6 lights, ±50m positions, 2 MB response input. No remote resources or executable content.
- Project import builds 1–20 scenes with Alex/Sarah, assigned voices, sequential dialogue/gestures/shot choices, wide camera, per-scene background descriptions and optional embedded room. Existing project saved before replacement. Existing Play workflow prepares audio and lipsync.
- Room requests embed projectId/sceneId, actor positions/postures, camera and description. Responses route to that original scene regardless of current scene selection, preserve all dialogue/cast, and participate in undo. Wrong project or missing scene rejects at Validate and Parse.
- Generated backgrounds persist in project JSON, trigger Stage3D rebuild, render identically in preview/export, and replace built-in room geometry. Built-in room selector identifies generated rooms and can explicitly replace them. No 3D preview mounts in AI JSON panel.
- Verified browser project template copy → two-scene Validate/Parse → room request for scene 2 → select scene 1 → Validate/Parse applies to scene 2 → preview. No console errors. MP4 export verified at artifacts/studio/ai-room-check.mp4. 51 tests, typecheck, focused lint and production build pass.
- Geometry is assembled from primitives, not generated arbitrary sculpted meshes or photorealistic assets. Structural validation cannot guarantee that ChatGPT's artistic layout avoids occlusion; inspect in Scenes and refine the room request as needed.

### Whiteboard presenter template (2026-09-21)
- Added home template matching the supplied flat illustration reference: warm background, rounded whiteboard, purple-shirt presenter and visible marker.
- Editable board words, shirt/ink colours and writing duration in Object inspector. Up to three lines of 14 characters; A–Z, numbers and . ! ? - rendered as uppercase single-line strokes.
- Marker tip and ink use the same deterministic segment sampler; reverse scrubbing and video export preserve synchronization. Pure SVG, no external assets or animation runtime.
- Verified 53 tests, typecheck, focused lint, production build and 12-second export; inspected rendered frame. Example project/video at artifacts/studio/whiteboard-presenter.json and .mp4.

### Whiteboard ending (2026-09-21)
- After ink completes, presenter lowers marker, moves to the left of the writing and turns toward viewers with eyes/smile revealed. All lettering remains unobstructed.
- Deterministic 1.2-second transition; default template extended to 14 seconds for a final reading hold. Inspector advises leaving at least two seconds after writing.
- 54 tests pass, typecheck/lint/build pass, exported video inspected at the final frame. Updated artifacts/studio/whiteboard-presenter.mp4 and .png.

### Volumetric whiteboard presenter turn (2026-09-21)
- Replaced the opacity-based face reveal with orthographic projection of shaded head/torso volumes and depth-sorted arms, hand and marker. Yaw rotates through a side profile before the character faces the viewer.
- Eyes, smile and brows attach to the front head surface and are hidden on the back; a projecting nose defines the profile. No face opacity animation.
- Turn lasts 1.5 seconds after lowering the marker; final position remains clear of board text. 55 tests, TypeScript, focused lint and production build pass.

### Generated front/back sprite presenter (2026-09-21)
- Generated a matching front/back transparent PNG atlas with the built-in image generation tool, saved under public/studio/characters/whiteboard/presenter-sprites-v1.png. Prompt set and usage recorded in adjacent README.md.
- WhiteboardPresenter now uses SpritePresenter instead of the projected 3D TurningPresenter. Back artwork while writing, full front artwork for the smile, with an edge-on sprite switch and synchronized separate arms/marker.
- Template thumbnail updated; fixed sprite artwork colours are explicit in inspector. Export waits for sprite loading.
- 56 tests pass, TypeScript and focused lint pass; exported writing and front-facing frames inspected, clean transparency. Preview: artifacts/studio/whiteboard-sprite-presenter.mp4.

### Restore original faceless 2D presenter (2026-09-21)
- Restored the simple flat SVG presenter with blank face, brown hair and purple shirt. No sprite or 3D renderer is used by the whiteboard template.
- Kept synchronized marker writing, lowered-marker ending and movement beside the board. Restored editable shirt colour and original thumbnail.
- Typecheck, focused lint and production build pass; exported final frame verified. Previous generated sprite assets retained but unused.

### Whiteboard text, drawings and code (2026-09-21)
- Object inspector includes Text + drawings, Code + drawings, and Drawings only. Code preserves case, indentation and ASCII programming punctuation; never evaluated. Text/code fit available board space rather than truncating new-mode content. Long snippets show a readability warning; unsupported characters use ?.
- Drawing canvas supports freehand, line, arrow, rectangle and ellipse; undo-last-stroke and clear. Normalized points persist with project JSON, up to 100 strokes of 512 points; invalid coordinates rejected. Shapes clamp to board bounds.
- Single deterministic ink stream sequences text/code followed by drawings; the existing faceless presenter's marker follows all strokes and steps aside afterward.
- Browser tested code entry + rectangle draw + end scrub with no console errors. Exported code and drawings to artifacts/studio/whiteboard-code-drawing.mp4. 58 tests, typecheck, focused lint and production build pass.

### Live presenter commands
- Whiteboard Object inspector now includes microphone recognition (browser SpeechRecognition with webkit fallback), typed commands, and template buttons. Only final recognition results execute; errors/unsupported browsers offer typed input and microphone stops on unmount.
- Supported commands: `write <sentence>`, `draw browser` (inside a computer screen), `draw computer`, `draw server`, and `connect computer to server` / `connect server to computer`. Missing endpoints are automatically drawn. Repeated diagrams and unsupported requests give feedback.
- First command starts a separate live board while retaining manual text/code/strokes. Reset restores manual content. Three text rows, 100 characters per sentence, 30 commands per board.
- Timed normalized strokes are serialized and validated with the project. Incoming commands queue, extend the scene and presenter lifetime, and start playback. Existing ink remains visible; deterministic playback, scrubbing and MP4 export use the same renderer.
- Verified typed-command flow in Studio, both arrow directions, completed board and step-aside, unsupported-command feedback, no browser console errors, and MP4 export (`artifacts/studio/whiteboard-live.*`). Actual spoken recognition requires user microphone/browser permissions and was not audio-tested.

### Dedicated Live presenter template and open-ended drawing
- Added a separate home template with a blank board, original faceless presenter, and automatically selected command panel.
- Added local-only `/api/studio/draw` using server-side OpenAI Responses structured output. Arbitrary descriptions produce validated normalized pen paths rather than a fixed template fallback. Existing ink is supplied as drawing context. Generation supports cancellation and rejects stale responses after board/project changes.
- Added a ChatGPT prompt-copy and validated drawing-JSON import workflow for use without API credentials. Existing instant computer/browser/server templates remain offline.
- Verified template launch, explicit missing-key state and custom house/tree import in the Studio. All 67 tests pass, including mocked provider success/refusal, coordinate bounds, serialization and new-template checks; build/typecheck/lint pass. No real provider call or spoken-microphone test was performed because no drawing API key is configured.
- Setup and limits: `docs/LIVE_PRESENTER.md`.

### Presenter layout, library dictation and erasure
- Enlarged the SVG board from 360×165 to 382×207 and expanded the usable ink area. Presenter resting position moves from x=74 to x=50 (left edge near the canvas boundary); writing and erasing follow the transformed ink coordinates.
- Added an offline drawing library with house, tree, cloud, database, phone, person, circle, rectangle, triangle, arrow and star plus aliases; existing browser/computer/server and connection commands retained. Unsupported drawing names now report a library message instead of using AI automatically. Custom JSON import remains available.
- Added `write`/`draw` modes across separate utterances and `stop writing`/`stop drawing`. Typed commands exercise the same interpreter as final speech recognition results.
- `remove`/`delete`/`undo` targets the latest visible item. Named commands target exact drawing/text labels, case-insensitively, and record a two-second animated erasure with a hand eraser. Previously drawn content remains visible when scrubbing before erasure. Removed library slots and text rows can be reused; invalid/missing/ambiguous names report errors.
- Typecheck, lint, production build and 70 Studio tests pass. Browser verified dictation arming, library drawings, named drawing erasure retaining text/tree, and named text erasure. Export smoke completed: `artifacts/studio/live-presenter-erase.mp4`. Microphone audio was not tested.

### Presenter action timeline and command playback
- Added a named track for every live write/draw/erase event, with action type colors, start/duration placement, per-action preview and seeking. Tracks expand when recording actions.
- Added persistent presenter live-mode setting and transient transport endpoint. Live commands play directly without voice-preparation races, queue behind existing actions, stop after the recorded action sequence/return-to-side and remain ready. Normal Play/Reset clears the live transport endpoint.
- Added Export presenter timeline, a standalone current-scene export trimmed to the final command plus three seconds, with project audio correctly rebased. Entire-project export remains available; the source project is never trimmed.
- Automated verification covers action timing, loop-independent stopping, live-mode persistence, erase tracks, standalone duration and audio rebasing. 73 Studio tests pass; typecheck/lint/build verified.

### Vertical architecture library
- Added fixed, labeled six-layer ML/DL architecture strokes matching the requested dataset, preprocessing, model design, training/optimizer, evaluation and cloud deployment sequence.
- Added ordinal/numeric layer commands, individual layer buttons, full-diagram command, duplicate checks, fixed positions when drawn out of order and named layer removal aliases.
- Reuses live playback/action tracks, persisted stroke validation, erasure and export. 75 Studio tests pass; typecheck, lint and production build pass.

### Projector / tablet live rooms
- Added `/studio/live` pairing page, `/studio/live/display` distraction-free responsive projector board, and `/studio/live/control` touch controller with library/architecture buttons, typed/voice commands, transport and recording download.
- Added server-authoritative ephemeral room state, SSE snapshots/broadcast/reconnection, anchored playback clocks, ordered command application, token-gated mutations and idempotent command retry. LAN origins validate against the actual incoming Host (Next may normalize its internal URL to localhost).
- Studio can seed a room from the presenter's current recording without leaving the editor. Downloaded room recordings reopen as normal Studio timelines for video export.
- Remote microphone is disabled on insecure origins with an HTTPS explanation; touch/text work over LAN HTTP. Single-server in-memory sessions expire after four hours of inactivity or server restart. Setup/hosting details: docs/LIVE_PRESENTER_ROOM.md.
- Verification completed: 79 Studio tests, typecheck, lint and production build. Browser-tested localhost host pairing, separate projector and controller, commands/queued architecture layers across the actual LAN URL, insecure-origin voice fallback, and projector reload restoring current state. Physical tablet/projector hardware and microphone audio were not tested.

### Live controller drawing canvas
- Added pointer/touch/stylus drawing canvas with freehand, line, arrow, rectangle and ellipse tools, completed-queue ink preview and pointer capture/cancellation. Freehand samples are bounded and normalized.
- Releasing a stroke sends a token-authenticated, idempotent drawing action. Server validates it, names it as a sketch, queues it after earlier writing/actions and broadcasts it to the projector. Sketches reuse named erasure, timeline recording and export.
- Verified a real canvas drag created a rectangle, queued after text and appeared as draw sketch 1 in the remote recording. Typecheck, lint, production build and 80 tests pass.

### Studio login requirement
- Removed the Studio AuthProvider bypass and enabled middleware for `/studio/:path*` and `/api/studio/:path*`, covering live controllers/displays and drawing/live APIs.
- Protected pages redirect to login with a validated return path; APIs return 401. Server verifies access tokens using Supabase's user endpoint and fails closed when credentials or tokens are missing/invalid.
- Added same-origin, verified HttpOnly session-cookie synchronization on login/refresh and cookie clearing on logout. Client guard hides Studio while authentication is loading and redirects after sign-out. Login returns to the requested Studio page, preserving a controller-link fragment.
- 82 tests pass, including unsigned/forged-token rejection, validated access, missing configuration, cookie flags/logout, cross-origin rejection and redirect validation. No live Supabase credentials are configured locally, so actual account sign-in could not be verified.

## Embedded SQLite authentication

Studio login/signup now use local SQLite accounts and revocable seven-day sessions. Passwords use salted scrypt, session tokens are hashed in storage, and Studio pages/APIs verify authentication on the server. No Supabase credentials are required for Studio. Requires Node 22.13+ and persistent writable storage; default database is `data/studio.sqlite`. Legacy video/billing data is not migrated.

## Cloudflare and Next.js update

Pinned Next.js to 14.2.35 and matching ESLint config, removed the obsolete SWC 13 fallback. Added OpenNext Workers configuration and D1 migration for users, sessions, rate limits, and shared presenter rooms. Local SQLite remains available. Shared room commands use optimistic concurrency and idempotency; SSE streams read D1 and revalidate authentication. Deployment instructions document the requested version's security advisories and the separate local rendering/narration service.
