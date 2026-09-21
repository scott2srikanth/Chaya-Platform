# Motion Explainer Studio — pre-implementation specification audit

> Historical baseline taken before the implementation work. See [MOTION_STUDIO_IMPLEMENTATION.md](MOTION_STUDIO_IMPLEMENTATION.md) for the implemented workflows and current validation.

Date: 2026-09-20. Scope: the two supplied Motion Explainer Studio and Character System documents, compared with the current repository. This is a source-code and integration audit, not a browser acceptance test. “Implemented” means a concrete connected code path exists; visual quality and performance are not certified. Prior checks on this unchanged source: TypeScript and production build passed; lint failed with 17 errors, including six conditional-hook errors in PoseEditor.

**Verdict: neither specification is complete.** The editor has a useful SVG canvas, local project storage, built-in characters, pose controls, script preview and clip-authoring UI. It does not yet provide a reliable unified animation timeline, complete character authoring, audio tracks, or video export. The second document assumes that rendering/export and undo/redo already exist; that assumption is false for this checkout.

Status: **Implemented** = connected implementation for the stated subset; **Partial** = incomplete, disconnected, or only modeled; **Missing** = no implementation found; **Deferred** = explicitly later/out of initial scope.

## 1. Motion-design MVP requirements

| Requirement / document section | Status | Evidence and limits |
|---|---|---|
| Local single-user 2D studio, no AI (§1, §31) | Partial | `/studio` has no login gate and saves locally. It remains inside the Next.js SaaS app, wrapped in its AuthProvider, with a dashboard backlink and Google font dependency. No AI generation in the studio. No independent offline app. |
| React, TypeScript, Zustand, SVG (§2) | Implemented | Used throughout the studio. Next.js replaces the proposed Vite shell. GSAP is absent; custom easing exists. This shell difference alone does not require a rewrite. |
| Remotion and FFmpeg (§2, §18, §27) | Missing | Neither dependencies nor a renderer/export entry point exist. |
| Explicit scene/element/animation model (§3, §7) | Implemented | `lib/studio/types.ts` defines structured projects, scenes, elements and numeric animations. Rendering reads scene data. |
| Editor layout (§4) | Partial | Assets, SVG canvas, properties, script panel, clip timeline and Save/Preview toolbar exist. Export and in-editor New/Open controls are absent. New/Open are only in the initial project picker. |
| 1920×1080, 16:9, 30fps defaults (§1, phase 2) | Implemented | Project settings default to these values. FPS is not used by an export renderer. |
| Grid, canvas zoom/pan, selection, drag/resize | Implemented | `StudioCanvas.tsx` has pointer operations and corner handles. |
| Object rotation/scale controls | Partial | Numeric rotation works for ordinary shapes; no rotation handle. Animated scale is calculated but not applied by the canvas. Character wrappers do not apply rotation or element opacity. |
| Rectangle, circle, line, text | Implemented | Creation buttons and SVG rendering are connected. Text is basic single SVG text content. |
| SVG/image/icon assets (§10, §24) | Missing | `svg` and `image` enum values exist, but no file importer/asset manager/source fields. Renderer falls back to a rectangle. Built-in rig SVG does not implement generic SVG import. |
| x/y/scale/rotation/opacity animation (§5, phase 3) | Partial | Numeric evaluator supports these plus width/height. Main script preview does not advance `currentTime`; scaling is not consumed by canvas. |
| Fill/stroke/blur animation (§5) | Partial | Static fill/stroke editing exists. No appearance animation tracks or blur implementation. |
| Linear/easeIn/easeOut/easeInOut/spring (§5) | Implemented | Pure easing functions in `lib/studio/easing.ts`. |
| Text typewriter, word/character/line reveals (§14) | Missing | No text segmentation/reveal engine; only generic object presets. |
| Motion preset library (§12, §22) | Partial | Fade in/out, four slides, scale in/out, pop, bounce are defined. Typewriter, draw-line, path-following and stagger are absent. Playback/scaling issues prevent treating all presets as working features. |
| Multi-scene editing (§6) | Partial | Project supports multiple scenes and store has add/remove/select actions, but studio UI has no callers for those actions. No full-project playback. |
| Scene duration/background/animations/camera/audio/transition (§6) | Partial | Most scene fields exist; no audio. No connected scene settings/navigation workflow. Scene transition field is not rendered. |
| Unified deterministic timeline (§8, §9, §23) | Partial | Pure numeric/pose evaluation exists, but object, clip and script clocks are separate. Script timing relies on wall clock, speech events and timeouts. No shared `getFrame(T)` pipeline. |
| Play/pause/seek/scrub | Partial | Script Preview/Stop and clip Play/Pause/ruler controls exist. Script preview resets instead of pause/resume; clip play restarts at zero; scrub does not drive canvas pose rendering. |
| Object/camera/audio tracks | Missing | Visible timeline is pose-clip oriented, not the specified unified scene timeline. |
| AssetManager upload/remove/rename/get and local files (§10) | Missing | IndexedDB contains only a projects object store. |
| Reusable system components (§11, §25) | Missing | No Browser/Server/Database/Cloud/API/Load Balancer/Queue/Cache/Container/Terminal/Code Window/Notification library. Shapes in script-template scenery are not this component system. |
| Arrows/connectors/draw paths/moving packets (§13) | Missing | Only basic lines; no arrow/path connectivity or packet motion model. |
| Camera pan/zoom/focus/rotation (§15) | Partial | Named camera regions, script shot selection and camera transitions exist. No camera rotation rendering or general time-keyed camera track; some camera movement depends on previous-frame state. |
| Cut/fade/crossfade/slide/zoom between scenes (§16) | Missing | Transition names exist in the model, but no scene compositor consumes them. Camera cuts are a separate feature. |
| Voice/music/SFX/waveform/timing (§17, §26) | Partial | Browser speech synthesis previews script dialogue. No audio file import, tracks, waveforms, mixing, or exportable synchronized narration. |
| MP4/H.264/WebM/quality presets/progress/cancel (§18, §27) | Missing | No export UI, jobs, codecs or rendering pipeline. |
| Versioned JSON project (§19) | Partial | Version, metadata, settings, scenes exist. Missing assets/audio/character library/clip/custom-pose persistence, schema validation, migration and file import/export. |
| Modular architecture (§20) | Partial | Engine/model/UI are separated into `lib/studio` and `components/studio`; no separate renderer, asset/audio systems or shared render-core package. |
| Templates (§28) | Partial | Product Demo, Interview and Classroom Lesson script/scenery templates exist. No architecture/API/database/cybersecurity/cloud/algorithm templates, reusable user-template storage or JSON template import. |
| Website-request golden project (§29) | Missing | No specified DNS→CDN→load balancer→servers→database demo project. |
| Unit/render/serialization/migration tests and examples (§30) | Missing | No studio test suite, frame comparisons, migrations or example JSON project suite found. |
| DSL/AI/3D/Rive/Lottie later in base MVP (§32) | Deferred | Absence is consistent with the base MVP's later roadmap. The character document separately requests Sprite/Lottie/Rive. |
| Master instruction / final MVP success criteria (§33) | Not met | Cannot author and preview a complete multi-scene animation, add audio tracks, export MP4 or compare preview/export frames. |

