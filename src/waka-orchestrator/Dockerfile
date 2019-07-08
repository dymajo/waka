FROM node:latest as build
WORKDIR /app
COPY . ./
RUN npm ci
RUN npm test
RUN npm run build:js

FROM node:alpine as runtime
ENV NODE_ENV=production
ENV PORT=80
EXPOSE 80
WORKDIR /app
COPY --from=build /app ./
ENTRYPOINT ["node", "lib/waka-orchestrator/standalone.js"]
