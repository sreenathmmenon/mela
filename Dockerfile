# Mela is a static single-page app. Build it with the full toolchain, then serve
# the compiled assets from a minimal image that carries no build tooling.
FROM node:22-alpine AS build
WORKDIR /app

# Pin pnpm to the major used by this repository. Letting
# corepack pick "latest" pulled pnpm 12, whose minimumReleaseAge supply-chain
# policy rejects the lockfile: spacetimedb 2.10.0 is newer than its quarantine
# window, so the build failed on a policy the rest of the project does not use.
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

# Install against the lockfile first so this layer caches across source edits.
# pnpm, with the same --frozen-lockfile used in local verification.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Railway serves from the domain root, so this uses the default `build` target.
RUN pnpm run build
RUN pnpm run build:transport

FROM node:22-alpine AS serve
WORKDIR /app
ENV NODE_ENV=production

# One bundled runtime serves the static frontend and the MCP transport.
# It has no game rules or database-owner credentials.

COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server

# Railway injects PORT; the transport reads it at startup.
CMD ["node", "dist-server/server.cjs"]
