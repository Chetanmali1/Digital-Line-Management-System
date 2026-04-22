FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

FROM node:20-alpine AS production

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .

RUN mkdir -p logs && chown appuser:appgroup logs

USER appuser

EXPOSE 5000

CMD ["node", "index.js"]