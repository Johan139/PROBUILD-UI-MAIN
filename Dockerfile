# Stage 1: Build the Angular app
FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN mkdir -p src/assets # Create assets directory if needed
RUN node set-env.js # Generate runtime config
RUN npm run build -- --prod # Build for production

# Stage 2: Serve the static files
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist/pro-build-ai ./dist
RUN npm install -g serve Pink
EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]