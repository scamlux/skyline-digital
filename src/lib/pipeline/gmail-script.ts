/**
 * Google Apps Script, который пересылает письма-оповещения площадок из Gmail
 * в /api/pipeline/ingest. Админка отдаёт его с уже подставленными адресом и
 * секретом, чтобы подключение сводилось к «вставить и сохранить».
 */
export function gmailForwardScript(siteUrl: string, secret: string): string {
  const url = `${siteUrl.replace(/\/$/, "")}/api/pipeline/ingest`;
  return `// Skyline Digital — пересылка писем-оповещений в конвейер заказов.
// Письма с ярлыком "pipeline" уходят в конвейер и получают ярлык "pipeline-done".
const URL = ${JSON.stringify(url)};
const SECRET = ${JSON.stringify(secret)};

function forwardAlerts() {
  const label = GmailApp.getUserLabelByName("pipeline") || GmailApp.createLabel("pipeline");
  const done = GmailApp.getUserLabelByName("pipeline-done") || GmailApp.createLabel("pipeline-done");
  for (const thread of label.getThreads(0, 20)) {
    for (const m of thread.getMessages()) {
      UrlFetchApp.fetch(URL, {
        method: "post",
        contentType: "application/json",
        headers: { Authorization: "Bearer " + SECRET },
        payload: JSON.stringify({
          subject: m.getSubject(),
          text: m.getPlainBody().slice(0, 90000),
          from: m.getFrom(),
          id: m.getId(),
        }),
        muteHttpExceptions: true,
      });
    }
    thread.removeLabel(label);
    thread.addLabel(done);
  }
}

// Запустить один раз вручную: создаёт триггер «каждые 15 минут».
function install() {
  for (const t of ScriptApp.getProjectTriggers()) ScriptApp.deleteTrigger(t);
  ScriptApp.newTrigger("forwardAlerts").timeBased().everyMinutes(15).create();
  forwardAlerts();
}
`;
}

/** Фильтр Gmail для писем площадок → ярлык pipeline. */
export const GMAIL_FILTER_FROM =
  "from:(upwork.com OR ungm.org OR worldbank.org OR workspace.ru OR freelancehunt.com OR contra.com OR fl.ru)";
