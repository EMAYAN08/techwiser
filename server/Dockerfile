FROM node:22-bookworm-slim

WORKDIR /app

# Puppeteer is not used by the Node API. Python scrapling is a separate service
# (set PYTHON_SCRAPER_URL). This image stays on stock Node.
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
