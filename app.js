(() => {
  'use strict';
  const cfg = window.OFERTAS_GV_CONFIG || {};
  const API_URL = String(cfg.API_URL || '').trim();
  const PAGE_SIZE = 24;
  let allOffers = [], filteredOffers = [], visibleCount = PAGE_SIZE, deferredInstall = null;
  const $ = id => document.getElementById(id);
  const money = n => Number(n || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  const safe = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = s => { if (!s) return 'consulte o folheto'; const a=String(s).split('-'); return a.length===3 ? `${a[2]}/${a[1]}/${a[0]}` : safe(s); };
  function jsonp(url, timeoutMs=18000) {
    return new Promise((resolve,reject) => {
      const cb='ofertasGV_'+Date.now()+'_'+Math.floor(Math.random()*1e6);
      const script=document.createElement('script'); let timer;
      const cleanup=()=>{clearTimeout(timer);delete window[cb];script.remove();};
      window[cb]=data=>{cleanup(); if(data && data.erro) reject(new Error(data.mensagem||'Falha no serviço de ofertas.')); else resolve(data);};
      script.onerror=()=>{cleanup();reject(new Error('Não foi possível conectar à base de ofertas. Confira a implantação pública do Apps Script.'));};
      timer=setTimeout(()=>{cleanup();reject(new Error('O serviço demorou para responder. Tente novamente.'));},timeoutMs);
      script.src=url+(url.includes('?')?'&':'?')+'callback='+encodeURIComponent(cb)+'&_='+Date.now();
      document.head.appendChild(script);
    });
  }
  function apiUrl(kind) {
    if (!API_URL || API_URL.includes('COLE_AQUI')) throw new Error('Falta configurar a URL pública do Apps Script no arquivo config.js.');
    return API_URL+(API_URL.includes('?')?'&':'?')+'api='+encodeURIComponent(kind);
  }
  function card(o) {
    const img=o.imagem_url ? `<img src="${safe(o.imagem_url)}" alt="${safe(o.produto)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'placeholder',textContent:'🛍️'}))">` : '<div class="placeholder">🛍️</div>';
    const discount=Number(o.preco_normal)>Number(o.preco_oferta)&&Number(o.preco_normal)>0?Math.round((1-o.preco_oferta/o.preco_normal)*100):0;
    return `<article class="product-card"><div class="product-image">${img}</div><div class="image-note">Imagem ilustrativa</div><div class="card-body"><div class="store">${safe(o.supermercado||'Supermercado')}</div><div class="product-name">${safe(o.produto)}</div><div class="pack">${safe([o.marca,o.embalagem].filter(Boolean).join(' · '))}</div>${o.patrocinado?'<span class="tag">Oferta patrocinada</span>':''}${discount?`<span class="tag">-${discount}%</span>`:''}${Number(o.preco_normal)>0?`<div class="old-price">De ${money(o.preco_normal)}</div>`:''}<div class="price">${money(o.preco_oferta)}</div><div class="valid">Válida até ${date(o.validade_fim)}</div>${o.observacao?`<div class="condition">${safe(o.observacao)}</div>`:''}${o.fonte_url?`<a class="source-link" href="${safe(o.fonte_url)}" target="_blank" rel="noopener noreferrer">Abrir folheto ↗</a>`:''}</div></article>`;
  }
  function populateFilters() {
    const categories=[...new Set(allOffers.map(o=>String(o.categoria||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const stores=[...new Set(allOffers.map(o=>String(o.supermercado||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    $('category').innerHTML='<option value="">Todas as categorias</option>'+categories.map(x=>`<option>${safe(x)}</option>`).join('');
    $('store').innerHTML='<option value="">Todos os supermercados</option>'+stores.map(x=>`<option>${safe(x)}</option>`).join('');
  }
  function filter() {
    const q=$('search').value.trim().toLocaleLowerCase('pt-BR'),cat=$('category').value,store=$('store').value;
    filteredOffers=allOffers.filter(o=>{
      const hay=[o.produto,o.marca,o.embalagem,o.supermercado,o.categoria].join(' ').toLocaleLowerCase('pt-BR');
      return (!q||hay.includes(q))&&(!cat||o.categoria===cat)&&(!store||o.supermercado===store);
    });
    filteredOffers.sort((a,b)=>Number(a.preco_oferta)-Number(b.preco_oferta)); visibleCount=PAGE_SIZE; render();
  }
  function render() {
    const root=$('offers'),visible=filteredOffers.slice(0,visibleCount);
    root.innerHTML=visible.length?visible.map(card).join(''):'<div class="empty">Nenhuma oferta encontrada com esses filtros.</div>';
    $('statusText').textContent=`${filteredOffers.length} oferta${filteredOffers.length===1?'':'s'} encontrada${filteredOffers.length===1?'':'s'}`;
    $('moreBtn').hidden=visibleCount>=filteredOffers.length;
  }
  async function loadOffers() {
    $('statusText').textContent='Carregando ofertas…';$('refreshBtn').disabled=true;
    try {
      const data=await jsonp(apiUrl('ofertas'));
      if(!Array.isArray(data)) throw new Error('A resposta do serviço de ofertas não está no formato esperado.');
      allOffers=data;populateFilters();filter();
      if(!data.length) $('offers').innerHTML='<div class="empty">Ainda não há ofertas publicadas e válidas. Volte em breve!</div>';
    } catch(err) { $('offers').innerHTML=`<div class="empty">${safe(err.message||'Erro ao carregar ofertas.')}<p><button class="refresh-btn" id="retryBtn">Tentar novamente</button></p></div>`; $('statusText').textContent='Não foi possível carregar'; const b=$('retryBtn'); if(b)b.addEventListener('click',loadOffers); }
    finally {$('refreshBtn').disabled=false;}
  }
  function setupAds() {
    const client=String(cfg.ADSENSE_CLIENT||'').trim(), top=String(cfg.ADSENSE_SLOT_TOP||'').trim(), bottom=String(cfg.ADSENSE_SLOT_BOTTOM||'').trim();
    // Não mostrar caixas vazias antes de configurar anúncios reais.
    if(!client || !top || !bottom) {
      ['adTop','adBottom'].forEach(id => { const el=$(id); if(el) el.hidden=true; });
      return;
    }
    ['adTop','adBottom'].forEach(id => { const el=$(id); if(el) el.hidden=false; });
    const s=document.createElement('script');s.async=true;s.crossOrigin='anonymous';s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(client);document.head.appendChild(s);
    [['adTop',top],['adBottom',bottom]].forEach(([id,slot])=>{const el=$(id);el.innerHTML=`<span>Publicidade</span><ins class="adsbygoogle" style="display:block" data-ad-client="${safe(client)}" data-ad-slot="${safe(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){console.warn('Anúncio indisponível',e);}});
  }
  $('search').addEventListener('input',filter);$('category').addEventListener('change',filter);$('store').addEventListener('change',filter);$('refreshBtn').addEventListener('click',loadOffers);$('moreBtn').addEventListener('click',()=>{visibleCount+=PAGE_SIZE;render();});
  $('privacyLink').addEventListener('click',e=>{e.preventDefault();$('privacyDialog').showModal();});$('closePrivacy').addEventListener('click',()=>$('privacyDialog').close());
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('installBtn').hidden=false;});
  $('installBtn').addEventListener('click',async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('installBtn').hidden=true;});
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('Service worker não registrado',e)));
  setupAds();loadOffers();
})();
