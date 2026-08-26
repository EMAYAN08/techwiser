FROM ghcr.io/puppeteer/puppeteer:22.0.0

USER root

# Setup working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Build TypeScript to JS
RUN npm run build

# Expose port and start
EXPOSE 3000
CMD ["npm", "start"]
