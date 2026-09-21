# Sarah — sculpted 3D character

Source: Quaternius, Universal Base Characters [Standard], CC0 1.0.
https://quaternius.com/packs/universalbasecharacters.html
https://quaternius.itch.io/universal-base-characters

Original official archive downloaded 2026-09-20 (itch upload 15861669).
Meshes: Superhero_Female_FullBody.gltf and Hair_Long.gltf.
The original license notice is included in LICENSE.txt.

Chaya adaptation preserves the authored face geometry, matching skin UVs, eyes,
eyebrows and skin weights. Added terracotta top, charcoal trousers and shoes,
brown hair, 1K compressed textures, and two basic speech mouth shapes.
The local GLB needs no avatar service or runtime external downloads.

Existing Sarah scenes upgrade automatically unless a custom GLB or the simple
starter appearance is explicitly selected. Poses, seated posture, transforms,
voice recordings and the script remain available. Native directing motions drive
the skeleton; this does not add the separate mannequin's 46 clips to Sarah.

Facial animation is a basic adaptation: no authored expression/blink rig or
production viseme set is supplied by this source model.

Rebuild with Python 3 and ffmpeg:
python3 scripts/studio/build-alex-model.py '/path/Universal Base Characters[Standard]' sarah
