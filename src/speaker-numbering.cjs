function renumberSpeakerPairs(board) {
 const speakers=board.filter(row=>/^Speaker [1-3]$/.test(row.role)).sort((a,b)=>Number(a.role.slice(-1))-Number(b.role.slice(-1)));
 if(!speakers.some(row=>row.removed)) return board.map(row=>({...row}));
 const ordered=[...speakers.filter(row=>!row.removed),...speakers.filter(row=>row.removed)];
 const replacements=new Map();
 ordered.forEach((speaker,index)=>{
  const evaluator=board.find(row=>row.role===speaker.role.replace('Speaker','Evaluator'));
  replacements.set(`Speaker ${index+1}`,{...speaker,role:`Speaker ${index+1}`});
  if(evaluator)replacements.set(`Evaluator ${index+1}`,{...evaluator,role:`Evaluator ${index+1}`});
 });
 return board.map(row=>replacements.get(row.role)||{...row});
}
module.exports={renumberSpeakerPairs};
