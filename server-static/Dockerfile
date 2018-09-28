FROM node:alpine as build

WORKDIR /app
COPY /package.json ./
COPY /package-lock.json ./
RUN npm ci

COPY /scss ./scss
COPY /js ./js
COPY /dist ./dist
COPY /translations ./translations

COPY /local.js ./
COPY /.babelrc ./
COPY /webpack.config.js ./

# This is just for documentaiton
COPY /server-common ./server-common
COPY /server-master ./server-master
COPY /server-worker ./server-worker
COPY /server-static ./server-static
RUN npm run build

# This shaves off like 100mb. Could be better.
FROM node:alpine as runtime
WORKDIR /app
COPY /package.json ./
COPY /package-lock.json ./
RUN npm ci --production

COPY --from=build /app/dist ./dist
COPY /server-common ./server-common
COPY /server-static ./server-static

ENV serverStaticPort 8000
EXPOSE 8000

ENTRYPOINT ["node", "server-static"]