The development phases repeat these requirements. Foundation/canvas are the furthest along; animation/motion/timeline/camera/templates are partial; asset/explainer/audio/export/golden-demo/quality phases remain incomplete. They should not be considered completed merely because their types or buttons exist.

## 2. Character System — all numbered sections

| Section | Status | Current implementation / gap |
|---|---|---|
| 1. Product goal | Partial | Built-in identities and scene instances exist. Complete create/edit/save/import/export workflow does not. |
| 2. Character library | Partial | Search, thumbnails, pose previews and insertion for four fixed rigged characters. No user-managed persistent library. |
| 3. Creation wizard | Missing | No create-from-built-in/sprite/SVG/Lottie/Rive/custom-rig flow. |
| 4. Rigged representation | Partial | Bone hierarchy, visuals, local/world transforms and z-index exist. No general representation discriminator; pivots/constraints and rendered bone scale are incomplete/absent. |
| 5. Sprite sheet | Missing | No importer, frame metadata or sprite renderer. |
| 6. Lottie | Missing | No importer, runtime, animation selection or timeline integration. |
| 7. Rive | Missing | No importer, runtime, state machine/input controls or timeline integration. |
| 8. Custom rig editor | Missing | Existing pose editor cannot create/reparent/delete bones, edit hierarchy or build a new rig. |
| 9. Pose editor | Partial | Dedicated view, bone selection, rotation drag and X/Y/rotation sliders. No pivot/z-order/constraint/scale editing. Save is not integrated into reusable pose loading. |
| 10. Pose library | Partial | Ten built-in poses shared by four rigs: idle, wave, point, talk, think, celebrate, sit, walk A/B, present. Custom poses are transient and not surfaced in the library. Requested full pose set is absent. |
| 11. Pose blending | Partial | Position/shortest-angle rotation/scale interpolation and blend helper exist. No opacity blending; direct gesture changes are not uniformly blended; scale is not fully rendered. |
| 12. Animation editor | Partial | Clip timeline supports whole-pose keyframes, drag timing, pose replacement, easing, duration and loop. No dedicated per-bone track editor or playback-speed control; preview integration is defective. |
| 13. Reusable animation clips | Partial | Five preset factories and clip model exist. Clips target scene `elementId`, not reusable character animations; no independent persistent clip library, FPS/tracks or start-time model. |
| 14. Main timeline integration | Partial | Character-related clip rows exist. Canvas uses first matching clip only, so Walk→Point→Talk sequencing on one instance is not implemented. |
| 15. Higher-level actions | Missing | Static gesture buttons are not `walkTo(target)`, `pointAt(object)`, run/sit/stand movement planning. |
| 16. Look-at | Partial | Classic characters track the current speaker horizontally with pupils. No arbitrary object/coordinate targeting API, head aiming or rigged-character integration. |
| 17. Two-bone IK | Missing | Forward hierarchy solver only. No hand/foot target solver. |
| 18. Expressions | Partial | Classic renderer has procedural reactions/facial changes. No independent expression assets/editor/animation tracks for the native rigged system. |
| 19. Talking cycle | Partial | Classic characters use speech text/progress to animate mouth openness. Rigged characters receive a static talk pose and do not consume that mouth system. |
| 20. Editable appearance | Partial | Typed appearance and color-token resolution exist. No appearance editing/save UI; hairstyle metadata does not construct alternative rig hair geometry. |
| 21. Variants | Missing | Four named characters share rig/pose data; no variants grouped under a reusable identity. |
| 22. Thumbnails | Implemented subset | Library generates SVG previews from built-in rigs. No imported-character thumbnail pipeline. |
| 23. Character insertion | Partial | Button inserts a scene element referencing `characterId`, without copying the rig. No drag-and-drop; full activeAnimation/activePose/expression/override fields are absent. |
| 24. Instance overrides | Partial | Position, dimensions, gesture, reaction and facing are per instance. No general color/speed/animation/expression override model, and some element transforms are ignored. |
| 25. Dedicated workspace | Partial | Scene, character library and pose-editor workspaces exist. No create/rig/animation/expression/asset studios. |
| 26. Preview controls | Partial | Static pose previews and clip controls exist. Pose editor's Play advances an unused `previewT`; speed/background options and dependable reset/scrub are absent. |
| 27. Import pipeline | Missing | No character file import/type detection/validation. |
| 28. Rendering/export | Missing | No Remotion renderer or editor/export state parity. |
| 29. Performance for 10–20 characters | Unverified / partial | Some renderer memoization exists; no performance tests or asset-cache system. Clip clock is not properly subscribed to by canvas. |
| 30. Character JSON schema | Partial | RiggedCharacter has ID/version/appearance/rig/poses. No multi-representation schema, persistent serialization pipeline, expressions/animations/metadata or validation. |
| 31. File architecture | Partial | Rig/model/evaluator/library/pose/renderer files exist. Missing rig/animation/expression editors and external import/render modules. Existing folders can be extended. |
| 32. Creative-tool UX | Partial | Visual canvas, thumbnails, sliders, presets and pose view exist. Missing drag-and-drop imports, shortcuts, undo and full workflows; visual polish not acceptance-tested. |
| 33. Character creation experience | Missing | Cannot create and persist a new character through the specified sequence. |
| 34. Golden built-in Alex | Partial | Alex has articulated body/facial visuals and ten poses. Exact independent expression/animation set, reusable animation library and golden integration validation are absent. |
| 35. Golden character demo | Missing | No architecture-pointing/packet/camera/export demonstration. |
| 36. Clean main timeline | Partial | Clip rows avoid hundreds of bone tracks, but no unified character/object/camera/voice timeline or detailed animation-editor drill-down. |
| 37. Undo/redo | Missing | No history stack or command system found. The specification's assumption of an existing undo system is incorrect. |
| 38. Keyboard shortcuts | Missing | No studio handlers for Space/R/K/P/I/O/Delete/Cmd-Z/redo. Project-name Enter is not the specified shortcut system. |
| 39. Tests | Missing | No rig, pose, clip, character, importer or frame-parity tests. |
| 40. Implementation order | Not completed | Library, fixed rigs, pose controls and clip UI exist while earlier creation/rig/persistence steps remain absent. Repository snapshot cannot establish historical implementation order. |
| 41. Character vs instance | Implemented foundation | Scene stores `characterId`; built-in definitions remain reusable. Needs extension for user-created definitions and animation libraries. |
| 42. Future architecture, no AI now | Partial / deferred | No studio AI. Current rig-only model lacks representation/action/expression abstractions needed for the stated future paths. Future AI/3D/physics/crowds are not present-phase requirements. |
| 43. Definition of done | Not met | Creation, persistence, rig editing, independent expressions, targeting, sequential clips, all importers and video export are absent or incomplete. |

