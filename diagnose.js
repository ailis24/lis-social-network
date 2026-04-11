#!/usr/bin/env node

import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { createServer } from "http";
import { join } from "path";

console.log("\n🔍 ===========================================");
console.log("   ДИАГНОСТИКА LIS SOCIAL NETWORK");
console.log("==========================================\n");

let errors = [];
let warnings = [];
let infos = [];

// ─── 1. ПРОВЕРКА ФАЙЛОВ ──────────────────────────────────
console.log("📁 ПРОВЕРКА ФАЙЛОВ:");

const requiredFiles = [
  "package.json",
  "server.js",
  "vite.config.js",
  "index.html",
  "src/main.jsx",
  "src/App.jsx",
  "src/index.css",
  "src/context/AuthContext.jsx",
  "src/pages/Login.jsx",
  "src/pages/Feed.jsx",
  "src/components/Post.jsx",
  "src/middleware/auth.js",
];

requiredFiles.forEach((file) => {
  if (existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - ОТСУТСТВУЕТ`);
    errors.push(`Отсутствует файл: ${file}`);
  }
});

// ─── 2. ПРОВЕРКА PACKAGE.JSON ────────────────────────────
console.log("\n📦 ПРОВЕРКА PACKAGE.JSON:");

try {
  const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
  console.log(`  ✅ package.json существует`);
  console.log(`  📝 Название: ${packageJson.name || "не указано"}`);

  const requiredDeps = [
    "express",
    "better-sqlite3",
    "react",
    "react-dom",
    "react-router-dom",
    "vite",
    "@vitejs/plugin-react",
  ];
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  requiredDeps.forEach((dep) => {
    if (allDeps[dep]) {
      console.log(`  ✅ ${dep}: ${allDeps[dep]}`);
    } else {
      console.log(`  ❌ ${dep} - НЕ УСТАНОВЛЕН`);
      errors.push(`Отсутствует зависимость: ${dep}`);
    }
  });

  // Проверка скриптов
  if (!packageJson.scripts?.dev) {
    console.log(`  ⚠️  Скрипт "dev" не найден`);
    warnings.push('Отсутствует скрипт "dev" в package.json');
  } else {
    console.log(`  ✅ Скрипт dev: ${packageJson.scripts.dev}`);
  }
} catch (error) {
  console.log(`  ❌ Ошибка чтения package.json: ${error.message}`);
  errors.push("Неверный package.json");
}

// ─── 3. ПРОВЕРКА VITE.CONFIG.JS ──────────────────────────
console.log("\n⚙️  ПРОВЕРКА VITE CONFIG:");

try {
  const viteConfig = readFileSync("vite.config.js", "utf-8");

  if (viteConfig.includes("port: 5173") || viteConfig.includes("port:5173")) {
    console.log(`  ✅ Порт Vite: 5173`);
  } else {
    console.log(`  ⚠️  Порт Vite не 5173`);
    warnings.push("Порт Vite отличается от 5173");
  }

  if (viteConfig.includes("proxy")) {
    console.log(`  ✅ Proxy настроен`);
  } else {
    console.log(`  ⚠️  Proxy не найден`);
    warnings.push("Отсутствует proxy конфигурация в vite.config.js");
  }

  if (viteConfig.includes("@vitejs/plugin-react")) {
    console.log(`  ✅ React плагин подключен`);
  } else {
    console.log(`  ❌ React плагин не найден`);
    errors.push("Отсутствует @vitejs/plugin-react в vite.config.js");
  }
} catch (error) {
  console.log(`  ❌ Ошибка чтения vite.config.js: ${error.message}`);
  errors.push("Неверный vite.config.js");
}

// ─── 4. ПРОВЕРКА СИНТАКСИСА JS/JSX ───────────────────────
console.log("\n🔍 ПРОВЕРКА СИНТАКСИСА:");

const jsFiles = [
  "server.js",
  "src/main.jsx",
  "src/App.jsx",
  "src/context/AuthContext.jsx",
];

jsFiles.forEach((file) => {
  try {
    execSync(`node --check ${file}`, { stdio: "pipe" });
    console.log(`  ✅ ${file} - синтаксис OK`);
  } catch (error) {
    console.log(`  ❌ ${file} - ОШИБКА СИНТАКСИСА`);
    errors.push(`Синтаксическая ошибка в ${file}`);
  }
});

// ─── 5. ПРОВЕРКА БАЗЫ ДАННЫХ ─────────────────────────────
console.log("\n💾 ПРОВЕРКА БАЗЫ ДАННЫХ:");

if (existsSync("lis_users.db")) {
  console.log(`  ✅ База данных существует`);

  try {
    execSync('sqlite3 lis_users.db "SELECT COUNT(*) FROM users;"', {
      stdio: "pipe",
    });
    console.log(`  ✅ База данных читаема`);

    const userCount = execSync(
      'sqlite3 lis_users.db "SELECT COUNT(*) FROM users;"',
      { encoding: "utf-8" },
    ).trim();
    console.log(`  👥 Пользователей: ${userCount}`);
  } catch (error) {
    console.log(`  ❌ Ошибка чтения БД`);
    errors.push("База данных повреждена");
  }
} else {
  console.log(`  ⚠️  База данных будет создана при первом запуске`);
  infos.push("База данных lis_users.db не найдена");
}

// ─── 6. ПРОВЕРКА ПОРТОВ ──────────────────────────────────
console.log("\n🔌 ПРОВЕРКА ПОРТОВ:");

const checkPort = (port) => {
  return new Promise((resolve) => {
    const server = createServer();
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve({ busy: true, port });
      } else {
        resolve({ busy: false, port, error: err.message });
      }
    });
    server.on("listening", () => {
      server.close();
      resolve({ busy: false, port });
    });
    server.listen(port, "127.0.0.1");
  });
};

// ─── 7. ПРОВЕРКА NODE_MODULES ────────────────────────────
console.log("\n📂 ПРОВЕРКА NODE_MODULES:");

if (existsSync("node_modules")) {
  console.log(`  ✅ node_modules существует`);

  const criticalModules = [
    "node_modules/express",
    "node_modules/better-sqlite3",
    "node_modules/react",
    "node_modules/vite",
  ];

  criticalModules.forEach((mod) => {
    if (existsSync(mod)) {
      console.log(`  ✅ ${mod.split("/")[1]}`);
    } else {
      console.log(`  ❌ ${mod.split("/")[1]} - НЕ УСТАНОВЛЕН`);
      errors.push(`Модуль ${mod.split("/")[1]} не установлен`);
    }
  });
} else {
  console.log(`  ❌ node_modules отсутствует`);
  errors.push("Не установлены npm зависимости");
}

// ─── 8. ПРОВЕРКА КРИТИЧЕСКИХ КОМПОНЕНТОВ ─────────────────
console.log("\n🧩 ПРОВЕРКА КОМПОНЕНТОВ:");

const criticalComponents = [
  "src/pages/Feed.jsx",
  "src/pages/Chat.jsx",
  "src/pages/GroupChat.jsx",
  "src/pages/Notifications.jsx",
  "src/pages/PhotoChain.jsx",
  "src/pages/AddStory.jsx",
  "src/components/Post.jsx",
  "src/components/Header.jsx",
  "src/components/BottomNav.jsx",
];

criticalComponents.forEach((file) => {
  if (existsSync(file)) {
    const content = readFileSync(file, "utf-8");

    // Проверка на export default
    if (content.includes("export default")) {
      console.log(`  ✅ ${file.split("/").pop()}`);
    } else {
      console.log(`  ⚠️  ${file.split("/").pop()} - нет export default`);
      warnings.push(`${file} не имеет export default`);
    }
  } else {
    console.log(`  ❌ ${file} - ОТСУТСТВУЕТ`);
    errors.push(`Отсутствует компонент: ${file}`);
  }
});

// ─── 9. ПРОВЕРКА INDEX.HTML ──────────────────────────────
console.log("\n📄 ПРОВЕРКА INDEX.HTML:");

try {
  const indexHtml = readFileSync("index.html", "utf-8");

  if (indexHtml.includes('id="root"')) {
    console.log(`  ✅ div#root найден`);
  } else {
    console.log(`  ❌ div#root не найден`);
    errors.push('В index.html отсутствует div с id="root"');
  }

  if (
    indexHtml.includes('src="/src/main.jsx"') ||
    indexHtml.includes('src="/main.jsx"')
  ) {
    console.log(`  ✅ main.jsx подключен`);
  } else {
    console.log(`  ⚠️  main.jsx не подключен или путь неверный`);
    warnings.push("main.jsx не подключен в index.html");
  }
} catch (error) {
  console.log(`  ❌ Ошибка чтения index.html: ${error.message}`);
  errors.push("Неверный index.html");
}

// ─── ИТОГИ ───────────────────────────────────────────────
console.log("\n" + "=".repeat(50));
console.log("📊 ИТОГИ ДИАГНОСТИКИ:");
console.log("=".repeat(50));

console.log(`\n✅ Успешно: ${infos.length + (errors.length === 0 ? 1 : 0)}`);
console.log(`⚠️  Предупреждения: ${warnings.length}`);
console.log(`❌ Ошибки: ${errors.length}`);

if (errors.length > 0) {
  console.log("\n🔴 КРИТИЧЕСКИЕ ОШИБКИ (требуется исправить):");
  errors.forEach((err, i) => {
    console.log(`   ${i + 1}. ${err}`);
  });
}

if (warnings.length > 0) {
  console.log("\n🟡 ПРЕДУПРЕЖДЕНИЯ (рекомендуется исправить):");
  warnings.forEach((warn, i) => {
    console.log(`   ${i + 1}. ${warn}`);
  });
}

// ─── РЕКОМЕНДАЦИИ ────────────────────────────────────────
console.log("\n💡 РЕКОМЕНДАЦИИ:");

if (errors.some((e) => e.includes("node_modules"))) {
  console.log("   1. Установи зависимости:");
  console.log("      npm install");
}

if (errors.some((e) => e.includes("синтаксис"))) {
  console.log("   2. Проверь файлы на синтаксические ошибки");
}

if (errors.some((e) => e.includes("База данных"))) {
  console.log("   3. Переименуй или удали поврежденную БД:");
  console.log("      mv lis_users.db lis_users.db.backup");
}

if (warnings.some((w) => w.includes("Vite"))) {
  console.log("   4. Проверь vite.config.js");
}

console.log("\n🚀 ЗАПУСК ПРИЛОЖЕНИЯ:");
console.log("   1. Останови все процессы:");
console.log("      pkill -f node");
console.log("      pkill -f vite");
console.log("\n   2. Запусти сервер:");
console.log("      npm run dev");
console.log("\n   3. Открой в браузере:");
console.log("      http://localhost:5173");

console.log("\n" + "=".repeat(50));
console.log("Если проблемы остались — покажи вывод этого скрипта");
console.log("==========================================\n");

// Выход с кодом ошибки если есть критические проблемы
if (errors.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
