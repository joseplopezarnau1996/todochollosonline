<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title) ?></title>
<?php if ($description): ?><meta name="description" content="<?= e($description) ?>"><?php endif; ?>
<?php if ($canonical): ?><link rel="canonical" href="<?= e($canonical) ?>"><?php endif; ?>
<?php if ($noindex): ?><meta name="robots" content="noindex,follow"><?php endif; ?>
<meta property="og:title" content="<?= e($title) ?>">
<?php if ($description): ?><meta property="og:description" content="<?= e($description) ?>"><?php endif; ?>
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<?php if ($canonical): ?><meta property="og:url" content="<?= e($canonical) ?>"><?php endif; ?>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛒</text></svg>">
<link rel="stylesheet" href="/assets/style.css?v=1">
<?php if ($schema): ?><script type="application/ld+json"><?= json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?></script><?php endif; ?>
</head>
<body>
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="/">Todo<b>Chollos</b>Online</a>
    <button class="menu-btn" aria-label="Abrir menú" onclick="document.body.classList.toggle('menu-open')">☰</button>
    <nav class="nav">
      <a href="/#comparador">Comparador</a>
      <a href="/categorias">Categorías</a>
      <a href="/#productos">Chollos</a>
      <a href="/guias/">Guías</a>
      <a href="/contacto">Contacto</a>
    </nav>
  </div>
</header>
<main>