## 3. Integration defects that change the completion verdict

1. **Object animations freeze during script preview.** `StudioCanvas.tsx` evaluates `getAnimatedState(el, currentTime)`. `store.ts` starts at zero and `tickPlayback` updates `playbackTime` and speech/camera progress, not `currentTime`. No studio UI invokes `setCurrentTime`. A preset definition is therefore not a working preview feature.
2. **Clip canvas updates are disconnected.** Canvas reads `animationClips`, `clipPlaybackTime` and `isClipPlaying` through `getState()` rather than reactive selectors. A clip tick alone does not trigger canvas rendering. Furthermore `scrubClip` sets `isClipPlaying: false`, and canvas only evaluates clips while clip/script playback is active. Scrubbing cannot reliably preview the requested pose.
3. **Scale/character transform output is dropped.** Numeric evaluator returns scale, but SVG wrappers do not apply it. Character wrappers apply translation but not element rotation/opacity. Rig solver returns bone scale, but bone SVG wrappers use translation/rotation only.
4. **Multiple clips cannot be sequenced.** `AnimationClip` has no start offset; canvas selects `.find(c => c.elementId === el.id)`. Additional clips for the same character are not a scheduled sequence.
5. **Custom poses and clips are not saved or reused correctly.** IndexedDB receives only `project`; clips and custom poses are separate store fields. Pose lookup only searches hardcoded `character.poses`; no component reads `customPoses` to expose saved user poses. Reload loses them, and saved poses are unavailable to the clip picker/evaluator even before reload.
6. **Pose-editor preview does not animate.** `previewT` changes but is never used to compute rendered pose transforms. Its hook placement also produces six lint errors.
7. **Script preview mutates authoring data.** Preview sets scene element gestures/reactions and Stop resets them to idle/none, rather than restoring original authored state. This conflicts with keeping transient playback state separate from serialized project data.
8. **Scene authoring is not wired to UI.** Store add/select/remove scene actions are never invoked by current studio components. Project supports scene arrays but users cannot complete the requested multi-scene flow through the editor.
9. **Two character systems have different capabilities.** Classic characters get procedural speech/reactions/eye tracking; rigged characters get editable bones/pose clips. These are not yet a unified reusable character system.

Primary evidence: `app/studio/page.tsx`; `components/studio/{StudioCanvas,StudioToolbar,AssetPanel,PropertiesPanel,CharacterLibrary,PoseEditor,ClipTimeline,RigRenderer}.tsx`; `lib/studio/{types,store,db,rig,clip-engine,animation-engine,easing,presets,character-animator,built-in-rigs}.ts`; `package.json`.

## 4. Recommended completion order

1. Fix clock subscriptions, seek/pause semantics, transform rendering and single-frame state evaluation. Connect scene navigation. Keep playback state separate from authored data.
2. Extend versioned project persistence to character definitions, poses, reusable clips and scene clip instances. Add validation/migrations and undo/redo.
3. Complete one native rigged character end to end: creation/appearance/rig editing → saved pose → clip → scene sequencing → expression/action. Integrate talking consistently.
4. Add actual asset import, explainer components, connectors, text motion and audio tracks.
5. Implement shared deterministic preview/Remotion rendering and MP4/WebM export, then verify the website-request golden demo frame by frame.
6. Add Sprite/Lottie/Rive representations and simple IK according to the character specification, plus performance and import validation tests.

No application code was changed by this audit. This report does not count placeholders or future roadmap items as completed functionality.
