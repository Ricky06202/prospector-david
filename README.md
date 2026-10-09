# Prospector David 🎯

Pipeline end-to-end de prospección local: **scraper Places → copys de WhatsApp** (envío 100% manual para proteger tu cuenta).

> **Objetivo (reestructurado):** vender **configuración de nube privada cifrada por $50**
> (pago único = setup + capacitación + primer mes de hosting; después $10/mes o export de
> datos gratis). El público es quien maneja **información confidencial**: abogados y
> estudios jurídicos, contadores, clínicas y consultorios (médicos/psicológicos),
> consultores y pequeños negocios con datos sensibles. **NO se venden landing pages ni
> servicios de marketing** (el pipeline de landings/capturas queda legacy, intacto pero fuera del flujo).

### Reglas del nuevo objetivo (implementadas en el código)
1. **Filtros de búsqueda** (`src/scraper/places.ts`): solo giros sensibles — abogados,
   notarías, contadores, auditoría, clínicas, consultorios médicos/psicológicos,
   laboratorios, seguros, inmobiliarias, consultoras, colegios. **Excluidos**: retail,
   restaurantes, tiendas online y agencias de marketing (`GIROS_EXCLUIDOS`).
2. **Lead Scoring** (`src/lib/lead-scoring.ts`): puntúa por giro sensible (+50),
   reputación y tamaño de cartera. **La web propia es irrelevante** — un abogado con
   web perfecta también paga $50 por soberanía de datos. Default `SCORE_MODO=filter`.
3. **Mensaje 1 — apertura**: describe sus datos sensibles por giro (`temaPorTipo`),
   ofrece la nube privada cifrada y **JAMÁS menciona crypto/USDC/blockchain**
   (regla 5; `esMensajeAperturaSeguro` lo bloquea automáticamente). Sin enlaces, sin
   emojis, sin imágenes. **Tope diario: 20-30 contactos** (`WA_MAX_SESION=25`).
4. **Mensaje 2 — detalles** (solo tras respuesta): los 4 puntos del servicio, la
   comparación con Google Drive y las formas de pago — USDC sin comisiones o
   transferencia (+10%). Aquí sí se puede decir USDC.
5. **Manejo de objeciones** en `mensajeCierre` / `generarRespuesta`: "Drive es compartido
   y escanea tus datos", "los $50 son pago único por soberanía real", "tu tiempo vale más
   que 40 horas de prueba y error".
6. **Seguimiento ÚNICO a las 48h** (regla 4): un solo mensaje amable entre el día 2 y el
   7; pasado ese margen se descarta — nada de re-envíos eternos.
7. **Cotizador** (`src/lib/precios.ts`): oferta única $50 + continuidad $10/mes o export
   gratis, en texto y PDF bajo el respaldo de la empresa matriz.

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
bun run envio         # MÓDULO 4: secuencia anti-ban (apertura sin enlaces + detalles) + lista + reporte HTML
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
mensaje 2 = detalles con precio y formas de pago) con los delays recomendados entre envíos. **Abre, revisa y envía tú mismo. Nada se
envía solo.**

- **En David no se mandan enlaces** (`ENVIAR_ENLACES=false`): la gente teme las estafas. El
  mensaje 1 es una apertura corta sin nada; si el dueño responde, envías el **mensaje 2**
  con los detalles — todo el valor cabe en texto (no hace adjuntar imágenes).
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
   - **Retoma (no respondió)** → el ÚNICO seguimiento a las 48h.
   - **Mensaje 2 · Detalles (respondió)** → cuando el cliente te responde, envía los 4
     puntos con precio, continuidad y formas de pago.
4. El que responde → lo pasas a **Interesado** → cierras con la cotización ($50 pago único;
   si duda, usa el mensaje de objeciones). Meta: 100 contactos/sem → 5-10 respuestas → 2-3 ventas.

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

El flujo que convierte: scrapea (Places con scoring de giros sensibles) → revisa el reporte
→ envía manualmente respetando el tope de 20-30 contactos/día (mensaje 1 = apertura sin
enlaces ni crypto; mensaje 2 = detalles tras la respuesta; UN retoma a las 48h) → cierras
la **nube privada cifrada por $50** (pago único con primer mes incluido) → cobras en USDC
sin comisiones o por transferencia (+10%).

Meta semanal: 100 negocios contactados → 5-10 respuestas → 2-3 ventas = **$100-150 USDC
netos**, más el recurring de $10/mes de quienes decidan quedarse.

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
