# Stage 1: Build Angular App
FROM node:20 AS builder

WORKDIR /app

# Only copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the app
COPY . .

# Force clear and reinstall optional native deps
RUN rm -rf node_modules package-lock.json && npm install --legacy-peer-deps

# Set env and build
RUN npm run set-env
RUN npm run build -- --configuration production
