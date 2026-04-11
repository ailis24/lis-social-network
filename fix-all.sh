#!/bin/bash

echo "🔍 === ДИАГНОСТИКА И ИСПРАВЛЕНИЕ LIS SOCIAL NETWORK ==="
echo ""

# 1. Остановка всех процессов
echo "🛑 Остановка всех процессов..."
pkill -9 node 2>/dev/null || true
pkill -9 vite 2>/dev/null || true
sleep 2

# 2. Освобождение портов
echo "🔓 Освобождение портов..."
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true
sleep 1

# 3. Проверка файлов
echo ""
echo "📁 Проверка файлов..."
MISSING_FILES=0

for file in "package.json" "server.js" "vite.config.js" "index.html" "src/main.jsx" "src/App.jsx"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file - ОТСУТСТВУЕТ"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

# 4. Проверка зависимостей
echo ""
echo "📦 Проверка зависимостей..."
if [ -d "node_modules" ]; then
    echo "  ✅ node_modules существует"
else
    echo "  ⚠️  node_modules отсутствует, устанавливаю..."
    npm install
fi

# 5. Проверка БД
echo ""
echo "💾 Проверка базы данных..."
if [ -f "lis_users.db" ]; then
    echo "  ✅ База данных существует"
    # Проверяем целостность
    if command -v sqlite3 &> /dev/null; then
        RESULT=$(sqlite3 lis_users.db "PRAGMA integrity_check;" 2>&1)
        if [ "$RESULT" = "ok" ]; then
            echo "  ✅ База данных цела"
        else
            echo "  ❌ База данных повреждена"
            echo "  💡 Переименовываю старую БД..."
            mv lis_users.db lis_users.db.corrupted
        fi
    fi
else
    echo "  ⚠️  База данных будет создана при запуске"
fi

# 6. Проверка синтаксиса
echo ""
echo "🔍 Проверка синтаксиса..."
node --check server.js 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ server.js - OK"
else
    echo "  ❌ server.js - ОШИБКА СИНТАКСИСА"
fi

# 7. Запуск приложения
echo ""
echo "🚀 Запуск приложения..."
echo "  → Используй Ctrl+C для остановки"
echo ""

npm run dev