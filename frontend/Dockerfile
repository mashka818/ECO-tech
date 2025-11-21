# Фронтенд - статические файлы
FROM nginx:alpine

# Копируем всю структуру frontend
COPY . /usr/share/nginx/html/

# Nginx будет обслуживать файлы из /usr/share/nginx/html
# Структура: /usr/share/nginx/html/pages/index.html
# Uploads монтируются отдельно через volume в docker-compose

