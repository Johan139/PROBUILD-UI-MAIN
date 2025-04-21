# Stage 1: Build the Angular app
FROM node:20 AS build

WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy app source
COPY . .

# Ensure assets directory exists (in case it's not under source control)
RUN mkdir -p src/assets

# Environment variables (build-time)
ARG BACKEND_URL="https://probuildai-backend.wonderfulgrass-0f331ae8.centralus.azurecontainerapps.io/api"
ARG API_KEY="ef306472fbed4ca9835115255241412"
ENV BACKEND_URL=$BACKEND_URL
ENV API_KEY=$API_KEY

# Set environment and build Angular app
RUN npm run set-env
RUN npm run build

# Optional: debug build output
RUN ls -la /app/dist/pro-build-ai
RUN ls -la /app/dist/pro-build-ai/browser

# Optional: commit layer to avoid rebuilds
RUN tar -cf /tmp/dist.tar -C /app/dist/pro-build-ai . && tar -xf /tmp/dist.tar -C /app/dist/pro-build-ai

# Stage 2: Serve the static files using 'serve'
FROM node:20-alpine

WORKDIR /app

# Copy built app from previous stage
COPY --from=build /app/dist/pro-build-ai/browser ./dist

# Install lightweight static server
RUN npm install -g serve

EXPOSE 80

# Serve on port 80
CMD ["serve", "-s", "dist", "-l", "80"]
