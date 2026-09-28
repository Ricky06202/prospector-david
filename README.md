# Prospector David 🎯

Pipeline end-to-end de prospección local: **scraper Places → copys de WhatsApp** (envío 100% manual para proteger tu cuenta).

> **Objetivo (modelo IaaS de suscripciones):** generar **$200+/mes recurrentes** vendiendo
> **ACCESO INMEDIATO** a la *Nube Privada Soberana* — plataforma ya lista, corriendo y
> automatizada (Coolify/Dokploy + Storj). Nada de desarrollo a medida ni setups uno por uno.
> **3 planes, sin negociación:** Básico $10/mes (50GB) · Pro $25/mes (200GB + sync móvil +
> backup diario) · Negocio $50/mes (500GB + 3 usuarios + soporte prioritario WhatsApp).
> **Público (filtrado por velocidad):** freelancers, creadores de contenido, consultores
> independientes y pequeños negocios con datos sensibles SIN equipo IT (estudios contables,
> abogados junior, clínicas pequeñas), gente cansada de Drive/iCloud. **EXCLUIR:** grandes
> empresas/corporativos lentos (proxy: `SCORE_RESENAS_MAX`) y buscadores de desarrollo custom.

### Reglas implementadas en el código
1. **Filtros de búsqueda** (`src/scraper/places.ts`): giros sensibles (abogados,
   contadores, clínicas, consultorios, seguros…) **+ independientes/creadores**
   (fotógrafos, diseñadores, nutricionistas, entrenadores, traductores… —
   `GIROS_INDEPENDIENTES`, deciden y pagan sin comité). **Excluidos**: retail/gastro/
   marketing/corporativos (`GIROS_EXCLUIDOS`) y negocios con más de
   `SCORE_RESENAS_MAX` reseñas (compra lenta con comité).
2. **Lead Scoring** (`src/lib/lead-scoring.ts`): independiente +45 / giro sensible +50,
   rating y cartera activa. **La web propia es irrelevante.** Default `SCORE_MODO=filter`.
3. **Mensaje 1 — apertura** (tono *solución inmediata*, no presupuesto): "¿Sabías que
   podés tener tu propia nube privada cifrada donde ni yo puedo ver tus archivos? Ya
   está lista, sin instalaciones; desde $10-$25 al mes, más barato que Dropbox. ¿Te paso
   el link para activarlo en 2 minutos?" Personalizado con `temaPorTipo()`. **Sin enlaces,
   sin emojis y sin palabras crypto** (el guardia `esMensajeAperturaSeguro` también
   bloquea "pago único"/"setup" del modelo viejo). **Volumen: 30-50/día** (`WA_MAX_SESION=40`).
4. **Mensaje 2 — activación** (SOLO tras respuesta): **no se explica tecnología**; va el
   `PLATAFORMA_URL` (link de registro/pago de .env) + los 3 planes + "todo se gestiona
   desde tu panel; si algo falla, lo resuelvo en minutos". Pago: USDC sin comisiones o
   transferencia (+10%).
5. **Regla de ORO anti-fricción** (`mensajeFueraDePlanes` + botón 🚫 en la GUI): si pide
   algo fuera de los 3 planes (2TB, instalar X software, a medida) → NO educado:
   "la plataforma está optimizada para estos 3 niveles; quizá no sea tu mejor opción".
6. **Seguimiento ÚNICO a las 48h**: un solo mensaje entre día 2 y 7; después, descartado.
7. **Cotizador** (`src/lib/precios.ts`): `planesNube()` — menú fijo de $10/$25/$50 en
   texto y PDF. El objetivo del pipeline es el **MRR**, no el cobro único.

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
bun run places        # MÓDULO 1c: Google Places API con LEAD SCORING — nichos de datos sensibles
                      #   (config: PLACES_QUERIES · PLACES_LIMITE · SCORE_MODO=filter · SCORE_MINIMO)
