# Stage 1: Build the Angular app
FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN mkdir -p src/assets # Create assets directory if needed
RUN npm run set-env # Use the script instead of node set-env.js directly
RUN npm run build # Use the defined build script

# Stage 2: Serve the static files
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist/pro-build-ai ./dist # Adjust based on your app name
RUN npm install -g serve
EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]