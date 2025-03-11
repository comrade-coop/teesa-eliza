# Use a specific Node.js version for better reproducibility
FROM node:23.3.0-slim AS builder

# Install pnpm globally and install necessary build tools
RUN npm install -g pnpm@9.15.1 && \
    apt-get update && \
    apt-get install -y git python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Python 3 as the default python
RUN ln -s /usr/bin/python3 /usr/bin/python

# Set the working directory
WORKDIR /app

# Copy application code
COPY . .

# Install dependencies
RUN pnpm install

# Build the project
RUN pnpm run build && pnpm prune --prod

# Create a new stage for the final image
FROM node:23.3.0-slim

# Install runtime dependencies if needed
RUN npm install -g pnpm@9.15.1
RUN apt-get update && \
    apt-get install -y git python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built artifacts and production dependencies from the builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/agent ./agent
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/scripts ./scripts

# Expose necessary ports
EXPOSE 3000

# Command to start the application
CMD ["sh", "-c", "pnpm start"]