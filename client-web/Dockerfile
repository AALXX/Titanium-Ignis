# ---------- Stage 1: Install Dependencies & Build ----------  
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies needed to build the project
COPY package*.json ./
COPY tsconfig*.json ./
COPY next.config.ts ./
RUN npm install

# Copy all source files and build
COPY . .
RUN npm run build


# ---------- Stage 2: Prune Dev Dependencies ----------
FROM node:24-alpine AS prod

WORKDIR /app

# Copy only what's needed from the builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static  
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/postcss.config.mjs ./
COPY --from=builder /app/tsconfig.json ./


# ---------- Final Runtime Image ----------
FROM node:24-alpine

WORKDIR /app

# Copy production app and dependencies
COPY --from=prod /app ./

# Inject environment manually if not done by Docker Compose
# COPY .env .env

EXPOSE 3000

# Start the Next.js app
CMD ["npm", "start"]
