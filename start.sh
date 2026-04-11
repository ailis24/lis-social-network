#!/bin/bash
node killport.mjs
sleep 1
npx concurrently --kill-others --names "SERVER,VITE" \
  "node server.js" \
  "vite --port 5000"
