# Stage 1: Build the Angular app
FROM node:22 AS build

WORKDIR /app

# Copy only package files first to leverage Docker layer caching
COPY package*.json ./

# Configure npm for stability
RUN npm config set registry https://registry.npmjs.org/
RUN npm config set fetch-retries 5
RUN npm config set fetch-retry-mintimeout 20000
RUN npm config set fetch-retry-maxtimeout 120000
RUN npm config set loglevel info

# Use fully deterministic install
RUN npm ci --legacy-peer-deps

# Copy the rest of your source
COPY . .

# Set environment args (safe to leave as is)
RUN mkdir -p src/assets
ARG BACKEND_URL="https://probuildai-backend.wonderfulgrass-0f331ae8.centralus.azurecontainerapps.io/api"
ARG API_KEY="ef306472fbed4ca9835115255241412"
ENV BACKEND_URL=$BACKEND_URL
ENV API_KEY=$API_KEY

# Build the Angular app
RUN npm run set-env
RUN npm run build

# Optional: force Docker layer commit (your original workaround)
RUN ls -la /app/dist/pro-build-ai
RUN ls -la /app/dist/pro-build-ai/browser
RUN tar -cf /tmp/dist.tar -C /app/dist/pro-build-ai . && tar -xf /tmp/dist.tar -C /app/dist/pro-build-ai

# Stage 2: Serve the static files
FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/dist/pro-build-ai/browser ./dist
RUN npm install -g serve

EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]
