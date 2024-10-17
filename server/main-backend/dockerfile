
FROM node:22-alpine as ts-compiler

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./

RUN npm install

COPY . ./
RUN npm run build

FROM node:22-alpine as ts-remover

WORKDIR /app

COPY --from=ts-compiler /app/package*.json ./
COPY --from=ts-compiler /app/main-backend-build ./

RUN npm install --only=production

FROM node:22-alpine


WORKDIR /app
COPY --from=ts-remover /app ./

ENV NODE_ENV=production

RUN mkdir -p log/

# Copy the .env file to the container
COPY .env .env

# Set environment variables from the .env file using a shell command
RUN export $(grep -v '^#' .env | xargs)

EXPOSE 7070

CMD ["node", "api/BackendApp_Api.js"]

