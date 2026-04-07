# Тролль-Монте

Небольшая игра на React/Vite: выбери одну из трех карт и попробуй пережить издевательства дилера.

## Локальный запуск

Нужен только Node.js.

1. Установить зависимости: `npm install`
2. Запустить dev-сервер: `npm run dev`
3. Собрать production-версию: `npm run build`

## Деплой на GitHub Pages

В репозитории настроен workflow [`.github/workflows/deploy-pages.yml`](/Users/alexey/proj/hobby/trollmonte/.github/workflows/deploy-pages.yml), который публикует приложение в GitHub Pages при пуше в ветку `main`.

Что нужно включить в GitHub:

1. Открыть `Settings -> Pages`.
2. В `Source` выбрать `GitHub Actions`.
3. Запушить изменения в `main`.

Для project pages сборка автоматически использует base-путь `/<repo>/`, для репозитория вида `<user>.github.io` используется `/`.
