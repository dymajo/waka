FROM node:lts-alpine as build-client

WORKDIR /app
COPY /package.json ./
COPY /package-lock.json ./
RUN apk add --no-cache git
RUN npm ci
COPY / ./
RUN npm run build

FROM golang:1.12-alpine as build-server
WORKDIR /app
COPY /server ./
ENV GOPATH /go
ENV GOBIN=$GOPATH/bin
RUN apk add --no-cache git
RUN go get -v ./
RUN go build -o waka

FROM alpine:3.9
EXPOSE 80
WORKDIR /app
COPY --from=build-client /app/dist ./dist
COPY --from=build-server /app/waka ./
RUN apk add --no-cache ca-certificates
CMD ./waka -p 80
