# Use Node.js version 20
FROM node:20-slim

# Install system dependencies for Canvas and PDF tools
RUN apt-get update && apt-get install -y \
    poppler-utils \
    libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Start the bot
CMD ["node", "index.js"]
