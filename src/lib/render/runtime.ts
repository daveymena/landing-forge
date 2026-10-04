import type { PageSpec } from "../schema";

/* ------------------------------------------------------------------ *
 *  Runtime de la landing publicada: galería, contador, bundles,
 *  cantidad, reveal, envío del formulario COD y píxeles.
 *  Se inyecta tal cual en el HTML exportado (sin dependencias).
 * ------------------------------------------------------------------ */

export function runtimeScript(spec: PageSpec): string {
  const endpoint = (spec.settings.endpoint || "").replace(/\/+$/, "");
  const provider = spec.settings.integration.provider;
  return `(function(){
'use strict';
var EP=${JSON.stringify(endpoint)};
var SITE=${JSON.stringify(spec.id)};
var PROVIDER=${JSON.stringify(provider)};
var CUR=${JSON.stringify(spec.product.currency || "COP")};
var LOC=${JSON.stringify(spec.locale === "es" ? "es-CO" : spec.locale)};
var NODEC=['COP','CLP','PYG','GTQ','ARS'].indexOf(CUR)>=0;
function fmt(v){try{return new Intl.NumberFormat(LOC,{style:'currency',currency:CUR,minimumFractionDigits:NODEC?0:(v%1?2:0),maximumFractionDigits:NODEC?0:2}).format(v)}catch(e){return '$'+Math.round(v).toLocaleString('es-CO')}}
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}

/* ---------- reveal al hacer scroll ---------- */
try{
  document.documentElement.classList.add('lf-anim');
  setTimeout(function(){$$('.reveal').forEach(function(el){el.classList.add('is-in')})},2600);
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.05});
  $$('.reveal').forEach(function(el,i){el.style.transitionDelay=(Math.min(i,6)*45)+'ms';io.observe(el)});
}catch(e){$$('.reveal').forEach(function(el){el.classList.add('is-in')})}

/* ---------- barra de anuncio ---------- */
$$('[data-lf-dismiss]').forEach(function(b){b.addEventListener('click',function(){b.parentNode.remove()})});

/* ---------- barra fija móvil ---------- */
(function(){
  var sb=$('[data-lf-sticky]'); if(!sb) return;
  function sync(){
    var mobileOnly=sb.getAttribute('data-only-mobile')==='1';
    var show=!mobileOnly||window.innerWidth<=860;
    sb.style.display=show?'flex':'none';
    document.body.classList.toggle('has-sticky',show);
  }
  sync(); window.addEventListener('resize',sync);
})();

/* ---------- galería de producto ---------- */
$$('[data-lf-gallery]').forEach(function(g){
  var main=$('.gal__main img',g)||null;
  $$('.gal__thumbs button',g).forEach(function(b){
    b.addEventListener('click',function(){
      $$('.gal__thumbs button',g).forEach(function(x){x.setAttribute('aria-selected','false')});
      b.setAttribute('aria-selected','true');
      var src=b.getAttribute('data-src');
      if(main){main.src=src}else{var holder=$('.gal__main',g);holder.innerHTML='<img src="'+src+'" alt="">';main=$('img',holder)}
    });
  });
});

/* ---------- contador ---------- */
$$('[data-lf-countdown]').forEach(function(c){
  var mins=parseInt(c.getAttribute('data-minutes')||'15',10);
  var key='lf_cd_'+SITE+'_'+mins;
  var end=parseInt(sessionStorage.getItem(key)||'0',10);
  if(!end||end<Date.now()){end=Date.now()+mins*60000;try{sessionStorage.setItem(key,String(end))}catch(e){}}
  function tick(){
    var d=Math.max(0,end-Date.now());var t=Math.floor(d/1000);
    var h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60;
    var hh=$('[data-h]',c),mm=$('[data-m]',c),ss=$('[data-s]',c);
    if(hh)hh.textContent=('0'+h).slice(-2);
    if(mm)mm.textContent=('0'+m).slice(-2);
    if(ss)ss.textContent=('0'+s).slice(-2);
  }
  tick();setInterval(tick,1000);
});

/* ---------- toggle de facturación ---------- */
$$('[data-lf-billing]').forEach(function(t){
  t.addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b) return;
    $$('button',t).forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});
    var annual=b.getAttribute('data-b')==='a';
    $$('.plan__p b').forEach(function(p){
      p.textContent=annual?(p.getAttribute('data-price-a')||p.textContent):(p.getAttribute('data-price-m')||p.textContent);
    });
  });
});

/* ---------- selección de bundle ---------- */
var SELECTED={qty:1,price:0,label:''};
(function(){
  var bs=$$('[data-lf-bundle]'); if(!bs.length) return;
  function pick(b){
    bs.forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});
    SELECTED={qty:parseInt(b.getAttribute('data-qty')||'1',10),price:parseFloat(b.getAttribute('data-price')||'0'),label:b.getAttribute('data-label')||''};
    syncSummary();
  }
  bs.forEach(function(b){b.addEventListener('click',function(){pick(b)})});
  var pre=bs.filter(function(b){return b.getAttribute('aria-pressed')==='true'})[0]||bs[0];
  if(pre)pick(pre);
})();

/* ---------- cantidad + resumen ---------- */
function syncSummary(){
  var form=$('[data-lf-form]'); if(!form) return;
  var unit=parseFloat(form.getAttribute('data-unit-price')||'0');
  var ship=parseFloat(form.getAttribute('data-shipping')||'0');
  var qi=$('[data-lf-qtyinput]',form);
  var qty=SELECTED.price?SELECTED.qty:Math.max(1,parseInt((qi&&qi.value)||'1',10));
  if(qi&&SELECTED.price)qi.value=String(qty);
  var sub=SELECTED.price?SELECTED.price:unit*qty;
  var sq=$('[data-lf-sumqty]'),ss=$('[data-lf-sumsub]'),st=$('[data-lf-sumtotal]');
  if(sq)sq.textContent='× '+qty;
  if(ss)ss.textContent=fmt(sub);
  if(st)st.textContent=fmt(sub+ship);
  var sv=$('.sticky-bar__v');
  if(sv&&sub)sv.firstChild&&(sv.childNodes[0].nodeValue=fmt(sub+ship));
}
$$('[data-lf-qty]').forEach(function(b){
  b.addEventListener('click',function(){
    var form=b.closest('form');var i=$('[data-lf-qtyinput]',form);
    var v=Math.max(1,(parseInt(i.value||'1',10))+parseInt(b.getAttribute('data-lf-qty'),10));
    i.value=String(v);SELECTED.price=0;syncSummary();track('AddToCart',{});
  });
});
syncSummary();

/* ---------- departamentos / ciudades ---------- */
(function(){
  var sel=$('[data-lf-state]'),city=$('[data-lf-city]'); if(!sel||!city) return;
  function toText(s,ph){
    var i=document.createElement('input');i.className='input';i.name=s.name;i.required=s.required;i.placeholder=ph;
    s.parentNode.replaceChild(i,s);
  }
  var url=(EP||'')+'/api/public/locations?site='+encodeURIComponent(SITE);
  fetch(url).then(function(r){return r.ok?r.json():Promise.reject()}).then(function(d){
    var states=(d&&d.states)||[];
    if(!states.length) throw new Error('empty');
    sel.innerHTML='<option value="">Selecciona…</option>'+states.map(function(s){return '<option value="'+s.name+'" data-id="'+(s.id||'')+'">'+s.name+'</option>'}).join('');
    sel.addEventListener('change',function(){
      var o=sel.options[sel.selectedIndex];var id=o&&o.getAttribute('data-id');
      city.innerHTML='<option value="">Cargando…</option>';city.disabled=true;
      fetch((EP||'')+'/api/public/locations?site='+encodeURIComponent(SITE)+'&state='+encodeURIComponent(id||sel.value))
        .then(function(r){return r.json()}).then(function(d2){
          var cs=(d2&&d2.cities)||[];
          city.innerHTML='<option value="">Selecciona…</option>'+cs.map(function(c){return '<option value="'+c.name+'">'+c.name+'</option>'}).join('');
          city.disabled=false;
        }).catch(function(){city.innerHTML='';city.disabled=false;toText(city,'Escribe tu ciudad')});
    });
  }).catch(function(){
    toText(sel,'Escribe tu departamento');toText(city,'Escribe tu ciudad');
  });
})();

/* ---------- píxeles ---------- */
function track(ev,data){
  try{ if(window.fbq) fbq('track',ev,data||{}); }catch(e){}
  try{ if(window.ttq) ttq.track(ev==='Purchase'?'CompletePayment':(ev==='AddToCart'?'AddToCart':ev),data||{}); }catch(e){}
  try{ if(window.gtag) gtag('event',ev.toLowerCase(),data||{}); }catch(e){}
}
track('ViewContent',{content_name:document.title});
$$('[data-lf-cta]').forEach(function(a){a.addEventListener('click',function(){track('InitiateCheckout',{})})});

/* ---------- envío de formularios ---------- */
$$('[data-lf-form]').forEach(function(form){
  form.addEventListener('submit',function(ev){
    ev.preventDefault();
    var msg=$('[data-lf-msg]',form);
    var btn=$('button[type=submit]',form);
    var fd=new FormData(form);
    if(fd.get('website')){return} // honeypot
    var payload={};fd.forEach(function(v,k){payload[k]=v});
    payload.siteId=SITE;payload.slug=form.getAttribute('data-slug')||'';
    payload.kind=form.getAttribute('data-kind')||'cod';
    payload.currency=CUR;
    payload.pageUrl=location.href;
    payload.utm=location.search;
    if(SELECTED.price){payload.quantity=SELECTED.qty;payload.bundle=SELECTED.label;payload.total=SELECTED.price}
    else{
      var unit=parseFloat(form.getAttribute('data-unit-price')||'0');
      payload.quantity=Math.max(1,parseInt(payload.quantity||'1',10));
      payload.total=unit*payload.quantity;
    }
    payload.shipping=parseFloat(form.getAttribute('data-shipping')||'0');
    payload.total=(payload.total||0)+payload.shipping;

    if(btn){btn.disabled=true;btn.dataset.t=btn.innerHTML;btn.innerHTML='Enviando…'}
    if(msg){msg.className='formmsg'}

    var url=((form.getAttribute('data-endpoint')||EP||'')+'/api/public/orders');
    fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})})
      .then(function(res){
        if(!res.ok||res.j.error) throw new Error(res.j.error||'No se pudo registrar el pedido');
        track(payload.kind==='lead'?'Lead':'Purchase',{value:payload.total,currency:CUR});
        if(msg){msg.className='formmsg ok';msg.textContent=form.getAttribute('data-success')||'¡Listo! Te contactamos para confirmar.'}
        form.reset();
        var rd=form.getAttribute('data-redirect');
        if(rd){setTimeout(function(){location.href=rd},900)}
        else{
          var wa=form.getAttribute('data-whatsapp');
          if(wa&&res.j.whatsappUrl){setTimeout(function(){window.open(res.j.whatsappUrl,'_blank')},600)}
        }
      })
      .catch(function(err){
        var wa=form.getAttribute('data-whatsapp');
        if(wa){
          var t='Hola! Quiero hacer este pedido:%0A'+encodeURIComponent(
            (payload.name||'')+' '+(payload.surname||'')+'%0ATel: '+(payload.phone||'')+
            '%0ACiudad: '+(payload.city||'')+', '+(payload.state||'')+'%0ADir: '+(payload.dir||'')+
            '%0ACantidad: '+payload.quantity+'%0ATotal: '+fmt(payload.total));
          if(msg){msg.className='formmsg ok';msg.innerHTML='Te estamos redirigiendo a WhatsApp para confirmar tu pedido…'}
          setTimeout(function(){location.href='https://wa.me/'+wa+'?text='+t},700);
        }else if(msg){
          msg.className='formmsg err';msg.textContent=String(err.message||err);
        }
      })
      .finally(function(){ if(btn){btn.disabled=false;btn.innerHTML=btn.dataset.t} });
  });
});
})();`;
}

/* ------------------------------ píxeles ------------------------------ */

export function pixelsScript(spec: PageSpec): string {
  const px = spec.settings.pixels;
  let out = "";
  if (px.metaPixelId) {
    out += `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${px.metaPixelId}');fbq('track','PageView');</script>`;
  }
  if (px.tiktokPixelId) {
    out += `<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${px.tiktokPixelId}');ttq.page()}(window,document,'ttq');</script>`;
  }
  if (px.ga4Id) {
    out += `<script async src="https://www.googletagmanager.com/gtag/js?id=${px.ga4Id}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${px.ga4Id}');${px.googleAdsId ? `gtag('config','${px.googleAdsId}');` : ""}</script>`;
  }
  if (px.customHead) out += px.customHead;
  return out;
}
