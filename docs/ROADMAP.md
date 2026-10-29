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

## Фаза 2. Аутентификация (этап 3 + часть 8)

- HeroUI v2, перенос `LoginSignup/*` (ребрендинг), провайдеры.
- Sign-in / sign-up / подтверждение email / forgot + reset / sign-out (+ очистка кэша).
- OAuth (Google) callback без ожидания триггера; проверка `next` только на относительные пути.
- `proxy.ts`: редирект на `/sign-in` для страниц, `401` для `/api`; `isPublicRoute` + тест из донора.
- Онбординг: форма создания аккаунта поверх `create_account`, выбор аккаунта после входа.
- Капча Supabase Auth (Turnstile/hCaptcha) как опция.

## Фаза 3. Участники и инвайты (остаток этапа 2 + этап 4)

- `account_invitations` (хэш токена, срок, одноразовость), RPC `create_invitation` / `accept_invitation` / `revoke_invitation`.
- RPC `change_member_role` (назначать только роль не выше своей), `remove_member`, `leave_account`, `transfer_ownership`, `delete_account`.
- Роутинг `/[account]` по slug, переключатель аккаунтов, страница участников (palistor).
- Генерация TS-констант прав из `role_permissions` и `can()` в UI.

## Дальше (по общему плану)

| Фаза | Содержание | Этап плана |
|---|---|---|
| 4 | i18n (next-intl, пайплайн словарей, en + ru) и ошибки/мониторинг (untracker, `global-error`, `instrumentation`) | 5–6 |
| 5 | Email: абстракция, провайдеры, шаблоны, auth-письма Supabase, Mailpit | 7 |
| 6 | Settings shell (реестр разделов), профиль, внешний вид, настройки аккаунта, sidebar по конфигу | 8 |
| 7 | Супер-админка | 9 |
| 8 | CI (lint, typecheck, unit, `db lint`, `db test`, дрейф типов, build, e2e) и деплой Vercel + Supabase | 10 |
| 9 | `modules/example` и гайд «как добавить модуль» | 11 |
| 10 | (опц.) HeroUI v3 | 12 |

CI из фазы 8 дешёвый и полезен уже сейчас: его можно подтянуть сразу после фазы 2.
