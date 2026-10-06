const {test}=require('node:test');const assert=require('node:assert/strict');
const {editBoard}=require('../src/board-edit.cjs');const {renderBoardImage}=require('../src/board-image.cjs');const {renderTable}=require('../src/role-board.cjs');const fixture=require('./fixtures/milestone-3.cjs');
function filled(){const input=structuredClone(fixture);input.board.find(r=>r.role==='Speaker 3').member='Zara Example';input.board.find(r=>r.role==='Evaluator 3').member='Finn Example';return input;}
test('removing the middle speaker renumbers the last speaker and their evaluator together',()=>{
 const edited=editBoard(filled(),'Speaker 2: Remove');
 assert.equal(edited.board.find(r=>r.role==='Speaker 2').member,'Zara Example');assert.equal(edited.board.find(r=>r.role==='Evaluator 2').member,'Finn Example');
 assert.equal(edited.board.find(r=>r.role==='Speaker 3').removed,true);
 const image=renderBoardImage(edited);assert.equal(image.cells.find(c=>c.role==='Speaker 2').holder,'Zara Example');assert.equal(image.cells.find(c=>c.role==='Evaluator 2').holder,'Finn Example');
 assert.ok(!image.cells.some(c=>c.role==='Speaker 3'));assert.doesNotMatch(renderTable(edited.board),/Speaker 3|Evaluator 3/);
});
test('subsequent corrections use the numbers shown in the preview',()=>{
 let edited=editBoard(filled(),'Speaker 2: Remove');edited=editBoard(edited,'Speaker 2: Robin Example; Evaluator 2: Casey Example');
 assert.equal(edited.board.find(r=>r.role==='Speaker 2').member,'Robin Example');assert.equal(edited.board.find(r=>r.role==='Evaluator 2').member,'Casey Example');
 edited=editBoard(edited,'Speaker 3: Drew Example');assert.equal(edited.board.find(r=>r.role==='Speaker 3').removed,false);assert.equal(edited.board.find(r=>r.role==='Evaluator 3').member,null);
});
test('multiple removals in one batch refer to the original preview numbers',()=>{
 const edited=editBoard(filled(),'Speaker 1: Remove; Speaker 2: Remove');assert.equal(edited.board.find(r=>r.role==='Speaker 1').member,'Zara Example');assert.equal(edited.board.find(r=>r.role==='Evaluator 1').member,'Finn Example');assert.equal(renderBoardImage(edited).cells.filter(c=>/^Speaker /.test(c.role)).length,1);
});
