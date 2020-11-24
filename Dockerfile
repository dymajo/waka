FROM node:lts as build-client

WORKDIR /app
COPY /package.json ./
COPY /package-lock.json ./
RUN npm ci
COPY / ./
RUN npm run build

FROM golang:1.12-alpine as build-server
ENV GOPATH /go
ENV GOBIN=$GOPATH/bin
RUN apk add --no-cache git
WORKDIR /app
COPY /server ./
RUN go get -v ./
RUN go build -o waka

FROM alpine:3.9
EXPOSE 80
ENV ENDPOINT=https://waka.app
ENV ASSETSPREFIX=/
WORKDIR /app
RUN apk add --no-cache ca-certificates
COPY --from=build-client /app/dist ./dist
COPY --from=build-server /app/waka ./
COPY /server/templates ./templates

CMD ./waka -p 80 -af ./dist/assets.json -sp ./dist -e $ENDPOINT -ap $ASSETSPREFIX
