FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

# Dev server with hot-reload (docker-compose mounts the source as a volume).
# For production use `npm run build && npm run start`.
CMD ["npm", "run", "dev"]
