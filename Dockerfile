# Stage 1: Build Angular App
FROM node:20 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run set-env
RUN npm run build -- --configuration production

# Stage 2: Serve Angular App via NGINX
FROM nginx:alpine
COPY --from=builder /app/dist/pro-build-ai /usr/share/nginx/html

# Optional: copy a custom NGINX config if needed
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
