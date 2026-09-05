# Mela is a static single-page app. Build it with the full toolchain, then serve
# the compiled assets from a minimal image that carries no build tooling.
FROM node:22-alpine AS build
WORKDIR /app

# Pin pnpm to the major that .github/workflows/deploy-pages.yml uses. Letting
# corepack pick "latest" pulled pnpm 12, whose minimumReleaseAge supply-chain
# policy rejects the lockfile: spacetimedb 2.10.0 is newer than its quarantine
# window, so the build failed on a policy the rest of the project does not use.
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

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
