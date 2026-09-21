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
import {newLiveSession,getLiveSession,joinLiveSession,commandLiveSession,sessionTime} from '../../lib/studio/live-session';
import {POST} from '../../app/api/studio/live/route';
import {NextRequest as BaseRequest} from 'next/server';
import {parseProject} from '../../lib/studio/project';
test('paired controllers broadcast ordered actions and retries do not duplicate them',()=>{
 const room=newLiveSession();assert.equal(joinLiveSession(room.code.toLowerCase()).token,room.token);
 let updates=0;getLiveSession(room.state.id).listeners.add(()=>updates++);
 const command={action:'command',command:'write Hello',requestId:'first'};
 const first=commandLiveSession(room.state.id,room.token,command);
 assert.equal(first.events.length,1);assert.equal(first.playing,true);
 commandLiveSession(room.state.id,room.token,command);assert.equal(updates,1);
 const next=commandLiveSession(room.state.id,room.token,{action:'command',command:'draw house',requestId:'second'});
 assert.ok(next.events[1].start>=next.events[0].start+next.events[0].duration);
 const erase=commandLiveSession(room.state.id,room.token,{action:'command',command:'remove house',requestId:'third'});
 assert.deepEqual(erase.events[2].eraseTargets,[1]);assert.equal(updates,3);
 assert.throws(()=>commandLiveSession(room.state.id,'invalid',{action:'pause',requestId:'bad'}),/access denied/);
 assert.equal(getLiveSession(room.state.id).state.revision,3);
});
test('shared playback clock clamps at completion and pause/replay remain synchronized',()=>{
 const room=newLiveSession();const s=commandLiveSession(room.state.id,room.token,{action:'command',command:'draw tree',requestId:'1'});
 assert.equal(sessionTime(s,s.anchorMs+100000),s.end);
 const paused=commandLiveSession(s.id,room.token,{action:'pause',requestId:'2'});
 assert.equal(paused.playing,false);assert.equal(sessionTime(paused,Date.now()+10000),paused.anchorTime);
 const replay=commandLiveSession(s.id,room.token,{action:'replay',requestId:'3'});assert.equal(replay.anchorTime,0);assert.equal(replay.playing,true);
});
test('remote recording can be opened as a Studio project, and cross-origin commands are rejected',async()=>{
 const room=newLiveSession();commandLiveSession(room.state.id,room.token,{action:'command',command:'draw first layer',requestId:'1'});
 const response=await POST(new NextRequest('http://localhost:3000/api/studio/live',{method:'POST',headers:{origin:'http://localhost:3000','x-presenter-token':room.token},body:JSON.stringify({action:'recording',id:room.state.id,requestId:'download'})}));
 assert.equal(response.status,200);const data=await response.json();assert.equal(parseProject(data.project).scenes[0].elements[0].whiteboard!.liveCommands!.length,1);
 const blocked=await POST(new NextRequest('http://localhost:3000/api/studio/live',{method:'POST',headers:{origin:'https://elsewhere.example'},body:'{}'}));assert.equal(blocked.status,403);
});

test('LAN browser origins are matched against the incoming host, not Next internal URL',async()=>{
 const room=newLiveSession();
 const response=await POST(new NextRequest('http://localhost:3000/api/studio/live',{method:'POST',headers:{host:'192.168.1.10:3000',origin:'http://192.168.1.10:3000'},body:JSON.stringify({action:'join',code:room.code})}));
 assert.equal(response.status,200);assert.equal((await response.json()).state.id,room.state.id);
});

test('tablet sketches queue after writing, synchronize, erase and survive recording',async()=>{
 const room=newLiveSession();const first=commandLiveSession(room.state.id,room.token,{action:'command',command:'write Hello',requestId:'text'});
 const drawing={strokes:[[{x:.2,y:.5},{x:.4,y:.7},{x:.6,y:.5}]]};
 const input={action:'drawing',drawing,requestId:'stroke'};
 const result=commandLiveSession(room.state.id,room.token,input);
 assert.equal(result.events[1].command,'draw sketch 1');assert.ok(result.events[1].start>=first.events[0].start+first.events[0].duration);
 assert.deepEqual(result.events[1].strokes,[[[.2,.5],[.4,.7],[.6,.5]]]);
 assert.equal(commandLiveSession(room.state.id,room.token,input).events.length,2);
 const removed=commandLiveSession(room.state.id,room.token,{action:'command',command:'remove',requestId:'erase'});assert.deepEqual(removed.events[2].eraseTargets,[1]);
 assert.throws(()=>commandLiveSession(room.state.id,room.token,{action:'drawing',drawing:{strokes:[[{x:2,y:0},{x:0,y:1}]]},requestId:'bad'}));
 assert.equal(getLiveSession(room.state.id).state.events.length,3);
});
