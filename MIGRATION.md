# Миграция на новую структуру базы данных

## Что изменилось

Проект был полностью переработан под конструктор сайта. Вместо простых проектов (`Project`) теперь используется расширенная модель домов (`House`) с тегами, планировками и другими улучшениями.

### Новые модели:

1. **HeaderPromo** - акции для шапки (бегущая строка)
2. **HomePagePromo** - акции и спецпредложения на главной (до 3 карточек)
3. **Tag** - теги для домов (максимум 4 на дом)
4. **House** - дома/проекты с расширенным функционалом
5. **HouseTag** - связь домов и тегов (многие-ко-многим)
6. **FloorPlan** - планировки этажей (1-3 этажа)
7. **PriceInclusion** - что включено в цену
8. **HeroSection** - первая секция главной (до 5 фото + 2 видео)
9. **VideoCard** - карточки с видео (безлимит)
10. **Testimonial** - отзывы клиентов (до 10 фото на отзыв)
11. **ContactRequest** - заявки с форм обратной связи

### Новые API эндпоинты:

```
/api/header-promos         - Акции для шапки
/api/homepage-promos       - Акции на главной
/api/tags                  - Теги домов
/api/houses                - Дома (новый, вместо /api/projects)
/api/houses/:slug/floor-plans       - Планировки
/api/houses/:slug/price-inclusions  - Что включено в цену
/api/hero-sections         - Первая секция главной
/api/video-cards           - Видео карточки
/api/testimonials          - Отзывы
/api/contact-requests      - Заявки
/api/search                - Поиск по сайту
/api/search/houses         - Расширенный поиск домов с фильтрацией
```

### Старые эндпоинты (оставлены для обратной совместимости):

```
/api/projects   - Старый API для проектов
/api/staff      - Персонал (без изменений)
/api/admin      - Админ панель (без изменений)
```

## Инструкция по применению на сервере

### 1. Остановите контейнеры

```bash
cd ~/ECO-tech
docker compose down
```

### 2. Сделайте резервную копию базы данных

```bash
# Подключитесь к PostgreSQL и создайте дамп
pg_dump -U eco-tech -h localhost -p 5432 eco_tech > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Обновите код из репозитория

```bash
git pull origin main
```

### 4. Примените миграции Prisma

**Вариант A: Для production (рекомендуется)**

Если у вас есть существующие данные в таблице `projects`, которые нужно сохранить:

```bash
cd backend

# 1. Создайте миграцию
npx prisma migrate dev --name add_website_constructor

# 2. Примените миграции
npx prisma migrate deploy
```

**Вариант B: Если можно удалить все данные**

```bash
cd backend

# Удалит все данные и пересоздаст БД
npx prisma migrate reset --force
npx prisma migrate deploy
```

### 5. Создайте директории для загрузок

```bash
cd ~/ECO-tech/backend/uploads
mkdir -p promos houses floor-plans hero videos testimonials
chmod -R 755 promos houses floor-plans hero videos testimonials
```

### 6. Пересоберите и запустите контейнеры

```bash
cd ~/ECO-tech
docker compose build --no-cache
docker compose up -d
```

### 7. Проверьте логи

```bash
docker compose logs backend | tail -50
docker compose logs nginx | tail -30
```

### 8. Проверьте Swagger документацию

Откройте в браузере: https://ecotechstroy-dev.ru/docs

Должны появиться новые разделы:
- HeaderPromos
- HomePagePromos
- Tags
- Houses
- FloorPlans
- PriceInclusions
- HeroSections
- VideoCards
- Testimonials
- ContactRequests
- Search

## Миграция данных из Projects в Houses

Если у вас есть данные в старой таблице `projects`, создайте скрипт миграции:

```sql
-- Пример миграции данных (выполнить в psql)
INSERT INTO houses (
  title, 
  slug, 
  regular_price, 
  area, 
  dimensions, 
  floors, 
  rooms, 
  bathrooms, 
  terraces, 
  description, 
  main_image, 
  images, 
  created_at, 
  updated_at,
  is_active,
  display_order
)
SELECT 
  title,
  slug,
  price as regular_price,
  area,
  dimensions,
  floors,
  rooms,
  bathrooms,
  terraces,
  description,
  main_image,
  images,
  created_at,
  updated_at,
  true as is_active,
  0 as display_order
FROM projects;
```

## Проверка работы

1. **Swagger UI**: https://ecotechstroy-dev.ru/docs
2. **Здоровье сервера**: https://ecotechstroy-dev.ru/health
3. **Тест создания заявки** (публичный эндпоинт):

```bash
curl -X POST https://ecotechstroy-dev.ru/api/contact-requests \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Тестовый пользователь",
    "phone": "+7 900 123-45-67",
    "message": "Тестовая заявка",
    "source": "Главная форма"
  }'
```

## Откат изменений

Если что-то пошло не так:

```bash
cd ~/ECO-tech

# Остановите контейнеры
docker compose down

# Восстановите базу из бэкапа
psql -U eco-tech -h localhost -p 5432 eco_tech < backup_YYYYMMDD_HHMMSS.sql

# Откатитесь на предыдущий коммит
git checkout <previous_commit_hash>

# Пересоберите контейнеры
docker compose build --no-cache
docker compose up -d
```

## Дополнительные команды для отладки

```bash
# Посмотреть все контейнеры
docker compose ps

# Посмотреть использование ресурсов
docker stats

# Перезапустить только backend
docker compose restart backend

# Войти в контейнер backend
docker exec -it eco_tech_backend sh

# Проверить схему Prisma внутри контейнера
docker exec -it eco_tech_backend npx prisma migrate status
```

## Нужна помощь?

Если возникли проблемы:

1. Проверьте логи: `docker compose logs backend --tail=100`
2. Проверьте подключение к БД: `docker compose logs postgres-check`
3. Проверьте Nginx: `docker compose logs nginx --tail=50`

## Что дальше?

После успешной миграции можно:

1. Создать первые теги через Swagger UI
2. Добавить дома с фотографиями
3. Настроить первую секцию главной страницы (HeroSection)
4. Добавить акции и спецпредложения
5. Загрузить видео
6. Добавить отзывы клиентов

Все операции доступны через Swagger UI: https://ecotechstroy-dev.ru/docs

