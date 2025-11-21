# Prisma ORM - Документация

Проект использует Prisma ORM для работы с базой данных PostgreSQL.

## Установка и настройка

### 1. Установка зависимостей
```bash
npm install
```

### 2. Настройка DATABASE_URL
В файле `.env` должен быть указан `DATABASE_URL`:
```
DATABASE_URL=postgresql://eco-tech:eco-tech-password-db@localhost:5432/eco_tech
```

### 3. Генерация Prisma Client
```bash
npm run prisma:generate
```

### 4. Создание миграций

#### Если БД пустая (первый запуск):
```bash
npm run prisma:migrate
# Введите имя миграции: init
```

#### Если БД уже существует:
```bash
npx prisma db push
```

## Команды

- `npm run prisma:generate` - Генерация Prisma Client
- `npm run prisma:migrate` - Создание новой миграции
- `npm run prisma:deploy` - Применение миграций в продакшене
- `npm run prisma:studio` - Открыть Prisma Studio (GUI для БД)

## Структура схемы

Схема Prisma находится в `prisma/schema.prisma` и содержит:

- **Project** - Проекты домов
- **ProjectImage** - Изображения проектов
- **StaffPhoto** - Фотографии персонала
- **Admin** - Администраторы

## Использование в коде

```typescript
import { prisma } from './prisma/client';

// Получить все проекты
const projects = await prisma.project.findMany({
  include: { images: true }
});

// Создать проект
const project = await prisma.project.create({
  data: {
    title: 'Новый проект',
    slug: 'novyi-proekt',
    // ...
  }
});

// Обновить проект
const updated = await prisma.project.update({
  where: { id: 1 },
  data: { title: 'Обновленный заголовок' }
});

// Удалить проект
await prisma.project.delete({
  where: { id: 1 }
});
```

## Миграции

Миграции Prisma автоматически создают SQL файлы в `prisma/migrations/`.

Для применения миграций в продакшене:
```bash
npm run prisma:deploy
```

## Prisma Studio

Визуальный редактор базы данных:
```bash
npm run prisma:studio
```

Откроется веб-интерфейс на http://localhost:5555

