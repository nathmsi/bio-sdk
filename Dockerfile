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

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app

# Non-root user
RUN addgroup -S biosdk && adduser -S biosdk -G biosdk
USER biosdk

COPY --from=builder --chown=biosdk:biosdk /app/node_modules ./node_modules
COPY --from=builder --chown=biosdk:biosdk /app/packages/protocol/dist ./packages/protocol/dist
COPY --from=builder --chown=biosdk:biosdk /app/apps/server/dist ./apps/server/dist
COPY --from=builder --chown=biosdk:biosdk /app/apps/server/package.json ./apps/server/package.json

ENV NODE_ENV=production
# PORT is injected by Render (10000) or defaults to 9000 locally
ENV PORT=9000
EXPOSE $PORT
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["node", "apps/server/dist/index.js"]
