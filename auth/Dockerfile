# Use a build stage to compile TypeScript
FROM node:alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Production image, copy only necessary files
FROM node:alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy any other files needed at runtime (e.g., .env)
COPY .env ./

CMD ["node", "dist/index.js"]