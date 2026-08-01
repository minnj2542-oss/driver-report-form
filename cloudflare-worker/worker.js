// Cloudflare Worker: script.google.com 앞단 중계 프록시
// 회사 네트워크가 script.google.com 도메인을 막고 있을 때,
// 브라우저는 이 Worker 주소로만 요청하고, 실제 구글 요청은 Worker(서버)가 대신 보냄.

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz-ooUmS4JLv6nuWOpTxLzUzHeNJytqFvIMlSoLCUai--Y1AcqX7C18FqWweNxLhgu4/exec";

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    const url = new URL(request.url);
    const target = APPS_SCRIPT_URL + url.search;

    const init = { method: request.method, redirect: 'follow' };
    if (request.method === 'POST') {
      init.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      init.body = await request.text();
    }

    let res;
    try {
      res = await fetch(target, init);
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: '프록시 요청 실패: ' + err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};
