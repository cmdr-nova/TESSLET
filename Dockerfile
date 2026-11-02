FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    BODY_SIZE_LIMIT=12M \
    PROTOCOL_HEADER=x-forwarded-proto \
    UPLOAD_DIR=/data/uploads
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json server.js ./
COPY scripts ./scripts
COPY migrations ./migrations
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.js && node server.js"]
