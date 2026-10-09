# Prospector David 🎯

Pipeline end-to-end de prospección local para negocios de **David, Chiriquí**:
**scraper → landings Astro → capturas → copys de WhatsApp** (envío 100% manual para proteger tu cuenta).

> **Filosofía:** la landing automática es un *gancho de venta*, no el producto final.
> Su trabajo es que el cliente diga "sí" al paquete de **Nivel 1** ($300, landing en 24 h).
> Una vez dentro, el **Nivel 2** (Plataforma Operativa / Dashboard, desde $1,200) es el
> upsell institucional que se vende bajo la garantía de la empresa matriz.

### Las 4 mejoras estratégicas
1. **Lead Scoring**: el motor de Places API puntúa y prioriza negocios tradicionales
   (agro, logística, construcción, servicios) con buena reputación (+4.0★, +50 reseñas)
   que NO tienen web (o la tienen deficiente). Cada prospecto guarda `lead_score`,
   `tier_lead` y `scoring_motivo` y entra ordenado de mejor a peor.
2. **Anti-ban WhatsApp**: el primer mensaje es una *apertura* corta **sin enlaces, PDFs
   ni imágenes** (lo valida `esMensajeAperturaSeguro`). El material pesado va en el
   mensaje 2, solo tras la respuesta del dueño. Delays dinámicos con jitter, pausas
   cada N envíos y factor nocturno (ver `WA_*` en `.env`). **En David no se mandan
   enlaces ni emojis** (`ENVIAR_ENLACES=false`): la muestra se entrega como imágenes
   adjuntas. Quien no respondió entra en **Seguimientos** con un mensaje de retoma
   adaptado a los días transcurridos (se re-envía aun tras un mes).
3. **Cotizador escalonado** ("Caballo de Troya"): Nivel 1 = Landing en 24 h por $300 ·
   Nivel 2 = Plataforma Operativa / Dashboard desde $1,200 bajo el paraguas de
   **Topografía Especializada S.A.** Texto y PDF en 2 niveles (GUI → Cotizador escalonado).
4. **Pipeline de prototipado optimizado**: una sola instancia de Chromium para todo el
   lote, espera por fuentes (no sleeps fijos), capturas **JPEG livianas por defecto**
   (las 6 imágenes ≈ 1MB, cargan al instante en WhatsApp), salta lo ya capturado
   (`SS_SALTAR`) y el build de landings es incremental (`build-landings.ts`).

---

## 1. Requisitos

- **Bun** (`bun run …`)
- **Chromium** para las capturas (el proyecto ya apunta a uno de nix; ajusta
  `CHROMIUM_PATH` en `.env` si usas otro).

## 2. Configuración (una vez)

```bash
cp .env.example .env
# edita .env:
#   PROSPECTO_DIR_URL  = fuente del directorio (ej. camchi)
#   DEEPSEEK_API_KEY   = tu key de DeepSeek (opcional; sin ella usa plantillas)
#   SOLO_SIN_WEB       = true → solo prospecta negocios SIN web propia
#   NICHO              = filtra por giro (ej. "Servicios", "Restaurantes"); vacío = todos
#   SECCIONES          = capturas por dispositivo (ej. "hero,servicios,ubicacion")
#   SCORE_*            = umbrales del Lead Scoring (rating, reseñas, puntaje)
#   WA_*               = ritmo anti-ban (delays, pausas, tope de sesión)
#   URL_PUBLICA        = dominio público de los prototipos (para el mensaje 2)
bun install
cd generator && bun install && cd ..
```

> ⚠️ `.env` está en `.gitignore`. **Jamás** subas la key ni los datos reales al repo público.

## 3. Uso (flujo normal)

### Interfaz visual (recomendado) 🖥️
```bash
bun run gui          # abre http://localhost:4877
```
En la GUI puedes:
- **Preparar lote del día** (ej. 10): toma los N prospectos *nuevos* y los marca "en cola".
- **Generar capturas y reporte**: corre el pipeline solo para el lote activo.
- Ver cada prospecto con sus **fotos por carpeta**, el **copy de DeepSeek** y el enlace `wa.me`.
- **Marcar enviado / no interesado / reagendar**: los enviados **nunca se repiten**.

