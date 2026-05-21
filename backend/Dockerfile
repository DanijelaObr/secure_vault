FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies with legacy peer deps
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production --legacy-peer-deps

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/main"]