# PostHog EU — configuración de KTR3 Links

## Estado

La integración está preparada en local y no se despliega automáticamente. El SDK solo se importa tras aceptar la categoría analítica. `/admin`, las rutas API y los formularios están excluidos.

## Configuración manual obligatoria en PostHog

1. Abrir el proyecto EU de KTR3.
2. Ir a `Settings → Project`.
3. Activar `Discard client IP data` en la configuración de captura de IP.
4. Comprobar que `Session replay` y `Heatmaps` están habilitados.
5. Mantener desactivada la grabación de consola.
6. Configurar una retención objetivo de 30 días para replays y 14 meses como máximo para analítica, si el plan lo permite.
7. No crear ni compartir una Personal API Key para la integración web.

## Prueba local manual

1. Ejecutar `npm run dev` y abrir `http://localhost:3000`.
2. Antes de elegir, comprobar en DevTools → Network que no existen peticiones a `posthog.com`.
3. Pulsar `Rechazar`: navegar y confirmar que PostHog continúa sin cargarse.
4. Abrir `Privacidad`, activar analítica y guardar.
5. Navegar a `/recursos`, hacer scroll, cambiar un filtro y reproducir una preview.
6. En PostHog, abrir `Activity` y comprobar que llegan `$pageview`, `scroll_depth_reached` y los eventos de recursos.
7. Entrar en `/admin/login` y confirmar que no aparece ningún evento ni replay de esa ruta.
8. Volver a una ruta pública y confirmar que la analítica puede reanudarse solo porque la preferencia sigue aceptada.

## Eventos propios

| Evento | Uso |
|---|---|
| `scroll_depth_reached` | Hitos 25, 50, 75 y 90 % |
| `link_clicked` | Navegación interna o dominio externo, nunca URL completa |
| `resource_card_viewed` | Recurso visible al 50 % |
| `resource_filter_selected` | Categoría y número de resultados |
| `resource_details_opened` | Interés en la descripción completa |
| `resource_preview_started` | Inicio de preview propio |
| `resource_preview_progress` | Progreso 25, 50 y 75 % |
| `resource_preview_completed` | Preview completada |
| `resource_download_requested` | Intención de descarga |
| `resource_gate_opened` | Apertura del formulario de entrega |
| `resource_gate_submitted` | Envío, sin nombre ni email |
| `resource_gate_completed` | Enlace preparado correctamente |
| `resource_gate_failed` | Error en el flujo de entrega |

## Embudos recomendados

### Recurso gratuito

`$pageview /recursos → resource_card_viewed → resource_preview_started → resource_download_requested → resource_gate_completed`

### Calidad del catálogo

`resource_preview_started → resource_preview_completed → resource_download_requested`

### Retención de comunidad

Evento de entrada: `resource_gate_completed`. Evento de retorno: `$pageview /recursos`, agrupado por semana.

## Datos que no deben capturarse

- Email, nombre, contraseña, token o respuesta de formulario.
- Query strings y fragmentos de URL.
- Contenido de `/admin` o rutas API.
- Consola del navegador.
- Contenido o tiempo de escucha dentro de Spotify.
- URLs externas completas; solo se conserva el dominio de destino.
