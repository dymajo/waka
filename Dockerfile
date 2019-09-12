FROM node:alpine

WORKDIR /usr/src/app
RUN mkdir cache

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY . .
RUN npm run build:js

ENV NODE_ENV=production

ENTRYPOINT [ "node","lib/index.js" ]