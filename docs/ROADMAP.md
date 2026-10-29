# Дорожная карта

Шаблон собирается «пересадкой»: новый репозиторий, ядро БД пишется заново, UI и утилиты переносятся из проекта-донора модулями с чисткой от домена. Номера этапов в скобках — этапы общего плана переноса.

## Фаза 1. Фундамент ✅

Цель: пустое, но рабочее приложение Next.js, связанное с Supabase, и ядро БД для пользователей и мультитенантности.

- Next.js 16 + TypeScript strict + Tailwind 4, ESLint с правилами донора, Vitest.
- Env-контракт на zod: без переменных `dev`/`build`/`start` не запускаются.
- Клиенты Supabase: browser, server, proxy (`getClaims()`), admin (секретный ключ).
- Локальный Supabase на портах 544xx (не конфликтует с другими проектами), скрипт `env:local`.
- Ядро БД: `profiles`, `accounts` (slug + зарезервированные слова), `account_members`, `account_role`, `role_permissions`, `private.platform_admins`; хелперы `private.has_permission` / `is_account_member` / `can_view_profile` / `is_platform_admin`; RPC `create_account`; хук `private.app_on_account_created`.
- Deny-by-default: отозваны default privileges, явные GRANT, column-level UPDATE, RLS везде, `SECURITY DEFINER` только в `private` с `search_path = ''`.
- pgTAP (67 проверок): белый список функций, негативный тест подделки `user_metadata`, RLS аккаунтов/участников/профилей, инварианты владельца, деактивация.

### Решения фазы 1 (отличия от плана)

| Решение | Почему |
|---|---|
| `uuid` (`gen_random_uuid()`) вместо `snowflake_id` | Нативно для Supabase (`auth.users`, storage-пути, генерация типов), не нужна последовательность и text-ключи |
| Удаление участника — `DELETE`, без `deleted_at` | Членство — это выдача доступа; «мягко удалённая» запись предоставляет доступ, если где-то забыт фильтр. Надгробия для синхронизации кэша возьмём из audit log |
| Хелперы и привилегированные функции в схеме `private` | Рекомендация Supabase: `SECURITY DEFINER` не должен лежать в публикуемой схеме. Клиентский RPC — `public.*` `SECURITY INVOKER`, внутри зовёт `private.*` |
| `platform_admins` в `private`, без доступа из API | Назначение админа только через SQL / service role |
| `profiles.email` (синхронизируется триггером) | Список участников с email без доступа к `auth.users` |
| `accounts.owner_id` + роль `owner` у одного участника | `owner_id ... ON DELETE RESTRICT` не даёт удалить владельца; триггер и уникальный индекс держат роль `owner` только за ним |
| Миграции через `supabase db schema declarative sync` (pg-delta) | В CLI 2.12x `db diff` больше не читает `schema_paths`; pg-delta отслеживает гранты, default privileges, комментарии и триггеры на `auth.users` |
| `auto_expose_new_tables` не трогаем | Флаг меняет baseline локальной БД и отбирает DML у `service_role`; deny-by-default задаём миграцией, одинаково для локальной и облачной БД |
| ESLint 9 | `eslint-plugin-import` из `eslint-config-next` 16.4 падает на ESLint 10 |

## Фаза 2. Аутентификация ✅

Цель: пользователь регистрируется, подтверждает email, входит (паролем или через Google), сбрасывает пароль, создаёт первый аккаунт и попадает в него.

