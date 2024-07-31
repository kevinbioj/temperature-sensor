FROM node:22.5.1 AS builder
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN pnpm install --frozen-lockfile

COPY src/ ./src/
RUN pnpm build

# ---

FROM node:22.5.1-alpine
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/dist/ ./dist/

CMD ["node", "dist/index.js"]
