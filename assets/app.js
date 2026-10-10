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

  var cf=document.getElementById('cform');
  if(cf){
    var st=document.getElementById('cstatus');
    cf.addEventListener('submit', function(ev){
      ev.preventDefault();
      if(!cf.checkValidity()){ cf.reportValidity(); return; }
      var btn=cf.querySelector('.cbtn');
      btn.disabled=true; st.textContent='Sending…'; st.className='cstatus';
      var data=new FormData(cf);
      data.set('name', (data.get('first_name')||'')+' '+(data.get('last_name')||''));
      fetch('https://api.web3forms.com/submit', { method:'POST', body:data, headers:{ 'Accept':'application/json' } })
        .then(function(r){ return r.json(); })
        .then(function(j){
          if(j.success){ st.textContent='Thanks — your message is on its way. I’ll get back to you soon.'; st.className='cstatus ok'; cf.reset(); }
          else { st.textContent='Something went wrong: '+(j.message||'please try again, or reach me on LinkedIn.'); st.className='cstatus err'; }
        })
        .catch(function(){ st.textContent='Could not send right now — please try again, or reach me on LinkedIn.'; st.className='cstatus err'; })
        .then(function(){ btn.disabled=false; });
    });
  }

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

  // career plan: Ikigai -> AI prompt
  var ikf=document.getElementById('ikform');
  if(ikf){
    var ids=['love','good','need','paid'];
    var tas={}; ids.forEach(function(k){ tas[k]=document.getElementById('ik-'+k); });
    try{
      var saved=JSON.parse(localStorage.getItem('ikigai-draft')||'{}');
      ids.forEach(function(k){ if(saved[k]) tas[k].value=saved[k]; });
    }catch(e){}
    ids.forEach(function(k){ tas[k].addEventListener('input', function(){
      try{ var d={}; ids.forEach(function(x){ d[x]=tas[x].value; }); localStorage.setItem('ikigai-draft', JSON.stringify(d)); }catch(e){}
    }); });
    var ist=document.getElementById('ikstatus');
    function ikPrompt(){
      var v={}; var any=false;
      ids.forEach(function(k){ v[k]=tas[k].value.trim(); if(v[k])any=true; });
      if(!any){ ist.textContent='Answer at least one question first.'; ist.className='cstatus err'; return null; }
      ist.textContent=''; ist.className='cstatus';
      return "I'm working through the Ikigai framework to find my career direction. Here are my reflections:\n\n"+
        "What I love: "+(v.love||'(not answered yet)')+"\n\n"+
        "What I'm good at: "+(v.good||'(not answered yet)')+"\n\n"+
        "What the world needs, that I care about: "+(v.need||'(not answered yet)')+"\n\n"+
        "What I can be paid for: "+(v.paid||'(not answered yet)')+"\n\n"+
        "Acting as an expert career counselor, summarize specific roles and industries that will be a good fit for me as a new college graduate. Specifically:\n"+
        "1. Identify the themes where my answers overlap - my Ikigai.\n"+
        "2. Recommend 5-7 specific target roles (from across the ~900 careers in 14 industry clusters) and the industries where they live, explaining how each fits my answers.\n"+
        "3. For my top 3 roles: typical entry paths, realistic salary ranges, and demand outlook.\n"+
        "4. List the skill gaps I should expect and a skills-based learning plan to close them (courses, certificates, and work-based learning such as internships or job shadowing).\n"+
        "5. Suggest 3 questions I should ask in informational interviews with professionals in these fields.";
    }
    function go(base){
      var pr=ikPrompt(); if(!pr) return;
      var url=base+encodeURIComponent(pr);
      var w=null; try{ w=window.open(url, '_blank', 'noopener'); }catch(e){}
      if(w) return;
      function fb(){ ist.textContent='Could not open a new tab here (preview windows block it). Use "Copy the prompt" and paste it into your AI assistant.'; ist.className='cstatus err'; }
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(pr).then(function(){ ist.textContent='A new tab is blocked here, so the prompt was copied instead. Paste it into claude.ai or chatgpt.com.'; ist.className='cstatus ok'; }, fb);
      } else { fb(); }
    }
    var AI_ENDPOINT = window.AI_ENDPOINT || '';
    var inlineBtn=document.getElementById('aigo-inline');
    var box=document.getElementById('airesult');
    function mdlite(t){
      t = t.replace(/&/g,'&amp;').replace(/</g,'&lt;');
      t = t.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
      t = t.replace(/^#{1,4} (.+)$/gm,'<b class="h">$1</b>');
      return t.split(/\n\n+/).map(function(pp){ return '<p>'+pp.replace(/\n/g,'<br>')+'</p>'; }).join('');
    }
    if(AI_ENDPOINT && inlineBtn){
      inlineBtn.hidden=false;
      inlineBtn.addEventListener('click', function(){
        var pr=ikPrompt(); if(!pr) return;
        inlineBtn.disabled=true; ist.textContent='Generating your recommendations…'; ist.className='cstatus';
        box.hidden=false; box.textContent='';
        var full='';
        fetch(AI_ENDPOINT, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt: pr }) })
          .then(function(res){
            if(!res.ok || !res.body) throw new Error('bad response');
            var rd=res.body.getReader(); var dec=new TextDecoder(); var buf='';
            function pump(){ return rd.read().then(function(r){
              if(r.done){ box.innerHTML=mdlite(full); ist.textContent=''; inlineBtn.disabled=false; return; }
              buf+=dec.decode(r.value,{stream:true});
              var lines=buf.split('\n'); buf=lines.pop();
              lines.forEach(function(l){ l=l.trim(); if(l.indexOf('data: ')===0){ var d=l.slice(6); if(d==='[DONE]')return;
                try{ var j=JSON.parse(d); var c=j.choices&&j.choices[0]&&j.choices[0].delta&&j.choices[0].delta.content; if(c){ full+=c; box.textContent=full; } }catch(e){} } });
              return pump();
            }); }
            return pump();
          })
          .catch(function(){
            box.hidden = full==='';
            ist.textContent='Could not generate right now — try again, or use Ask Claude / Ask ChatGPT below.'; ist.className='cstatus err';
            inlineBtn.disabled=false;
          });
      });
    }
    var SIGNUP_ENDPOINT = window.SIGNUP_ENDPOINT || '';
    var gate=document.getElementById('cpgate');
    if(gate){
      var verified=false;
      try{ verified=!!localStorage.getItem('cp-verified'); }catch(e){}
      function closeGate(){ gate.hidden=true; document.body.classList.remove('gated'); }
      function openGate(){ gate.hidden=false; document.body.classList.add('gated'); }
      if(SIGNUP_ENDPOINT && !verified){
        openGate();
        var g1=document.getElementById('gform1'), g2=document.getElementById('gform2');
        var s1=document.getElementById('gstatus1'), s2=document.getElementById('gstatus2');
        var step1=document.getElementById('gstep1'), step2=document.getElementById('gstep2');
        var gm=document.getElementById('gemail');
        var who={};
        function gpost(data){
          return fetch(SIGNUP_ENDPOINT, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify(data) })
            .then(function(r){ return r.text(); })
            .then(function(t){ try{ return JSON.parse(t); }catch(e){ return {ok:false}; } });
        }
        function sendCode(st){
          st.textContent='Sending your code'+String.fromCharCode(8230); st.className='cstatus';
          return gpost({ action:'start', first_name:who.first, last_name:who.last, email:who.email })
            .then(function(j){
              if(j.ok){ st.textContent=''; return true; }
              st.textContent='Could not send the code. Check the email address and try again.'; st.className='cstatus err'; return false;
            })
            .catch(function(){ st.textContent='Could not send the code right now. Please try again.'; st.className='cstatus err'; return false; });
        }
        g1.addEventListener('submit', function(ev){
          ev.preventDefault();
          if(!g1.checkValidity()){ g1.reportValidity(); return; }
          var fd=new FormData(g1);
          if(fd.get('botcheck')) return;
          who={ first:String(fd.get('first_name')||'').trim(), last:String(fd.get('last_name')||'').trim(), email:String(fd.get('email')||'').trim() };
          var btn=g1.querySelector('.cbtn'); btn.disabled=true;
          sendCode(s1).then(function(okay){
            btn.disabled=false;
            if(okay){ gm.textContent=who.email; step1.hidden=true; step2.hidden=false; g2.querySelector('input[name=code]').focus(); }
          });
        });
        document.getElementById('gresend').addEventListener('click', function(){
          var ci=g2.querySelector('input[name=code]'); ci.value=''; ci.focus();
          sendCode(s2).then(function(okay){ if(okay){ s2.textContent='New code sent - the previous code no longer works.'; s2.className='cstatus ok'; } });
        });
        g2.addEventListener('submit', function(ev){
          ev.preventDefault();
          var code=String(new FormData(g2).get('code')||'').trim();
          if(code.length!==6){ s2.textContent='Enter the 6-digit code from the email.'; s2.className='cstatus err'; return; }
          var btn=g2.querySelector('.cbtn'); btn.disabled=true;
          s2.textContent='Verifying'+String.fromCharCode(8230); s2.className='cstatus';
          gpost({ action:'verify', email:who.email, code:code, page:'career-plan' })
            .then(function(j){
              if(j.ok){
                try{ localStorage.setItem('cp-verified', who.email); }catch(e){}
                s2.textContent='Verified. Welcome!'; s2.className='cstatus ok';
                setTimeout(closeGate, 500);
              } else {
                s2.textContent = j.error==='expired' ? 'That code expired. Click Resend code for a new one.' : 'That code does not match. Check the email and try again.';
                s2.className='cstatus err';
              }
            })
            .catch(function(){ s2.textContent='Could not verify right now. Please try again.'; s2.className='cstatus err'; })
            .then(function(){ btn.disabled=false; });
        });
      }
    }
    document.getElementById('aigo-claude').addEventListener('click', function(){ go('https://claude.ai/new?q='); });
    document.getElementById('aigo-chatgpt').addEventListener('click', function(){ go('https://chatgpt.com/?q='); });
    document.getElementById('aigo-copy').addEventListener('click', function(){
      var p=ikPrompt(); if(!p) return;
      function ok(){ ist.textContent='Prompt copied - paste it into any AI assistant.'; ist.className='cstatus ok'; }
      if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(p).then(ok, function(){ ist.textContent='Copy failed - select and copy manually.'; ist.className='cstatus err'; }); }
      else { ist.textContent='Copy not available in this browser.'; ist.className='cstatus err'; }
    });
  }

  // verdict filters on CX pages
  var vfs=[].slice.call(document.querySelectorAll('.vf'));
  var bfs=[].slice.call(document.querySelectorAll('.bf'));
  if(vfs.length){
    var groups=[].slice.call(document.querySelectorAll('.uxgroup'));
    var mode='all', brand='all';
    function applyF(){
      groups.forEach(function(g){
        var bOk = brand==='all' || g.getAttribute('data-b')===brand;
        var vis=0;
        [].slice.call(g.querySelectorAll('.uxcase')).forEach(function(c){
          var ok = mode==='all' || c.getAttribute('data-v')===mode;
          c.hidden=!ok; if(ok)vis++;
        });
        g.hidden = !bOk || vis===0;
      });
    }
    vfs.forEach(function(btn){
      btn.addEventListener('click', function(){
        vfs.forEach(function(b){ b.classList.toggle('active', b===btn); });
        mode=btn.getAttribute('data-v'); applyF();
      });
    });
    bfs.forEach(function(btn){
      btn.addEventListener('click', function(){
        bfs.forEach(function(b){ b.classList.toggle('active', b===btn); });
        brand=btn.getAttribute('data-b'); applyF();
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