- HeroUI v3 (3.2.7) + next-themes, иконки `@gravity-ui/icons`. Провайдеры: тема, `RouterProvider` (клиентская навигация для `href` в HeroUI), `Toast.Provider`.
- Перенос `LoginSignup/*` с ребрендингом: `AuthShell` (форма слева, бренд-панель справа), экраны входа, регистрации, «проверьте почту», забытого и нового пароля. Название и слоган в `core/config/site.ts`.
- Вход и регистрация вызывают Supabase Auth из браузера; капча встроенная в Supabase (Turnstile/hCaptcha), включается env-переменными и `[auth.captcha]`.
- Письма Supabase Auth (подтверждение, сброс, смена email) ведут на `/auth/confirm?token_hash=…`: токен проверяется на сервере, ссылка работает в любом браузере. Шаблоны в `supabase/templates/`.
- `/auth/callback` для OAuth и стандартных шаблонов; `next` проходит через `safeNextPath` (только относительный путь того же сайта, без петли на страницы входа).
- `proxy.ts`: неавторизованных на `/sign-in?next=…`, для `/api` — 401; вошедших со страниц входа — в приложение. `isPublicRoute` + тесты из донора.
- `/accounts`: нет аккаунтов — онбординг, один — сразу в него, несколько — выбор. `/onboarding`: форма поверх `create_account` (Server Action), slug из названия с транслитерацией кириллицы, ошибки constraint-ов под полями.
- Выход: `signOut({ scope: "local" })` и полная перезагрузка страницы.
- Юр. страницы-заглушки `/terms-of-use`, `/privacy-policy`; страница-заглушка аккаунта `/[account]`.
- Vitest: 54 теста (публичные маршруты, `safeNextPath`, ошибки Auth и `create_account`, пароль, slug, env).

### Решения фазы 2 (отличия от плана)

| Решение | Почему |
|---|---|
| Сразу HeroUI v3 вместо v2 → v3 | Решение владельца. В шаблоне мало UI, отдельная миграция не нужна; этап 12 плана снят |
| `@gravity-ui/icons` вместо `@iconify/react` | Iconify грузит иконки из сети во время работы; gravity-ui — пакет, на котором построены примеры HeroUI v3 |
| Вход/регистрация из браузера, без донорских `/api/auth/signin` и `/api/auth/email-signup` | Встроенную капчу Supabase нельзя обойти прямым вызовом Auth; лимиты Auth считаются по IP пользователя, а не сервера; нет входа через service role |
| Ссылки из писем через `token_hash` и `/auth/confirm` | PKCE-обмен `code` работает только в браузере, где начали регистрацию; `verifyOtp` на сервере — в любом |
| Кнопки OAuth по `GET /auth/v1/settings` | Кнопка появляется, когда провайдер включён в Supabase; нет второго списка в env |
| Выбор аккаунта на сервере (`/accounts`), без `localStorage` | Редирект до рендера; «последний аккаунт» вернётся вместе с переключателем (фаза 3) |
| Тексты на английском, ошибки Auth по коду | i18n — фаза 4; словарь будет ключоваться теми же кодами |
| Yandex SmartCaptcha не перенесена | Supabase Auth проверяет только hCaptcha и Turnstile; Yandex потребует серверной обёртки над входом |
| `email_sent = 30` в локальном `config.toml` | Значение по умолчанию (2 в час) не даёт пройти регистрацию, повторную отправку и сброс локально |

## Фаза 3. Участники и инвайты (остаток этапа 2 + этап 4)

- `account_invitations` (хэш токена, срок, одноразовость), RPC `create_invitation` / `accept_invitation` / `revoke_invitation`.
- RPC `change_member_role` (назначать только роль не выше своей), `remove_member`, `leave_account`, `transfer_ownership`, `delete_account`.
- Роутинг `/[account]` по slug, переключатель аккаунтов, страница участников (palistor).
- Генерация TS-констант прав из `role_permissions` и `can()` в UI.
- Регистрация по инвайту: `next` не переживает подтверждение email (шаблон ведёт на `/accounts`), поэтому ожидающие приглашения показываем на `/accounts`.

## Дальше (по общему плану)

| Фаза | Содержание | Этап плана |
|---|---|---|
| 4 | i18n (next-intl, пайплайн словарей, en + ru) и ошибки/мониторинг (untracker, `global-error`, `instrumentation`) | 5–6 |
| 5 | Email: абстракция, провайдеры, шаблоны, auth-письма Supabase, Mailpit | 7 |
| 6 | Settings shell (реестр разделов), профиль, внешний вид, настройки аккаунта, sidebar по конфигу | 8 |
| 7 | Супер-админка | 9 |
| 8 | CI (lint, typecheck, unit, `db lint`, `db test`, дрейф типов, build, e2e) и деплой Vercel + Supabase | 10 |
| 9 | `modules/example` и гайд «как добавить модуль» | 11 |

CI из фазы 8 дешёвый и полезен уже сейчас: его стоит подтянуть до фазы 3.
