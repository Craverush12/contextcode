# Base image
FROM node:22-alpine

# Use an ARG to define the port, with a default value.
# This will be used by EXPOSE. The runtime APP_PORT will come from the docker-compose environment.
ARG APP_PORT=3005

# Create app directory
WORKDIR /app

# Install build dependencies, then add vips.
# We will remove build-deps later to keep the image small.
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    build-base \
    vips-dev \
    && apk add --no-cache vips

# Copy package files.
COPY package*.json ./

# Install production dependencies and clean up build dependencies.
# This is a separate layer to leverage Docker cache.
RUN npm ci --omit=dev \
    && apk del .build-deps

# Copy the rest of the application source code.
# A .dockerignore file is recommended to exclude node_modules, .git, etc.
COPY . .

# Create uploads and logs directory
# Note: For production, it's better to manage these with Docker volumes.
RUN mkdir -p uploads && chmod 777 uploads
RUN mkdir -p logs/accessLogs logs/errorLogs logs/requestsLogs && chmod -R 777 logs

# Expose the port the app runs on.
EXPOSE ${APP_PORT}

# The command to run the application.
# Use 'node' for production instead of 'nodemon'.
CMD ["node", "index.js"]
