/* ---- FAQ accordion ---- */
document.querySelectorAll('.faq-item button').forEach(function(b){
  b.addEventListener('click',function(){
    var open=b.getAttribute('aria-expanded')==='true';
    document.querySelectorAll('.faq-item button').forEach(function(x){x.setAttribute('aria-expanded','false')});
    b.setAttribute('aria-expanded',open?'false':'true');
  });
});

/* ---- Tabs (products, system explorer, ads B2B/B2C, LinkedIn manual/automated) ---- */
document.querySelectorAll('[data-tabs]').forEach(function(box){
  var tabs=[].slice.call(box.querySelectorAll('[role=tab]'));
  function select(t){
    tabs.forEach(function(x){
      var on=x===t;
      x.setAttribute('aria-selected',on?'true':'false');
      x.tabIndex=on?0:-1;
      var p=document.getElementById(x.getAttribute('aria-controls'));
      if(p)p.hidden=!on;
    });
  }
  tabs.forEach(function(t,i){
    t.addEventListener('click',function(){select(t)});
    t.addEventListener('keydown',function(e){
      var k=e.key;
      if(k==='ArrowRight'||k==='ArrowLeft'||k==='ArrowDown'||k==='ArrowUp'){
        var fwd=(k==='ArrowRight'||k==='ArrowDown');
        var n=tabs[(i+(fwd?1:tabs.length-1))%tabs.length];
        n.focus();select(n);e.preventDefault();
      }
    });
  });
});

/* ---- Logo marquee: duplicate the set for a seamless loop ---- */
(function(){
  var track=document.getElementById('logoTrack');
  if(!track)return;
  [].slice.call(track.children).forEach(function(n){
    var c=n.cloneNode(true);
    c.classList.add('clone');
    c.setAttribute('aria-hidden','true');
    c.querySelectorAll('img').forEach(function(i){i.alt='';i.removeAttribute('loading')});
    track.appendChild(c);
  });
})();

/* ---- Scroll reveal ---- */
(function(){
  var els=[].slice.call(document.querySelectorAll('.reveal'));
  if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in')});return;}
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
  },{rootMargin:'0px 0px -8% 0px',threshold:.08});
  els.forEach(function(e){io.observe(e)});
})();

/* ---- Stat count-up ---- */
(function(){
  var els=[].slice.call(document.querySelectorAll('[data-count]'));
  if(!els.length||!('IntersectionObserver' in window)||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))return;
  function run(el){
    var to=+el.getAttribute('data-count'),suf=el.getAttribute('data-suffix')||'',t0=null,dur=1400;
    function step(t){
      if(!t0)t0=t;
      var p=Math.min((t-t0)/dur,1);
      el.textContent=Math.round(to*(1-Math.pow(1-p,3)))+suf;
      if(p<1)requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting){io.unobserve(e.target);run(e.target);}});
  },{threshold:.6});
  els.forEach(function(el){io.observe(el)});
})();

/* ---- Lead context: remember where a visitor came from, for the lead form and analytics ---- */
(function(){
  var K='hb_ctx', ctx={};
  try{ctx=JSON.parse(sessionStorage.getItem(K)||'{}')||{};}catch(e){ctx={};}
  var q=new URLSearchParams(location.search);
  ['utm_source','utm_medium','utm_campaign','utm_industry'].forEach(function(k){if(q.get(k))ctx[k]=q.get(k).slice(0,80);});
  if(!ctx.landing)ctx.landing=location.pathname;
  if(!ctx.referrer&&document.referrer){try{ctx.referrer=new URL(document.referrer).hostname;}catch(e){}}
  var m=location.pathname.match(/^\/(industries|services)\/([a-z0-9-]+)\//);
  if(m){ctx[m[1]==='industries'?'industry':'service']=m[2];}
  try{sessionStorage.setItem(K,JSON.stringify(ctx));}catch(e){}
  window.hbContext=ctx;
  document.querySelectorAll('a[href$="#contact"],a[href="#contact"]').forEach(function(a){
    a.addEventListener('click',function(){
      if(typeof gtag==='function')gtag('event','cta_click',{page_path:location.pathname,industry:ctx.industry||'',service:ctx.service||''});
    });
  });
})();
