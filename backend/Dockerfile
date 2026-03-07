# Stage 1: Build the backend
FROM node:22-alpine AS builder
WORKDIR /app
# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci
# Copy source files
COPY . .
# Build the NestJS project
RUN npm run build
# Remove devDependencies to prepare for production image
RUN npm prune --production

# Stage 2: Production image
FROM node:22-alpine AS runner
WORKDIR /app

# Copy built artifacts and production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Expose backend port
EXPOSE 3000

# Start backend service
CMD ["node", "dist/main.js"]
