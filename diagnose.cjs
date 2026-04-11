#!/usr/bin/env node
// diagnose.cjs - Диагностика всех проблем приложения Lis

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 ========================================');
console.log('🔍   LIS SOCIAL NETWORK - DIAGNOSTICS');
console.log('🔍 ========================================\n');

const errors = [];
const warnings = [];
const infos = [];

// ─── 1. ПРОВЕРКА ФАЙЛОВ ────────────────────────────────────────────────────
console.log('📁 Checking files...\n');

const requiredFiles = [
  'package.json',
  'server.js',
  '.env',
  'src/main.jsx',
  'src/services/ydb.js',
  'src/pages/Login.jsx',
  'src/pages/Register.jsx',
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    infos.push(`✅ File exists: ${file}`);
  } else {
    errors.push(`❌ Missing file: ${file}`);
  }
});

// ─── 2. ПРОВЕРКА .ENV ──────────────────────────────────────────────────────
console.log('🔐 Checking .env variables...\n');

const requiredEnvVars = [
  'VITE_YDB_ENDPOINT',
  'VITE_YDB_DATABASE',
  'VITE_YDB_API_KEY_ID',
  'VITE_YDB_API_SECRET',
  'VITE_YANDEX_ACCESS_KEY',
  'VITE_YANDEX_SECRET_KEY',
  'VITE_API_URL',
  'API_PORT',
];

require('dotenv').config();

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value && value !== '') {
    const masked = value.length > 20 ? value.substring(0, 20) + '...' : value;
    infos.push(`✅ ${varName} = ${masked}`);
  } else {
    errors.push(`❌ Missing or empty: ${varName}`);
  }
});

// ─── 3. ПРОВЕРКА ЗАВИСИМОСТЕЙ ─────────────────────────────────────────────
console.log('📦 Checking dependencies...\n');

const requiredDeps = [
  'express',
  'cors',
  'dotenv',
  'ydb-sdk',
  '@aws-sdk/client-s3',
  'react',
  'react-dom',
  'react-router-dom',
  'vite',
  'concurrently',
];

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  requiredDeps.forEach(dep => {
    if (allDeps[dep]) {
      infos.push(`✅ Dependency installed: ${dep}@${allDeps[dep]}`);
    } else {
      errors.push(`❌ Missing dependency: ${dep}`);
    }
  });
} catch (err) {
  errors.push(`❌ Cannot read package.json: ${err.message}`);
}

// ─── 4. ПРОВЕРКА YDB SDK ───────────────────────────────────────────────────
console.log('🗄️  Checking YDB SDK...\n');

try {
  const ydbPkg = require('ydb-sdk/package.json');
  infos.push(`✅ YDB SDK version: ${ydbPkg.version}`);

  // Проверяем экспорты
  try {
    const Ydb = require('ydb-sdk');

    if (Ydb.StaticCredentialsAuthService) {
      infos.push('✅ Ydb.StaticCredentialsAuthService available');
    } else {
      errors.push('❌ Ydb.StaticCredentialsAuthService NOT found');
    }

    if (Ydb.Driver && Ydb.Driver.create) {
      infos.push('✅ Ydb.Driver.create available');
    } else {
      errors.push('❌ Ydb.Driver.create NOT found');
    }

  } catch (importErr) {
    errors.push(`❌ Cannot import ydb-sdk: ${importErr.message}`);
  }

} catch (err) {
  errors.push(`❌ YDB SDK not installed: ${err.message}`);
}

// ─── 5. ПРОВЕРКА СИНТАКСИСА SERVER.JS ─────────────────────────────────────
console.log('🔧 Checking server.js syntax...\n');

try {
  const serverCode = fs.readFileSync('server.js', 'utf8');

  // Проверяем базовые импорты
  if (serverCode.includes("import express from 'express'")) {
    infos.push('✅ server.js has Express import');
  } else {
    errors.push('❌ server.js missing Express import');
  }

  if (serverCode.includes('app.listen')) {
    infos.push('✅ server.js has app.listen');
  } else {
    errors.push('❌ server.js missing app.listen');
  }

  // Проверяем наличие YDB инициализации
  if (serverCode.includes('initDriver') || serverCode.includes('Ydb.Driver')) {
    infos.push('✅ server.js has YDB initialization');
  } else {
    warnings.push('⚠️  server.js missing YDB initialization');
  }

} catch (err) {
  errors.push(`❌ Cannot read server.js: ${err.message}`);
}

