# Ktr3 Resources — desarrollo local

## Requisitos

- Node.js 24
- Docker con Compose
- El repositorio `ktr3-links-v2`

## Arranque desde cero

```bash
cp .env.example .env
npm install
npm run db:start
set -a
. ./.env
set +a
npm run db:migrate
npm run admin:create -- prod.ktr3@gmail.com Ktr3
npm run resources:seed
npm run resources:seed:oneshot
npm run dev
```

`admin:create` solicita y confirma la contraseña de forma oculta. No la pases como
argumento, no la escribas en documentación y no la guardes en el historial del
terminal. El comando carga el `.env` local automáticamente. En automatizaciones
de confianza, `ADMIN_PASSWORD` debe inyectarse
únicamente desde el gestor de secretos del entorno. Al cambiar la contraseña se
revocan todas las sesiones administrativas existentes.

Abre:

- Biblioteca pública: `http://localhost:3000/recursos`
- Panel: `http://localhost:3000/admin`

El recurso MIDI sembrado es solo una comprobación local y se puede archivar desde el panel.
El seed de one-shot publica un sonido original KTR3 con una preview independiente.

## Archivos locales

Con `RESOURCE_STORAGE_DRIVER=local`, los archivos se guardan en `.data/resources`. La carpeta está excluida de Git y de la imagen Docker. Nunca se deben colocar uploads en `public/`.

El límite inicial del archivo principal es 250 MB. Portadas y previews tienen límites separados de 8 MB y 30 MB.

## Email de desarrollo

`EMAIL_DRIVER=development` no envía correo real. Después de solicitar un recurso, la interfaz muestra un enlace privado de desarrollo para probar la descarga.

En producción debe usarse:

```dotenv
EMAIL_DRIVER=resend
RESEND_API_KEY=re_... # permiso Sending access, limitado a ktr3.es
RESEND_CONTACTS_API_KEY=re_... # permiso Full access; no se usa para enviar
RESEND_SEGMENT_ID=...
EMAIL_FROM=Ktr3 Resources <resources@ktr3.es>
```

El dominio remitente debe verificarse dentro de Resend antes de publicar. Crea también un segmento para la comunidad Ktr3: los contactos confirmados se añaden automáticamente y las bajas se sincronizan con Resend. Las dos claves están separadas deliberadamente para que una filtración de la clave usada en las entregas no permita administrar la audiencia.

Los recursos MIDI siempre se entregan por email. La aplicación genera un token opaco aleatorio, guarda únicamente su hash y envía un enlace que caduca en 24 horas. El archivo permanece en almacenamiento privado: nunca se publica su ruta interna ni una URL reutilizable.

### Preview automática de MIDI

Cuando el administrador sube un `.mid` o `.midi` sin preview manual, la aplicación genera una preview chiptune WAV automáticamente:

- PCM mono de 8 bits a 22.050 Hz;
- máximo 15 segundos y 192 notas melódicas;
- omite el canal MIDI 10 de percusión;
- no usa FFmpeg, plugins, samples, soundfonts ni servicios externos;
- se renderiza una sola vez y se almacena como asset `preview` privado;
- una preview MP3/WAV/OGG/M4A subida manualmente siempre tiene prioridad.

El navegador recibe únicamente el WAV generado mediante el endpoint público de preview. El MIDI original continúa protegido por el flujo de entrega por email. Para completar recursos antiguos que todavía no tengan preview:

```bash
node --env-file=.env --env-file=.env.local scripts/backfill-midi-previews.mjs
```

El comando es idempotente: ignora recursos que ya tienen una preview.

## Protección de entregas

Antes de crear el enlace se aplican tres controles sin servicios de pago adicionales:

- Cloudflare Turnstile bloquea automatizaciones básicas.
- Una lista local rechaza dominios conocidos de correo temporal. La lista reduce el abuso, pero no pretende demostrar que todos los proveedores desconocidos sean permanentes.
- PostgreSQL limita solicitudes aceptadas a 5 por email/hora, 10 por IP/hora, 30 por IP/día y 90 globales/día. El límite global deja margen dentro del máximo diario del plan gratuito de Resend.

Las direcciones IP no se guardan en claro. Email e IP se convierten en identificadores HMAC con un secreto exclusivo y los registros de control se eliminan después de 24 horas. Para producción configura valores secretos distintos:

```dotenv
RESOURCE_RATE_LIMIT_SECRET=valor-aleatorio-de-al-menos-32-caracteres
RESOURCE_EMAIL_LIMIT_PER_HOUR=5
RESOURCE_IP_LIMIT_PER_HOUR=10
RESOURCE_IP_LIMIT_PER_DAY=30
RESOURCE_GLOBAL_LIMIT_PER_DAY=90
```

Puedes actualizar manualmente la lista pública y versionada de dominios temporales con:

```bash
npm run security:refresh-disposable-emails
```

La descarga de la lista solo ocurre al ejecutar ese comando de mantenimiento; una solicitud pública no depende de GitHub ni de una API externa.

Los valores reales se configuran en el gestor de secretos del servidor. No se
pegan en chats, incidencias, documentación, commits ni capturas de pantalla.

## Cloudflare R2

El driver local funciona en producción mediante volumen Docker, pero R2 evita que las descargas consuman el ancho de banda del VPS.

```dotenv
RESOURCE_STORAGE_DRIVER=r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=ktr3-resources
```

El bucket debe ser privado. La aplicación genera URLs firmadas de corta duración después de validar la descarga.

Cuando uses R2, activa versionado/retención en el bucket o añade una segunda copia periódica: `backup-resources.sh` cubre el volumen Docker local, no los objetos remotos. Si EasyPanel cambia el nombre del volumen, ejecuta el backup con `RESOURCE_VOLUME_NAME=nombre_real`.

## Mantenimiento

```bash
npm run cleanup:expired
npm test
npm run build
```

`cleanup:expired` elimina sesiones caducadas, grants agotados y registros antiguos de intentos de login; no borra recursos ni suscriptores.
También elimina las huellas pseudónimas de solicitudes de recursos al superar 24 horas.
