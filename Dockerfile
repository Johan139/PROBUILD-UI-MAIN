# Stage 1: Build and Serve Angular App
FROM node:22 AS build-and-serve
WORKDIR /app

# Install Angular CLI globally
RUN npm install -g @angular/cli

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Create the src/assets directory if it doesn't exist
RUN mkdir -p src/assets

# Generate runtime config
RUN node set-env.js

# Expose port 80 for the development server
EXPOSE 80

# Run the Angular development server on port 80
CMD ["ng", "serve", "--host", "0.0.0.0", "--port", "80", "--disable-host-check"]