const {test}=require('node:test');const assert=require('node:assert/strict');
const {editBoard}=require('../src/board-edit.cjs');const {assertUniqueRoleHolders}=require('../src/role-uniqueness.cjs');const fixture=require('./fixtures/milestone-3.cjs');
test('one person cannot fill Timer and Listener in the same correction batch',()=>{
 const original=structuredClone(fixture);
 assert.throws(()=>editBoard(fixture,'Timer: Zara Example; Listner: Zara Example'),/only one role/);
 assert.deepEqual(fixture,original);
});
test('a person already holding another role is rejected with that role named',()=>{
 assert.throws(()=>editBoard(fixture,'Timer: Noel Example'),/TMOD.*Timer/);
 assert.throws(()=>editBoard(fixture,'Listener: mira example'),/Timer.*Listener/);
});
test('a holder can move roles when their previous role is reopened in the same batch',()=>{
 const edited=editBoard(fixture,'Listener: Mira Example; Timer: Open');
 assert.equal(edited.board.find(r=>r.role==='Timer').member,null);
 assert.equal(edited.board.find(r=>r.role==='Listener').member,'Mira Example');
 assert.doesNotThrow(()=>assertUniqueRoleHolders(edited.board));
});
test('conflicting corrections are quoted, while unrelated valid corrections are retained',()=>{
 let error;try{editBoard(fixture,'Timer: Noel Example; Listener: Finn Example; Meeting time: 15:45');}catch(e){error=e;}
 assert.equal(error.invalidCorrections[0].line,'Timer: Noel Example');
 assert.match(error.invalidCorrections[0].reason,/TMOD/);
 assert.deepEqual(error.validCorrections,['Listener: Finn Example','Meeting time: 15:45']);
});
