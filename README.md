# ECO-tech - Сайт строительной компании

Проект состоит из фронтенда и бэкенда, запускаемых через Docker Compose.

## Быстрый старт

### 1. Клонирование проекта
```bash
git clone -b v2 https://github.com/mashka818/ECO-tech.git
cd ECO-tech
```

### 2. Автоматическая настройка (рекомендуется)
```bash
chmod +x setup.sh
sudo ./setup.sh
```

### 3. Ручная настройка

#### Настройка переменных окружения
```bash
cp backend/.env.example backend/.env
# Отредактируйте backend/.env
```

#### Установка зависимостей
```bash
cd backend
npm install
npm run prisma:generate
cd ..
```

#### Настройка базы данных
```bash
# Создание пользователя и БД (если еще не создано)
sudo -i -u postgres psql
CREATE USER "eco-tech" WITH PASSWORD 'eco-tech-password-db';
CREATE DATABASE eco_tech OWNER "eco-tech";
\q

# Применение миграций
cd backend
npx prisma db push
npm run create-admin
cd ..
```

#### Настройка SSL (для HTTPS)
```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d ecotechstroy-dev.ru -d www.ecotechstroy-dev.ru

# Копирование сертификатов
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/ecotechstroy-dev.ru/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/ecotechstroy-dev.ru/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/fullchain.pem
sudo chmod 600 nginx/ssl/privkey.pem
```

### 4. Запуск проекта

```bash
# Сборка и запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

## Структура проекта

```
eco-tech/
├── backend/              # Backend API (Node.js + TypeScript + Prisma)
│   ├── prisma/          # Prisma схема и миграции
│   ├── routes/          # API роуты
│   ├── uploads/         # Загруженные файлы
│   └── ...
├── frontend/            # Frontend (статический сайт)
│   ├── pages/
│   ├── components/
│   └── styles/
├── nginx/               # SSL сертификаты
│   └── ssl/
├── docker-compose.yml   # Конфигурация Docker Compose
├── nginx.conf          # Конфигурация Nginx
└── setup.sh            # Скрипт автоматической настройки
```

## Сервисы

- **backend** - Backend API на порту 3000
- **frontend** - Frontend (статический сайт)
- **nginx** - Nginx reverse proxy на портах 80/443
- **postgres-check** - Проверка готовности PostgreSQL

## API Endpoints

### Публичные
- `GET /api/projects` - Список проектов
- `GET /api/projects/:slug` - Проект по slug
- `GET /api/staff` - Фотографии персонала

### Админ (требует авторизации)
- `POST /api/admin/login` - Вход (admin/admin)
- `POST /api/projects` - Создать проект
- `PUT /api/projects/:id` - Обновить проект
- `DELETE /api/projects/:id` - Удалить проект
- `POST /api/staff` - Добавить фото персонала
- `PUT /api/staff/:id` - Обновить фото персонала
- `DELETE /api/staff/:id` - Удалить фото персонала

## Полезные команды

```bash
# Управление контейнерами
docker-compose up -d              # Запуск
docker-compose down               # Остановка
docker-compose restart            # Перезапуск
docker-compose logs -f             # Логи всех сервисов
docker-compose logs -f backend     # Логи только backend

# Backend
cd backend
npm run dev                        # Разработка
npm run build                      # Сборка
npm run prisma:studio              # Prisma Studio
npm run create-admin               # Создать админа

# Обновление проекта
git pull origin v2
cd backend && npm install && npm run build
docker-compose restart
```

## Переменные окружения

Основные переменные в `backend/.env`:
- `DATABASE_URL` - URL подключения к PostgreSQL
- `PORT` - Порт backend (по умолчанию 3000)
- `NODE_ENV` - Окружение (production/development)

## Домен и SSL

- Домен: `ecotechstroy-dev.ru`
- SSL сертификаты: Let's Encrypt
- Автоматическое обновление: `sudo certbot renew --dry-run`

## Поддержка

При возникновении проблем проверьте:
1. Логи: `docker-compose logs -f`
2. Статус контейнеров: `docker-compose ps`
3. Подключение к БД: `psql -U eco-tech -d eco_tech`

