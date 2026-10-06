const {test}=require('node:test');const assert=require('node:assert/strict');
const {editBoard}=require('../src/board-edit.cjs');const {renderBoardImage}=require('../src/board-image.cjs');const {renderTable,updateBoard}=require('../src/role-board.cjs');const fixture=require('./fixtures/milestone-3.cjs');
test('removing Speaker 2 hides the entire speaker/evaluator row rather than showing Open',()=>{
 const edited=editBoard(fixture,'Speaker 2: Remove',{testOnly:true});
 assert.equal(edited.board.find(r=>r.role==='Speaker 3').removed,true);
 assert.equal(edited.board.find(r=>r.role==='Evaluator 3').removed,true);
 assert.equal(edited.board.find(r=>r.role==='Speaker 3').member,null);
 assert.doesNotMatch(renderTable(edited.board),/Speaker 3|Evaluator 3/);
 const roles=renderBoardImage(edited).cells.map(c=>c.role);assert.ok(!roles.includes('Speaker 3'));assert.ok(!roles.includes('Evaluator 3'));assert.ok(roles.includes('Speaker 2'));
});
test('only a Secretary correction restores a removed slot and its evaluator',()=>{
 let edited=editBoard(fixture,'Speaker 2: Remove');
 const message={id:'fictional-claim',sender:'Zara Example',text:'I will take Speaker 3'};
 const result=updateBoard(edited.board,[message],[{messageId:message.id,intent:'take',role:'Speaker 3'}]);
 assert.equal(result.board.find(r=>r.role==='Speaker 3').removed,true);assert.equal(result.notes[0].kind,'clarify');
 edited=editBoard(edited,'Speaker 3: Zara Example',{testOnly:true});
 assert.equal(edited.board.find(r=>r.role==='Speaker 3').removed,false);assert.equal(edited.board.find(r=>r.role==='Speaker 3').member,'Zara Example');
 assert.equal(edited.board.find(r=>r.role==='Evaluator 3').removed,false);
 assert.ok(renderBoardImage(edited).cells.some(c=>c.role==='Speaker 3'));
});
test('Open is different from Remove, and unrelated roles cannot be removed',()=>{
 const open=editBoard(fixture,'Speaker 2: Open');assert.match(renderTable(open.board),/Speaker 2\s+\| Open/);
 assert.throws(()=>editBoard(fixture,'Timer: Remove'),/speaker/);
});
test('removal survives saving and the evaluator stays hidden until its speaker returns',()=>{
 const edited=JSON.parse(JSON.stringify(editBoard(fixture,'Speaker 2: Remove')));
 assert.equal(edited.board.find(r=>r.role==='Evaluator 3').removed,true);
 const roles=renderBoardImage(edited).cells.map(c=>c.role);assert.ok(!roles.includes('Speaker 3'));assert.ok(!roles.includes('Evaluator 3'));
 assert.throws(()=>editBoard(edited,'Evaluator 3: Zara Example'),/until.*Speaker 3/);
});
test('removing all speakers hides the prepared-speakers section without breaking the square board',()=>{
 const edited=editBoard(fixture,'Speaker 1: Remove; Speaker 2: Remove; Speaker 3: Remove');
 const image=renderBoardImage(edited);assert.equal(image.width,image.height);
 assert.ok(!image.cells.some(c=>/^(Speaker|Evaluator) /.test(c.role)));
 assert.equal(image.cells.length,9);
});
