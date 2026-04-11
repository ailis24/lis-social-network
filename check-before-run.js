import fs from "fs";
import path from "path";

console.log("\n🔍 === ПРОВЕРКА ПЕРЕД ЗАПУСКОМ ===\n");

let hasErrors = false;
const fixes = [];

// 1. Проверка файлов
console.log("📁 1. ПРОВЕРКА ФАЙЛОВ:\n");

const requiredFiles = [
  { path: "package.json", desc: "Package.json" },
  { path: "vite.config.js", desc: "Vite config" },
  { path: "src/main.jsx", desc: "Main.jsx" },
  { path: "src/App.jsx", desc: "App.jsx" },
  { path: "src/context/AuthContext.jsx", desc: "AuthContext.jsx" },
  { path: "src/firebase.js", desc: "Firebase.js" },
];

requiredFiles.forEach(({ path: filePath, desc }) => {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${desc}: ${filePath}`);
  } else {
    console.log(`❌ ${desc}: ${filePath} - НЕ НАЙДЕН!`);
    fixes.push(`Создайте файл: ${filePath}`);
    hasErrors = true;
  }
});

// 2. Проверка firebase.js
console.log("\n🔥 2. ПРОВЕРКА FIREBASE.JS:\n");

try {
  const firebaseContent = fs.readFileSync("src/firebase.js", "utf8");

  const checks = [
    { test: /export const auth/, name: "export const auth" },
    { test: /export const db/, name: "export const db" },
    { test: /export const storage/, name: "export const storage" },
    { test: /export default app/, name: "export default app" },
    { test: /initializeApp/, name: "initializeApp" },
  ];

  checks.forEach(({ test, name }) => {
    if (test.test(firebaseContent)) {
      console.log(`✅ ${name}`);
    } else {
      console.log(`❌ ${name} - ОТСУТСТВУЕТ!`);
      fixes.push(`Добавьте "${name}" в src/firebase.js`);
      hasErrors = true;
    }
  });
} catch (err) {
  console.log("❌ Не удалось прочитать firebase.js");
  fixes.push("Проверьте файл src/firebase.js");
  hasErrors = true;
}

// 3. Проверка AuthContext.jsx
console.log("\n🔐 3. ПРОВЕРКА AUTHCONTEXT.JSX:\n");

try {
  const authContent = fs.readFileSync("src/context/AuthContext.jsx", "utf8");

  const authChecks = [
    { test: /export function useAuth/, name: "export function useAuth" },
    {
      test: /export function AuthProvider/,
      name: "export function AuthProvider",
    },
    {
      test: /from ['"]\.\.\/firebase\.js['"]/,
      name: "import from ../firebase.js",
    },
    { test: /<AuthContext\.Provider/, name: "AuthContext.Provider" },
    { test: /function login/, name: "function login" },
    { test: /function signup/, name: "function signup" },
  ];

  authChecks.forEach(({ test, name }) => {
    if (test.test(authContent)) {
      console.log(`✅ ${name}`);
    } else {
      console.log(`❌ ${name} - ОТСУТСТВУЕТ!`);
      fixes.push(`Добавьте "${name}" в src/context/AuthContext.jsx`);
      hasErrors = true;
    }
  });
} catch (err) {
  console.log("❌ Не удалось прочитать AuthContext.jsx");
  fixes.push("Проверьте файл src/context/AuthContext.jsx");
  hasErrors = true;
}

// 4. Проверка main.jsx
console.log("\n📄 4. ПРОВЕРКА MAIN.JSX:\n");

try {
  const mainContent = fs.readFileSync("src/main.jsx", "utf8");

  const mainChecks = [
    {
      test: /import.*BrowserRouter.*from ['"]react-router-dom['"]/,
      name: "BrowserRouter import",
    },
    {
      test: /import.*AuthProvider.*from ['"]\.\/context\/AuthContext['"]/,
      name: "AuthProvider import (без .jsx)",
    },
    { test: /<BrowserRouter>/, name: "<BrowserRouter>" },
    { test: /<AuthProvider>/, name: "<AuthProvider>" },
    { test: /<App \/>/, name: "<App />" },
  ];

  mainChecks.forEach(({ test, name }) => {
    if (test.test(mainContent)) {
      console.log(`✅ ${name}`);
    } else {
      console.log(`❌ ${name} - ОТСУТСТВУЕТ!`);
      fixes.push(`Добавьте "${name}" в src/main.jsx`);
      hasErrors = true;
    }
  });
} catch (err) {
  console.log("❌ Не удалось прочитать main.jsx");
  fixes.push("Проверьте файл src/main.jsx");
  hasErrors = true;
}

// 5. Проверка package.json
console.log("\n📦 5. ПРОВЕРКА ЗАВИСИМОСТЕЙ:\n");

try {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const deps = packageJson.dependencies || {};

  const requiredDeps = [
    { name: "react", critical: true },
    { name: "react-dom", critical: true },
    { name: "react-router-dom", critical: true },
    { name: "firebase", critical: true },
    { name: "vite", critical: false },
    { name: "@vitejs/plugin-react", critical: false },
  ];

  requiredDeps.forEach(({ name, critical }) => {
    if (deps[name]) {
      console.log(`✅ ${name}: ${deps[name]}`);
    } else {
      const mark = critical ? "❌" : "⚠️";
      console.log(`${mark} ${name} - ${critical ? "КРИТИЧНО!" : "не найдено"}`);
      if (critical) {
        fixes.push(`Установите: npm install ${name}`);
        hasErrors = true;
      }
    }
  });
} catch (err) {
  console.log("❌ Не удалось прочитать package.json");
  fixes.push("Проверьте файл package.json");
  hasErrors = true;
}

// 6. Проверка vite.config.js
console.log("\n⚙️  6. ПРОВЕРКА VITE.CONFIG.JS:\n");

try {
  const viteContent = fs.readFileSync("vite.config.js", "utf8");

  if (viteContent.includes("allowedHosts")) {
    console.log("✅ allowedHosts настроен");
  } else {
    console.log(
      "⚠️  allowedHosts не найден (может вызвать проблемы на Replit)",
    );
    fixes.push("Добавьте allowedHosts в vite.config.js");
  }

  if (
    viteContent.includes("host: '0.0.0.0'") ||
    viteContent.includes("host: true")
  ) {
    console.log("✅ host настроен");
  } else {
    console.log("⚠️  host может быть не настроен");
  }
} catch (err) {
  console.log("⚠️  vite.config.js не найден (не критично)");
}

// ИТОГИ
console.log("\n" + "=".repeat(50));
console.log("📊 ИТОГИ ПРОВЕРКИ:");
console.log("=".repeat(50));

if (!hasErrors) {
  console.log("\n✅ ВСЁ ГОТОВО К ЗАПУСКУ!\n");
  console.log("🚀 Запустите команду: npm run dev\n");
} else {
  console.log("\n❌ НАЙДЕНЫ ОШИБКИ!\n");
  console.log("🔧 ЧТО НУЖНО ИСПРАВИТЬ:\n");

  fixes.forEach((fix, index) => {
    console.log(`${index + 1}. ${fix}`);
  });

  console.log("\n💡 После исправления запустите: npm run dev\n");
}

console.log("=".repeat(50) + "\n");

// Выход с кодом ошибки если есть проблемы
process.exit(hasErrors ? 1 : 0);
