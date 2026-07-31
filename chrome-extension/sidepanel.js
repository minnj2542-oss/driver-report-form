const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw_KjCQveSYn0kXPpw9QZKmzsFTOm0IIBAjwi40cLkNXi-VWXdrmdQBpKu2P1Se-tvl/exec";

let currentPending = [];

async function loadReports() {
  try {
    const res = await fetch(APPS_SCRIPT_URL);
    const data = await res.json();
    if (data.ok) {
      currentPending = data.reports.filter(r => r.status !== 'done');
      render(currentPending);
    }
  } catch (err) {
    console.error('불러오기 실패', err);
  }
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function render(pending) {
  document.getElementById('countLabel').textContent = `(${pending.length})`;
  const list = document.getElementById('list');
  list.innerHTML = pending.length
    ? pending.map(cardHtml).join('')
    : '<div class="empty">대기중인 신고가 없습니다.</div>';

  list.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => copyText(btn));
  });
  list.querySelectorAll('.done-btn').forEach(btn => {
    btn.addEventListener('click', () => complete(btn.dataset.id));
  });
}

function cardHtml(r) {
  const escapedText = r.text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `
    <div class="card">
      <div class="card-head">
        <span class="dispatch">${r.dispatchNo || '?'} / ${r.location || '?'}</span>
        <span class="time">${formatTime(r.timestamp)}</span>
      </div>
      <div class="card-text">${escapedText}</div>
      <div class="card-actions">
        <button type="button" class="copy-btn" data-text="${encodeURIComponent(r.text)}">복사</button>
        <button type="button" class="done-btn" data-id="${r.id}">처리완료</button>
      </div>
    </div>
  `;
}

async function copyText(btn) {
  const text = decodeURIComponent(btn.dataset.text);
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = '복사됨';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '복사'; btn.classList.remove('copied'); }, 1200);
  } catch (err) {
    alert('복사에 실패했습니다.');
  }
}

function notifyBadge() {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: 'refresh-badge' });
  }
}

async function complete(id) {
  const idx = currentPending.findIndex(r => r.id === id);
  if (idx === -1) return;
  const removed = currentPending.splice(idx, 1)[0];
  render(currentPending);
  notifyBadge();

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'setStatus', id, status: 'done' })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '실패');
  } catch (err) {
    currentPending.splice(idx, 0, removed);
    render(currentPending);
    notifyBadge();
    alert('처리완료 처리에 실패했습니다.');
  }
}

document.getElementById('refreshBtn').addEventListener('click', loadReports);

loadReports();
setInterval(loadReports, 15000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) loadReports();
});
