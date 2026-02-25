# Настройка Cloudflare Worker и Notion API

Это пошаговая инструкция по привязке игры к вашей Notion CRM через собственный Cloudflare Worker на домене `310596.xyz`.

## Шаг 1: Подготовка Notion
1. Создайте базу данных (Table) в Notion со следующими свойствами:
   - `Name` (тип: **Title**)
   - `Telegram ID` (тип: **Number**)
   - `Total Games` (тип: **Number**)
   - `Wins` (тип: **Number**)
   - `Losses` (тип: **Number**)
   - `Draws` (тип: **Number**)
   - `Last Choice` (тип: **Select**, добавьте туда опции `rock`, `paper`, `scissors`)
   - `First Login` (тип: **Date**)
   - `Last Active` (тип: **Date**)
   - `Updated At` (тип: **Date**)
2. Перейдите по адресу: [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
3. Создайте новую интеграцию (назовите её, например, "RPS Bot CRM").
4. Скопируйте **Internal Integration Secret** (это ваш `NOTION_API_KEY`).
5. Откройте вашу базу данных в Notion, нажмите кнопку `...` в правом верхнем углу, выберите **"Add connections"** (или "Connect to") и добавьте созданную вами интеграцию.
6. Вытащите ID вашей базы данных. Он находится в URL-адресе:
   `https://www.notion.so/YOUR_WORKSPACE_NAME/`**`1234567890abcdef1234567890abcdef`**`?v=...`
   То, что я выделил жирным — это ваш `DATABASE_ID`.

## Шаг 2: Настройка Cloudflare Worker
1. Зайдите в панель Cloudflare: [dash.cloudflare.com](https://dash.cloudflare.com)
2. В левом меню перейдите в **Workers & Pages**.
3. Нажмите кнопку **Create application**, затем **Create Worker**.
4. Назовите его, например: `rps-notion-api`. Нажмите **Deploy**.
5. Нажмите **Edit code**. Скопируйте полностью всё содержимое из локального файла `worker.js` (я создал его в папке проекта) и вставьте в редактор Cloudflare. Нажмите **Save and deploy**.

## Шаг 3: Настройка переменных окружения (в Cloudflare)
1. В панели Cloudflare перейдите в настройки вашего воркера (`rps-notion-api`).
2. Зайдите в вкладку **Settings** -> раздел **Variables**.
3. Добавьте две переменные (Environment Variables):
   - `NOTION_API_KEY`: вставьте сюда ваш секретный ключ из Шага 1.
   - `NOTION_DATABASE_ID`: вставьте сюда ID вашей базы данных из Шага 1.
   *(Обязательно нажмите кнопочку "Encrypt" или "Secret", чтобы ключи были спрятаны).*

## Шаг 4: Привязка к вашему домену
1. В настройках воркера зайдите во вкладку **Triggers**.
2. В разделе **Custom Domains** нажмите **Add Custom Domain**.
3. Введите поддомен для API, например: `api.310596.xyz`.
4. Нажмите **Add Custom Domain**. Cloudflare автоматически пропишет нужные DNS-записи.

## Шаг 5: Обновление конфигурации игры
Как только воркер заработает по вашему домену, откройте файл `script.js` в проекте, найдите в самом начале строчку:
`const API_URL = "https://api.310596.xyz";`
Убедитесь, что там указан именно тот домен, который вы привязали к Воркеру на Шаге 4.
После этого можно играть — статистика сама полетит в Notion!
