import { appearanceDefaults } from "../../../lib/studio/appearance";
import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import type { SceneElement } from "../../../lib/studio/types";
import { createHuman, type HumanActor } from "./HumanActor";

/** The bundled asset is trusted; user-provided GLBs retain their embedded-resource restriction. */
export async function createSculptedActor(el: SceneElement, character: "alex" | "sarah"): Promise<HumanActor> {
  const response = await fetch(staticFile(`studio/characters/${character}/${character}.glb`));
  if (!response.ok) throw new Error(`${character}'s model could not load. Reload Studio to retry.`);
  const manager = new T.LoadingManager();
  manager.setURLModifier(url => {
    if (!url.startsWith("data:") && !url.startsWith("blob:")) throw new Error("Bundled model resources must be embedded.");
    return url;
  });
  const gltf = await new GLTFLoader(manager).parseAsync(await response.arrayBuffer(), "");
  const actor = createHuman(el);
  // Keep only the inexpensive transform hierarchy as the directing rig.
  const discard: T.Mesh[] = [];
  actor.body!.traverse(o => { if ((o as T.Mesh).isMesh) discard.push(o as T.Mesh); });
  for (const m of discard) {
    m.geometry.dispose();
    (Array.isArray(m.material) ? m.material : [m.material]).forEach(material => material.dispose());
    m.removeFromParent();
  }
  actor.mouth = undefined; actor.lips = undefined; actor.eyes = undefined;
  const model = gltf.scene, offset = new T.Group();
  model.updateMatrixWorld(true);
  const bones = new Map<string, T.Bone>();
  model.traverse(o => {
    if ((o as T.Bone).isBone) bones.set(o.name, o as T.Bone);
    if ((o as T.Mesh).isMesh) { (o as T.Mesh).castShadow = true; (o as T.Mesh).receiveShadow = true; }
  });
  actor.morphs = [];
  model.traverse(o => {
    const mesh = o as T.Mesh;
    for (const shape of ["jawOpen", "mouthPucker"]) {
      const index = mesh.morphTargetDictionary?.[shape];
      if (index !== undefined) actor.morphs!.push({mesh, index, shape});
    }
  });
  // A recessed oral cavity sits behind the split lip seam, never painted over the face.
  const headBone = bones.get("Head")!;
  const mouthInterior = new T.Mesh(new T.SphereGeometry(1, 20, 12), new T.MeshBasicMaterial({color: "#211316"}));
  mouthInterior.position.copy(headBone.worldToLocal(new T.Vector3(0, character === "sarah" ? 1.5764 : 1.614, .060)));
  mouthInterior.scale.set(.03, .021, .012);
  headBone.add(mouthInterior);
  const rest = new Map<string, T.Quaternion>();
  bones.forEach((bone, name) => rest.set(name, bone.getWorldQuaternion(new T.Quaternion())));
  const bindings: {bone: T.Bone; source: T.Object3D; rest: T.Quaternion}[] = [];
  const bind = (name: string, source: T.Object3D | undefined, child?: string) => {
    const bone = bones.get(name); if (!bone || !source) return;
    const orientation = rest.get(name)!.clone();
    if (child) {
      const next = bones.get(child)!;
      const direction = next.getWorldPosition(new T.Vector3()).sub(bone.getWorldPosition(new T.Vector3())).normalize();
      orientation.premultiply(new T.Quaternion().setFromUnitVectors(direction, new T.Vector3(0, -1, 0)));
    }
    bindings.push({bone, source, rest: orientation});
  };
  for (const name of ["pelvis", "spine_01", "spine_02", "spine_03", "neck_01"]) bind(name, actor.body);
  bind("Head", actor.head);
  // Native directing indices are world-left then world-right; source asset uses anatomical sides.
  for (const [i, side] of [[0, "r"], [1, "l"]] as const) {
    bind(`upperarm_${side}`, actor.arms?.[i], `lowerarm_${side}`);
    bind(`lowerarm_${side}`, actor.elbows?.[i], `hand_${side}`);
    bind(`hand_${side}`, actor.wrists?.[i], `middle_01_${side}`);
    bind(`thigh_${side}`, actor.legs?.[i], `calf_${side}`);
    bind(`calf_${side}`, actor.knees?.[i], `foot_${side}`);
    bind(`foot_${side}`, actor.knees?.[i]);
  }
  const eyewear = new T.Group();
  eyewear.position.copy(headBone.worldToLocal(new T.Vector3(0, character === "sarah" ? 1.657 : 1.701, .105)));
  eyewear.quaternion.copy(headBone.getWorldQuaternion(new T.Quaternion()).invert());
  headBone.add(eyewear);
  const frames = new T.Group(), rectangular = new T.Group();
  eyewear.add(frames, rectangular);
  const frameMaterial = new T.MeshStandardMaterial({color:"#252c37", roughness:.4, metalness:.25});
  const tube = (parent: T.Group, points: T.Vector3[]) => {
    parent.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.002,6,false),frameMaterial));
  };
  for (const x of [-.034,.034]) {
    const round = new T.Mesh(new T.TorusGeometry(.023,.002,8,40),frameMaterial);
    round.position.x=x;round.scale.y=.76;frames.add(round);
    tube(rectangular, [[-.023,-.015],[.023,-.015],[.023,.015],[-.023,.015],[-.023,-.015]].map(([dx,y])=>new T.Vector3(x+dx,y,0)));
  }
  tube(eyewear,[new T.Vector3(-.012,0,0),new T.Vector3(0,.003,.002),new T.Vector3(.012,0,0)]);
  for (const side of [-1,1]) tube(eyewear,[new T.Vector3(side*.057,0,0),new T.Vector3(side*.071,0,-.035),new T.Vector3(side*.072,-.01,-.10)]);
  const defaults = appearanceDefaults(character);
  actor.setAppearance = (settings) => {
    const a={...defaults,...settings};
    headBone.scale.set(a.headSize*a.faceWidth,a.headSize,a.headSize);
    model.scale.set(1.045*a.bodyWidth,1.045*a.height,1.045);
    eyewear.visible=a.glasses!=="none"; frames.visible=a.glasses==="round";rectangular.visible=a.glasses==="rectangular";
    frameMaterial.color.set(a.glassesColor);
    model.traverse(o=>{
      const mesh=o as T.Mesh;
      if (!mesh.isMesh) return;
      for (const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]) {
        const m=mat as T.MeshStandardMaterial;
        if (!m.color) continue;
        if (m.name.endsWith("_Shirt")) m.color.set(a.topColor);
        else if (m.name.endsWith("_Trousers")) m.color.set(a.trousersColor);
        else if (m.name.endsWith("_Shoes")) m.color.set(a.shoesColor);
        else if (m.name.startsWith("MI_Hair")) m.color.set(a.hairColor);
        else if (m.name.startsWith("MI_Superhero")) m.color.set(a.skinTint);
      }
    });
  };
  actor.setAppearance(el.actor3d?.appearance);
  offset.add(model); actor.root.add(offset);
  const worldQ = new T.Quaternion(), parentQ = new T.Quaternion();
  actor.updateRig = () => {
    offset.position.y = actor.body!.position.y;
    actor.root.updateMatrixWorld(true);
    for (const {bone, source, rest: orientation} of bindings) {
      source.getWorldQuaternion(worldQ).multiply(orientation);
      bone.parent!.getWorldQuaternion(parentQ).invert();
      bone.quaternion.copy(parentQ.multiply(worldQ));
      bone.updateWorldMatrix(false, true);
    }
  };
  return actor;
}
