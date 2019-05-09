FROM node:alpine

WORKDIR /usr/src/app
RUN mkdir cache

COPY package*.json ./

RUN npm ci

COPY . .

CMD ["npm", "run", "bs"]