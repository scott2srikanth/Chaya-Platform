import { parseProject, nativeCharacters } from "./project";
import type { Project, StudioAsset } from "./types";
import type { RiggedCharacter } from "./rig";
const DB_NAME = "motion-explainer-studio";
const DB_VERSION = 2;
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of ["projects", "library"])
        if (!db.objectStoreNames.contains(name))
          db.createObjectStore(name, { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Close other studio tabs to update local storage"));
  });
}
export interface LocalLibrary {
  id: "shared";
  characters: RiggedCharacter[];
  assets: StudioAsset[];
  templates: NonNullable<Project["templates"]>;
}
export async function loadLibrary(): Promise<LocalLibrary> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("library", "readonly"),
      req = tx.objectStore("library").get("shared");
    req.onsuccess = () =>
      resolve(
        req.result ?? {
          id: "shared",
          characters: nativeCharacters(),
          assets: [],
          templates: [],
        },
      );
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
function merge<T extends { id: string }>(a: T[], b: T[]): T[] {
  const map = new Map(a.map((x) => [x.id, x]));
  b.forEach((x) => map.set(x.id, x));
  return Array.from(map.values());
}
export async function saveProject(project: Project): Promise<void> {
  const validated = parseProject(project),
    db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["projects", "library"], "readwrite");
    tx.objectStore("projects").put({
      ...validated,
      metadata: { ...validated.metadata, updatedAt: new Date().toISOString() },
    });
    const library = tx.objectStore("library"),
      req = library.get("shared");
    req.onsuccess = () => {
      const old = req.result as LocalLibrary | undefined;
      library.put({
        id: "shared",
        characters: merge(old?.characters ?? [], validated.characters ?? []),
        assets: merge(old?.assets ?? [], validated.assets ?? []),
        templates: merge(old?.templates ?? [], validated.templates ?? []),
      });
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("Save aborted"));
    };
  });
}
export async function loadProject(id: string): Promise<Project | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readonly"),
      req = tx.objectStore("projects").get(id);
    req.onsuccess = () => {
      try {
        resolve(req.result ? parseProject(req.result) : null);
      } catch (e) {
        reject(e);
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
export async function listProjects(): Promise<Project[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readonly"),
      req = tx.objectStore("projects").getAll();
    req.onsuccess = () => {
      try {
        resolve((req.result ?? []).map(parseProject));
      } catch (e) {
        reject(e);
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
export async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite");
    tx.objectStore("projects").delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
