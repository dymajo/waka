#!/bin/bash
git pull
npm install
npm run build-css
npm run build-js
pm2 stop dev
NODE_ENV="dev" pm2 start app.js --name dev