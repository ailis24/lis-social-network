#!/bin/bash

echo "🚀 ПОЛНЫЙ СБРОС ПРИЛОЖЕНИЯ..."

# Остановить всё
pkill -9 node 2>/dev/null
pkill -f vite 2>/dev/null
sleep 3

# Очистить всё
rm -rf node_modules dist package-lock.json
rm -rf .vite .replit_cache

# Установить заново
npm install

# Запустить
echo "✅ Запуск..."
npm run dev