# Lis — Социальная сеть

## Стек технологий
- **Frontend**: React 18 + Vite (порт 5000)
- **Backend**: Express.js + SQLite через `better-sqlite3` (порт 3001)
- **CSS**: Tailwind CSS v3, кастомный index.css
- **Auth**: JWT (токен хранится в localStorage)
- **Запуск**: `concurrently` — оба сервиса через `npm run dev`

## Структура проекта
```
src/
  App.jsx               # Маршрутизация, lazy loading, провайдеры
  main.jsx              # Точка входа React
  index.css             # Глобальные стили (Tailwind + кастомные)
  context/
    AuthContext.jsx     # Авторизация, user, login/logout/register
    FitnessContext.jsx  # Таймер активности (не используется в UI напрямую)
    PremiumContext.jsx  # Премиум-статус пользователя
  components/
    Header.jsx          # Шапка с градиентом, уведомления, мобильный nav
  pages/
    Login.jsx           # Вход
    Register.jsx        # Регистрация
    Feed.jsx            # Лента, истории, таймер 10 мин, создание постов
    Profile.jsx         # Профиль, редактирование, выход, добавление в друзья
    Messages.jsx        # Личные сообщения, polling 5с
    Search.jsx          # Поиск пользователей в реальном времени
  services/
    index.js            # Все API-методы (auth, posts, messages, friends, stories, notifications, timer)
server.js               # Express API (SQLite, JWT, multer для файлов)
lis_users.db            # База данных SQLite
```

## API Endpoints (server.js)
- `POST /api/auth/register` — регистрация
- `POST /api/auth/login` — вход
- `GET/PUT /api/users/:uid` — профиль
- `POST /api/users/avatar` — загрузка аватара
- `GET /api/users/search?q=` — поиск пользователей
- `GET/POST /api/posts` — лента и создание постов
- `POST /api/posts/:id/like` — лайк
- `GET/POST /api/posts/:id/comments` — комментарии
- `GET/POST /api/messages/conversations` — чаты
- `GET/POST/DELETE /api/messages/:id` — сообщения
- `POST /api/friends/request` — запрос в друзья
- `POST /api/friends/accept` — принять запрос
- `GET/POST /api/stories` — истории
- `GET/PUT /api/notifications` — уведомления
- `GET/POST /api/feed-timer` — таймер ленты

## Ключевые особенности
- Фиолетово-розовый градиентный дизайн по всему приложению
- Логотип «Lis» в каллиграфическом шрифте Parisienne
- Таймер ленты: 10 минут → модал с выбором (упражнение или перерыв 30 мин)
- Бар историй с просмотром
- Поиск в реальном времени (с дебаунсом 300мс)
- Сообщения с автообновлением каждые 5 секунд
- Мобильная нижняя навигация (на экранах < sm)
- Lazy loading страниц через React.lazy + Suspense
- Все тексты UI на русском языке

## AuthContext
- Экспортирует `user` (не `currentUser`)
- Методы: `login`, `register`, `logout`, `updateUser`

## Переменные окружения
- `JWT_SECRET` — секрет для JWT (по умолчанию `lis_users_secret_key_2024`)
- `VITE_API_URL` — URL бэкенда (по умолчанию `http://localhost:3001`)

## Запуск
```bash
npm run dev   # запускает сервер (3001) и клиент (5000) одновременно
```
