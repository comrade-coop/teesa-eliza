# Use a specific Node.js version for better reproducibility
FROM node:23.3.0-slim AS builder

# Add build arguments
# API key for the LLM
ARG LLM_API_KEY
# Twitter login credentials
ARG TWITTER_USERNAME
ARG TWITTER_PASSWORD
ARG TWITTER_EMAIL
ARG TWITTER_2FA_SECRET
# Teesa URL
ARG TEESA_URL

# Set environment variables that will be available at runtime
ENV DOCKER_LLM_API_KEY=${LLM_API_KEY}
ENV DOCKER_TWITTER_USERNAME=${TWITTER_USERNAME}
ENV DOCKER_TWITTER_PASSWORD=${TWITTER_PASSWORD}
ENV DOCKER_TWITTER_EMAIL=${TWITTER_EMAIL}
ENV DOCKER_TWITTER_2FA_SECRET=${TWITTER_2FA_SECRET}
ENV DOCKER_TEESA_URL=${TEESA_URL}

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
COPY deploy/update-env.sh .

# Copy and update .env file
RUN cp .env.example .env && \
    chmod +x update-env.sh && \
    ./update-env.sh

# Install dependencies
RUN chmod +x ./scripts/clean.sh && \
    bash ./scripts/clean.sh && \
    pnpm install

# Build the project with Turbo cache disabled
RUN pnpm run build --no-cache && pnpm prune --prod

# Create a new stage for the final image
FROM node:23.3.0-slim

# Install runtime dependencies if needed
RUN npm install -g pnpm@9.15.1
RUN apt-get update && \
    apt-get install -y git python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy .env, built artifacts and production dependencies from the builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/agent ./agent
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/.env ./

# Expose necessary ports
EXPOSE 3000

# Command to start the application
CMD ["sh", "-c", "pnpm start"]
