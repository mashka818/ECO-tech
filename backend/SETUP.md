# Инструкция по установке на сервере

## Шаг 1: Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install -y git curl wget nginx postgresql postgresql-contrib
```

## Шаг 2: Настройка PostgreSQL

```bash
# Создание пользователя и базы данных
sudo -i -u postgres
psql

CREATE USER "eco-tech" WITH PASSWORD 'eco-tech-password-db';
ALTER USER "eco-tech" WITH CREATEDB;
CREATE DATABASE eco_tech OWNER "eco-tech";
GRANT ALL PRIVILEGES ON DATABASE eco_tech TO "eco-tech";
\q
exit
```

## Шаг 3: Клонирование проекта

```bash
cd /var/www
git clone -b v2 https://github.com/mashka818/ECO-tech.git
cd ECO-tech/backend
```

## Шаг 4: Установка зависимостей и сборка

```bash
npm install
npm run build
```

## Шаг 5: Настройка переменных окружения

```bash
cp .env.example .env
nano .env
```

Убедитесь, что в `.env` указаны правильные данные:
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=eco_tech
DATABASE_USER=eco-tech
DATABASE_PASSWORD=eco-tech-password-db
PORT=3000
```

## Шаг 6: Настройка Prisma и выполнение миграций

```bash
# Генерация Prisma Client
npm run prisma:generate

# Создание миграций (если БД пустая)
npm run prisma:migrate
# Введите имя миграции: init

# Если БД уже существует, можно использовать:
npx prisma db push
```

## Шаг 6.1: Создание админа с хэшированным паролем

```bash
# Создание админа (username: admin, password: admin)
npm run create-admin
```

Этот скрипт создаст админа с паролем, хэшированным через Argon2.

## Шаг 7: Создание директорий для загрузок

```bash
mkdir -p uploads/projects uploads/staff
chmod -R 755 uploads
```

## Шаг 8: Настройка Nginx

```bash
# Копирование конфигурации
sudo cp nginx.conf /etc/nginx/sites-available/ecotechstroy-dev.ru
sudo ln -sf /etc/nginx/sites-available/ecotechstroy-dev.ru /etc/nginx/sites-enabled/

# Удаление дефолтной конфигурации
sudo rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации
sudo nginx -t
```

## Шаг 9: Установка SSL сертификата

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d ecotechstroy-dev.ru -d www.ecotechstroy-dev.ru

# Автоматическое обновление
sudo certbot renew --dry-run
```

## Шаг 10: Запуск через Docker

```bash
# Сборка и запуск
docker compose up -d

# Просмотр логов
docker compose logs -f

# Проверка статуса
docker compose ps
```

## Шаг 11: Перезапуск Nginx

```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Шаг 12: Проверка работы

```bash
# Проверка API
curl http://localhost:3000/health

# Проверка через домен
curl https://ecotechstroy-dev.ru/api/health
```

## Полезные команды

```bash
# Просмотр логов backend
docker compose logs -f backend

# Перезапуск backend
docker compose restart backend

# Остановка всех контейнеров
docker compose down

# Обновление проекта
cd /var/www/ECO-tech
git pull origin v2
cd backend
npm install
npm run build
docker compose restart backend
```

## Настройка файрвола

```bash
# Разрешение портов
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw enable
```

