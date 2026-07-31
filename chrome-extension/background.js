const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw_KjCQveSYn0kXPpw9QZKmzsFTOm0IIBAjwi40cLkNXi-VWXdrmdQBpKu2P1Se-tvl/exec";

async function updateBadge() {
  try {
    const res = await fetch(APPS_SCRIPT_URL);
    const data = await res.json();
    if (!data.ok) return;
    const pending = data.reports.filter(r => r.status !== 'done').length;
    chrome.action.setBadgeText({ text: pending > 0 ? String(pending) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#e03131' });
  } catch (err) {
    console.error('배지 업데이트 실패', err);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  chrome.alarms.create('checkReports', { periodInMinutes: 1 });
  updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  updateBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkReports') updateBadge();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'refresh-badge') updateBadge();
});
