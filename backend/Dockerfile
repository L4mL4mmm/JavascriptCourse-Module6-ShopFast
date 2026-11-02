# ==========================================
# Stage 1: Build Application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies if needed
RUN apk add --no-cache python3 make g++

# Copy dependency manifests
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source files
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# Remove development dependencies to prepare clean production modules
RUN npm prune --production

# ==========================================
# Stage 2: Minimal Production Image (<200MB)
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Install security updates & curl for healthchecks
RUN apk add --no-cache curl tzdata && \
    cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime && \
    echo "Asia/Ho_Chi_Minh" > /etc/timezone

# Run as non-root user for security compliance
USER node

# Copy built application and production dependencies only
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist
COPY --chown=node:node package*.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