bun run build:landings # (LEGACY) landings de muestra del embudo viejo — ya no se usan
bun run capturar      # (LEGACY) capturas de landings — ya no se usan
bun run envio         # MÓDULO 4: secuencia anti-ban (apertura sin enlaces + link de activación) + lista + reporte HTML
bun run pipeline      # = build + capturar + envio (respeta el lote activo; módulos legacy no afectan el flujo)
```

### Control diario (10 al día, sin repetir)
1. `bun run gui` → "Preparar lote" con 10 → "Generar capturas y reporte".
2. Revisa cada tarjeta, envía por WhatsApp y marca **Enviado**.
3. Los enviados quedan marcados y **no vuelven a salir nunca**; al otro día preparas otros 10.

## 4. El Asistente Humano (envío manual + anti-ban)

```bash
xdg-open output/reporte_envio.html
```
Cada tarjeta muestra la **secuencia anti-ban** (mensaje 1 = apertura sin enlaces ni crypto;
mensaje 2 = link de activación + los 3 planes) con los delays recomendados entre envíos. **Abre, revisa y envía tú mismo. Nada se
envía solo.**

- **En David el mensaje 1 no lleva enlaces**: la gente teme las estafas. La apertura es
  corta y sin nada adjunto; si el dueño responde, el **mensaje 2** lleva el link de
  activación de la plataforma (`PLATAFORMA_URL`) — directo, sin explicaciones técnicas.
- Respeta el ritmo: `WA_DELAY_BASE` + `WA_DELAY_JITTER` (ms) entre envíos, pausa larga cada
  `WA_PAUSA_CADA` envíos, factor nocturno x2.5 de 22h a 7h.
- `output/lista_envio.json` = versión estructurada para herramientas (incluye `mensajes[]`,
  `config_anti_ban` y `ritmo_sugerido`).

### 📡 Retoma (mensaje 2 aunque hayan pasado semanas/meses)

La mayoría no responde ni lee el primer mensaje. La pestaña **Seguimientos** de la GUI
agrupa a los contactados que no cerraron y genera un **mensaje de retoma** adaptado a los
regla operativa 4 — UN solo seguimiento:

- **< 48 h** → aún no entra a la lista (espera).
- **2-7 días** → retoma única y amable (con salida elegante si no aplica).
- **> 7 días sin respuesta** → se descarta; no hay segundo intento.

Cada tarjeta de seguimiento muestra los días, el mensaje listo (`wa.me`) y las acciones
(Interesado / Reagendar / No). Los datos viven en `output/seguimientos.json` y en el estado
`seguimiento` de cada prospecto (el reloj parte de `ultimo_contacto`).

### Flujo completo de envío (día a día)

1. **Preparar lote** (10 nuevos) → **Generar capturas y reporte**.
2. Envía el **mensaje 1** (apertura, sin enlaces) a todos, abriendo cada `wa.me`.
   Luego pulsa **"✓ Marcar todos como Enviado"** (o marca uno por uno).
3. Cada tarjeta de la pestaña **Seguimientos** tiene un selector:
   - **Retoma 48h (única)** → el UNICO seguimiento; pasados 7 días queda descartado.
   - **Mensaje 2 · Link de activación** → cuando responde, le mandás el link. Listo: se
     suscribe solo desde la plataforma (proceso automático, esfuerzo cero).
4. Si duda → botón **🚫 Fuera de planes** cuando pida algo que no está en los 3 planes.
   Meta: 150-250 contactos/sem → 8-15 respuestas → **5-10 suscriptores nuevos/semana**.

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

El flujo que convierte: scrapea (Places con scoring de giros sensibles/independientes) →
revisa el reporte → envía manualmente 30-50 contactos/día (mensaje 1 = apertura sin enlaces
ni crypto; mensaje 2 = **link de activación** tras la respuesta; UN retoma a las 48h) → el
cliente se suscribe solo en la plataforma (automatizada, no tocas nada) → cobras en USDC
sin comisiones, tarjeta o transferencia (+10%).

**Metas del modelo:** Mes 1 = ~$100-150 (validación) · Mes 2+ = **>$200/mes MRR** ·
5-10 suscriptores nuevos/semana. Regla de oro: si no cabe en los 3 planes, se dice que NO —
filtramos curiosos para enfocarnos en quien paga rápido.

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