// ─── 6. ПРОВЕРКА ПОРТОВ ────────────────────────────────────────────────────
console.log('🔌 Checking ports...\n');

const ports = [3000, 5000, 8080];

ports.forEach(port => {
  try {
    // Проверяем занятость порта (работает на Linux/Mac)
    execSync(`lsof -i :${port}`, { stdio: 'ignore' });
    warnings.push(`⚠️  Port ${port} is already in use`);
  } catch (err) {
    infos.push(`✅ Port ${port} is available`);
  }
});

// ─── 7. ПРОВЕРКА API_URL ───────────────────────────────────────────────────
console.log('🌐 Checking API URL configuration...\n');

const apiUrl = process.env.VITE_API_URL;
if (apiUrl) {
  if (apiUrl.includes('localhost') && process.env.REPL_SLUG) {
    warnings.push('⚠️  VITE_API_URL uses localhost but running on Replit');
    errors.push('❌ Set VITE_API_URL to your Replit URL: https://3000-workspace-username.replit.dev');
  } else if (apiUrl.includes('replit.dev')) {
    infos.push(`✅ API URL configured for Replit: ${apiUrl}`);
  } else {
    warnings.push(`⚠️  API URL: ${apiUrl} (make sure it's correct)`);
  }
} else {
  errors.push('❌ VITE_API_URL not set in .env');
}

// ─── 8. ПРОВЕРКА NODE VERSION ──────────────────────────────────────────────
console.log('📌 Checking Node.js version...\n');

try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion >= 16) {
    infos.push(`✅ Node.js version: ${nodeVersion}`);
  } else {
    errors.push(`❌ Node.js version too old: ${nodeVersion} (need >= 16)`);
  }
} catch (err) {
  errors.push(`❌ Cannot determine Node.js version: ${err.message}`);
}

// ─── ВЫВОД РЕЗУЛЬТАТОВ ─────────────────────────────────────────────────────
console.log('\n🔍 ========================================');
console.log('🔍              RESULTS');
console.log('🔍 ========================================\n');

if (errors.length > 0) {
  console.log('❌ ERRORS (must fix):\n');
  errors.forEach((err, i) => {
    console.log(`${i + 1}. ${err}`);
  });
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS (should check):\n');
  warnings.forEach((warn, i) => {
    console.log(`${i + 1}. ${warn}`);
  });
  console.log('');
}

if (infos.length > 0) {
  console.log('✅ INFO (all good):\n');
  infos.forEach((info, i) => {
    console.log(`${i + 1}. ${info}`);
  });
  console.log('');
}

// ─── РЕКОМЕНДАЦИИ ──────────────────────────────────────────────────────────
if (errors.length > 0) {
  console.log('🔧 RECOMMENDED ACTIONS:\n');

  if (errors.some(e => e.includes('Missing or empty'))) {
    console.log('1. Update .env file with all required variables');
  }

  if (errors.some(e => e.includes('ydb-sdk') || e.includes('YDB SDK'))) {
    console.log('2. Install YDB SDK: npm install ydb-sdk@latest');
  }

  if (errors.some(e => e.includes('VITE_API_URL'))) {
    console.log('3. Set VITE_API_URL in .env to your Replit URL');
  }

  if (errors.some(e => e.includes('Missing dependency'))) {
    console.log('4. Install dependencies: npm install');
  }

  console.log('');
}

// ─── ИТОГ ──────────────────────────────────────────────────────────────────
const exitCode = errors.length > 0 ? 1 : 0;

if (exitCode === 0) {
  console.log('🎉 All checks passed! You can run: npm run dev');
} else {
  console.log(`❌ Found ${errors.length} error(s). Fix them before running the app.`);
}

console.log('\n🔍 ========================================\n');

process.exit(exitCode);