# Multi-arch Node server image.
FROM node:24-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY app.js otel.js rss.js server.js ./

EXPOSE 3000

USER node

CMD ["node", "server.js"]
