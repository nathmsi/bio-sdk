# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/protocol/package.json packages/protocol/
COPY apps/server/package.json apps/server/
COPY tsconfig.base.json ./

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY packages/protocol packages/protocol
COPY apps/server apps/server

RUN pnpm --filter @bio-sdk/protocol build
RUN pnpm --filter @bio-sdk/server build

# pnpm deploy creates a self-contained bundle with real node_modules (no symlinks)
RUN pnpm --filter @bio-sdk/server deploy --prod /app/deploy

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

RUN addgroup -S biosdk && adduser -S biosdk -G biosdk

COPY --from=builder --chown=biosdk:biosdk /app/deploy ./

USER biosdk

ENV NODE_ENV=production
ENV PORT=9000
EXPOSE $PORT
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["node", "dist/index.js"]
