FROM node:lts as build

WORKDIR /app
COPY / ./
RUN npm ci
RUN npm run build

# This shaves off like 100mb. Could be better.
FROM node:lts-alpine as runtime
WORKDIR /app
COPY /package.json ./
COPY /package-lock.json ./
RUN npm ci --production

COPY --from=build /app/dist ./dist
COPY /server-static ./server-static

ENV serverStaticPort 8000
EXPOSE 8000

CMD node ./server-static/
