FROM node:24-bookworm-slim AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Prisma generation validates only the URL shape and does not contact SQL Server.
RUN DATABASE_URL="sqlserver://localhost:1433;database=docker-build;schema=dbo;user=build;password=build;encrypt=true;trustServerCertificate=true;" \
    npm run prisma:generate

# Next.js imports the Prisma composition during its build, so non-secret placeholder
# values satisfy configuration validation without requiring a reachable database.
RUN DATABASE_SERVER="localhost" \
    DATABASE_PORT="1433" \
    DATABASE_NAME="docker-build" \
    DATABASE_USER="build" \
    DATABASE_PASSWORD="build" \
    DATABASE_ENCRYPT="true" \
    DATABASE_TRUST_SERVER_CERTIFICATE="true" \
    npm run build

FROM base AS runner

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"]

CMD ["node", "server.js"]
