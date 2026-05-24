FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend
COPY backend/package*.json backend/
WORKDIR /app/backend
RUN npm ci --only=production

COPY backend/ .
RUN npx prisma generate

FROM node:20-alpine

WORKDIR /app

# Copy built backend
COPY --from=builder /app/backend /app/backend
COPY --from=builder /app/backend/node_modules /app/backend/node_modules

WORKDIR /app/backend

EXPOSE 3001

CMD ["node", "src/server.js"]
