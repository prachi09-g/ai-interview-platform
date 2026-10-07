# syntax=docker/dockerfile:1

# ==============================================================================
# AI Interview Preparation & Evaluation Platform — Frontend (Next.js) Dockerfile
#
# Build context must be the PROJECT ROOT (frontend/ is self-contained, but
# keeping the same context convention as backend.Dockerfile keeps
# docker-compose.yml simple). From the project root:
#   docker build -f frontend/Dockerfile -t ai-interview-frontend .
#
# Uses Next.js's `output: 'standalone'` (enabled in next.config.ts) — a
# pruned, self-contained server bundle that doesn't need the full
# node_modules copied into the final image.
# ==============================================================================

# ---- Stage 1: deps ----
FROM node:20-alpine AS deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

# ---- Stage 2: builder ----
FROM node:20-alpine AS builder
WORKDIR /app/frontend
COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend .

# NEXT_PUBLIC_* variables are inlined into the client JS bundle at BUILD
# time, not read at container runtime — a well-known Next.js Docker
# gotcha. Must be passed as a build ARG (docker build --build-arg or
# docker-compose's `args:`), not just an environment variable on the
# running container.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ---- Stage 3: production ----
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/frontend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
