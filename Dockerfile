# ============================================================
#  Prospector David — imagen Docker
#  Bun (Debian) + Chromium (capturas/scraper de Google Maps)
# ============================================================
FROM oven/bun:1-debian

# Chromium y fuentes para que las capturas rendericen el texto.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencias de la raíz
COPY package.json bun.lock ./
RUN bun install

# Dependencias del generador Astro
COPY generator/package.json generator/bun.lock ./generator/
RUN cd generator && bun install

# Código fuente (data/, output/ y .env van por volúmenes, no se hornean)
COPY . .

RUN mkdir -p /app/data /app/output

ENV CHROMIUM_PATH=/usr/bin/chromium
ENV PORT=4877

EXPOSE 4877

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["bun", "run", "gui"]
