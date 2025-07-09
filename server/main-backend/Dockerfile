# ---------- Stage 1: Compile TypeScript ----------
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies needed to build the project
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm install

# Copy source files and compile
COPY . .
RUN npm run build


# ---------- Stage 2: Prune Dev Dependencies ----------
FROM node:24-alpine AS prod

WORKDIR /app

# Copy only what's needed from the builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/main-backend-build ./main-backend-build
RUN npm install --omit=dev


# ---------- Final Runtime Image ----------
FROM node:24-alpine

WORKDIR /app

# Copy production app and dependencies
COPY --from=prod /app ./

# Create log directory
RUN mkdir -p /app/log

# Inject environment manually if not done by Docker Compose
# COPY .env .env

EXPOSE 7070

# Start the server
CMD ["npm", "start"]
