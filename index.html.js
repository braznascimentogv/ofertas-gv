<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ofertas GV | Ofertas em destaque</title>
  <meta name="theme-color" content="#075c43">
  <link rel="manifest" href="manifest.json">
  <link rel="icon" href="assets/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="assets/icon-192.png">
  <link rel="stylesheet" href="styles.css">
</head>
<body data-page="index">
  <header class="topo">
    <div class="marca">
      <span class="logo">🛒</span>
      <div><strong>Ofertas GV</strong><small>Mais economia no seu dia a dia!</small></div>
    </div>
    <nav>
      <a href="ofertas.html">Todas as ofertas</a>
      <button id="btnNotif" class="btn-notif">🔔 Ativar notificações</button>
    </nav>
  </header>

  <section class="hero">
    <h1>Economize no supermercado sem perder tempo.</h1>
    <p>Compare ofertas de Governador Valadares em um só lugar.</p>
    <a class="btn" href="ofertas.html">Ver ofertas</a>
  </section>

  <main>
    <h2>Ofertas em destaque</h2>
    <div id="lista" class="grade"><p class="carregando">Carregando as melhores ofertas…</p></div>
  </main>

  <div id="ofgv-notif-status" class="notif-status"></div>

  <footer>
    <p><strong>Ofertas GV · Mais economia no seu dia a dia!</strong></p>
    <p>As ofertas divulgadas são retiradas dos folhetos publicados nos sites oficiais dos supermercados, sendo este aplicativo de mera consulta ao usuário. O Ofertas GV não possui nenhum vínculo com qualquer estabelecimento comercial.</p>
    <p>Todas as imagens são meramente ilustrativas. As ofertas estão de acordo com a validade e as observações contidas nos folhetos, com validade conforme a data indicada no folheto e/ou enquanto durar o estoque.</p>
  </footer>

  <script src="config.js"></script>
  <script src="app.js"></script>
</body>
</html>