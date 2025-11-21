# Инструкция по установке на сервере

## Шаг 1: Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install -y git curl wget postgresql postgresql-contrib
```

## Шаг 2: Установка Node.js и npm

```bash
# Установка Node.js 18 через NodeSource (рекомендуется)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
sudo apt install -y nodejs

# Проверка установки
node --version
npm --version

# Альтернативный способ (если первый не работает)
# sudo apt install -y nodejs npm
```

## Шаг 3: Установка Docker и Docker Compose

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверка установки
docker --version
docker compose version
```

## Шаг 4: Настройка PostgreSQL

```bash
# Запуск PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

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

## Шаг 5: Клонирование проекта

```bash
# Переход в директорию для проектов
cd /var/www
# или
cd ~

# Клонирование репозитория
git clone -b v2 https://github.com/mashka818/ECO-tech.git
cd ECO-tech
```

## Шаг 6: Настройка переменных окружения

```bash
# Создание .env файла для backend
cd backend
cp .env.example .env
nano .env
```

Убедитесь, что в `.env` указаны правильные данные:
```
DATABASE_URL=postgresql://eco-tech:eco-tech-password-db@localhost:5432/eco_tech
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=eco_tech
DATABASE_USER=eco-tech
DATABASE_PASSWORD=eco-tech-password-db
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://ecotechstroy-dev.ru
```

## Шаг 7: Установка зависимостей и настройка Prisma

```bash
# Установка зависимостей backend
cd backend
npm install

# Генерация Prisma Client
npm run prisma:generate

# Применение миграций Prisma
npx prisma db push

# Или создание миграций (если БД пустая)
# npm run prisma:migrate
# Введите имя миграции: init
```

## Шаг 8: Создание админа

```bash
# Создание админа с хэшированным паролем (Argon2)
npm run create-admin
# Username: admin, Password: admin
```

## Шаг 9: Сборка backend

```bash
# Сборка TypeScript проекта
npm run build
```

## Шаг 9.5: Настройка DNS записей для домена

**ВАЖНО:** Перед получением SSL сертификата необходимо настроить DNS записи для домена!

### Настройка DNS записей

В панели управления вашего домена (у регистратора домена) нужно создать следующие DNS записи:

**A записи:**
- `ecotechstroy-dev.ru` → `81.177.216.84`
- `www.ecotechstroy-dev.ru` → `81.177.216.84`

**Или CNAME запись (альтернатива):**
- `www.ecotechstroy-dev.ru` → `ecotechstroy-dev.ru` (CNAME)

### Проверка DNS записей

```bash
# Проверка A записи для основного домена
dig ecotechstroy-dev.ru +short
# Должен вернуть: 81.177.216.84

# Проверка A записи для www поддомена
dig www.ecotechstroy-dev.ru +short
# Должен вернуть: 81.177.216.84

# Или через nslookup
nslookup ecotechstroy-dev.ru
nslookup www.ecotechstroy-dev.ru

# Проверка с сервера
curl -I http://ecotechstroy-dev.ru
curl -I http://www.ecotechstroy-dev.ru
```

**Примечание:** После создания DNS записей может потребоваться от 5 минут до 48 часов для их распространения (обычно 15-30 минут).

## Шаг 10: Настройка SSL сертификатов

```bash
# Возврат в корень проекта
cd /var/www/ECO-tech
# или
cd ~/ECO-tech

# Установка Certbot
sudo apt install -y certbot

# ВАЖНО: Убедитесь, что DNS записи настроены и домен указывает на сервер!
# Проверка DNS перед получением сертификата
dig ecotechstroy-dev.ru +short
dig www.ecotechstroy-dev.ru +short

# ВАЖНО: Если порт 80 занят, нужно остановить веб-сервер
# Проверка, что занимает порт 80
sudo netstat -tlnp | grep :80
# или
sudo ss -tlnp | grep :80

# Остановка nginx (если запущен)
sudo systemctl stop nginx

# Остановка apache (если запущен)
sudo systemctl stop apache2

# Получение SSL сертификата
# Вариант 1: С указанием email (рекомендуется)
sudo certbot certonly --standalone -d ecotechstroy-dev.ru -d www.ecotechstroy-dev.ru --email your-email@example.com --agree-tos --non-interactive

