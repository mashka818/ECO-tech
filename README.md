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

**Или смотрите подробную инструкцию:** [backend/SETUP.md](backend/SETUP.md)

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

#### Настройка DNS записей (ОБЯЗАТЕЛЬНО перед SSL!)

В панели управления доменом создайте DNS записи:
- **A запись:** `ecotechstroy-dev.ru` → `81.177.216.84`
- **A запись:** `www.ecotechstroy-dev.ru` → `81.177.216.84`

Проверка DNS:
```bash
dig ecotechstroy-dev.ru +short  # Должно вернуть: 81.177.216.84
dig www.ecotechstroy-dev.ru +short  # Должно вернуть: 81.177.216.84
```

**Важно:** Подождите 15-30 минут после создания записей для их распространения.

#### Настройка SSL (для HTTPS)
```bash
sudo apt install -y certbot

# ВАЖНО: Убедитесь, что DNS записи настроены и домен указывает на сервер!
# Проверка DNS
dig ecotechstroy-dev.ru +short
dig www.ecotechstroy-dev.ru +short

# ВАЖНО: Остановите веб-сервер перед получением сертификата
sudo systemctl stop nginx
sudo systemctl stop apache2

# Получение SSL сертификата с email (рекомендуется)
sudo certbot certonly --standalone -d ecotechstroy-dev.ru -d www.ecotechstroy-dev.ru --email your-email@example.com --agree-tos --non-interactive

# Или без email (если не хотите указывать)
sudo certbot certonly --standalone -d ecotechstroy-dev.ru -d www.ecotechstroy-dev.ru --register-unsafely-without-email --agree-tos --non-interactive

# Копирование сертификатов
sudo mkdir -p backend/nginx/ssl
sudo cp /etc/letsencrypt/live/ecotechstroy-dev.ru/fullchain.pem backend/nginx/ssl/
sudo cp /etc/letsencrypt/live/ecotechstroy-dev.ru/privkey.pem backend/nginx/ssl/
sudo chmod 644 backend/nginx/ssl/fullchain.pem
sudo chmod 600 backend/nginx/ssl/privkey.pem
```

**Примечания:** 
- **Сначала настройте DNS записи!** Без них Certbot не сможет получить сертификат
- Замените `your-email@example.com` на ваш реальный email адрес
- **Обязательно остановите nginx/apache перед получением сертификата**, иначе будет ошибка "port 80 already in use"
- После получения сертификата веб-сервер будет запущен через Docker Compose

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
- `GET /api/admin/check` - Проверка авторизации
- `POST /api/projects` - Создать проект
- `PUT /api/projects/:id` - Обновить проект
- `DELETE /api/projects/:id` - Удалить проект
- `POST /api/staff` - Добавить фото персонала
- `PUT /api/staff/:id` - Обновить фото персонала
- `DELETE /api/staff/:id` - Удалить фото персонала

### Документация API
- `GET /docs` - Swagger UI документация
  - HTTP: `http://81.177.216.84/docs`
  - HTTPS: `https://ecotechstroy-dev.ru/docs`

## Полезные команды

```bash
# Управление контейнерами
docker-compose up -d              # Запуск всех сервисов
docker-compose down               # Остановка всех сервисов
docker-compose restart            # Перезапуск всех сервисов
docker-compose logs -f            # Логи всех сервисов
docker-compose logs -f backend    # Логи только backend
docker-compose ps                 # Статус контейнеров

# Backend
cd backend
npm install                       # Установка зависимостей
npm run dev                       # Разработка (с автоперезагрузкой)
npm run build                     # Сборка TypeScript
npm start                         # Запуск собранного проекта
npm run prisma:generate           # Генерация Prisma Client
npm run prisma:studio             # Prisma Studio (GUI для БД)
npm run prisma:migrate            # Создание миграции
npx prisma db push                # Применение изменений схемы
npm run create-admin              # Создать админа

# Обновление проекта
git pull origin v2
cd backend
npm install
npm run prisma:generate
npm run build
cd ..
docker-compose restart
```

**Подробная документация:** [backend/SETUP.md](backend/SETUP.md)

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

