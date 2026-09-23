# Self-hosting image. Multi-stage so the final layer carries only the
# standalone server output, not the toolchain or dev dependencies.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Install scripts are needed here: Prisma's postinstall generates the client.
RUN npm ci --ignore-scripts=false

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The provider must be set at build time, because `prisma generate` bakes it in.
ARG DATABASE_PROVIDER=postgresql
ENV DATABASE_PROVIDER=$DATABASE_PROVIDER
# A URL is required for `prisma generate` to run, but is never connected to.
ENV DATABASE_URL=${DATABASE_URL:-postgresql://placeholder:placeholder@localhost:5432/placeholder}
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma's generated client and query engine, needed at runtime.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Schema and seed, so migrations can be run from inside the container.
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
