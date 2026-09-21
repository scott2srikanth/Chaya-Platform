import {before} from 'node:test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {registerLocalUser,createLocalSession} from '../../lib/local-auth-db';
import {STUDIO_COOKIE} from '../../lib/studio-auth';
let testCookie='';
before(async()=>{process.env.STUDIO_DB_PATH=join(mkdtempSync(join(tmpdir(),'chaya-auth-test-')),'accounts.sqlite');const user=await registerLocalUser('tester@example.test','test-password-long','test');testCookie=`${STUDIO_COOKIE}=${await createLocalSession(user.id)}`;});
class NextRequest extends BaseRequest {constructor(input:string,options?:ConstructorParameters<typeof BaseRequest>[1]){const headers=new Headers(options?.headers);headers.set('cookie',testCookie);super(input,{...options,headers});}}
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generatedBoardCommand,drawingPrompt} from '../../lib/studio/whiteboard-ai';
import {livePresenterProject} from '../../lib/studio/templates';
import {validLiveCommands} from '../../lib/studio/live-whiteboard';
import {parseProject,serializeProject} from '../../lib/studio/project';
import {whiteboardFrame} from '../../lib/studio/whiteboard';
import {GET,POST} from '../../app/api/studio/draw/route';
import {NextRequest as BaseRequest} from 'next/server';
const drawing={strokes:[[{x:.1,y:.6},{x:.3,y:.2},{x:.5,y:.6}],[{x:.15,y:.5},{x:.15,y:.9},{x:.45,y:.9},{x:.45,y:.5}]]};
test('Live presenter is a blank, serializable template',()=>{
 const p=livePresenterProject();assert.equal(p.metadata.name,'Live presenter');assert.equal(p.scenes[0].elements[0].text,'');
 assert.deepEqual(parseProject(JSON.parse(serializeProject(p))).scenes[0].elements[0].whiteboard?.liveCommands,[]);
});
test('generated drawing follows marker timing and survives project import',()=>{
 const event=generatedBoardCommand('draw a house',drawing,.2);
 assert.ok(validLiveCommands([event]));
 const p=livePresenterProject();p.scenes[0].elements[0].whiteboard={liveCommands:[event]};
 const restored=parseProject(JSON.parse(serializeProject(p)));
 assert.deepEqual(restored.scenes[0].elements[0].whiteboard?.liveCommands,[event]);
 const mid=whiteboardFrame('',1,9,{liveCommands:[event]}),end=whiteboardFrame('',40,9,{liveCommands:[event]});
 assert.ok(mid.distance>0&&mid.distance<end.distance);
 assert.match(drawingPrompt('draw a tree',[event]),/Existing ink:/);
});
test('AI drawings reject code, out-of-range points, empty and invisible drawings',()=>{
 for(const data of [{svg:'<script/>'},{strokes:[]},{strokes:[[{x:0,y:0},{x:2,y:1}]]},{strokes:[[{x:0,y:0},{x:0,y:0}]]}])assert.throws(()=>generatedBoardCommand('draw',data,0));
});
test('drawing endpoint handles missing credentials, external access and validated provider output',async()=>{
 const key=process.env.OPENAI_API_KEY, original=globalThis.fetch;
 try {
  delete process.env.OPENAI_API_KEY;
  assert.equal((await (await GET(new NextRequest('http://localhost:3000/api/studio/draw'))).json()).configured,false);
  const request=()=>new NextRequest('http://localhost:3000/api/studio/draw',{method:'POST',headers:{origin:'http://localhost:3000'},body:JSON.stringify({command:'draw a house',strokes:[]})});
  assert.equal((await POST(request())).status,503);
  process.env.OPENAI_API_KEY='test-placeholder';
  assert.equal((await POST(new NextRequest('https://example.com/api/studio/draw',{method:'POST'}))).status,403);
  globalThis.fetch=async (_url,options)=>{const body=JSON.parse(String(options?.body));assert.equal(body.text.format.type,'json_schema');return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(drawing)}]}]}));};
  const result=await POST(request());assert.equal(result.status,200);assert.deepEqual(await result.json(),drawing);
  globalThis.fetch=async()=>new Response(JSON.stringify({status:'completed',output:[{content:[{type:'refusal'}]}]}));
  assert.equal((await POST(request())).status,422);
 }finally{globalThis.fetch=original;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
