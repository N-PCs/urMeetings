# ------------------------------------------------------------
# urMeetings — Cloud Run / Docker image
# Build: docker build -t urmeetings .
# Run:   docker run -p 8080:8080 --env-file .env.local urmeetings
# ------------------------------------------------------------
FROM oven/bun:1.1 AS builder
WORKDIR /app
COPY package.json bun.lockb* bunfig.toml* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
ENV NITRO_PRESET=node-server
RUN bun run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
# Nitro node-server preset outputs to .output/
COPY --from=builder /app/.output ./.output
EXPOSE 8080
CMD ["node", ".output/server/index.mjs"]