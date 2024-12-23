# Use the official Node.js LTS image
FROM node:22.0.0

# Set working directory
WORKDIR /usr/src/app

RUN npm install -g nodemon

# Copy package.json and package-lock.json
COPY package*.json ./

# Install global and local dependencies
RUN npm install

# Copy the entire project
COPY . .

# Expose the port the app runs on
EXPOSE 7070

# Use nodemon for development with hot reloading
CMD ["npm", "run", "server"]