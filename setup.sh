#!/bin/bash

# Скрипт для настройки всего проекта на сервере

echo "🚀 Настройка ECO-tech проекта..."

# Проверка прав
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Некоторые команды требуют sudo. Запустите скрипт с sudo для полной настройки."
fi

# 1. Установка Docker и Docker Compose (если не установлены)
if ! command -v docker &> /dev/null; then
    echo "📦 Установка Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

if ! command -v docker-compose &> /dev/null; then
    echo "📦 Установка Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 2. Установка PostgreSQL (если не установлен)
if ! command -v psql &> /dev/null; then
    echo "📦 Установка PostgreSQL..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# 3. Настройка PostgreSQL
echo "🗄️  Настройка базы данных..."
sudo -i -u postgres psql << EOF
CREATE USER "eco-tech" WITH PASSWORD 'eco-tech-password-db';
ALTER USER "eco-tech" WITH CREATEDB;
CREATE DATABASE eco_tech OWNER "eco-tech";
GRANT ALL PRIVILEGES ON DATABASE eco_tech TO "eco-tech";
EOF

# 4. Настройка переменных окружения
echo "⚙️  Настройка переменных окружения..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Создан файл backend/.env. Отредактируйте его при необходимости."
fi

# 5. Установка зависимостей backend
echo "📦 Установка зависимостей backend..."
cd backend
npm install
npm run prisma:generate
cd ..

# 6. Применение миграций Prisma
echo "🗄️  Применение миграций базы данных..."
cd backend
npx prisma db push
cd ..

# 7. Создание админа
echo "👤 Создание администратора..."
cd backend
npm run create-admin
cd ..

# 8. Создание директорий для SSL
echo "🔒 Создание директорий для SSL..."
sudo mkdir -p nginx/ssl
sudo chmod 755 nginx/ssl

# 9. Установка SSL сертификата (если нужно)
if [ ! -f nginx/ssl/fullchain.pem ]; then
    echo "🔒 Установка SSL сертификата через Certbot..."
    sudo apt install -y certbot
    
    # Остановка веб-серверов, которые могут занимать порт 80
    echo "Остановка веб-серверов для освобождения порта 80..."
    sudo systemctl stop nginx 2>/dev/null || true
    sudo systemctl stop apache2 2>/dev/null || true
    
    # Проверка, свободен ли порт 80
    if sudo netstat -tlnp | grep -q ":80 "; then
        echo "⚠️  Порт 80 все еще занят. Проверьте, что занимает порт:"
        sudo netstat -tlnp | grep :80
        echo "Остановите процесс вручную и повторите попытку."
    else
        # Запрос email или использование флага без email
        read -p "Введите email для уведомлений (или нажмите Enter для пропуска): " EMAIL
        
        if [ -z "$EMAIL" ]; then
            echo "Получение сертификата без email..."
            sudo certbot certonly --standalone -d ecotechstroy-dev.ru -d www.ecotechstroy-dev.ru --register-unsafely-without-email --agree-tos --non-interactive
        else
            echo "Получение сертификата с email: $EMAIL"
            sudo certbot certonly --standalone -d ecotechstroy-dev.ru -d www.ecotechstroy-dev.ru --email "$EMAIL" --agree-tos --non-interactive
        fi
        
        # Копирование сертификатов
        if [ -f /etc/letsencrypt/live/ecotechstroy-dev.ru/fullchain.pem ]; then
            sudo cp /etc/letsencrypt/live/ecotechstroy-dev.ru/fullchain.pem nginx/ssl/
            sudo cp /etc/letsencrypt/live/ecotechstroy-dev.ru/privkey.pem nginx/ssl/
            sudo chmod 644 nginx/ssl/fullchain.pem
            sudo chmod 600 nginx/ssl/privkey.pem
            echo "✅ SSL сертификаты успешно скопированы"
        else
            echo "⚠️  Не удалось получить сертификаты. Проверьте настройки DNS и доступность домена."
        fi
    fi
fi

# 10. Настройка файрвола
echo "🔥 Настройка файрвола..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 11. Сборка и запуск контейнеров
echo "🐳 Сборка и запуск Docker контейнеров..."
docker-compose build
docker-compose up -d

echo "✅ Настройка завершена!"
echo ""
echo "📋 Полезные команды:"
echo "  docker-compose up -d          # Запуск всех сервисов"
echo "  docker-compose down           # Остановка всех сервисов"
echo "  docker-compose logs -f        # Просмотр логов"
echo "  docker-compose restart        # Перезапуск всех сервисов"
echo ""
echo "🌐 Сайт будет доступен по адресу: https://ecotechstroy-dev.ru"