### Línea de comandos
```bash
bun run seed          # (opcional) fusiona los 8 clientes reales (no borra nada)
bun run scrape        # MÓDULO 1a: directorio CAMCHI (API WordPress) — teléfonos +507, dedup, sin-web
bun run gmaps         # MÓDULO 1b: Google Maps de David — teléfonos + web + COORDENADAS + rating (best-effort)
                      #   (config: GMAP_QUERIES="restaurantes en David, salones en David" · GMAP_LIMITE=15)
bun run places        # MÓDULO 1c: Google Places API con LEAD SCORING — prioriza sin-web + reputación
                      #   (config: PLACES_QUERIES · PLACES_LIMITE · SCORE_RATING_MIN/RESENAS_MIN/MINIMO)
bun run build:landings # MÓDULO 2: genera las landings del lote activo (incremental, salta lo fresco)
bun run capturar      # MÓDULO 3: capturas móvil + PC por sección (1 navegador, salta lo capturado)
bun run envio         # MÓDULO 4: secuencia anti-ban (apertura sin enlaces + muestra) + lista + reporte HTML
bun run pipeline      # = build + capturar + envio (respeta el lote activo)
```

### Control diario (10 al día, sin repetir)
1. `bun run gui` → "Preparar lote" con 10 → "Generar capturas y reporte".
2. Revisa cada tarjeta, envía por WhatsApp y marca **Enviado**.
3. Los enviados quedan marcados y **no vuelven a salir nunca**; al otro día preparas otros 10.

## 4. El Asistente Humano (envío manual + anti-ban)

```bash
xdg-open output/reporte_envio.html
```
Cada tarjeta muestra la **secuencia anti-ban** (mensaje 1 = apertura sin enlaces; mensaje 2 =
muestra) con los delays recomendados entre envíos. **Abre, revisa y envía tú mismo. Nada se
envía solo.**

- **En David no se mandan enlaces** (`ENVIAR_ENLACES=false`): la gente teme las estafas. El
  mensaje 1 es una apertura corta sin nada; si el dueño responde, envías el **mensaje 2**
  adjuntando las **imágenes** del prototipo (las capturas aparecen en la tarjeta).
- Respeta el ritmo: `WA_DELAY_BASE` + `WA_DELAY_JITTER` (ms) entre envíos, pausa larga cada
  `WA_PAUSA_CADA` envíos, factor nocturno x2.5 de 22h a 7h.
- `output/lista_envio.json` = versión estructurada para herramientas (incluye `mensajes[]`,
  `config_anti_ban` y `ritmo_sugerido`).

### 📡 Retoma (mensaje 2 aunque hayan pasado semanas/meses)

La mayoría no responde ni lee el primer mensaje. La pestaña **Seguimientos** de la GUI
agrupa a los contactados que no cerraron y genera un **mensaje de retoma** adaptado a los
días transcurridos desde el último contacto:

- **1-7 días** → nudge corto (¿lo vieron?).
- **8-30 días** → retoma (el primer mensaje se pierde, reenvío con imágenes).
- **>30 días** → retoma en frío (re-apertura como si fuera nuevo, con las vistas).

Cada tarjeta de seguimiento muestra los días, el mensaje listo (`wa.me`), sus capturas y
acciones (Interesado / Reagendar / No). Así puedes re-enviar la muestra a un cliente que
no respondió, aunque haya pasado un mes. Los datos viven en `output/seguimientos.json` y en
el estado `seguimiento` de cada prospecto (el reloj parte de `ultimo_contacto`).

### Flujo completo de envío (día a día)

1. **Preparar lote** (10 nuevos) → **Generar capturas y reporte**.
2. Envía el **mensaje 1** (apertura, sin enlaces) a todos, abriendo cada `wa.me`.
   Luego pulsa **"✓ Marcar todos como Enviado"** (o marca uno por uno).
