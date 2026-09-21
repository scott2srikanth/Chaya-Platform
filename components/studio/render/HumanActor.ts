import * as T from "three";
import type { SceneElement } from "../../../lib/studio/types";
import { actorSettings } from "../../../lib/studio/stage3d";
export type HumanActor = {
  root: T.Group;
  texturedFace?: boolean;
  setAppearance?: (appearance?: import("../../../lib/studio/appearance").CharacterAppearance) => void;
  updateRig?: (open: number, round: number, blink: number) => void;
  body?: T.Group;
  head?: T.Group;
  mouth?: T.Mesh;
  lips?: T.Mesh[];
  eyes?: T.Group[];
  arms?: T.Group[];
  elbows?: T.Group[];
  wrists?: T.Group[];
  legs?: T.Group[];
  knees?: T.Group[];
  mixer?: T.AnimationMixer;
  clipDuration?: number;
  animationNames?: string[];
  morphs?: { mesh: T.Mesh; index: number; shape?: string }[];
};
export function createHuman(el: SceneElement, faceTexture?: T.Texture): HumanActor {
  const a = actorSettings(el),
    root = new T.Group(),
    body = new T.Group();
  root.add(body);
  const feminine = /sarah|mia/i.test(el.characterId ?? "");
  const skin = new T.MeshStandardMaterial({ color: a.skin, roughness: 0.72 });
  if (faceTexture) skin.color.set("#a57052");
  const fabric = new T.MeshStandardMaterial({
    color: a.shirt,
    roughness: 0.95,
  });
  const hairMat = new T.MeshStandardMaterial({
    color: a.hair,
    roughness: 0.65,
  });
  const mat = (c: string) =>
    new T.MeshStandardMaterial({ color: c, roughness: 0.8 });
  const add = (
    parent: T.Object3D,
    g: T.BufferGeometry,
    m: T.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new T.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const ell = (
    p: T.Object3D,
    m: T.Material,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
  ) => {
    const mesh = add(p, new T.SphereGeometry(1, 32, 24), m, x, y, z);
    mesh.scale.set(rx, ry, rz);
    return mesh;
  };
  const capsule = (
    p: T.Object3D,
    m: T.Material,
    r: number,
    length: number,
    x: number,
    y: number,
    z: number,
  ) => add(p, new T.CapsuleGeometry(r, length, 8, 20), m, x, y, z);
  const pants = mat(feminine ? "#384957" : "#273541"),
    shoe = mat("#dfdbd2");
  const legs: T.Group[] = [], knees: T.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group(), knee = new T.Group();
    leg.position.set(side * 0.105, 0.97, 0); body.add(leg);
    capsule(leg, pants, 0.083, 0.34, 0, -0.24, 0);
    knee.position.y = -0.46; leg.add(knee);
    capsule(knee, pants, 0.065, 0.37, 0, -0.24, 0.008);
    ell(knee, shoe, 0, -0.445, 0.055, 0.085, 0.065, 0.18);
    ell(knee, mat("#8c8e8e"), 0, -0.485, 0.057, 0.087, 0.023, 0.182);
    legs.push(leg); knees.push(knee);
  }
  ell(body, pants, 0, 0.97, 0, 0.2, 0.12, 0.12);
  // Tailored torso: shoulder line, waist taper and a flat hem, rather than a capsule.
  const points = [
    new T.Vector2(0.17, 0),
    new T.Vector2(0.18, 0.05),
    new T.Vector2(feminine ? 0.145 : 0.17, 0.17),
    new T.Vector2(0.205, 0.34),
    new T.Vector2(0.235, 0.43),
    new T.Vector2(0.17, 0.48),
    new T.Vector2(0.065, 0.51),
  ];
  const torso = add(body, new T.LatheGeometry(points, 48), fabric, 0, 1, 0);
  torso.scale.z = 0.65;
  capsule(body, skin, 0.065, 0.12, 0, 1.53, 0);
  const collar = add(
    body,
    new T.TorusGeometry(0.074, 0.014, 10, 36),
    mat("#eee8de"),
    0,
    1.49,
    0,
  );
  collar.rotation.x = Math.PI / 2;
  const head = new T.Group();
  head.position.set(0, 1.73, 0);
  body.add(head);
  // Tapered jaw and cheek structure.
  const faceMaterial = faceTexture ? new T.MeshStandardMaterial({map: faceTexture, roughness: 0.85}) : skin;
  const face = ell(head, faceMaterial, 0, 0, 0, 0.145, 0.205, 0.137);
  if (faceTexture) {
    // Image center is the nose; the seam belongs at the back of the head.
    // Cylindrical longitude and linear height align this supplied UV layout.
    const position = face.geometry.getAttribute("position"), uv = face.geometry.getAttribute("uv");
    for (let i = 0; i < position.count; i++) {
      uv.setXY(i, 0.5 + Math.atan2(position.getX(i), position.getZ(i)) / (2 * Math.PI),
        Math.max(0, Math.min(1, 0.5 + position.getY(i) * 0.5)));
    }
    uv.needsUpdate = true;
  }
  const vertices = face.geometry.getAttribute("position");
  for (let i = 0; i < vertices.count; i++) {
    const y = vertices.getY(i);
    if (y < 0) vertices.setX(i, vertices.getX(i) * (1 + y * 0.18));
  }
  face.geometry.computeVertexNormals();
  if (!faceTexture) for (const side of [-1, 1]) {
    ell(head, skin, side * 0.146, -0.007, 0, 0.026, 0.05, 0.028);
  }
  if (!faceTexture) ell(head, skin, 0, -0.003, 0.131, 0.024, 0.05, 0.038);
  if (!faceTexture) ell(head, skin, 0, -0.038, 0.147, 0.024, 0.019, 0.021);
  const hair = add(
    head,
    new T.SphereGeometry(1, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.4),
    hairMat,
    0,
    0.021,
    -0.012,
  );
  hair.scale.set(0.154, 0.202, 0.147);
  hair.rotation.z = feminine ? -0.08 : 0.1;
  hair.visible = !faceTexture;
  if (feminine) {
    ell(head, hairMat, -0.125, -0.105, -0.055, 0.057, 0.23, 0.073);
    ell(head, hairMat, 0.125, -0.105, -0.055, 0.057, 0.23, 0.073);
    ell(head, hairMat, 0, -0.08, -0.115, 0.14, 0.22, 0.055);
  } else if (!faceTexture) {
    for (let i = 0; i < 7; i++) {
      const lock = ell(
        head,
        hairMat,
        -0.11 + i * 0.032,
        0.155 + (i % 2) * 0.01,
        0.03,
        0.042,
        0.065,
        0.09,
      );
      lock.rotation.z = -0.35;
    }
  }
  const eyes: T.Group[] = [];
  if (!faceTexture) for (const side of [-1, 1]) {
    const eye = new T.Group();
    eye.position.set(side * 0.059, 0.025, 0.12);
    head.add(eye);
    eyes.push(eye);
    ell(eye, mat("#fff8ed"), 0, 0, 0, 0.035, 0.022, 0.018);
    ell(
      eye,
      mat(feminine ? "#594732" : "#54716b"),
      0,
      0,
      0.017,
      0.015,
      0.017,
      0.005,
    );
    ell(eye, mat("#171b21"), 0, 0, 0.021, 0.007, 0.012, 0.003);
    ell(eye, mat("#ffffff"), -0.005, 0.006, 0.025, 0.003, 0.004, 0.001);
    const brow = ell(
      head,
      hairMat,
      side * 0.059,
      0.072,
      0.132,
      0.039,
      0.008,
      0.008,
    );
    brow.rotation.z = -side * 0.08;
  }
  const mouth = ell(head, mat("#43272a"), 0, -0.09, 0.131, 0.045, 0.001, 0.008);
  const lipMat = faceTexture ? new T.MeshBasicMaterial({color: "#79483d"}) : mat(feminine ? "#a96961" : "#a57369");
  const lips = [
    ell(head, lipMat, 0, -0.087, 0.14, 0.046, 0.006, 0.009),
    ell(head, lipMat, 0, -0.096, 0.14, 0.043, 0.008, 0.009),
  ];
  const arms: T.Group[] = [],
    elbows: T.Group[] = [],
    wrists: T.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new T.Group();
    arm.position.set(side * 0.215, 1.405, 0);
    body.add(arm);
    arms.push(arm);
    capsule(arm, fabric, 0.068, 0.13, 0, -0.075, 0);
    capsule(arm, skin, 0.047, 0.15, 0, -0.235, 0);
    const elbow = new T.Group();
    elbow.position.set(0, -0.33, 0);
    arm.add(elbow);
    elbows.push(elbow);
    ell(elbow, skin, 0, 0, 0, 0.049, 0.052, 0.047);
    capsule(elbow, skin, 0.037, 0.18, 0, -0.12, 0);
    const wrist = new T.Group();
    wrist.position.set(0, -0.258, 0);
    elbow.add(wrist);
    wrists.push(wrist);
    ell(wrist, skin, 0, -0.043, 0, 0.043, 0.06, 0.022);
    for (let f = 0; f < 4; f++) {
      const finger = new T.Group();
      finger.position.set((f - 1.5) * 0.021, -0.078, 0);
      finger.rotation.z = (f - 1.5) * 0.055;
      wrist.add(finger);
      capsule(finger, skin, 0.009, 0.041, 0, -0.02, 0);
      const tip = capsule(finger, skin, 0.008, 0.027, 0, -0.056, 0.007);
      tip.rotation.x = -0.2;
    }
    const thumb = capsule(
      wrist,
      skin,
      0.013,
      0.045,
      side * 0.041,
      -0.03,
      0.004,
    );
    thumb.rotation.z = side * 0.48;
  }
  return { root, texturedFace: !!faceTexture, body, head, mouth, lips, eyes, arms, elbows, wrists, legs, knees };
}
