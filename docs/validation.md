# Проверка GriefTool v2

Проверено на Node.js 24, Next.js 16.4.3 и Chromium.

## Автоматические проверки

- 11 проверок `npm test`: цены и промокоды, вход по логину/паролю, scrypt, срок сессий и выход, смена пароля владельца, роли, отключение сотрудника, лимиты запросов.
- 3 проверки `node tests/migration.test.mjs`: сохранение прежних заказов и каталога, перенос правил, завершение старых сессий и добавление связи с аккаунтом.
- 16 проверок API магазина на production-контейнере: авторизация, Origin, CRUD, серверная цена, ник, сохранение заказа, запрет покупки скрытого товара, отклонение опасных ссылок.
- 13 проверок API сообщества на production-контейнере: управление сотрудниками, запрет превышения прав, публикация правил, скрытые черновики, публикация новости, приватность обращения, ответ команды, продолжение переписки, отзыв доступа и удаление контента.

Всего — 43 проверки, все прошли.

## Браузерные сценарии production-сборки

- Каталог, поиск и категории; создание заказа без оплаты; FAQ.
- Вход по логину/паролю; создание, изменение и удаление товара; сохранение настроек; выход.
- Создание раздела правил в админке и проверка его на публичной странице.
- Публикация новости и открытие полного текста по отдельному адресу.
- Обращение игрока → ответ сотрудника в админке → ответ игрока → закрытие обращения.
- Восстановление приватной переписки в другом браузере по коду доступа.
- Создание сотрудника поддержки, вход с отдельной ролью, проверка ограниченной навигации, отключение и отзыв сессии.
- Удаление тестовых новостей, правил и сотрудника через интерфейс.
- Проверка главной на 1440/390/360 px и остальных новых страниц на 390 px; горизонтального переполнения страницы нет.
- Необработанных ошибок JavaScript в проверенных сценариях нет. Публичных ссылок на `/admin` нет.

## Развёртывание и данные

Итоговый Docker-образ собран без ошибок. Docker Compose прошёл проверку конфигурации с заданными логином, паролем и доменом. Production-приложение отвечает на `/api/health`. Проверка зависимостей `npm audit --omit=dev --audit-level=high` не обнаружила известных уязвимостей.

Перезапуск контейнера сохраняет данные, включая аккаунты и обращения. Резервная копия создана работающим приложением через SQLite backup API; восстановленный отдельный файл проверен через `PRAGMA quick_check`.

Пароли и тестовые базы не входят в исходники или архив. Снимки находятся в игнорируемой папке `test-results/`.

Не выполнено: размещение на публичном домене владельца, выпуск реального HTTPS-сертификата, подключение платежей и выдачи доната. Для развёртывания подготовлены Docker Compose, Caddy и README.

## Seasonal update — 2026-11-01

- `npm test`: 11 existing catalog/auth tests passed.
- `node tests/migration.test.mjs`: 3 migration tests passed.
- `node tests/events.test.mjs`: 11 tests passed, including concurrent redemption, case-insensitive nickname, UUID duplication, browser independence, campaign switching, missing reward config, idempotent acknowledgement and records surviving a new process.
- Existing HTTP suites: 16 base API checks and 13 community checks passed on isolated production server; support role also denied access to seasonal settings.
- `npm run build`: production build passed.
- `scripts/events-smoke.py`: Playwright/Chromium verified all themes, six collectible pumpkins across three routes, saved browser progress, nickname/command dialog, 390px layout and no page errors.
- `tests/events-api.test.mjs`: authenticated bridge heartbeat/redeem/ack exercised through HTTP, including missing key rejection, Origin checks for browser endpoints, secret isolation, concurrent redemption and admin reward journal.

No real Minecraft connection or plugin compilation is claimed. Official Spigot API download returned proxy `403` for `hub.spigotmc.org`. A narrowly scoped network configuration draft adding only that hostname was saved; requires user review/save/publish to apply. Java sources, Maven POM, plugin.yml, config.yml and a GitHub Actions build workflow are included. Workflow has not been run. Reward commands require a live test on the user's server after compilation, particularly with third-party command/economy plugins.

The protocol intentionally favors at-most-once command attempts over automatic retry: uncertain reservations stay blocked for manual review. Payment integration remains disabled. No production deployment performed.
