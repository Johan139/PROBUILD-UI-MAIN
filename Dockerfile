# Stage 1: Build the Angular app
FROM node:22 AS build
WORKDIR /app

COPY package*.json ./
RUN rm -rf node_modules package-lock.json
RUN npm install --legacy-peer-deps

COPY . .

ARG BACKEND_URL
ARG API_KEY
ARG NG_ENV=production
ENV BACKEND_URL=$BACKEND_URL
ENV API_KEY=$API_KEY

RUN npm run build -- --configuration=$NG_ENV

# Stage 2: Serve the static files
FROM node:22-alpine
WORKDIR /app

COPY --from=build /app/dist/pro-build-ai/browser ./dist
RUN npm install -g serve
EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]