# Development stage
FROM node:22-slim AS development

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Production stage
FROM node:22-slim AS production

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --only=production

# Copy build output from development
COPY --from=development /usr/src/app/dist /usr/src/app/dist

CMD ["node", "dist/main.js"]
