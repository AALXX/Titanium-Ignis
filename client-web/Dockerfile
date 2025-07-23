# ---------- Stage 1: Install Dependencies & Build ----------  
FROM node:24-alpine AS builder

WORKDIR /app

# Accept build arguments for Next.js public variables
ARG NEXT_PUBLIC_BACKEND_SERVER=""
ARG NEXT_PUBLIC_FILE_SERVER=""
ARG NEXT_PUBLIC_PROJECTS_SERVER=""
ARG NEXT_PUBLIC_TASKS_SERVER=""
ARG NEXT_PUBLIC_DEPLOYMENTS_SERVER=""
ARG NEXT_PUBLIC_MESSAGE_SERVER=""

# Debug: Print what we received as build args
RUN echo "🔍 Received build arguments:" && \
    echo "NEXT_PUBLIC_BACKEND_SERVER='$NEXT_PUBLIC_BACKEND_SERVER'" && \
    echo "NEXT_PUBLIC_FILE_SERVER='$NEXT_PUBLIC_FILE_SERVER'" && \
    echo "NEXT_PUBLIC_PROJECTS_SERVER='$NEXT_PUBLIC_PROJECTS_SERVER'" && \
    echo "NEXT_PUBLIC_TASKS_SERVER='$NEXT_PUBLIC_TASKS_SERVER'" && \
    echo "NEXT_PUBLIC_DEPLOYMENTS_SERVER='$NEXT_PUBLIC_DEPLOYMENTS_SERVER'" && \
    echo "NEXT_PUBLIC_MESSAGE_SERVER='$NEXT_PUBLIC_MESSAGE_SERVER'"

# Set them as environment variables for the build
ENV NEXT_PUBLIC_BACKEND_SERVER=$NEXT_PUBLIC_BACKEND_SERVER
ENV NEXT_PUBLIC_FILE_SERVER=$NEXT_PUBLIC_FILE_SERVER
ENV NEXT_PUBLIC_PROJECTS_SERVER=$NEXT_PUBLIC_PROJECTS_SERVER
ENV NEXT_PUBLIC_TASKS_SERVER=$NEXT_PUBLIC_TASKS_SERVER
ENV NEXT_PUBLIC_DEPLOYMENTS_SERVER=$NEXT_PUBLIC_DEPLOYMENTS_SERVER
ENV NEXT_PUBLIC_MESSAGE_SERVER=$NEXT_PUBLIC_MESSAGE_SERVER

# Debug: Print the environment variables after setting
RUN echo "🔍 Environment variables set for build:" && \
    echo "NEXT_PUBLIC_BACKEND_SERVER='$NEXT_PUBLIC_BACKEND_SERVER'" && \
    echo "NEXT_PUBLIC_FILE_SERVER='$NEXT_PUBLIC_FILE_SERVER'" && \
    echo "NEXT_PUBLIC_PROJECTS_SERVER='$NEXT_PUBLIC_PROJECTS_SERVER'" && \
    echo "NEXT_PUBLIC_TASKS_SERVER='$NEXT_PUBLIC_TASKS_SERVER'" && \
    echo "NEXT_PUBLIC_DEPLOYMENTS_SERVER='$NEXT_PUBLIC_DEPLOYMENTS_SERVER'" && \
    echo "NEXT_PUBLIC_MESSAGE_SERVER='$NEXT_PUBLIC_MESSAGE_SERVER'"

# Validate that required environment variables are not empty
RUN if [ -z "$NEXT_PUBLIC_BACKEND_SERVER" ]; then \
        echo "❌ ERROR: NEXT_PUBLIC_BACKEND_SERVER is empty or not set!"; \
        echo "Make sure to pass --build-arg NEXT_PUBLIC_BACKEND_SERVER=<value>"; \
        exit 1; \
    fi

# Install dependencies needed to build the project
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copy configuration files
COPY tsconfig*.json ./
COPY next.config.ts ./
COPY postcss.config.mjs ./

# Copy source code
COPY . .

# Install dev dependencies needed for build
RUN npm ci

# Debug: Show what Next.js will see during build
RUN echo "🔍 Final check - what Next.js will see:" && \
    env | grep NEXT_PUBLIC || echo "No NEXT_PUBLIC variables found!"

# Build the application with environment variables available
RUN npm run build

# Verify build output contains our environment variables
RUN echo "🔍 Checking if build output contains our variables..." && \
    find .next -name "*.js" -type f -exec grep -l "NEXT_PUBLIC_BACKEND_SERVER" {} \; | head -5 || \
    echo "⚠️  Variables might not be embedded in build output"

# ---------- Stage 2: Production Runtime ----------
FROM node:24-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy the standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the Next.js app
CMD ["node", "server.js"]