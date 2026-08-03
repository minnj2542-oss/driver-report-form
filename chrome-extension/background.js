const APPS_SCRIPT_URL = "https://blue-snowflake-09f5.6611cc.workers.dev";

async function updateBadge() {
  try {
    const res = await fetch(APPS_SCRIPT_URL);
    const data = await res.json();
    if (!data.ok) return;
    const pending = data.reports.filter(r => r.status !== 'done').length;
    chrome.action.setBadgeText({ text: pending > 0 ? String(pending) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#e03131' });

    await checkNewReports(data.reports);
  } catch (err) {
    console.error('배지 업데이트 실패', err);
  }
}

// 백그라운드 서비스워커는 언제든 재시작될 수 있어서, "이미 본 신고" 목록을
// 메모리가 아니라 chrome.storage.local에 저장해서 재시작 후에도 유지되게 함.
async function checkNewReports(reports) {
  const stored = await chrome.storage.local.get(['knownIds', 'notifyEnabled']);
  const knownIds = stored.knownIds; // 최초 실행이면 undefined
  const notifyEnabled = stored.notifyEnabled !== false; // 기본값 켜짐
  const allIds = reports.map(r => r.id);

  if (knownIds === undefined) {
    // 최초 실행 시점엔 이미 있던 신고들 알림 없이 기준선만 저장
    await chrome.storage.local.set({ knownIds: allIds });
    return;
  }

  const knownSet = new Set(knownIds);
  if (notifyEnabled) {
    reports.forEach((r) => {
      // 완전히 처음 보는 id만 알림. 처리완료<->되돌리기로 상태만 바뀐 건 제외.
      if (r.status !== 'done' && !knownSet.has(r.id)) {
        chrome.notifications.create(r.id, {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: '신고가 접수되었습니다!',
          message: `${r.dispatchNo || '?'} / ${r.location || '?'}`
        });
      }
    });
  }

  await chrome.storage.local.set({ knownIds: allIds });
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
