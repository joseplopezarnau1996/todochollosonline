<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title) ?></title>
<?php if ($description): ?><meta name="description" content="<?= e($description) ?>"><?php endif; ?>
<?php if ($canonical): ?><link rel="canonical" href="<?= e($canonical) ?>"><?php endif; ?>
<?php if ($noindex): ?><meta name="robots" content="noindex,follow"><?php endif; ?>
<meta name="theme-color" content="#0a0e0b">
<meta property="og:title" content="<?= e($title) ?>">
<?php if ($description): ?><meta property="og:description" content="<?= e($description) ?>"><?php endif; ?>
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<?php if ($canonical): ?><meta property="og:url" content="<?= e($canonical) ?>"><?php endif; ?>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='24' height='24' rx='6' fill='%23FFD21F'/><path d='M12 5l6 3.4v6.8L12 19l-6-3.8V8.4z M6 8.4l6 3.4 6-3.4 M12 11.8V19' fill='none' stroke='%23111' stroke-width='1.6' stroke-linejoin='round'/></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Caveat:wght@600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css?v=<?= defined('BUILD_VERSION') ? BUILD_VERSION : 2 ?>">
<?php $bgImg = aj('fondo_imagen'); ?>
<style>:root{--bg:<?= color(aj('colores.fondo'), '#0a0e0b') ?>;--card:<?= color(aj('colores.tarjetas'), '#121a15') ?>;--card2:color-mix(in srgb,var(--card) 88%,#fff);--y:<?= color(aj('colores.acento'), '#ffd21f') ?>;--y2:color-mix(in srgb,var(--y) 85%,#000);--ink:<?= color(aj('colores.texto'), '#f4f6f3') ?>}
<?php if ($bgImg && preg_match('~^https://~', $bgImg)): ?>body{background-image:linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)),url("<?= e($bgImg) ?>");background-size:cover;background-attachment:fixed;background-position:center}.hero{background:transparent}<?php endif; ?></style>
<?php if ($schema): ?><script type="application/ld+json"><?= json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?></script><?php endif; ?>
<script>window.TC = <?= json_encode(['api' => cfg()['compare_api'] ?? '', 'tag' => cfg()['partner_tag'], 'mk' => cfg()['marketplace']]) ?>;</script>
</head>
<body>
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="/" aria-label="Todo Chollos Online, inicio">
      <span class="logo-ico"><?= icon('box', 26) ?></span>
      <span class="logo-txt"><b><?= e(aj('textos.logo_1', 'Todo')) ?><em><?= e(aj('textos.logo_2', 'Chollos')) ?></em></b><small><?= e(aj('textos.logo_sub', 'Comparador de precios')) ?></small></span>
    </a>
    <nav class="nav" id="nav">
      <a href="/">Inicio</a>
      <a href="/#comparador">Comparador</a>
      <a href="/categorias">Categorías</a>
      <a href="/guias/">Guías</a>
      <a href="/#nosotros">Sobre nosotros</a>
      <a href="/#productos">Productos</a>
    </nav>
    <div class="top-actions">
      <a class="icon-btn" href="/#productos" aria-label="Buscar productos" onclick="setTimeout(function(){var q=document.getElementById('q');if(q)q.focus()},300)"><?= icon('search', 24) ?></a>
      <button class="icon-btn menu-btn" aria-label="Abrir menú" onclick="document.body.classList.toggle('menu-open')"><?= icon('menu', 26) ?></button>
    </div>
  </div>
</header>
<main>
