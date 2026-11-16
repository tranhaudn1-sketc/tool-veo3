# --- Giai đoạn 1: Cài đặt Dependencies ---
FROM node:22-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# --- Giai đoạn 2: Builder & Compile ---
FROM node:22-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Đảm bảo thư mục public luôn tồn tại
RUN mkdir -p /app/public

ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
ENV DATABASE_URL="file:/app/prisma/dev.db"

# Khởi tạo Prisma Client, database SQLite template và build Next.js Standalone
RUN npx prisma generate
RUN npx prisma db push
RUN cp /app/prisma/dev.db /app/prisma/template.db
RUN npm run build

# --- Giai đoạn 3: Runner Môi trường Production ---
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Cài đặt ffmpeg và openssl cho việc xử lý video/prisma
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Tạo user nextjs với thư mục home đầy đủ quyền
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 -g nodejs -m -d /home/nextjs nextjs

ENV HOME=/home/nextjs

# Tạo sẵn các thư mục storage và cấp quyền cho user nextjs
RUN mkdir -p /app/storage/images /app/storage/videos /app/storage/thumbnails /app/storage/uploads /app/prisma
RUN chown -R nextjs:nodejs /app/storage /app/prisma /home/nextjs

# Copy artifacts từ builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

# Tự động sao chép template.db nếu dev.db chưa tồn tại và chạy thẳng server Node.js
CMD ["sh", "-c", "if [ ! -f /app/prisma/dev.db ] && [ -f /app/prisma/template.db ]; then cp /app/prisma/template.db /app/prisma/dev.db; fi && node server.js"]
