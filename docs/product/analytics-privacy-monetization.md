# Analítica, privacidad y monetización de GZK Underground

## Principio

Medir si la plataforma ayuda a descubrir la escena sin convertir a las personas en un producto ni mezclar estadísticas propias con métricas de escucha de Spotify.

## Almacenamiento funcional

- La vuelta RANDOM usa `localStorage` para no repetir perfiles y continuar después de recargar.
- No contiene nombre, email ni una identidad compartida con terceros.
- Debe explicarse en la política de privacidad como almacenamiento funcional.
- Si el uso deja de ser estrictamente funcional, deberá pasar por consentimiento.

## Analítica por niveles

### Nivel 1: métricas propias y mínimas

- Aparición de perfil en RANDOM.
- Apertura de ficha.
- Selección desde una búsqueda.
- Clic externo por plataforma.
- Totales diarios y ratios normalizados por impresiones.
- Sin registrar teclas, texto introducido, reproducción Spotify ni segundos escuchados.

Este nivel debe diseñarse sin cookies publicitarias y con retención limitada. Los identificadores técnicos pseudónimos, si fueran necesarios para abuso o visitantes únicos, se rotarán y documentarán.

### Nivel 2: mapa de calor opcional

- Solo se carga después de consentimiento para analítica avanzada.
- Se excluyen formularios, administración, campos de texto y cualquier dato de contacto.
- Se enmascaran entradas y contenido sensible.
- Se limita a periodos concretos de investigación UX, no como grabación permanente.
- Se prefiere una solución autoalojada y se define una retención corta.

## Preferencias

El futuro panel tendrá tres estados independientes:

1. Funcional: necesario para la vuelta RANDOM y preferencias solicitadas.
2. Analítica básica: métricas propias de descubrimiento.
3. Analítica avanzada: mapas de calor o grabación de sesión, desactivada por defecto.

Rechazar debe ser tan fácil como aceptar. Ningún script no esencial se carga antes de la elección.

## Publicidad

### Primera opción: patrocinio directo

- Un único bloque `sponsor.exe`, identificado como `PATROCINADO`.
- Creatividad alojada localmente y enlace etiquetado.
- Sin autoplay, popups, interstitials ni overlays sobre Spotify o el directorio.
- Tamaño máximo recomendado: 300 × 250 en escritorio y ancho fluido hasta 320 px en móvil.
- Estadísticas limitadas a impresiones y clics agregados del bloque.

### Segunda opción: red programática

Google AdSense u otras redes añaden terceros, requisitos de consentimiento, política publicitaria y posible impacto de rendimiento. Solo se evaluarán cuando el tráfico justifique esa complejidad y exista una CMP válida para visitantes europeos.

## Fuentes normativas y técnicas

- Directiva ePrivacy, artículo 5.3: https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:02002L0058-20091219
- Guía sobre cookies de la AEPD: https://www.aepd.es/guias/guia-cookies.pdf
- Cookies y funciones de Heatmaps de Matomo: https://matomo.org/faq/general/faq_146/
- Requisitos CMP de Google para publicidad en el EEE: https://support.google.com/adsense/answer/13554116?hl=es

Antes de producción, los textos y categorías de consentimiento deben revisarse contra la normativa vigente y la configuración real de las herramientas elegidas.
