#!/bin/bash
git pull
npm run build-css
npm run build-js
pm2 restart app