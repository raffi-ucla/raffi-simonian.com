(function(){
  var dds=[].slice.call(document.querySelectorAll('.dd'));
  function closeAll(except){ dds.forEach(function(dd){ if(dd!==except){ dd.classList.remove('open'); var b=dd.querySelector('.ddbtn'); if(b)b.setAttribute('aria-expanded','false'); } }); }
  dds.forEach(function(dd){
    var btn=dd.querySelector('.ddbtn');
    btn.addEventListener('click', function(e){ e.stopPropagation(); closeAll(dd); var open=dd.classList.toggle('open'); btn.setAttribute('aria-expanded', open?'true':'false'); });
  });
  document.addEventListener('click', function(){ closeAll(null); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeAll(null); });

  function domain(u){ try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return ''; } }

  // scoped search on collection pages
  var ps=document.getElementById('pagesearch');
  if(ps){
    var hits=document.getElementById('hits');
    var emptyMsg=document.getElementById('empty');
    var subs=[].slice.call(document.querySelectorAll('#library .sub'));
    var items=[];
    subs.forEach(function(sub){
      [].slice.call(sub.querySelectorAll('.grid > li')).forEach(function(li){
        items.push({el:li, sub:sub, text:li.textContent.toLowerCase()});
      });
    });
    ps.addEventListener('input', function(){
      var terms=ps.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      var shown=0; var vis=new Map();
      items.forEach(function(c){
        var ok=terms.every(function(t){return c.text.indexOf(t)!==-1;});
        c.el.hidden=!ok;
        if(ok){ shown++; vis.set(c.sub,(vis.get(c.sub)||0)+1); }
      });
      subs.forEach(function(sub){ sub.hidden=!(vis.get(sub)>0); });
      if(hits) hits.textContent = terms.length ? (shown+' result'+(shown===1?'':'s')) : '';
      if(emptyMsg) emptyMsg.classList.toggle('show', shown===0);
    });
  }

  // verdict filters on CX pages
  var vfs=[].slice.call(document.querySelectorAll('.vf'));
  if(vfs.length){
    var groups=[].slice.call(document.querySelectorAll('.uxgroup'));
    vfs.forEach(function(btn){
      btn.addEventListener('click', function(){
        vfs.forEach(function(b){ b.classList.toggle('active', b===btn); });
        var mode=btn.getAttribute('data-v');
        groups.forEach(function(g){
          var vis=0;
          [].slice.call(g.querySelectorAll('.uxcase')).forEach(function(c){
            var ok = mode==='all' || c.getAttribute('data-v')===mode;
            c.hidden=!ok; if(ok)vis++;
          });
          g.hidden = vis===0;
        });
      });
    });
  }

  // global search on home
  var q=document.getElementById('q');
  if(q && window.SEARCH){
    var hits2=document.getElementById('hits');
    var results=document.getElementById('results');
    var emptyMsg2=document.getElementById('empty');
    var colgrid=document.getElementById('colgrid');
    var idx=window.SEARCH.map(function(r){
      return {r:r, text:(r[0]+' '+r[2]+' '+domain(r[1])+' '+r[3]+' '+r[5]+' '+r[6]).toLowerCase()};
    });
    function esc(t){ var d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
    q.addEventListener('input', function(){
      var terms=q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if(!terms.length){ results.hidden=true; results.innerHTML=''; colgrid.hidden=false; emptyMsg2.classList.remove('show'); hits2.textContent=''; return; }
      colgrid.hidden=true; results.hidden=false;
      var html=''; var shown=0;
      idx.forEach(function(c){
        if(terms.every(function(t){return c.text.indexOf(t)!==-1;})){
          shown++;
          if(shown<=60){
            var r=c.r;
            var m='<span class="dom">'+esc(domain(r[1]))+'</span>';
            if(r[4]) m+='<span class="badge">'+esc(r[4])+'</span>';
            m+='<span class="colbadge">'+esc(r[5])+'</span>';
            html+='<li><a class="card" href="'+esc(r[1])+'" target="_blank" rel="noopener"><span class="t">'+esc(r[0])+'</span>'+(r[2]?'<span class="s">'+esc(r[2])+'</span>':'')+'<span class="m">'+m+'</span></a></li>';
          }
        }
      });
      results.innerHTML=html;
      hits2.textContent=shown+' result'+(shown===1?'':'s')+(shown>60?' (showing 60)':'');
      emptyMsg2.classList.toggle('show', shown===0);
    });
  }
})();
