import {test} from "node:test";
import assert from "node:assert/strict";
import {useStudioStore} from "../../lib/studio/store";
import {conversationProject} from "../../lib/studio/templates";
import {dialogueSignature, dialogueTracks} from "../../lib/studio/dialogue";
import {missingVoiceLines} from "../../lib/studio/prepare-voices";

const performance = {source:"rhubarb",duration:1,mouthCues:[{start:0,end:1,value:"C"}],energy:[.5],sampleRate:1,beats:[.2]};
function result(body: any) {
 const scene=body.project.scenes.find((s:any)=>s.id===body.sceneId);
 return {lines:scene.script.map((l:any)=>({lineId:l.id, signature:dialogueSignature(l,scene.elements.find((e:any)=>e.id===l.characterElementId)),duration:1,dataUrl:"data:audio/wav;base64,test",performance}))};
}
test("Play records assigned voices, caches them, and refreshes only an edited line", async () => {
 const old=global.fetch, requests:any[]=[];
 global.fetch=async (_url,init)=>{const body=JSON.parse(String(init?.body));requests.push(body);return Response.json(result(body));};
 try {
  const p=conversationProject();useStudioStore.getState().replaceProject(p);
  const pending=useStudioStore.getState().previewScript();
  assert.equal(useStudioStore.getState().isPlaying,false);
  assert.ok(useStudioStore.getState().voicePreparation);
  await pending;
  let s=useStudioStore.getState();assert.equal(s.isPlaying,true);
  assert.equal(dialogueTracks(s.project!).length,p.scenes[0].script.length);
  assert.equal(missingVoiceLines(s.project!,p.scenes[0].id).length,0);
  assert.equal(requests[0].project.scenes[0].elements.find((e:any)=>e.characterId==='sarah').voice.name,'Samantha');
  s.stopPreview();await s.previewScript();assert.equal(requests.length,1);
  s.stopPreview();s.editProject(p=>p.scenes[0].script[1].text='This is a changed line.');
  await s.previewScript();assert.equal(requests.length,2);assert.equal(requests[1].project.scenes[0].script.length,1);
 } finally {global.fetch=old;useStudioStore.getState().stopPreview();}
});
test("a failed voice service holds playback and reports an actionable error",async()=>{
 const old=global.fetch;global.fetch=async()=>{throw new Error('offline');};
 try {useStudioStore.getState().replaceProject(conversationProject());await useStudioStore.getState().previewScript();assert.equal(useStudioStore.getState().isPlaying,false);assert.match(useStudioStore.getState().voiceError,/voice service/);assert.equal(useStudioStore.getState().playbackTime,0);} finally{global.fetch=old;useStudioStore.getState().stopPreview();}
});
test("Reset during recording cannot restart playback or attach late recordings",async()=>{
 const old=global.fetch;let finish!:(r:Response)=>void;
 global.fetch=async(_u,init)=>await new Promise<Response>(resolve=>{finish=()=>resolve(Response.json(result(JSON.parse(String(init?.body)))));});
 try {useStudioStore.getState().replaceProject(conversationProject());const pending=useStudioStore.getState().previewScript();useStudioStore.getState().stopPreview();finish(new Response());await pending;assert.equal(useStudioStore.getState().isPlaying,false);assert.equal(dialogueTracks(useStudioStore.getState().project!).length,0);}finally{global.fetch=old;useStudioStore.getState().stopPreview();}
});
