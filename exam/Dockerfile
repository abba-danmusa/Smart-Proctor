FROM node:alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist
COPY .env ./

CMD ["node", "dist/index.js"]
