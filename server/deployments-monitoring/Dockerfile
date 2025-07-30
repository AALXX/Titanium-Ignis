# Use Node.js 18 as base image
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 5090

# Health check for Socket.IO service
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const net = require('net'); const client = net.connect(5090, 'localhost', () => { client.end(); process.exit(0); }); client.on('error', () => process.exit(1));" || exit 1

# Start the application
CMD ["npm", "start"] 