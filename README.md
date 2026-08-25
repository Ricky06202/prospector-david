# Prospector David 🎯

Pipeline end-to-end de prospección local para negocios de **David, Chiriquí**:
**scraper → landings Astro → capturas → copys de WhatsApp** (envío 100% manual para proteger tu cuenta).

> **Filosofía:** la landing automática es un *gancho de venta*, no el producto final.
> Su trabajo es que el cliente diga "sí" al paquete de $300. Cuando te contratan,
> construyes la landing personalizada de verdad (como las 8 que hiciste a mano).

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
bun run scrape        # MÓDULO 1: extrae del directorio, filtra teléfonos (+507), dedup, sin-web
bun run build:landings # MÓDULO 2: genera las landings del lote activo
bun run capturar      # MÓDULO 3: capturas móvil + PC por sección (carpeta por prospecto)
bun run envio         # MÓDULO 4: copys (DeepSeek) + lista + reporte HTML
bun run pipeline      # = build + capturar + envio (respeta el lote activo)
```

### Control diario (10 al día, sin repetir)
1. `bun run gui` → "Preparar lote" con 10 → "Generar capturas y reporte".
2. Revisa cada tarjeta, envía por WhatsApp y marca **Enviado**.
3. Los enviados quedan marcados y **no vuelven a salir nunca**; al otro día preparas otros 10.

## 4. El Asistente Humano (envío manual)

```bash
xdg-open output/reporte_envio.html
```
Cada tarjeta muestra: copy de venta, las capturas (móvil y PC por sección) y el enlace
`wa.me` con el mensaje preescrito. **Abre, revisa y envía tú mismo.** Nada se envía solo.

`output/lista_envio.json` = versión estructurada para herramientas.

## 5. Reglas del scraper (camchi)

- Descubre listings vía **API REST de WordPress** (`wpbdp_listing`).
- Por cada listing lee su página y extrae el **JSON-LD LocalBusiness** (teléfono).
- **Dedupe** por id, por teléfono y por nombre normalizado.
- **Filtro sin-web**: si el listing revela dominio propio (fuera del directorio y de
  redes), se excluye cuando `SOLO_SIN_WEB=true`.
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

El flujo que convierte: scrapea → revisa el reporte → envía manualmente con el copy
de DeepSeek → muestra la maqueta → cierra el $300 → ahí sí construyes la landing
personalizada (con su color, fotos reales y mapa con pin). La calidad del prototipo
te abre la puerta; la calidad de la entrega te consigue la recomendación.

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
