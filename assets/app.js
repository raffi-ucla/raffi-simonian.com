(function(){
  var dds=[].slice.call(document.querySelectorAll('.dd'));
  function closeAll(except){ dds.forEach(function(dd){ if(dd!==except){ dd.classList.remove('open'); var b=dd.querySelector('button.ddbtn'); if(b)b.setAttribute('aria-expanded','false'); } }); }
  dds.forEach(function(dd){
    var btn=dd.querySelector('button.ddbtn');
    if(btn) btn.addEventListener('click', function(e){ e.stopPropagation(); closeAll(dd); var open=dd.classList.toggle('open'); btn.setAttribute('aria-expanded', open?'true':'false'); });
  });
  document.addEventListener('click', function(){ closeAll(null); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeAll(null); });

  function domain(u){ try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return ''; } }
  function nameOk(v){
    v = String(v||'').trim();
    var letters = 0;
    for (var i = 0; i < v.length; i++) {
      var ch = v.charAt(i);
      if (ch.toLowerCase() !== ch.toUpperCase()) letters++;
    }
    return letters >= 2;
  }


  var cf=document.getElementById('cform');
  if(cf){
    var st=document.getElementById('cstatus');
    cf.addEventListener('submit', function(ev){
      ev.preventDefault();
      if(!cf.checkValidity()){ cf.reportValidity(); return; }
      var cdata=new FormData(cf);
      if(!nameOk(cdata.get('first_name')) || !nameOk(cdata.get('last_name'))){
        st.textContent="Please enter your full first and last name - initials alone won't work."; st.className='cstatus err'; return;
      }
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

  // resources page: Ask-AI guide
  function mdlite(t){
    t = t.replace(/&/g,'&amp;').replace(/</g,'&lt;');
    t = t.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
    t = t.replace(/^#{1,4} (.+)$/gm,'<b class="h">$1</b>');
    t = t.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
    return t.split(/\n\n+/).map(function(pp){ return '<p>'+pp.replace(/\n/g,'<br>')+'</p>'; }).join('');
  }
  function addCopy(box, raw){
    var old=box.querySelector('.copybtn'); if(old) old.parentNode.removeChild(old);
    var plain=raw
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'$1 ($2)')
      .replace(/\*\*/g,'')
      .replace(/^#{1,4} /gm,'')
      .trim();
    var b=document.createElement('button');
    b.type='button'; b.className='copybtn'; b.setAttribute('aria-label','Copy this answer');
    b.textContent='⧉ Copy';
    b.addEventListener('click', function(){
      function ok(){ b.textContent='✓ Copied'; setTimeout(function(){ b.textContent='⧉ Copy'; },1600); }
      function fail(){ b.textContent='Copy failed'; setTimeout(function(){ b.textContent='⧉ Copy'; },1600); }
      function plainCopy(){
        if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(plain).then(ok, fail); } else fail();
      }
      var c=box.cloneNode(true);
      var cb=c.querySelector('.copybtn'); if(cb) cb.parentNode.removeChild(cb);
      var html=c.innerHTML;
      if(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem){
        try{
          var item=new ClipboardItem({
            'text/html': new Blob([html], {type:'text/html'}),
            'text/plain': new Blob([plain], {type:'text/plain'})
          });
          navigator.clipboard.write([item]).then(ok, plainCopy);
        }catch(e){ plainCopy(); }
      } else plainCopy();
    });
    var host = (box.parentNode && box.parentNode.className === 'answrap') ? box.parentNode : box;
    box.classList.add('hascopy');
    host.appendChild(b);
  }
  var askBtn=document.getElementById('askgo');
  var RES_ENDPOINT = window.AI_ENDPOINT || '';
  if(RES_ENDPOINT && askBtn){
    var askWrap=document.getElementById('askai');
    if(askWrap) askWrap.hidden=false;
    var askQ=document.getElementById('askq');
    var askSt=document.getElementById('askstatus');
    var thread=document.getElementById('askthread');
    var hist=[];
    var askGo=function(){
      var q=(askQ.value||'').trim();
      if(!q){ askSt.textContent='Type what you are looking for first.'; askSt.className='cstatus err'; askQ.focus(); return; }
      askBtn.disabled=true; askQ.value='';
      askSt.textContent='Looking through the library…'; askSt.className='cstatus';
      var qEl=document.createElement('div'); qEl.className='askq'; qEl.textContent=q; thread.appendChild(qEl);
      var wrap=document.createElement('div'); wrap.className='answrap'; thread.appendChild(wrap);
      var box=document.createElement('div'); box.className='airesult'; wrap.appendChild(box);
      thread.scrollTop=qEl.offsetTop-6; var pinned=false;
      hist.push({ role:'user', content:q });
      var full='';
      fetch(RES_ENDPOINT.replace(/\/?$/,'/')+'resources', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ messages: hist.slice(-8) }) })
        .then(function(res){
          if(!res.ok || !res.body){ var err=new Error('bad response'); err.status=res.status; throw err; }
          var rd=res.body.getReader(); var dec=new TextDecoder(); var buf='';
          function pump(){ return rd.read().then(function(r){
            if(r.done){
              box.innerHTML=mdlite(full);
              addCopy(box, full);
              thread.scrollTop=qEl.offsetTop-6;
              hist.push({ role:'assistant', content: full });
              askSt.textContent=''; askBtn.disabled=false;
              askQ.placeholder='Ask a follow-up…'; askQ.focus();
              return;
            }
            buf+=dec.decode(r.value,{stream:true});
            var lines=buf.split('\n'); buf=lines.pop();
            lines.forEach(function(l){ l=l.trim(); if(l.indexOf('data: ')===0){ var d=l.slice(6); if(d==='[DONE]')return;
              try{ var j=JSON.parse(d); var c=j.choices&&j.choices[0]&&j.choices[0].delta&&j.choices[0].delta.content; if(c){ full+=c; box.textContent=full; if(!pinned && thread.scrollHeight-thread.clientHeight>=qEl.offsetTop-6){ thread.scrollTop=qEl.offsetTop-6; pinned=true; } } }catch(e){} } });
            return pump();
          }); }
          return pump();
        })
        .catch(function(err){
          var limited = err && err.status === 429;
          var msg = limited
            ? 'Quite a few questions in a short time — please wait a couple of minutes, then ask again.'
            : 'The guide could not answer just now — please try again in a moment.';
          if(full===''){
            box.innerHTML='<p>⚠ '+msg+'</p>';
            box.classList.add('askerr');
            hist.pop(); askQ.value=q;
          } else { box.innerHTML=mdlite(full); hist.push({ role:'assistant', content: full }); }
          askSt.textContent=msg; askSt.className='cstatus err';
          askBtn.disabled=false;
        });
    };
    askBtn.addEventListener('click', askGo);
    askQ.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); askGo(); } });
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
      if(!any){ if(ist){ ist.textContent='Answer at least one question first.'; ist.className='cstatus err'; } return null; }
      if(ist){ ist.textContent=''; ist.className='cstatus'; }
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
    var AI_ENDPOINT = window.AI_ENDPOINT || '';
        var snapBtn=document.getElementById('snapgo');
    var snapBox=document.getElementById('snapresult');
    if(AI_ENDPOINT && snapBtn && snapBox){
      snapBtn.addEventListener('click', function(){
        var pr=ikPrompt(); if(!pr) return;
        snapBtn.disabled=true; if(ist){ ist.textContent='Reading your answers…'; ist.className='cstatus'; }
        snapBox.hidden=false; snapBox.textContent='';
        var full='';
        fetch(AI_ENDPOINT.replace(/\/?$/,'/')+'snapshot', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt: pr }) })
          .then(function(res){
            if(!res.ok || !res.body){ var err=new Error('bad response'); err.status=res.status; throw err; }
            var rd=res.body.getReader(); var dec=new TextDecoder(); var buf='';
            function pump(){ return rd.read().then(function(r){
              if(r.done){
                snapBox.innerHTML=mdlite(full);
                if(ist) ist.textContent='';
                snapBtn.disabled=false; snapBtn.textContent='Refresh my snapshot';
                var isPaid=false; try{ isPaid=!!localStorage.getItem('cp-paid'); }catch(e){}
                if(!isPaid){
                  var up=document.createElement('p'); up.className='upsell';
                  up.innerHTML='That is the snapshot — the <b>$50 Personalized Career Assessment</b> turns your answers into a full career project plan: your direction, where you stand today, your first year month by month, and a 3-year roadmap — as a downloadable PDF with my personal review notes, credited in full toward any session. <a href="#buytier">Get my plan ↓</a>';
                  snapBox.appendChild(up);
                  var ua=up.querySelector('a'); if(ua) ua.addEventListener('click', function(ev){ ev.preventDefault(); var bt2=document.getElementById('buytier'); if(bt2) bt2.scrollIntoView({behavior:'smooth'}); });
                }
                return;
              }
              buf+=dec.decode(r.value,{stream:true});
              var lines=buf.split('\n'); buf=lines.pop();
              lines.forEach(function(l){ l=l.trim(); if(l.indexOf('data: ')===0){ var d=l.slice(6); if(d==='[DONE]')return;
                try{ var j=JSON.parse(d); var c=j.choices&&j.choices[0]&&j.choices[0].delta&&j.choices[0].delta.content; if(c){ full+=c; snapBox.textContent=full; } }catch(e){} } });
              return pump();
            }); }
            return pump();
          })
          .catch(function(err){
            snapBox.hidden = full==='';
            var limited = err && err.status === 429;
            if(ist){ ist.textContent = limited ? 'Quite a few requests in a short time — please wait a couple of minutes and try again.' : 'Could not generate the snapshot just now — please try again in a moment.'; ist.className='cstatus err'; }
            snapBtn.disabled=false;
          });
      });
    }
    // paid Personalized Career Assessment
    var aw=document.getElementById('assesswrap');
    if(aw){
      var PAID_DIGEST='65880756e9705e3a968122f51b760c0f728178bcff4330921f294aa73102a1cf';
      var paidOk=false;
      try{ paidOk=!!localStorage.getItem('cp-paid'); }catch(e){}
      function markPaid(){
        aw.hidden=false;
        var bt=document.getElementById('buytier'); if(bt) bt.hidden=true;
        var sb=document.getElementById('snapbar'); if(sb) sb.hidden=true;
        var sr=document.getElementById('snapresult'); if(sr) sr.hidden=true;
      }
      if(paidOk) markPaid();
      var pq=null; try{ pq=new URLSearchParams(location.search).get('paid'); }catch(e){}
      if(pq && window.crypto && crypto.subtle){
        crypto.subtle.digest('SHA-256', new TextEncoder().encode(pq)).then(function(buf){
          var hex=Array.prototype.map.call(new Uint8Array(buf), function(x){ return ('0'+x.toString(16)).slice(-2); }).join('');
          if(hex===PAID_DIGEST){
            try{ localStorage.setItem('cp-paid', pq); }catch(e){}
            markPaid();
            try{ history.replaceState(null,'',location.pathname); }catch(e){}
            try{ aw.scrollIntoView({behavior:'smooth'}); }catch(e){}
          }
        });
      }
      var promoEl=document.getElementById('promocode');
      function claimPromo(){
        if(!promoEl) return;
        var cached=null; try{ cached=localStorage.getItem('cp-promo'); }catch(e){}
        if(cached){ promoEl.textContent=cached; return; }
        var ep=window.SIGNUP_ENDPOINT||'';
        var token=''; try{ token=localStorage.getItem('cp-paid')||''; }catch(e){}
        function fail(){ promoEl.parentNode.innerHTML='<b>Your $50 credit:</b> within 24 hours I will personally email your one-time promo code to the email you used at checkout — use it when booking any session and the full $50 is credited. Need it sooner? <a href="/contact/">Contact me</a>. <a href="https://www.everyexpert.com/raffisimonian" target="_blank" rel="noopener">Book now →</a>'; }
        if(!ep || !token){ fail(); return; }
        fetch(ep, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({ action:'claim_code', paid: token, page:'career-plan' }) })
          .then(function(res){ return res.json(); })
          .then(function(j){
            if(j && j.ok && j.code){ promoEl.textContent=j.code; try{ localStorage.setItem('cp-promo', j.code); }catch(e){} }
            else fail();
          })
          .catch(fail);
      }
      var ago=document.getElementById('assessgo');
      var ast=document.getElementById('assessstatus');
      var abox=document.getElementById('assessresult');
      var adl=document.getElementById('assessdl');
      var lastMd='';
      var acredit=document.getElementById('assesscredit');
      var arev=document.getElementById('reviewbox');
      var pfIds=['must','never','values','skills','when','limits'];
      var pfEls={}; pfIds.forEach(function(k){ pfEls[k]=document.getElementById('pf-'+k); });
      try{ var pfSaved=JSON.parse(localStorage.getItem('cp-planform')||'{}'); pfIds.forEach(function(k){ if(pfEls[k]&&pfSaved[k]) pfEls[k].value=pfSaved[k]; }); }catch(e){}
      pfIds.forEach(function(k){ if(pfEls[k]) pfEls[k].addEventListener('input', function(){
        try{ var d={}; pfIds.forEach(function(x){ d[x]=pfEls[x]?pfEls[x].value:''; }); localStorage.setItem('cp-planform', JSON.stringify(d)); }catch(e){}
      }); });
      function planPrompt(){
        var iv={}; var ikAny=false; ids.forEach(function(k){ iv[k]=tas[k].value.trim(); if(iv[k])ikAny=true; });
        var pv={}; var pfCount=0; pfIds.forEach(function(k){ pv[k]=pfEls[k]?pfEls[k].value.trim():''; if(pv[k])pfCount++; });
        if(!ikAny) return { err:'Answer at least one of the four Ikigai questions in Step 1 first — they are the foundation of your plan.', to:'ikform' };
        if(pfCount<3) return { err:'Answer at least three of the six planning questions above — the more you give, the better your plan.', to:'planform' };
        function nb(s){ return s||'(not answered)'; }
        return { prompt: 'Here is my complete intake for my personalized career plan.\n\nMY IKIGAI REFLECTIONS\nWhat I love: '+nb(iv.love)+
          '\n\nWhat I am good at: '+nb(iv.good)+
          '\n\nWhat the world needs, that I care about: '+nb(iv.need)+
          '\n\nWhat I can be paid for: '+nb(iv.paid)+
          '\n\nMY PLANNING ANSWERS\nMy non-negotiables (must-haves and the tradeoffs I accept): '+nb(pv.must)+
          '\n\nMy deal-breakers: '+nb(pv.never)+
          '\n\nMy values and causes: '+nb(pv.values)+
          '\n\nMy current skills and credentials: '+nb(pv.skills)+
          '\n\nMy timeline and what achievement looks like: '+nb(pv.when)+
          '\n\nMy constraints and resources: '+nb(pv.limits)+
          '\n\nPlease build my detailed career project plan.' };
      }
      function saveAssessment(md){
        var ep=window.SIGNUP_ENDPOINT||''; if(!ep) return;
        var em=''; try{ em=localStorage.getItem('cp-verified')||''; }catch(e){}
        var tok=''; try{ tok=localStorage.getItem('cp-paid')||''; }catch(e){}
        if(!tok) return;
        try{ fetch(ep, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({ action:'save_assessment', paid: tok, email: em, page:'career-plan', assessment: String(md||'').slice(0,40000) }) }).catch(function(){}); }catch(e){}
      }
      function withJsPDF(cb, fail){
        if(window.jspdf && window.jspdf.jsPDF){ cb(window.jspdf.jsPDF); return; }
        var s=document.createElement('script'); s.src='/assets/jspdf.umd.min.js';
        s.onload=function(){ if(window.jspdf && window.jspdf.jsPDF) cb(window.jspdf.jsPDF); else fail(); };
        s.onerror=fail; document.head.appendChild(s);
      }
      function assessPdf(jsPDF, md){
        var doc=new jsPDF({ unit:'pt', format:'letter' });
        var W=612, H=792, M=58, maxW=W-M*2, y=M+12;
        function need(h){ if(y+h>H-M-14){ doc.addPage(); y=M+6; } }
        doc.setFont('helvetica','bold'); doc.setFontSize(21); doc.setTextColor(32,30,27);
        doc.text('Personalized Career Assessment', M, y); y+=20;
        doc.setFont('helvetica','normal'); doc.setFontSize(10.5); doc.setTextColor(120);
        doc.text('Prepared by Raffi Simonian · raffi-simonian.com · '+new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}), M, y);
        y+=10; doc.setDrawColor(190); doc.line(M, y, W-M, y); y+=20;
        var lines=md.split('\n');
        for(var i=0;i<lines.length;i++){
          var ln=lines[i].trim();
          if(!ln){ y+=5; continue; }
          ln=ln.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)').replace(/\*\*/g,'');
          if(ln.indexOf('## ')===0){
            need(52); y+=10;
            doc.setFont('helvetica','bold'); doc.setFontSize(13.5); doc.setTextColor(32,30,27);
            doc.text(ln.slice(3), M, y); y+=7;
            doc.setDrawColor(225); doc.line(M, y, W-M, y); y+=16;
            continue;
          }
          doc.setFont('helvetica','normal'); doc.setFontSize(10.5); doc.setTextColor(60);
          var ind=0, txt=ln;
          var bm=ln.match(/^[-*] +(.*)$/);
          if(bm){ ind=14; txt='•  '+bm[1]; }
          var wrapped=doc.splitTextToSize(txt, maxW-ind);
          for(var k=0;k<wrapped.length;k++){ need(15); doc.text(wrapped[k], M+ind+(bm&&k>0?11:0), y); y+=14.5; }
          y+=3;
        }
        var n=doc.getNumberOfPages();
        for(var p2=1;p2<=n;p2++){ doc.setPage(p2); doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(150);
          doc.text('raffi-simonian.com  ·  page '+p2+' of '+n, W/2, H-26, {align:'center'}); }
        doc.save('Personalized-Career-Assessment.pdf');
      }
      if(ago && AI_ENDPOINT){
        ago.addEventListener('click', function(){
          var pp=planPrompt();
          if(pp.err){ ast.textContent=pp.err; ast.className='cstatus err'; var tgt=document.getElementById(pp.to); if(tgt) tgt.scrollIntoView({behavior:'smooth'}); return; }
          var pr=pp.prompt;
          ago.disabled=true; ast.textContent='Building your career plan — this takes a minute or two…'; ast.className='cstatus';
          abox.hidden=false; abox.textContent='';
          var full='';
          fetch(AI_ENDPOINT.replace(/\/?$/,'/')+'assessment', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt: pr }) })
            .then(function(res){
              if(!res.ok || !res.body) throw new Error('bad response');
              var rd=res.body.getReader(); var dec=new TextDecoder(); var buf='';
              function pump(){ return rd.read().then(function(r){
                if(r.done){ abox.innerHTML=mdlite(full); addCopy(abox, full); ast.textContent=''; ago.disabled=false; ago.textContent='Regenerate'; adl.hidden=false; lastMd=full; try{ localStorage.setItem('cp-assess-md', full); }catch(e){} acredit.hidden=false; if(arev) arev.hidden=false; claimPromo(); saveAssessment(full); return; }
                buf+=dec.decode(r.value,{stream:true});
                var lines=buf.split('\n'); buf=lines.pop();
                lines.forEach(function(l){ l=l.trim(); if(l.indexOf('data: ')===0){ var d=l.slice(6); if(d==='[DONE]')return;
                  try{ var j=JSON.parse(d); var c=j.choices&&j.choices[0]&&j.choices[0].delta&&j.choices[0].delta.content; if(c){ full+=c; abox.textContent=full; } }catch(e){} } });
                return pump();
              }); }
              return pump();
            })
            .catch(function(){
              abox.hidden = full==='';
              ast.textContent='Could not generate right now — your purchase is saved on this device; please try again in a few minutes.'; ast.className='cstatus err';
              ago.disabled=false;
            });
        });
        if(adl) adl.addEventListener('click', function(){
          var md=lastMd; if(!md){ try{ md=localStorage.getItem('cp-assess-md')||''; }catch(e){} }
          if(!md){ ast.textContent='Generate your assessment first.'; ast.className='cstatus err'; return; }
          adl.disabled=true; ast.textContent='Preparing your PDF…'; ast.className='cstatus';
          withJsPDF(function(jsPDF){ try{ assessPdf(jsPDF, md); ast.textContent=''; }catch(e){ ast.textContent='Could not prepare the PDF — please try again.'; ast.className='cstatus err'; } adl.disabled=false; },
            function(){ adl.disabled=false; ast.textContent='Could not prepare the PDF — please try again.'; ast.className='cstatus err'; });
        });
      }
      var savedMd='';
      try{ savedMd=localStorage.getItem('cp-assess-md')||''; }catch(e){}
      if(paidOk && savedMd && abox){
        abox.hidden=false; abox.innerHTML=mdlite(savedMd); addCopy(abox, savedMd);
        lastMd=savedMd; if(adl) adl.hidden=false; if(ago) ago.textContent='Regenerate';
        if(acredit){ acredit.hidden=false; claimPromo(); }
        if(arev) arev.hidden=false;
      }
    }
    var SIGNUP_ENDPOINT = window.SIGNUP_ENDPOINT || '';
    var gate=document.getElementById('cpgate');
    if(gate){
      var verified=false;
      try{ verified=!!localStorage.getItem('cp-verified'); }catch(e){}
      function closeGate(){ gate.hidden=true; document.body.classList.remove('gated'); }
      function openGate(){ gate.hidden=false; document.body.classList.add('gated'); }
      var uq=null;
      try{ uq=new URLSearchParams(location.search).get('unlock'); }catch(e){}
      if(uq && window.crypto && crypto.subtle){
        crypto.subtle.digest('SHA-256', new TextEncoder().encode(uq)).then(function(buf){
          var hex=Array.prototype.map.call(new Uint8Array(buf), function(x){ return ('0'+x.toString(16)).slice(-2); }).join('');
          if(hex==='106683d953726b8447f6b5b86540ec91d7b6add5a59a5b5d8eab4bdc215b5a2b'){
            try{ localStorage.setItem('cp-verified','owner'); }catch(e){}
            closeGate();
            try{ history.replaceState(null, '', location.pathname); }catch(e){}
          }
        });
      }
      if(SIGNUP_ENDPOINT && !verified){
        openGate();
        var g1=document.getElementById('gform1'), g2=document.getElementById('gform2');
        var s1=document.getElementById('gstatus1'), s2=document.getElementById('gstatus2');
        var step1=document.getElementById('gstep1'), step2=document.getElementById('gstep2');
        var gm=document.getElementById('gemail');
        var who={};
        var TS_KEY=window.TURNSTILE_SITE_KEY||'';
        var tsWid=null;
        function tsRender(){
          if(!TS_KEY || tsWid!==null) return;
          if(window.turnstile && document.getElementById('cfts')){
            try{ tsWid=turnstile.render('#cfts', { sitekey: TS_KEY }); }catch(e){ tsWid=null; }
            if(tsWid===null) setTimeout(function(){ tsWid=null; tsRender(); }, 800);
          } else { setTimeout(tsRender, 300); }
        }
        tsRender();
        function tsToken(){
          if(!TS_KEY) return '';
          try{ return turnstile.getResponse(tsWid)||''; }catch(e){ return ''; }
        }
        function tsReset(){ if(!TS_KEY) return; try{ turnstile.reset(tsWid); }catch(e){} }
        function gpost(data){
          return fetch(SIGNUP_ENDPOINT, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify(data) })
            .then(function(r){ return r.text(); })
            .then(function(t){ try{ return JSON.parse(t); }catch(e){ return {ok:false}; } });
        }
        function sendCode(st){
          st.textContent='Sending your code'+String.fromCharCode(8230); st.className='cstatus';
          var tk=tsToken();
          if(TS_KEY && !tk){ st.textContent='Please complete the verification box first.'; st.className='cstatus err'; return Promise.resolve(false); }
          return gpost({ action:'start', first_name:who.first, last_name:who.last, email:who.email, cf_token: tk })
            .then(function(j){
              tsReset();
              if(j.ok){ st.textContent=''; return true; }
              st.textContent = j.error==='too_many'
                ? 'That email has requested several codes in the past hour. Please wait a while and try again.'
                : (j.error==='captcha' ? 'Verification did not pass — please complete the check and try again.'
                : 'Could not send the code. Check the email address and try again.');
              st.className='cstatus err'; return false;
            })
            .catch(function(){ st.textContent='Could not send the code right now. Please try again.'; st.className='cstatus err'; return false; });
        }
        g1.addEventListener('submit', function(ev){
          ev.preventDefault();
          if(!g1.checkValidity()){ g1.reportValidity(); return; }
          var fd=new FormData(g1);
          if(fd.get('botcheck')) return;
          who={ first:String(fd.get('first_name')||'').trim(), last:String(fd.get('last_name')||'').trim(), email:String(fd.get('email')||'').trim() };
          if(!nameOk(who.first) || !nameOk(who.last)){ s1.textContent="Please enter your full first and last name - initials alone won't work."; s1.className='cstatus err'; return; }
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
