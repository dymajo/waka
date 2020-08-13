FROM golang:1.12-alpine as build
RUN apk add --no-cache git libc-dev
RUN go get -v github.com/patrickbr/gtfstidy

FROM node:alpine

WORKDIR /usr/src/app
RUN mkdir cache

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY --from=build /go/bin/gtfstidy /bin
COPY . .
RUN npm run build:js

ENV NODE_ENV=production

ENTRYPOINT [ "node","lib/index.js" ]
