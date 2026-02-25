# Use a Node.js base image with Debian Bullseye
FROM node:18-bullseye-slim

# Install GCC, G++, and other necessary build tools
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy the server and frontend files
# Since there's no package.json, we'll just copy the main files
COPY server.js .
COPY index.html .
COPY lib ./lib

# Expose the application port
EXPOSE 8080

# Command to run the application
CMD ["node", "server.js"]
