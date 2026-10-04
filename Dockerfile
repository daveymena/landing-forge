FROM node:22-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev
ENV NODE_ENV=production
EXPOSE 3000
VOLUME ["/app/data", "/app/public"]
CMD ["npm", "start"]
