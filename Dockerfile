# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Install bun
RUN npm install -g bun

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package.json ./
COPY bun.lock ./  # Assuming bun creates a lockfile named bun.lock

# Install dependencies
RUN bun install

# Copy the rest of the application code
COPY . .

# Build the application (if needed)
RUN bun run build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["bun", "run", "start"]
