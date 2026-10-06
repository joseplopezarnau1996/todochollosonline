<?php
/**
 * CONFIGURACIÓN DE TODO CHOLLOS ONLINE
 * Las claves de Amazon NO van aquí: se guardan como "Secrets" en GitHub
 * (Settings > Secrets and variables > Actions):
 *   AMZ_CLIENT_ID      -> ID de credencial (amzn1.application-oa2-client...)
 *   AMZ_CLIENT_SECRET  -> Secreto de esa credencial
 */
return [
    'site_name'     => 'Todo Chollos Online',
    'site_url'      => 'https://www.todochollosonline.es',
    'owner_name'    => 'Josep López Arnau',
    'contact_email' => 'joseplopezarnau1996@gmail.com',

    // URL del comparador (Cloudflare Worker). Vacío = comparador desactivado.
    'compare_api'   => getenv('COMPARE_API') ?: 'https://todochollos-comparador.joseplopezarnau1996.workers.dev/',

    'partner_tag'   => 'deskfind-21',
    'marketplace'   => 'www.amazon.es',

    'api_client_id'     => getenv('AMZ_CLIENT_ID') ?: '',
    'api_client_secret' => getenv('AMZ_CLIENT_SECRET') ?: '',
    'api_token_url'     => getenv('AMZ_TOKEN_URL') ?: 'https://api.amazon.co.uk/auth/o2/token',
    'api_base_url'      => getenv('AMZ_BASE_URL') ?: 'https://creatorsapi.amazon',

    // La web se regenera cada hora con precios recién consultados.
    'price_cache_ttl' => 3600,
];
