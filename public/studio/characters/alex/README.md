# Alex — sculpted 3D character

Source: Quaternius, Universal Base Characters [Standard]
https://quaternius.com/packs/universalbasecharacters.html
https://quaternius.itch.io/universal-base-characters

Downloaded from the author's free Standard archive on 2026-09-20 (itch upload 15861669).
Source meshes: Superhero_Male_FullBody.gltf and Hair_SimpleParted.gltf.
License: CC0 1.0; the original license notice is included in LICENSE.txt.

Chaya adaptation:
- Original sculpted male face, authored skin UVs, eyes, eyebrows, hair and skinning.
- Navy shirt, charcoal trousers and shoes, with clean geometric material boundaries.
- Brown hair and eyebrows; original matching light skin map.
- Source maps encoded at 1024px as JPEG to reduce the download size.
- Basic jaw-open and lip-rounding morphs added for the existing recorded-speech driver.
- Runtime rest-pose retargeting from Studio's directing controls, including seated posture.

The source does not supply facial blendshapes, teeth/tongue performance, or a full facial rig.
The two added mouth shapes are a restrained approximation, not production facial capture.
The bundled character uses Studio's native actions; the separate 46-clip mannequin is unchanged.

Rebuild:
python3 scripts/studio/build-alex-model.py '/path/Universal Base Characters[Standard]'
Requires Python 3 and ffmpeg. Produces a self-contained GLB; no third-party service is called at runtime.
