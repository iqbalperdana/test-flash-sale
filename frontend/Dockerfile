# Stage 1: Build the frontend
FROM node:22-alpine AS builder
WORKDIR /app
# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci
# Copy source files
COPY . .
# Build the Vite React project
RUN npm run build

# Stage 2: Production Nginx image
FROM nginx:alpine AS runner

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy frontend build from builder to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose frontend port (Nginx default is 80, mapped in compose)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
