export function shellMarkup(): string {
  return `
    <main class="app-shell">
      <header class="top-bar">
        <div>
          <h1>Radar Zone Configurator</h1>
          <p>실시간 위치와 Zone 설정을 한 화면에서 확인합니다.</p>
        </div>
        <div class="status-pill" data-status data-tone="warn">연결 대기</div>
      </header>
      <div class="toast" data-toast data-visible="false"></div>
      <section class="workspace">
        <aside class="side-panel">
          <section>
            <h2>Zone</h2>
            <div class="zone-list" data-zone-list></div>
            <div data-zone-type-controls></div>
          </section>
          <section>
            <h2>오탐 보정</h2>
            <div data-calibration-panel></div>
          </section>
          <section>
            <h2>다음 단계</h2>
            <button type="button" disabled>다각형 편집</button>
            <button type="button" disabled>평면도 업로드</button>
          </section>
        </aside>
        <section class="map-panel">
          <div class="map-toolbar" data-map-toolbar></div>
          <div class="radar-host" data-radar-scene></div>
        </section>
      </section>
    </main>
    <div data-calibration-dialog></div>
    <div data-protected-zone-dialog></div>
    <div data-shrink-confirm-dialog></div>
  `;
}
