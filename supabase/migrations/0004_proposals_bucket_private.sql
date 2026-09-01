-- 0004 — Close the `proposals` bucket (SEC3 in docs/AUDIT.md), part 2/2.
--
-- ⚠️ Применять ТОЛЬКО после того, как задеплоен код, который отдаёт КП по
-- подписанной ссылке (signDownloadUrl в src/app/api/proposal/[token]/route.ts)
-- и шлёт PDF в Telegram байтами. На старом коде это ломает и скачивание
-- клиентом, и отправку КП в группу.
--
-- Откат: update storage.buckets set public = true where id = 'proposals';

update storage.buckets
set public = false
where id = 'proposals';

-- Политик для anon/authenticated по-прежнему нет: читать и писать может только
-- service role, а клиент получает подписанную ссылку через /api/proposal/[token].
