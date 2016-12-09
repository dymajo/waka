#!/bin/bash
git pull
git submodule foreach git pull origin master
npm install
npm run build-css
npm run build-js
pm2 stop dev
NODE_ENV="dev" pm2 start app.js --name dev