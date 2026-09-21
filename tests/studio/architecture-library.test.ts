import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ARCHITECTURE_LAYERS,architectureLayerStrokes} from '../../lib/studio/architecture-library';
import {createBoardCommand,validLiveCommands} from '../../lib/studio/live-whiteboard';
import {livePresenterProject} from '../../lib/studio/templates';
import {parseProject,serializeProject} from '../../lib/studio/project';
test('six named layers have fixed vertical positions and bounded labeled strokes',()=>{
 const commands=ARCHITECTURE_LAYERS.map((l,i)=>createBoardCommand(`draw ${l.name}`,[],i*12));
 assert.ok(validLiveCommands(commands));
 for(let i=1;i<6;i++)assert.ok(commands[i].strokes[0][0][1]>commands[i-1].strokes[0][2][1]);
 assert.deepEqual(createBoardCommand('draw layer 3',[],0).strokes,architectureLayerStrokes(2));
 assert.equal(createBoardCommand('draw the 1st layer',[],0).command,'draw first layer');
 const p=livePresenterProject();p.scenes[0].elements[0].whiteboard={liveCommands:commands};
 assert.deepEqual(parseProject(JSON.parse(serializeProject(p))).scenes[0].elements[0].whiteboard!.liveCommands,commands);
});
test('architecture layers reject duplicates, support named erasure and full diagram',()=>{
 const first=createBoardCommand('draw first layer',[],0);
 assert.throws(()=>createBoardCommand('draw first layer',[first],12));
 const second=createBoardCommand('draw second layer',[first],12);
 const erased=createBoardCommand('remove layer 1',[first,second],24);assert.deepEqual(erased.eraseTargets,[0]);
 assert.equal(createBoardCommand('draw first layer',[first,second,erased],28).command,'draw first layer');
 const full=createBoardCommand('draw vertical architecture diagram',[],0);assert.ok(validLiveCommands([full]));
 assert.equal(full.strokes.length,ARCHITECTURE_LAYERS.flatMap((_,i)=>architectureLayerStrokes(i)).length);
});
