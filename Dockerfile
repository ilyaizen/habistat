FROM node:18-alpine

# Install bun
RUN npm install -g bun

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and bun.lockb
COPY package.json bun.lockb ./

# Install ALL dependencies (including dev dependencies needed for build)
RUN bun install

# Copy the rest of the application code
COPY . .

# Generate SvelteKit types and build the application
RUN bun run svelte-kit sync && bun run build

# Install a simple HTTP server
RUN npm install -g http-server

# Expose the port the app runs on
EXPOSE 4173

# Command to run the application
CMD ["http-server", "dist", "-p", "4173", "-a", "0.0.0.0", "--cors"]
