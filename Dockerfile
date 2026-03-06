FROM node:22-bookworm-slim

# Install GCC, G++, ARM cross-compiler tools, QEMU Cortex-M emulator
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    git \
    python3 \
    gcc-arm-none-eabi \
    binutils-arm-none-eabi \
    libnewlib-arm-none-eabi \
    qemu-system-arm \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Download FreeRTOS-Kernel (POSIX port) for FreeRTOS simulation challenges
RUN env GIT_SSL_NO_VERIFY=true git clone --depth 1 --branch V11.1.0 \
    https://github.com/FreeRTOS/FreeRTOS-Kernel.git /opt/freertos-kernel \
    && rm -rf /opt/freertos-kernel/.git


# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -m appuser

WORKDIR /app

# Install dependencies first (layer cache optimization)
COPY package*.json ./
RUN npm install --omit=dev

# Copy app files
COPY server.js .
COPY index.html .
COPY visteon_questions.js .
COPY platform/ ./platform/
COPY scripts/ ./scripts/


# Create data directory for SQLite database (owned by appuser)
RUN mkdir -p /app/data && chown -R appuser:appuser /app/data

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "const http = require('http'); http.get('http://localhost:8080/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

ENV NODE_ENV=production

CMD ["node", "server.js"]
