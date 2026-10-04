/* ------------------------------------------------------------------ *
 *  Runtime que SOLO vive dentro del iframe del editor.
 *  Pinta overlays de selección, habilita edición en línea y
 *  conversa con el editor React por postMessage.
 * ------------------------------------------------------------------ */

export const EDITOR_RUNTIME = `(function(){
'use strict';
var style=document.createElement('style');
style.textContent=[
 '[data-lf-b]{position:relative}',
 '[data-lf-b].lf-hover{outline:2px dashed color-mix(in srgb,var(--accent) 70%,transparent);outline-offset:-2px}',
 '[data-lf-b].lf-sel{outline:2px solid var(--accent);outline-offset:-2px}',
 '[data-lf-b].lf-sel::after{content:attr(data-lf-type);position:absolute;top:0;left:0;z-index:999;background:var(--accent);color:var(--accent-fg);font:600 11px/1 ui-sans-serif,system-ui;padding:5px 9px;border-radius:0 0 7px 0;letter-spacing:.04em;pointer-events:none}',
 '[data-lf-f]{outline-offset:2px;border-radius:3px;transition:background .15s}',
 '[data-lf-f]:hover{background:color-mix(in srgb,var(--accent) 16%,transparent);cursor:text}',
 '[data-lf-f][contenteditable=true]{outline:2px solid var(--accent);background:color-mix(in srgb,var(--accent) 9%,transparent)}',
 '.lf-eh{position:fixed;z-index:99999;display:flex;gap:4px;background:#111117;border:1px solid #2a2a36;border-radius:9px;padding:4px;box-shadow:0 10px 30px rgba(0,0,0,.5)}',
 '.lf-eh button{all:unset;cursor:pointer;color:#d6d6e0;font:600 11.5px/1 ui-sans-serif,system-ui;padding:6px 9px;border-radius:6px}',
 '.lf-eh button:hover{background:#23232e;color:#fff}'
].join('');
document.head.appendChild(style);

var selected=null, editing=null;
function post(m){try{parent.postMessage(Object.assign({__lf:true},m),'*')}catch(e){}}

function blockOf(el){return el&&el.closest?el.closest('[data-lf-b]'):null}
function fieldOf(el){return el&&el.closest?el.closest('[data-lf-f]'):null}

document.addEventListener('mouseover',function(e){
  var b=blockOf(e.target); if(!b) return;
  document.querySelectorAll('.lf-hover').forEach(function(x){x.classList.remove('lf-hover')});
  if(b!==selected)b.classList.add('lf-hover');
});
document.addEventListener('mouseout',function(e){
  var b=blockOf(e.target); if(b)b.classList.remove('lf-hover');
});

document.addEventListener('click',function(e){
  var fl=fieldOf(e.target);
  var b=blockOf(e.target);
  if(b){select(b.getAttribute('data-lf-b'))}
  if(fl&&b){
    e.preventDefault();
    startEdit(fl,b.getAttribute('data-lf-b'));
    return;
  }
  var a=e.target.closest&&e.target.closest('a[href^="#"]');
  if(a){e.preventDefault()}
},true);

function select(id){
  document.querySelectorAll('.lf-sel').forEach(function(x){x.classList.remove('lf-sel')});
  var el=document.querySelector('[data-lf-b="'+id+'"]');
  if(el){el.classList.add('lf-sel');el.classList.remove('lf-hover');selected=el}
  post({type:'select',blockId:id});
}

function startEdit(el,blockId){
  if(editing&&editing!==el)stopEdit();
  editing=el;
  el.setAttribute('contenteditable','true');
  el.focus();
  try{
    var r=document.createRange();r.selectNodeContents(el);
    var s=window.getSelection();s.removeAllRanges();s.addRange(r);
  }catch(e){}
  el.addEventListener('blur',onBlur);
  el.addEventListener('keydown',onKey);
  el.__blockId=blockId;
}
function onKey(e){
  if(e.key==='Escape'){e.preventDefault();stopEdit()}
  if(e.key==='Enter'&&!e.shiftKey&&e.target.tagName!=='DIV'){e.preventDefault();stopEdit()}
}
function onBlur(){stopEdit()}
function stopEdit(){
  if(!editing)return;
  var el=editing;editing=null;
  el.removeAttribute('contenteditable');
  el.removeEventListener('blur',onBlur);
  el.removeEventListener('keydown',onKey);
  var html=el.innerHTML.replace(/<br\\s*\\/?>/gi,'\\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim();
  post({type:'patch',blockId:el.__blockId,path:el.getAttribute('data-lf-f'),value:html});
}

/* scroll reportado para conservar la posición al re-render */
var st=0;
window.addEventListener('scroll',function(){
  st=window.scrollY;
  clearTimeout(window.__lfT);
  window.__lfT=setTimeout(function(){post({type:'scroll',y:st})},140);
},{passive:true});

window.addEventListener('message',function(e){
  var d=e.data||{};
  if(!d.__lfCmd)return;
  if(d.cmd==='select')select(d.blockId);
  if(d.cmd==='scrollTo')window.scrollTo(0,d.y||0);
  if(d.cmd==='scrollToBlock'){
    var el=document.querySelector('[data-lf-b="'+d.blockId+'"]');
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  }
});

post({type:'ready',height:document.body.scrollHeight});
})();`;