# Вариант 2: Без email (если не хотите указывать email)
sudo certbot certonly --standalone -d ecotechstroy-dev.ru -d www.ecotechstroy-dev.ru --register-unsafely-without-email --agree-tos --non-interactive

# После получения сертификата можно запустить nginx обратно (если нужно)
# sudo systemctl start nginx

# Создание директории для SSL
sudo mkdir -p backend/nginx/ssl

# Копирование сертификатов
sudo cp /etc/letsencrypt/live/ecotechstroy-dev.ru/fullchain.pem backend/nginx/ssl/
sudo cp /etc/letsencrypt/live/ecotechstroy-dev.ru/privkey.pem backend/nginx/ssl/
sudo chmod 644 backend/nginx/ssl/fullchain.pem
sudo chmod 600 backend/nginx/ssl/privkey.pem
```

**Важно:** 
- **Перед получением сертификата обязательно настройте DNS записи!** Домен должен указывать на IP сервера `81.177.216.84`
- Замените `your-email@example.com` на ваш реальный email адрес
- Email нужен для уведомлений о скором истечении сертификата
- Если используете вариант без email, вы не будете получать уведомления
- **Перед получением сертификата обязательно остановите веб-сервер (nginx/apache), который занимает порт 80**
- После получения сертификата веб-сервер будет запущен через Docker Compose

## Шаг 11: Настройка файрвола

```bash
# Разрешение необходимых портов
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включение файрвола
sudo ufw enable

# Проверка статуса
sudo ufw status verbose
```

## Шаг 12: Запуск проекта через Docker Compose

```bash
# Возврат в корень проекта
cd /var/www/ECO-tech
# или
cd ~/ECO-tech

# Сборка и запуск всех сервисов
docker-compose build
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Проверка статуса контейнеров
docker-compose ps
```

## Шаг 13: Проверка работы

```bash
# Проверка API
curl http://localhost:3000/health

# Проверка Swagger документации
curl http://localhost:3000/docs

# Проверка через домен (после настройки DNS)
curl https://ecotechstroy-dev.ru/api/health
curl https://ecotechstroy-dev.ru/docs
```

## Полезные команды

### Управление Docker контейнерами

```bash
# Запуск всех сервисов
docker-compose up -d

# Остановка всех сервисов
docker-compose down

# Перезапуск всех сервисов
docker-compose restart

# Просмотр логов
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f nginx

# Пересборка контейнеров
docker-compose build --no-cache
docker-compose up -d
```

### Управление backend

```bash
cd backend

# Разработка (с автоперезагрузкой)
npm run dev

# Сборка проекта
npm run build

# Запуск собранного проекта
npm start

# Prisma Studio (GUI для БД)
npm run prisma:studio

# Создание нового админа
npm run create-admin
```

### Обновление проекта

```bash
# Обновление кода из Git
cd /var/www/ECO-tech
# или
cd ~/ECO-tech

git pull origin v2

# Обновление зависимостей backend
cd backend
npm install
npm run prisma:generate
npm run build

# Перезапуск контейнеров
cd ..
docker-compose restart
```

### Работа с базой данных

```bash
# Подключение к PostgreSQL
psql -U eco-tech -d eco_tech

# Применение миграций Prisma
cd backend
npx prisma db push

# Создание новой миграции
npm run prisma:migrate

# Просмотр данных через Prisma Studio
npm run prisma:studio
# Откроется на http://localhost:5555
```

### Мониторинг и логи

```bash
# Логи всех сервисов
docker-compose logs -f

# Логи только backend
docker-compose logs -f backend

# Логи только nginx
docker-compose logs -f nginx

# Статус контейнеров
docker-compose ps

# Использование ресурсов
docker stats
```

### Обновление SSL сертификатов

```bash
# Ручное обновление
sudo certbot renew

# Тест автоматического обновления
sudo certbot renew --dry-run

# Настройка автоматического обновления (через cron)
sudo crontab -e
# Добавить строку:
# 0 3 * * * certbot renew --quiet
```

## Решение проблем

### Backend не запускается

```bash
# Проверка логов
docker-compose logs backend

# Проверка подключения к БД
cd backend
npx prisma db push

