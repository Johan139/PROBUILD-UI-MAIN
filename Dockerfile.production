# Stage 1: Build the Angular app
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
# Set environment variables during build (if needed by set-env.js)
ENV BACKEND_URL=https://probuildai-backend.wonderfulgrass-0f331ae8.centralus.azurecontainerapps.io/api
ENV API_KEY=ef306472fbed4ca9835115255241412
ENV Google_API=AIzaSyBVEXpDDbV96oeuydmvV9F6Ew1Hq-6Psww
RUN node set-env.js
RUN npm run build -- --configuration production

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist/probuildai-ui /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]