3. Cada tarjeta de la pestaña **Seguimientos** tiene un selector:
   - **Retoma (no respondió)** → mensaje adaptado a los días + imágenes.
   - **Mensaje 2 · Muestra (respondió)** → cuando el cliente te responde, usa esta opción
     para enviarle la muestra con las 6 imágenes.
4. El que responde → lo pasas a **Interesado** → cierras con el cotizador escalonado.

## 5. Reglas del scraper (camchi y Places)

- Descubre listings vía **API REST de WordPress** (`wpbdp_listing`) o la **Places API (New)**.
- Por cada listing lee su página y extrae el **JSON-LD LocalBusiness** (teléfono).
- **Dedupe** por id, por teléfono y por nombre normalizado.
- **Filtro sin-web**: si el listing revela dominio propio (fuera del directorio y de
  redes), se excluye cuando `SOLO_SIN_WEB=true`.
- **Lead Scoring (Places)**: rating + reseñas + giro tradicional + ausencia de web
  puntúan cada lead (0-100). Solo entran los que pasan `SCORE_RATING_MIN`/`SCORE_RESENAS_MIN`/
  `SCORE_MINIMO`. Las webs propias se chequean ligero (`ANALIZAR_WEB`): si son deficientes
  (caídas, sin vista móvil, casi vacías) el negocio **sigue siendo lead**.
- **Colores e iconos por giro**: cada negocio recibe `color_accent` e icono según su
  categoría, y la landing varía su estructura (gastronomía → especialidades con
  precios, belleza → precios, automotriz → CTA de cotización, salud → confianza).

## 6. Limitaciones honestas

- **Coordenadas**: camchi no las publica. Las landings de prospectos nuevos usan el
  centro de David. Cuando el cliente cierre, pídele su dirección exacta, edita
  `coordenadas` en `data/prospectos.json` y re-corre `build:landings` + `capturar`.
- **Dirección**: idem, viene genérica. El humano la afina al vender.
- **Estructura**: las variantes por giro cubren los casos comunes; negocios con
  categoría genérica ("Servicios") usan la plantilla base.

## 7. Consejo de negocio

El flujo que convierte: scrapea (Places con scoring) → revisa el reporte → envía manualmente
siguiendo el ritmo anti-ban (mensaje 1 = apertura sin enlaces, mensaje 2 = muestra tras la
respuesta) → muestra la maqueta → cierra el **Nivel 1** ($300, landing en 24 h) → ahí sí
construyes la landing personalizada (con su color, fotos reales y mapa con pin).

Una vez que el negocio confía en ti, abre el **Nivel 2**: la *Plataforma Operativa /
Dashboard a la medida* (desde $1,200), cotizada bajo la garantía de la empresa matriz
(Topografía Especializada S.A.). El caballo de Troya: la landing de $300 abre la puerta;
el dashboard institucional paga el margen.

## 8. Despliegue en GitHub

```bash
git init
git add .
git commit -m "Prospector David: pipeline de prospección local"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/prospector-david.git
git push -u origin main
```
> `data/prospectos.json`, `.env` y `output/` están en `.gitignore` — en el repo solo
> va el código. Un clon nuevo debe correr `cp .env.example .env`, `bun install`,
> `cd generator && bun install`, y `bun run seed` + `bun run scrape`.

## 9. Despliegue en tu NAS (Docker)

Empaquetado con Chromium incluido para las capturas y el scraper de Google Maps.

```bash
git clone git@github.com:Ricky06202/prospector-david.git
cd prospector-david
cp .env.example .env          # pon tu DEEPSEEK_API_KEY
docker compose up -d --build
# abre http://IP_DEL_NAS:4877
```

**Persistencia** (volúmenes): `./data` (prospectos), `./output` (capturas, lote, reportes)
y `./.env` (tu key). Si `data/` está vacío, el entrypoint lo siembra con los 8 clientes
la primera vez. El contenedor se reinicia solo (`restart: unless-stopped`).

Para actualizar: `git pull && docker compose up -d --build`.
