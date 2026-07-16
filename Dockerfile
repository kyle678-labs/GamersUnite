# GamersUnite production image
# Build:  docker build -t gamersunite:1.0 .
FROM node:22-slim AS base
# Prisma's query engine needs OpenSSL at runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Strip Windows line endings in case the repo was checked out with CRLF
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh
RUN npx prisma generate
# Build never connects to a DB (all routes are dynamic), but the env var must exist
RUN DATABASE_URL="file:./build.db" npm run build

FROM base AS runtime
ENV NODE_ENV=production
# SQLite lives on the mounted volume (see k8s/deployment.yaml)
ENV DATABASE_URL="file:/data/gamersunite.db"
COPY --from=build /app /app
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
