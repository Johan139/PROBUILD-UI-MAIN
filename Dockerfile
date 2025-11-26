# Stage 1: Build Angular
FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
ARG BACKEND_URL
ARG API_KEY
ARG NG_ENV=production
ENV BACKEND_URL=$BACKEND_URL
ENV API_KEY=$API_KEY
RUN npm run build -- --configuration=$NG_ENV

# Stage 2: NGINX to serve static content
FROM nginx:alpine

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy Angular build output
COPY --from=build /app/dist/pro-build-ai/browser /usr/share/nginx/html

# Copy custom NGINX config (important for SPA + PDFJS)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
