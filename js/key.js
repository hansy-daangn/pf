/* 내 전용 링크(…#k=키)로 열면: 저장소의 data/gh.enc(암호화된 GitHub 토큰)를 이 키로 풀어 이 기기에 저장 → 다음부터 편집·디자인·올리기 모두 자동 연결.
   키는 주소의 # 뒤에만 있어서 서버로 전송되지 않음. 링크를 잃어버리면 /upload/ 에서 다시 만들면 됨(옛 링크는 무효). */
(() => {
  const m = location.hash.match(/[#&]k=([A-Za-z0-9_-]{20,})/);
  if (!m) return;
  try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) { }
  const b = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  (async () => {
    try {
      const enc = await fetch('data/gh.enc?t=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
      const key = await crypto.subtle.importKey('raw', b(m[1]), 'AES-GCM', false, ['decrypt']);
      const tok = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b(enc.iv) }, key, b(enc.ct)));
      localStorage.setItem('pf.k', m[1]);
      if (localStorage.getItem('pf.gh') !== tok) { localStorage.setItem('pf.gh', tok); location.reload(); }
    } catch (e) { console.warn('전용 링크 확인 실패', e); }
  })();
})();
