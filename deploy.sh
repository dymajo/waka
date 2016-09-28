#!/bin/bash
git pull
npm install
npm run install-typings
npm run build-css
npm run build-js
pm2 restart app