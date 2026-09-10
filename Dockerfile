FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json bun.lock* package-lock.json* ./
RUN npm ci || npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./server.ts

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
