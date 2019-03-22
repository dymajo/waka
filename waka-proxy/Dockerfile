FROM node:latest as build
WORKDIR /app
COPY ./*.json ./
COPY ./*.js ./
COPY waka-proxy ./waka-proxy
RUN npm ci --production

FROM node:alpine as runtime
ENV NODE_ENV=production
ENV PORT=80
EXPOSE 80
WORKDIR /app
COPY --from=build /app ./
ENTRYPOINT ["node", "waka-proxy/standalone.js"]
