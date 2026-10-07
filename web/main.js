const captions={prepare:'Your preview is ready. Check the roles before approving.',review:'“Nothing to correct.” You approve this preview in your private chat.',post:'After the group connection is checked, the board you approved is posted.'};
for(const button of document.querySelectorAll('[data-step]')){
 button.addEventListener('click',()=>{
  for(const other of document.querySelectorAll('[data-step]'))other.setAttribute('aria-pressed',String(other===button));
  document.getElementById('demo-caption').textContent=captions[button.dataset.step];
 });
}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const word=document.getElementById('rotating-word'),words=['speakers.','mentoring.','your club.'];
let index=0,timer;
function setRotation(){clearInterval(timer);if(!reducedMotion.matches)timer=setInterval(()=>{index=(index+1)%words.length;word.textContent=words[index];},4500);}
setRotation();reducedMotion.addEventListener('change',setRotation);
