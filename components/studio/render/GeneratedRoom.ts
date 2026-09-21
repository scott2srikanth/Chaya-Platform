import * as T from "three";
import type { Room3D } from "../../../lib/studio/ai-schema";
export function createGeneratedRoom(world: T.Scene, room: Room3D) {
  world.background = new T.Color(room.background);
  world.add(new T.AmbientLight(room.ambient.color, room.ambient.intensity));
  for (const source of room.lights) {
    const light =
      source.type === "point"
        ? new T.PointLight(source.color, source.intensity, 60)
        : new T.DirectionalLight(source.color, source.intensity);
    light.position.set(...source.position);
    world.add(light);
  }
  for (const source of room.objects) {
    const geometry =
      source.shape === "box"
        ? new T.BoxGeometry(1, 1, 1)
        : source.shape === "sphere"
          ? new T.SphereGeometry(0.5, 24, 16)
          : source.shape === "cylinder"
            ? new T.CylinderGeometry(0.5, 0.5, 1, 24)
            : new T.ConeGeometry(0.5, 1, 24);
    const material = new T.MeshStandardMaterial({
      color: source.color,
      roughness: source.roughness,
      metalness: source.metalness,
    });
    const mesh = new T.Mesh(geometry, material);
    mesh.name = source.name;
    mesh.position.set(...source.position);
    mesh.scale.set(...source.size);
    mesh.rotation.set(
      ...(source.rotation.map((v) => (v * Math.PI) / 180) as [
        number,
        number,
        number,
      ]),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    world.add(mesh);
  }
}
