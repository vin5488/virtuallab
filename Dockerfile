# Use a Node.js base image with Debian Bullseye
FROM node:18-bullseye-slim

# Install GCC, G++, and other necessary build tools including ARM cross-compiler
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    python3 \
    gcc-arm-none-eabi \
    binutils-arm-none-eabi \
    libnewlib-arm-none-eabi \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -m appuser

# Set the working directory
WORKDIR /app

# Copy the server and frontend files
COPY server.js .
COPY index.html .

# Create submissions directory writable by appuser
RUN touch submissions.json && chown appuser:appuser submissions.json

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "const http = require('http'); http.get('http://localhost:8080/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Set production environment
ENV NODE_ENV=production

# Command to run the application
CMD ["node", "server.js"]
