# ECO-tech Backend

Backend API для сайта строительной компании.

## Установка на сервере

### 1. Установка зависимостей
```bash
cd backend
npm install
```

### 2. Настройка переменных окружения
```bash
cp .env.example .env
# Отредактируйте .env файл
```

### 3. Настройка Prisma
```bash
# Убедитесь, что в .env указан DATABASE_URL:
# DATABASE_URL=postgresql://eco-tech:eco-tech-password-db@localhost:5432/eco_tech

# Генерация Prisma Client
npm run prisma:generate

# Создание миграций
npm run prisma:migrate
# Или если БД уже существует:
npx prisma db push
```

### 3.1. Создание админа
```bash
# Создание админа с хэшированным паролем (Argon2)
npm run create-admin
# Username: admin, Password: admin
```

### 3.2. Prisma Studio (опционально)
```bash
# Открыть Prisma Studio для просмотра/редактирования данных
npm run prisma:studio
```

### 4. Сборка проекта
```bash
npm run build
```

### 5. Запуск через Docker
```bash
docker compose up -d
```

### 6. Настройка Nginx
```bash
chmod +x setup-nginx.sh
sudo ./setup-nginx.sh
```

## API Endpoints

### Публичные endpoints

- `GET /api/projects` - Получить все проекты
- `GET /api/projects/:slug` - Получить проект по slug
- `GET /api/staff` - Получить фотографии персонала

### Админ endpoints

- `POST /api/admin/login` - Вход (username: admin, password: admin)
- `GET /api/admin/check` - Проверка авторизации
- `POST /api/projects` - Создать проект
- `PUT /api/projects/:id` - Обновить проект
- `DELETE /api/projects/:id` - Удалить проект
- `POST /api/staff` - Добавить фото персонала
- `PUT /api/staff/:id` - Обновить фото персонала
- `DELETE /api/staff/:id` - Удалить фото персонала

## Структура проекта

```
backend/
├── prisma/              # Prisma схема и миграции
│   ├── schema.prisma    # Схема базы данных
│   └── migrations/      # Миграции Prisma
├── routes/              # API роуты
├── middleware/          # Middleware функции
├── utils/               # Утилиты (хэширование паролей)
├── scripts/             # Скрипты (создание админа)
├── uploads/             # Загруженные файлы
│   ├── projects/        # Фото проектов
│   └── staff/           # Фото персонала
├── types/               # TypeScript типы
├── server.ts            # Главный файл сервера
└── docker-compose.yml   # Docker конфигурация
```

## Формат имен файлов персонала

Фотографии персонала автоматически переименовываются в формат:
`имя-фамилия-должность.jpg`

Пример: `ivan-ivanov-director.jpg`

