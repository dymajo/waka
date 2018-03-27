FROM node:carbon

ADD . /server

WORKDIR /server

RUN npm install
RUN npm run build

CMD ["npm", "start"]
