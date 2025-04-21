# Stage 1: Build the Angular app
 FROM node:22 AS build
 WORKDIR /app
 COPY package*.json ./
 RUN npm install --legacy-peer-deps
 COPY . .
 RUN mkdir -p src/assets
 ARG BACKEND_URL="https://probuildai-backend.wonderfulgrass-0f331ae8.centralus.azurecontainerapps.io/api"
 ARG API_KEY="ef306472fbed4ca9835115255241412"
 ENV BACKEND_URL=$BACKEND_URL
 ENV API_KEY=$API_KEY
 RUN npm run set-env
 RUN npm run build
 RUN ls -la /app/dist/pro-build-ai
 RUN ls -la /app/dist/pro-build-ai/browser
 RUN tar -cf /tmp/dist.tar -C /app/dist/pro-build-ai . && tar -xf /tmp/dist.tar -C /app/dist/pro-build-ai # Force layer commit
 
 # Stage 2: Serve the static files
 FROM node:22-alpine
 WORKDIR /app
 COPY --from=build /app/dist/pro-build-ai/browser ./dist
 RUN npm install -g serve
 EXPOSE 80
 CMD ["serve", "-s", "dist", "-l", "80"]