# Проверка переменных окружения
cat .env

# Пересборка контейнера
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Ошибки подключения к БД

```bash
# Проверка статуса PostgreSQL
sudo systemctl status postgresql

# Проверка подключения
psql -U eco-tech -d eco_tech -h localhost

# Проверка прав доступа в pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf
# Убедитесь, что есть строка:
# host    all             all             127.0.0.1/32           md5

# Перезапуск PostgreSQL
sudo systemctl restart postgresql
```

### Nginx не работает

```bash
# Проверка конфигурации
docker-compose exec nginx nginx -t

# Просмотр логов
docker-compose logs nginx

# Перезапуск nginx
docker-compose restart nginx
```

### Swagger не открывается

```bash
# Проверка доступности backend
curl http://localhost:3000/docs

# Проверка проксирования nginx
curl http://localhost/docs

# Проверка логов backend
docker-compose logs backend | grep docs
```

### Ошибка "port 80 already in use" при получении SSL

```bash
# Проверка, что занимает порт 80
sudo netstat -tlnp | grep :80
# или
sudo ss -tlnp | grep :80

# Остановка nginx
sudo systemctl stop nginx

# Остановка apache
sudo systemctl stop apache2

# Проверка, что порт свободен
sudo netstat -tlnp | grep :80

# Повторная попытка получения сертификата
sudo certbot certonly --standalone -d ecotechstroy-dev.ru -d www.ecotechstroy-dev.ru --register-unsafely-without-email --agree-tos --non-interactive
```

### Ошибка "no valid A records found" или "NXDOMAIN" при получении SSL

Эта ошибка означает, что DNS записи для домена не настроены или еще не распространились.

```bash
# 1. Проверка DNS записей
dig ecotechstroy-dev.ru +short
dig www.ecotechstroy-dev.ru +short

# Должны вернуть: 81.177.216.84

# 2. Если записи не настроены, настройте их в панели управления доменом:
# - A запись: ecotechstroy-dev.ru → 81.177.216.84
# - A запись: www.ecotechstroy-dev.ru → 81.177.216.84
# Или CNAME: www.ecotechstroy-dev.ru → ecotechstroy-dev.ru

# 3. Ожидание распространения DNS (может занять до 48 часов, обычно 15-30 минут)
# Проверка каждые 5 минут:
watch -n 300 'dig ecotechstroy-dev.ru +short'

# 4. После того как DNS записи настроены и распространились, повторите получение сертификата
sudo certbot certonly --standalone -d ecotechstroy-dev.ru -d www.ecotechstroy-dev.ru --register-unsafely-without-email --agree-tos --non-interactive
```

**Где настраивать DNS:**
- В панели управления доменом у вашего регистратора
- Обычно раздел называется "DNS", "DNS Management", "Управление DNS"
- Нужно создать A записи для домена и www поддомена

## Структура проекта

```
ECO-tech/
├── backend/              # Backend API
│   ├── prisma/          # Prisma схема и миграции
│   ├── routes/          # API роуты
│   ├── config/          # Конфигурация (Swagger)
│   ├── uploads/         # Загруженные файлы
│   └── ...
├── frontend/            # Frontend
├── nginx/              # SSL сертификаты
│   └── ssl/
├── docker-compose.yml  # Конфигурация Docker
├── nginx.conf          # Конфигурация Nginx
└── README.md           # Документация
```

## Доступ к сервисам

- **API:** `http://81.177.216.84:3000` или `https://ecotechstroy-dev.ru/api`
- **Swagger:** `http://81.177.216.84/docs` или `https://ecotechstroy-dev.ru/docs`
- **Frontend:** `https://ecotechstroy-dev.ru`
- **Prisma Studio:** `http://localhost:5555` (локально, через `npm run prisma:studio`)

## Безопасность

- Пароли админов хэшируются через Argon2
- SSL сертификаты обновляются автоматически
- Файрвол настроен для ограничения доступа
- Сессии админов требуют авторизации

## Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs -f`
2. Проверьте статус контейнеров: `docker-compose ps`
3. Проверьте подключение к БД: `psql -U eco-tech -d eco_tech`
4. Проверьте переменные окружения: `cat backend/.env`
