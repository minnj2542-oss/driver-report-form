/**
 * 기사님 신고 폼 백엔드
 * Google Apps Script 웹앱으로 배포해서 사용합니다. (설정 방법은 SETUP.md 참고)
 *
 * 첫 요청 시 자동으로 "기사님 신고 데이터" 스프레드시트를 생성하고,
 * 그 ID를 스크립트 속성(SHEET_ID)에 저장해서 이후 계속 재사용합니다.
 * 시트 안에는 탭이 2개 생김:
 *   - "신고" : 기사님이 제출한 신고 내역 (자동 기록, 직접 건드릴 필요 없음)
 *   - "상품마스터" : 상품코드/상품명/존 목록. 이 탭에 엑셀(상품코드/상품명/존, 3열)을
 *     그대로 복사해서 2행부터 붙여넣으면 폼에서 자동 매칭에 사용됨.
 */

const REPORT_HEADERS = ['id', 'timestamp', 'dispatchNo', 'location', 'itemsJson', 'reason', 'text', 'status'];
const PRODUCT_HEADERS = ['상품코드', '상품명', '존'];

function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let sheetId = props.getProperty('SHEET_ID');
  if (sheetId) {
    return SpreadsheetApp.openById(sheetId);
  }
  const ss = SpreadsheetApp.create('기사님 신고 데이터');
  ss.getSheets()[0].setName('신고');
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}

function getReportSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName('신고');
  if (!sheet) {
    sheet = ss.insertSheet('신고');
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(REPORT_HEADERS);
  }
  return sheet;
}

function getProductSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName('상품마스터');
  if (!sheet) {
    sheet = ss.insertSheet('상품마스터');
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(PRODUCT_HEADERS);
  }
  return sheet;
}

function doGet(e) {
  const action = e.parameter && e.parameter.action;

  if (action === 'products') {
    return jsonOutput({ ok: true, products: getProducts() });
  }

  return jsonOutput({ ok: true, reports: getReports() });
}

function getReports() {
  const sheet = getReportSheet();
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);

  const reports = rows.map(function (r) {
    return {
      id: r[0],
      timestamp: r[1] instanceof Date ? r[1].toISOString() : r[1],
      dispatchNo: r[2],
      location: r[3],
      items: safeParseJson(r[4]),
      reason: r[5],
      text: r[6],
      status: r[7] || 'pending'
    };
  });

  reports.sort(function (a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return reports;
}

function getProducts() {
  const sheet = getProductSheet();
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);

  return rows
    .filter(function (r) { return r[0]; })
    .map(function (r) {
      return { code: String(r[0]).trim(), name: String(r[1] || '').trim(), zone: String(r[2] || '').trim() };
    });
}

function doPost(e) {
  let result;
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.action === 'setStatus') {
      result = setStatus(payload.id, payload.status);
    } else {
      result = addReport(payload);
    }
  } catch (err) {
    result = { ok: false, error: String(err) };
  }
  return jsonOutput(result);
}

function addReport(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getReportSheet();
    const id = Utilities.getUuid();
    const text = buildMessageText(payload);
    sheet.appendRow([
      id,
      new Date(),
      payload.dispatchNo || '',
      payload.location || '',
      JSON.stringify(payload.items || []),
      payload.reason || '',
      text,
      'pending'
    ]);
    return { ok: true, id: id };
  } finally {
    lock.releaseLock();
  }
}

function setStatus(id, status) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getReportSheet();
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === id) {
        sheet.getRange(i + 1, 8).setValue(status); // 8번째 열 = status
        return { ok: true };
      }
    }
    return { ok: false, error: 'id를 찾을 수 없습니다: ' + id };
  } finally {
    lock.releaseLock();
  }
}

function buildMessageText(payload) {
  const lines = [];
  lines.push((payload.dispatchNo || '?') + '번 // ' + (payload.location || '?'));
  lines.push('');
  const items = payload.items || [];
  items.forEach(function (it) {
    lines.push((it.code || '?') + ' ' + (it.name || '?') + ' - ' + (it.qty || '?') + '박스');
    if (it.zone) lines.push(it.zone);
  });
  lines.push('');
  lines.push(payload.reason || '?');
  return lines.join('\n');
}

function safeParseJson(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return [];
  }
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
