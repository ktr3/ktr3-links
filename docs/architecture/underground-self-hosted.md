# Arquitectura autoalojada de GZK Underground

## Objetivo

Ejecutar la web pública, el backend, PostgreSQL, moderación y estadísticas en el servidor `principal`, manteniendo `obsidian` como destino de copias cifradas y evitando dependencias obligatorias de una plataforma administrada.

## Entornos

| Entorno | Dirección | Datos | Publicación |
|---------|-----------|-------|-------------|
| Local | `localhost` | PostgreSQL Docker local | Solo Mac |
| Staging | Subdominio privado pendiente | Base independiente | Traefik + autenticación |
| Producción | `ktr3.es` | PostgreSQL producción | Traefik + TLS |

Nunca se comparte una base de datos entre staging y producción.

## Servicios Docker de producción

```text
Traefik existente
  └── ktr3-web
        ├── Next.js 16 con runtime Node
        ├── páginas públicas
        ├── Route Handlers `/api/*`
        └── panel `/underground/admin`

ktr3-db
  └── PostgreSQL 16

ktr3-backup
  └── pg_dump cifrado, retención y copia a obsidian
```

No se necesita Redis durante la primera versión. Se añadirá solo si las métricas o los límites de peticiones superan lo que PostgreSQL puede manejar de forma sencilla.

## Datos principales

- `profiles`: identidad pública, slug, estado y datos editoriales.
- `profile_roles`: artista, productor, DJ, colectivo/sello y visual.
- `profile_links`: Spotify, Instagram, YouTube, SoundCloud y otras plataformas.
- `submissions`: solicitud original, consentimiento y correo privado.
- `moderation_events`: historial de aprobación, cambios, rechazo y retirada.
- `web_events`: impresiones RANDOM, perfiles abiertos, selecciones y clics externos.
- `profile_stats_daily`: agregados diarios normalizados por impresiones.
- `admin_users`: cuentas autorizadas para moderar.

Los correos no aparecen en `profiles`, `web_events` ni respuestas públicas.

## Spotify

La web utiliza Widgets/Embeds y oEmbed. La Web API autenticada no es necesaria para que visitantes anónimos descubran perfiles.

La iFrame API puede controlar la interfaz local del reproductor, pero los eventos de reproducción no se almacenan. Las estadísticas propias se limitan a:

- aparición del perfil en RANDOM;
- apertura de ficha;
- selección desde búsqueda;
- clic externo hacia Spotify u otra plataforma.

No se calculan reproducciones, segundos escuchados ni métricas derivadas del contenido Spotify.

## Seguridad

- Secretos solo en variables del contenedor, nunca dentro del web root.
- PostgreSQL no publica el puerto 5432 en Internet.
- Las API públicas validan esquema, origen, tamaño y límite de frecuencia.
- Turnstile se valida en servidor para las solicitudes públicas.
- Las sesiones administrativas usan cookies `HttpOnly`, `Secure` y `SameSite=Lax`.
- Las acciones administrativas se registran y los perfiles se archivan en vez de borrarse.
- Las imágenes se validan por tipo, tamaño y dimensiones antes de almacenarse.

## Despliegue

1. GitHub conserva el código fuente.
2. Una imagen multi-stage compila Next.js con salida `standalone`.
3. Staging recibe la imagen y ejecuta migraciones explícitas.
4. Las pruebas de humo validan inicio, Underground, API y administración.
5. Producción recibe la misma imagen verificada.
6. La versión anterior permanece etiquetada para rollback.

El contenedor nunca montará el repositorio completo como `/usr/share/nginx/html`; esto evita volver a exponer `docker-compose.yml`, configuraciones o futuros secretos.

## Copias de seguridad

- `pg_dump` diario cifrado.
- Retención: 7 diarias, 5 semanales y 6 mensuales.
- Copia secundaria en `obsidian` con una clave exclusiva servidor-a-servidor.
- Prueba de restauración mensual sobre una base temporal.
- Las copias incluyen base de datos y recursos subidos, pero no imágenes Docker reconstruibles.

## Capacidad inicial

El servidor principal dispone de margen suficiente para esta arquitectura. PostgreSQL tendrá límites de memoria conservadores porque comparte host con otros contenedores. Se configurarán healthchecks, rotación de logs y alertas por disco, memoria y fallos de backup.
