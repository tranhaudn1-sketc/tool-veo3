# --- Giai đoạn 1: Dependencies ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# --- Giai đoạn 2: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true

# Khởi tạo Prisma Client và build Next.js
RUN npx prisma generate
RUN npm run build

# --- Giai đoạn 3: Runner ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Cài đặt ffmpeg cho Linux container
RUN apk add --no-cache ffmpeg

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Tạo thư mục storage và cấp quyền
RUN mkdir -p /app/storage/images /app/storage/videos /app/storage/thumbnails /app/storage/uploads /app/prisma
RUN chown -R nextjs:nodejs /app/storage /app/prisma

# Copy artifacts từ builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
