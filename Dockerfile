# Mela is a static single-page app. Build it with the full toolchain, then serve
# the compiled assets from a minimal image that carries no build tooling.
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

# Install against the lockfile first so this layer caches across source edits.
# pnpm, with the same --frozen-lockfile as .github/workflows/deploy-pages.yml.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Railway serves from the domain root, so this is the default `build` target
# (base "/"), not `build:pages` (base "/mela/", for GitHub Pages).
RUN pnpm run build

FROM node:22-alpine AS serve
WORKDIR /app
ENV NODE_ENV=production

# `serve` is the whole runtime: no source, no dev dependencies.
RUN npm install --global serve@14

COPY --from=build /app/dist ./dist

# Railway injects PORT; sh -c lets the variable expand at start time.
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
