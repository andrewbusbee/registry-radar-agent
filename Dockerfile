# Build stage
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime stage
FROM --platform=$BUILDPLATFORM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
# USER node  # Commented out to run as root for Docker socket access (like Portainer agent)
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]




