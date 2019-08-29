FROM node:alpine

WORKDIR /usr/src/app
RUN mkdir cache

COPY . .

RUN npm ci
RUN npm run build:js

ENV NODE_ENV=production

ENTRYPOINT [ "node","lib/index.js" ]