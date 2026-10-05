# Multi-stage production Dockerfile for Samata Sainik Dal (SSD) Platform
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Step 1: Dependencies installation
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Step 2: Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Step 3: Production runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/*.html ./
COPY --from=builder /app/*.css ./
COPY --from=builder /app/*.js ./

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api || exit 1

CMD ["npm", "start"]
