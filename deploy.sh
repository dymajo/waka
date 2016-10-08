#!/bin/bash
git pull
git submodule foreach git pull origin master
npm install
npm run install-typings
npm run build-css
npm run build-js
pm2 restart app