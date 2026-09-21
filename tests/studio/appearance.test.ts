import {test} from "node:test";
import assert from "node:assert/strict";
import {conversationProject} from "../../lib/studio/templates";
import {parseProject,serializeProject} from "../../lib/studio/project";
import {appearanceDefaults} from "../../lib/studio/appearance";
test("3D appearance survives project save and load without changing character voice",()=>{
 const p=conversationProject(),el=p.scenes[0].elements[0],voice=structuredClone(el.voice);
 el.actor3d!.appearance={...appearanceDefaults("alex"),glasses:"round",headSize:1.06,bodyWidth:1.1,topColor:"#284d73"};
 const restored=parseProject(JSON.parse(serializeProject(p))).scenes[0].elements[0];
 assert.deepEqual(restored.actor3d!.appearance,el.actor3d!.appearance);assert.deepEqual(restored.voice,voice);
});
test("invalid appearance data cannot reach the renderer",()=>{
 for(const appearance of [{height:NaN},{faceWidth:0},{glasses:"bad"},{topColor:"invalid"}]){
  const p=conversationProject();p.scenes[0].elements[0].actor3d!.appearance=appearance as any;assert.throws(()=>parseProject(p));
 }
});
