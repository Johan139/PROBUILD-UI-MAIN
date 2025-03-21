# Stage 1: Build the Angular app
FROM node:22 AS build
WORKDIR /app

# Install Angular CLI globally
RUN npm install -g @angular/cli

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Build the Angular app for production
ARG BACKEND_URL
ARG API_KEY
ENV BACKEND_URL=$BACKEND_URL
ENV API_KEY=$API_KEY
RUN npm run set-env && ng build --configuration production

# Stage 2: Serve the app with Nginx
FROM nginx:alpine
COPY --from=build /app/dist/probuildai-ui /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]