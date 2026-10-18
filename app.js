/* Ofertas GV — lógica do app (PWA) */
(function () {
  'use strict';

  // ---------- Utilidades ----------
  function escapar(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function preco(n) { return Number(n || 0).toFixed(2).replace('.', ','); }
  function dataBR(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
  }
  function normalizarImagem(url) {
    url = String(url || '').trim();
    var m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/);
    if (m && /drive\.google\.com/i.test(url)) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w600';
    return /^https?:\/\//i.test(url) ? url : '';
  }

  // ---------- Consulta ao Apps Script (JSONP) ----------
  function jsonp(api, params) {
    return new Promise(function (resolve, reject) {
      var cb = 'ofgv_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
      var pares = Object.keys(params || {}).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      });
      var url = CONFIG.WEB_APP_URL.replace(/\/+$/, '') +
        '?api=' + encodeURIComponent(api) +
        (pares.length ? '&' + pares.join('&') : '') +
        '&callback=' + cb;
      var s = document.createElement('script');
      var timer = setTimeout(function () { limpar(); reject(new Error('Tempo esgotado ao consultar o servidor de ofertas.')); }, 15000);
      function limpar() {
        clearTimeout(timer);
        try { delete window[cb]; } catch (e) { window[cb] = undefined; }
        if (s.parentNode) s.parentNode.removeChild(s);
      }
      window[cb] = function (dados) { limpar(); resolve(dados); };
      s.onerror = function () { limpar(); reject(new Error('Não foi possível conectar ao servidor de ofertas. Verifique a URL em config.js.')); };
      s.src = url;
      document.body.appendChild(s);
    });
  }

  // ---------- Cartão de oferta ----------
  function cardOferta(o, comSelecao) {
    var img = normalizarImagem(o.imagem_url);
    var destaque = o.destaque === true || String(o.destaque) === 'true' || String(o.destaque).toLowerCase() === 'sim' || String(o.destaque) === '1';
    var html = '<article class="card"><div class="foto">';
    if (destaque) html += '<span class="tag">⭐ Destaque</span>';
    if (comSelecao) html += '<input type="checkbox" class="sel" data-id="' + escapar(o.id_oferta) + '" aria-label="Selecionar para comparar">';
    html += img ? '<img loading="lazy" src="' + escapar(img) + '" alt="' + escapar(o.produto) + '">' : '<div class="sem-foto">🛒</div>';
    html += '</div><div class="info"><h3>' + escapar(o.produto) + '</h3>';
    if (o.marca) html += '<p class="marca">' + escapar(o.marca) + '</p>';
    if (o.embalagem) html += '<p class="embalagem">' + escapar(o.embalagem) + '</p>';
    html += '<div class="precos"><span class="preco-oferta">R$ ' + preco(o.preco_oferta) + '</span>';
    if (Number(o.preco_normal) > 0) html += '<span class="preco-normal">R$ ' + preco(o.preco_normal) + '</span>';
    html += '</div>';
    if (o.supermercado) html += '<p class="loja">🏪 ' + escapar(o.supermercado) + '</p>';
    if (o.validade_fim) html += '<p class="validade">Válido até ' + dataBR(o.validade_fim) + '</p>';
    if (o.observacao && String(o.observacao).trim() && String(o.observacao).trim() !== '—') html += '<p class="obs">ℹ️ ' + escapar(o.observacao) + '</p>';
    html += '</div></article>';
    return html;
  }

  // ---------- Notificações de novas ofertas ----------
  var CHAVE_BASELINE = 'ofertasgv_notif_baseline';
  var timerNotif = null;
  function textoEstado() {
    if (!('Notification' in window)) return 'Seu navegador não suporta notificações.';
    if (Notification.permission === 'granted') return '✅ Notificações ativadas. Você será avisado quando houver novas ofertas (com o app aberto).';
    if (Notification.permission === 'denied') return 'Notificações bloqueadas. Libere nas configurações do site para ativar.';
    return '';
  }
  function verificar() {
    jsonp('status').then(function (d) {
      var total = d && typeof d.total === 'number' ? d.total : null;
      if (total === null) return;
      var anterior = parseInt(localStorage.getItem(CHAVE_BASELINE) || '', 10);
      if (!isNaN(anterior) && total > anterior && 'Notification' in window && Notification.permission === 'granted') {
        try { new Notification('🛒 Ofertas GV', { body: 'Novas ofertas registradas! Confira agora — ' + total + ' ofertas válidas.' }); } catch (e) {}
      }
      localStorage.setItem(CHAVE_BASELINE, String(total));
    }).catch(function () {});
  }
  function iniciarNotificacoes() {
    if (timerNotif) return;
    verificar();
    timerNotif = setInterval(verificar, CONFIG.INTERVALO_NOTIFICACAO_MS);
  }
  (function configurarBotaoNotif() {
    var btn = document.getElementById('btnNotif');
    var st = document.getElementById('ofgv-notif-status');
    function refletir() {
      var t = textoEstado();
      if (st && t) st.textContent = t;
      if (btn && 'Notification' in window && Notification.permission === 'granted') {
        btn.textContent = '🔔 Notificações ativadas';
        btn.disabled = true;
      }
    }
    if (btn) {
      btn.addEventListener('click', function () {
        if (!('Notification' in window)) { refletir(); return; }
        Notification.requestPermission().then(function (p) {
          refletir();
          if (p === 'granted') {
            localStorage.removeItem(CHAVE_BASELINE);
            try { new Notification('🛒 Ofertas GV', { body: 'Notificações ativadas com sucesso!' }); } catch (e) {}
            iniciarNotificacoes();
          }
        });
      });
    }
    refletir();
    if ('Notification' in window && Notification.permission === 'granted') iniciarNotificacoes();
  })();

  // ---------- Páginas ----------
  var pagina = document.body.getAttribute('data-page');

  if (pagina === 'index') {
    jsonp('destaques').then(function (lista) {
      var alvo = document.getElementById('lista');
      if (!lista || !lista.length) { alvo.innerHTML = '<p class="vazio">Nenhuma oferta válida no momento. Volte em breve!</p>'; return; }
      alvo.innerHTML = lista.map(function (o) { return cardOferta(o, false); }).join('');
    }).catch(function (e) {
      document.getElementById('lista').innerHTML = '<p class="vazio">' + escapar(e.message) + '</p>';
    });
  }

  if (pagina === 'ofertas') {
    var TODAS = [];

    function preencherSelect(id, valores, rotuloVazio) {
      var sel = document.getElementById(id);
      var atual = sel.value;
      sel.innerHTML = '<option value="">' + rotuloVazio + '</option>' +
        valores.map(function (v) { return '<option>' + escapar(v) + '</option>'; }).join('');
      sel.value = atual;
    }
    function popularFiltros() {
      var cats = {}, lojas = {};
      TODAS.forEach(function (o) {
        if (o.categoria) cats[o.categoria] = true;
        if (o.supermercado) lojas[o.supermercado] = true;
      });
      preencherSelect('filtroCategoria', Object.keys(cats).sort(), 'Todas as categorias');
      preencherSelect('filtroLoja', Object.keys(lojas).sort(), 'Todos os supermercados');
    }
    function aplicarFiltros() {
      var q = document.getElementById('busca').value.trim().toLowerCase();
      var cat = document.getElementById('filtroCategoria').value.toLowerCase();
      var loja = document.getElementById('filtroLoja').value.toLowerCase();
      var ordem = document.getElementById('ordem').value;
      var lista = TODAS.filter(function (o) {
        var texto = (o.produto + ' ' + (o.marca || '') + ' ' + (o.embalagem || '')).toLowerCase();
        if (q && texto.indexOf(q) < 0) return false;
        if (cat && String(o.categoria || '').toLowerCase() !== cat) return false;
        if (loja && String(o.supermercado || '').toLowerCase() !== loja) return false;
        return true;
      });
      if (ordem === 'menor') lista.sort(function (a, b) { return a.preco_oferta - b.preco_oferta; });
      if (ordem === 'maior') lista.sort(function (a, b) { return b.preco_oferta - a.preco_oferta; });
      document.getElementById('contador').textContent = lista.length + ' oferta(s) encontrada(s)';
      var alvo = document.getElementById('lista');
      if (!lista.length) { alvo.innerHTML = '<p class="vazio">Nenhuma oferta encontrada com esses filtros.</p>'; return; }
      alvo.innerHTML = lista.map(function (o) { return cardOferta(o, true); }).join('');
    }
    ['busca', 'filtroCategoria', 'filtroLoja', 'ordem'].forEach(function (id) {
      document.getElementById(id).addEventListener(id === 'busca' ? 'input' : 'change', aplicarFiltros);
    });

    var selecionadas = [];
    function atualizarBarra() {
      document.getElementById('contSelecionadas').textContent = selecionadas.length + ' oferta(s) selecionada(s)';
      document.getElementById('barraComparar').classList.toggle('ativa', selecionadas.length > 0);
    }
    document.getElementById('lista').addEventListener('change', function (ev) {
      if (!ev.target.classList.contains('sel')) return;
      var id = ev.target.getAttribute('data-id');
      if (ev.target.checked) { if (selecionadas.indexOf(id) < 0) selecionadas.push(id); }
      else { selecionadas = selecionadas.filter(function (x) { return x !== id; }); }
      atualizarBarra();
    });
    document.getElementById('btnLimpar').addEventListener('click', function () {
      selecionadas = [];
      Array.prototype.forEach.call(document.querySelectorAll('.sel'), function (c) { c.checked = false; });
      atualizarBarra();
    });
    document.getElementById('btnComparar').addEventListener('click', function () {
      var sel = TODAS.filter(function (o) { return selecionadas.indexOf(String(o.id_oferta)) >= 0; });
      if (sel.length < 2) { alert('Selecione pelo menos duas ofertas para comparar.'); return; }
      var campos = [
        ['Produto', function (o) { return escapar(o.produto); }],
        ['Marca', function (o) { return escapar(o.marca || '—'); }],
        ['Embalagem', function (o) { return escapar(o.embalagem || '—'); }],
        ['Preço da oferta', function (o) { return 'R$ ' + preco(o.preco_oferta); }],
        ['Preço normal', function (o) { return Number(o.preco_normal) > 0 ? 'R$ ' + preco(o.preco_normal) : '—'; }],
        ['Supermercado', function (o) { return escapar(o.supermercado || '—'); }],
        ['Válido até', function (o) { return dataBR(o.validade_fim) || '—'; }],
        ['Observação', function (o) { return escapar(o.observacao || '—'); }]
      ];
      var html = '<table><thead><tr><th>Campo</th>' + sel.map(function (o, i) { return '<th>Oferta ' + (i + 1) + '</th>'; }).join('') + '</tr></thead><tbody>';
      campos.forEach(function (c) {
        html += '<tr><th>' + c[0] + '</th>' + sel.map(function (o) { return '<td>' + c[1](o) + '</td>'; }).join('') + '</tr>';
      });
      html += '</tbody></table>';
      document.getElementById('tabelaComparar').innerHTML = html;
      document.getElementById('modalComparar').classList.add('ativo');
    });
    document.getElementById('btnFechar').addEventListener('click', function () {
      document.getElementById('modalComparar').classList.remove('ativo');
    });
    document.getElementById('modalComparar').addEventListener('click', function (ev) {
      if (ev.target === this) this.classList.remove('ativo');
    });

    jsonp('ofertas').then(function (lista) {
      TODAS = lista || [];
      popularFiltros();
      aplicarFiltros();
    }).catch(function (e) {
      document.getElementById('lista').innerHTML = '<p class="vazio">' + escapar(e.message) + '</p>';
    });
  }

  // ---------- Service Worker ----------
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  }
})();