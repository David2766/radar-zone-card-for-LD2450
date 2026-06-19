(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=Date.now(),t={version:1,zones:[{id:`zone_1`,name:`침대`,type:`detection`,shape:`rect`,points:[[-900,1e3],[900,1e3],[900,2600],[-900,2600]]},{id:`filter_1`,name:`커튼 오탐`,type:`filter`,shape:`rect`,points:[[1800,2600],[2600,2600],[2600,3800],[1800,3800]]}],calibrationZones:[],floorplan:{enabled:!1,hasImage:!1}},n={async getState(){let t=(Date.now()-e)/1e3;return{connected:!0,updatedAt:Date.now(),pirMotion:!1,targets:[{id:`target_1`,name:`T1`,color:`#ff6b7a`,x:Math.round(Math.sin(t/2)*1100),y:Math.round(1800+Math.cos(t/2.8)*700),active:!0},{id:`target_2`,name:`T2`,color:`#ffd166`,x:0,y:0,active:!1},{id:`target_3`,name:`T3`,color:`#06d6a0`,x:0,y:0,active:!1}]}},async getConfig(){return structuredClone(t)},async saveConfig(e){t=structuredClone(e)}},r=i(new URLSearchParams(window.location.search).get(`device`)||``);function i(e){let t=e.trim().replace(/\/+$/,``);return t?/^https?:\/\//i.test(t)?t:`http://${t}`:``}function a(e){return`${r}${e}`}async function o(e,t){let n=await fetch(a(e),t);if(!n.ok)throw Error(`${n.status} ${n.statusText}`);return n.json()}async function s(e,t){let n=await fetch(a(e),t);if(!n.ok)throw Error(`${n.status} ${n.statusText}`)}async function c(e){let t=await o(`/text_sensor/${encodeURIComponent(e)}`),n=typeof t.value==`string`?t.value:t.state;if(typeof n!=`string`||!n.trim())throw Error(`${e} is empty`);return JSON.parse(n)}async function l(e,t,n,r){let i=new URLSearchParams(r);await s(`/${e}/${encodeURIComponent(t)}/${n}`,{method:`POST`,headers:{"Content-Type":`application/x-www-form-urlencoded`},body:i})}var u=6,d=4,f=`__EMPTY__`,p={async getState(){return{...await c(`Radar State JSON`),updatedAt:Date.now()}},getConfig(){return c(`Zone Config JSON`)},async saveConfig(e){for(let t=0;t<u;t+=1){let n=`zone_${t+1}`,r=e.zones.find(e=>e.id===n),i=r?JSON.stringify(r):f;if(i.length>255)throw Error(`${n} config is too large to store on this device`);await l(`text`,`Software Zone ${t+1} Config`,`set`,{value:i}),await l(`select`,`Software Zone ${t+1} Type`,`set`,{option:r?m(r.type):`Disabled`})}for(let t=0;t<d;t+=1){let n=`calibration_${t+1}`,r=e.calibrationZones?.find(e=>e.id===n),i=r?JSON.stringify(r):f;if(i.length>255)throw Error(`${n} config is too large to store on this device`);await l(`text`,`Calibration Filter ${t+1} Config`,`set`,{value:i})}}};function m(e){return e===`filter`?`Filter`:e===`disabled`?`Disabled`:`Detection`}function h(e){return String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#039;`)}var g=-4860,ee=4860,_=7560;function v(e,t,n){let r=n.width-n.pad*2,i=n.height-n.pad*2,a=n.width/2,o=n.height-n.pad;return{x:a+e/n.rangeX*(r/2),y:o-t/n.rangeY*i}}function te(e,t,n){let r=n.width-n.pad*2,i=n.height-n.pad*2,a=n.width/2,o=n.height-n.pad;return{x:(e-a)/(r/2)*n.rangeX,y:(o-t)/i*n.rangeY}}function ne(e,t=120){let n=t/2*Math.PI/180;return Math.sin(n)*e}function re(e,t){let n=t*Math.PI/180;return{x:Math.sin(n)*e,y:Math.cos(n)*e}}var y={title:`Radar Map`,range_x:3e3,range_y:6e3,hold_ms:1500,show_distance:!0,distance_decimals:2,targets:[],device_id:``,configurator_url:``,use_yaml_targets:void 0,selected_zone:`zone_1`,zone_names:{}};function ie(e){let t=e.width/2,n=e.height-e.pad,r=e.fovDegrees/2;return`
    <path class="beam" d="M ${t} ${n} L ${oe(e.rangeY,-r,r,e,!1)} Z" />
    <g class="grid">${[-60,-30,0,30,60].filter(e=>Math.abs(e)<=r).map(r=>{let i=v(...b(e.rangeY,r),e),a=v(...b(e.rangeY*.92,r),e);return`
        <line x1="${t}" y1="${n}" x2="${i.x}" y2="${i.y}" />
        <text class="angle-label" x="${a.x}" y="${a.y}">${r}°</text>
      `}).join(``)}${ae(e.rangeY).map(t=>{let n=v(0,t,e);return`
        <path d="${oe(t,-r,r,e)}" />
        <text class="distance-label" x="${n.x+5}" y="${n.y-5}">${t/1e3}m</text>
      `}).join(``)}</g>
  `}function ae(e){let t=[];for(let n=1e3;n<=e;n+=1e3)t.push(n);return t}function oe(e,t,n,r,i=!0){let a=[];for(let o=0;o<=36;o+=1){let s=v(...b(e,t+(n-t)*o/36),r),c=o===0?i?`M `:``:`L `;a.push(`${c}${s.x} ${s.y}`)}return a.join(` `)}function b(e,t){let n=re(e,t);return[n.x,n.y]}var x=760,S=540,C=34,se=class{constructor(e){this.host=e}render(e,t,n=``,r=!1,i=-1){let a=x,o=S,s=C,c=this.viewport(),l=a/2,u=o-s;this.host.innerHTML=`
      <svg class="radar-scene" viewBox="0 0 ${a} ${o}" role="img" aria-label="Radar map">
        ${ie(c)}
        ${(t.calibrationZones||[]).map(e=>w(e,c,n,r,i,!0)).join(``)}
        ${t.zones.map(e=>w(e,c,n,r,i)).join(``)}
        <polygon class="sensor" points="${l},${u-12} ${l-10},514 390,514" />
        ${e.targets.filter(le).map(e=>ce(e,c)).join(``)}
      </svg>
    `}pointFromEvent(e,t){let n=t.getBoundingClientRect(),r=te((e.clientX-n.left)/n.width*x,(e.clientY-n.top)/n.height*S,this.viewport());return{x:fe(Math.round(r.x),-this.viewport().rangeX,this.viewport().rangeX),y:fe(Math.round(r.y),0,this.viewport().rangeY)}}viewport(){let e=y.range_y,t=ne(e,120);return{width:x,height:S,pad:C,rangeX:Math.max(y.range_x,t),rangeY:e,fovDegrees:120}}};function ce(e,t){let n=v(e.x,e.y,t),r=`${(Math.hypot(e.x,e.y)/1e3).toFixed(2)} m`;return`
    <g class="target" style="--target-color:${e.color}">
      <circle cx="${n.x}" cy="${n.y}" r="9"></circle>
      <text x="${n.x}" y="${n.y-30}">
        <tspan x="${n.x}" dy="0">${h(e.name)}</tspan>
        <tspan x="${n.x}" dy="14">${r}</tspan>
      </text>
    </g>
  `}function le(e){return e.active&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&Math.hypot(e.x,e.y)>100}function w(e,t,n,r,i,a=!1){if(!e.points.length)return``;let o=e.id===n;if(e.placeholder&&!o)return``;let s=e.points.map(([e,n])=>v(e,n,t)),c=s.map(e=>`${e.x},${e.y}`).join(` `),l=s[0],u=pe(e.id),d=e.placeholder?``:e.name,f=r&&!a?`data-zone-drag="move" data-zone-id="${e.id}"`:``,p=a?`data-calibration-info="${e.id}"`:``,m=r&&o&&!a?ue(e,t):``,g=r&&o?de(e,t,i):``;return`
    <g class="web-zone ${e.type}${a?` calibration`:``}${e.placeholder?` placeholder`:``}${o?` selected`:``}">
      <polygon points="${c}" ${f} ${p}></polygon>
      ${m}
      <text x="${l.x+8}" y="${l.y-8}">
        <tspan x="${l.x+8}" dy="0">${h(u)}</tspan>
        ${d?`<tspan x="${l.x+8}" dy="14">${h(d)}</tspan>`:``}
      </text>
      ${g}
    </g>
  `}function ue(e,t){return e.points.map(([n,r],i)=>{let a=e.points[(i+1)%e.points.length];if(!a)return``;let o=v(n,r,t),s=v(a[0],a[1],t);return`
        <line
          class="zone-edge-hit"
          x1="${o.x}"
          y1="${o.y}"
          x2="${s.x}"
          y2="${s.y}"
          data-zone-id="${e.id}"
          data-zone-edge="${i}"
        />
      `}).join(``)}function de(e,t,n){return e.points.map(([r,i],a)=>{let o=v(r,i,t);return`
        <circle
          class="zone-handle${a===n?` selected`:``}"
          cx="${o.x}"
          cy="${o.y}"
          r="7"
          data-zone-drag="resize"
          data-zone-id="${e.id}"
          data-zone-point="${a}"
        />
      `}).join(``)}function fe(e,t,n){return Math.min(n,Math.max(t,e))}function pe(e){let t=/^zone_(\d+)$/.exec(e);return t?`Zone ${t[1]}`:e}var T=new URLSearchParams(window.location.search),me=T.get(`device`)?.trim()||``,he=T.get(`mock`)===`1`||!me&&window.location.hostname===`localhost`,E={detection:`Detection`,filter:`Filter`,disabled:`Disabled`},D=6,O=4,ge=8,_e=10,ve=3e3,k=15e3,A=6e4,j=20,M=80,N=2400,P=2400,ye=36e5,be=1200,F=.05,I=.95,L=800,R=700,xe=class{constructor(e){this.root=e,this.api=he?n:p,this.state=null,this.config=null,this.timer=0,this.toastTimer=0,this.saveTimer=0,this.saveInFlight=!1,this.saveQueued=!1,this.selectedZoneId=``,this.selectedPointIndex=-1,this.calibrationRun=null,this.calibrationResult=null,this.calibrationDialogOpen=!1,this.calibrationLogs=[],this.protectedZoneDialogOpen=!1,this.shrinkConfirmZoneId=``,this.shrinkWarningShownZoneId=``,this.historyPast=[],this.historyFuture=[],this.nameEditHistoryCaptured=!1,this.drag=null,this.handleZoneDragMove=e=>{if(!this.drag||!this.config||e.pointerId!==this.drag.pointerId)return;let t=this.root.querySelector(`[data-radar-scene] svg`);if(!t)return;e.preventDefault();let n=this.drag.zoneId,r=this.scene.pointFromEvent(e,t),i=this.drag.source===`calibration`?z(this.drag.startZone,this.drag.pointIndex,r,!!this.drag.startZone.minSizeUnlocked):this.drag.mode===`move`?Se(this.drag.startZone,this.drag.startPoint,r):Ce(this.drag.startZone,this.drag.pointIndex,r);this.drag.source===`calibration`&&!this.drag.startZone.minSizeUnlocked&&Te(this.drag.startZone,this.drag.pointIndex,r)&&this.shrinkWarningShownZoneId!==n&&(this.shrinkWarningShownZoneId=n,this.shrinkConfirmZoneId=n,this.renderShrinkConfirmDialog()),this.config=this.drag.source===`calibration`?{...this.config,calibrationZones:(this.config.calibrationZones||[]).map(e=>e.id===n?{...V(i),placeholder:!1}:e)}:{...this.config,zones:Q(this.config.zones,{...V(i),placeholder:!1})},this.state&&(this.scene.render(this.state,this.displayConfig(),this.selectedZoneId,!0,this.selectedPointIndex),this.attachSceneEvents())},this.handleZoneDragEnd=e=>{!this.drag||e.pointerId!==this.drag.pointerId||(e.preventDefault(),this.drag=null,window.removeEventListener(`pointermove`,this.handleZoneDragMove),window.removeEventListener(`pointerup`,this.handleZoneDragEnd),window.removeEventListener(`pointercancel`,this.handleZoneDragEnd),this.renderSidebar(),this.render(),this.saveConfig())},this.handleKeyDown=e=>{if(e.key!==`Delete`&&e.key!==`Backspace`)return;let t=document.activeElement?.tagName.toLowerCase();if(!(t===`input`||t===`textarea`||t===`select`)){if(e.preventDefault(),this.selectedCalibrationZone()){this.deleteSelectedItem();return}if(this.selectedPointIndex>=0){this.deleteSelectedPoint();return}this.deleteSelectedItem()}},this.root.innerHTML=ze();let t=this.root.querySelector(`[data-radar-scene]`);if(!t)throw Error(`Radar scene container not found`);this.scene=new se(t),window.addEventListener(`keydown`,this.handleKeyDown)}async start(){await this.loadConfig(),await this.refreshState(),this.timer=window.setInterval(()=>{this.refreshState()},500)}stop(){window.clearInterval(this.timer),window.clearTimeout(this.saveTimer),window.removeEventListener(`keydown`,this.handleKeyDown)}async loadConfig(){try{this.config=Pe(await this.api.getConfig()),this.setSelectedZone(this.config.zones[0]?.id||``),this.renderSidebar()}catch(e){this.showStatus(`설정을 읽지 못했습니다: ${e instanceof Error?e.message:String(e)}`,`error`)}}async refreshState(){try{this.state=await this.api.getState(),this.updateCalibrationRun(),this.render(),this.showStatus(this.state.connected?`연결됨`:`연결 대기`,this.state.connected?`ok`:`warn`)}catch(e){this.showStatus(`상태를 읽지 못했습니다: ${e instanceof Error?e.message:String(e)}`,`error`)}}render(){if(!this.state||!this.config)return;this.drag||(this.scene.render(this.state,this.displayConfig(),this.selectedZoneId,!0,this.selectedPointIndex),this.attachSceneEvents());let e=this.root.querySelector(`[data-updated-at]`);e&&(e.textContent=new Date(this.state.updatedAt).toLocaleTimeString()),this.renderToolbar(),this.renderCalibrationDialog(),this.renderProtectedZoneDialog(),this.renderShrinkConfirmDialog()}renderToolbar(){let e=this.root.querySelector(`[data-map-toolbar]`);if(!e)return;let t=this.selectedZone(),n=this.selectedCalibrationZone(),r=t?`${K(t)} · ${t.shape===`rect`?`사각형`:`다각형`} · ${E[t.type]}`:n?`${K(n)} · 오탐 보정 · ${n.type===`disabled`?`비활성화`:`활성`}`:`선택 없음`;e.innerHTML=`
      <div class="map-toolbar-actions">
        <button type="button" data-history-undo ${this.historyPast.length?``:`disabled`} title="되돌리기">↶</button>
        <button type="button" data-history-redo ${this.historyFuture.length?``:`disabled`} title="다시 실행">↷</button>
        <button type="button" data-zone-to-rect ${t&&t.shape!==`rect`?``:`disabled`}>사각형</button>
        <button type="button" data-selected-delete ${t||n?``:`disabled`}>삭제</button>
      </div>
      <span>${h(r)}</span>
      <span>마지막 업데이트</span>
      <strong data-updated-at>${this.state?new Date(this.state.updatedAt).toLocaleTimeString():`-`}</strong>
    `,e.querySelector(`[data-history-undo]`)?.addEventListener(`click`,()=>{this.undo()}),e.querySelector(`[data-history-redo]`)?.addEventListener(`click`,()=>{this.redo()}),e.querySelector(`[data-zone-to-rect]`)?.addEventListener(`click`,()=>{this.convertSelectedZoneToRect()}),e.querySelector(`[data-selected-delete]`)?.addEventListener(`click`,()=>{this.deleteSelectedItem()})}renderSidebar(){if(!this.config)return;let e=this.root.querySelector(`[data-zone-list]`);if(!e)return;let t=this.displayZones();e.innerHTML=`
      ${t.length?t.map(e=>`
                <button class="zone-list-item ${e.type}${e.id===this.selectedZoneId?` selected`:``}" type="button" data-zone-id="${e.id}">
                  <div>
                    <strong>${h(K(e))}</strong>
                    <span>${h(W(e.id))}</span>
                  </div>
                  <em>${E[e.type]}</em>
                </button>
              `).join(``):`<p class="empty-zone-message">아직 설정된 구역이 없습니다. Zone 추가를 눌러 감지 또는 제외 구역을 만들어보세요.</p>`}
      <div class="zone-add-area">
        <button class="zone-add-button" type="button" data-zone-add ${t.length>=D?`disabled`:``}>Zone 추가</button>
        <p>${t.length>=D?`최대 6개까지 설정되었습니다.`:`감지/제외 구역은 최대 6개까지 만들 수 있습니다.`}</p>
      </div>
    `,e.querySelectorAll(`[data-zone-id]`).forEach(e=>{e.addEventListener(`click`,()=>{this.setSelectedZone(e.dataset.zoneId||this.selectedZoneId),this.renderSidebar(),this.render()})}),e.querySelector(`[data-zone-add]`)?.addEventListener(`click`,()=>{this.addZone()}),this.renderZoneTypeControls(),this.renderCalibrationPanel()}renderZoneTypeControls(){if(!this.config)return;let e=this.root.querySelector(`[data-zone-type-controls]`);if(!e)return;let t=this.selectedDisplayZone();if(!t){e.innerHTML=`<p class="panel-help">Zone을 추가하거나 선택하세요.</p>`;return}e.innerHTML=`
      <div class="zone-type-card ${t.type}">
        <div>
          <strong>${h(K(t))}</strong>
          <span>원하는 구역을 지정하여 이름을 붙이거나 탐지 제외를 하도록 설정할 수 있습니다.</span>
        </div>
        <label class="zone-name-field">
          <span>Zone 이름</span>
          <input type="text" data-zone-name-input value="${h(t.name||``)}" maxlength="${_e}" placeholder="예: 침대, 책상, 커튼" />
        </label>
        <div class="zone-type-buttons">
          ${[`detection`,`filter`,`disabled`].map(e=>`
                <button
                  class="zone-type-button ${e}${t.type===e?` selected`:``}"
                  type="button"
                  data-zone-type="${e}"
                >
                  ${E[e]}
                </button>
              `).join(``)}
        </div>
        <button class="danger-button" type="button" data-zone-delete>Zone 삭제</button>
      </div>
    `;let n=e.querySelector(`[data-zone-name-input]`);n?.addEventListener(`input`,()=>{this.setSelectedZoneNameDraft(n.value)}),n?.addEventListener(`keydown`,e=>{e.key===`Enter`&&(e.preventDefault(),this.commitSelectedZoneName(n.value))}),n?.addEventListener(`change`,()=>{this.commitSelectedZoneName(n.value)}),n?.addEventListener(`blur`,()=>{this.commitSelectedZoneName(n.value)}),e.querySelectorAll(`[data-zone-type]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.zoneType;t&&this.setSelectedZoneType(t)})}),e.querySelector(`[data-zone-delete]`)?.addEventListener(`click`,()=>{this.deleteSelectedZone()})}renderCalibrationPanel(){if(!this.config)return;let e=this.root.querySelector(`[data-calibration-panel]`);if(!e)return;let t=this.config.calibrationZones?.length||0,n=!!this.calibrationRun,r=!!this.state?.pirMotion,i=this.config.calibrationZones||[];e.innerHTML=`
      <div class="calibration-card">
        <div>
          <strong>오탐 보정</strong>
          <span>사람이 없는 상태에서 안정적으로 반복 감지되는 위치를 자동 제외 구역으로 저장합니다.</span>
        </div>
        <button class="calibration-button" type="button" ${n?`data-calibration-stop`:`data-calibration-start`} ${!n&&(r||t>=O)?`disabled`:``}>
          ${n?`보정 중지`:`오탐 보정 시작`}
        </button>
        <p>${this.calibrationStatusText(t,r)}</p>
        ${i.length?`<div class="calibration-list">
                ${i.map(e=>`
                    <div class="calibration-list-item ${e.type===`disabled`?`disabled`:``}${e.id===this.selectedZoneId?` selected`:``}" data-calibration-select="${h(e.id)}">
                      <span>
                        ${h(e.name||e.id)}
                        <em>${e.type===`disabled`?`비활성화`:`활성`}</em>
                      </span>
                      <div class="calibration-list-actions">
                        <button type="button" data-calibration-toggle="${h(e.id)}">
                          ${e.type===`disabled`?`활성화`:`비활성화`}
                        </button>
                        <button type="button" data-calibration-delete="${h(e.id)}">삭제</button>
                      </div>
                    </div>
                  `).join(``)}
              </div>`:``}
      </div>
    `,e.querySelector(`[data-calibration-start]`)?.addEventListener(`click`,()=>{this.startCalibrationRun()}),e.querySelector(`[data-calibration-stop]`)?.addEventListener(`click`,()=>{this.stopCalibrationRun(`사용자가 보정을 중지했습니다.`,`warn`)}),e.querySelectorAll(`[data-calibration-delete]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.calibrationDelete;t&&this.deleteCalibrationZone(t)})}),e.querySelectorAll(`[data-calibration-toggle]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.calibrationToggle;t&&this.toggleCalibrationZone(t)})}),e.querySelectorAll(`[data-calibration-select]`).forEach(e=>{e.addEventListener(`click`,t=>{t.target?.closest(`button`)||(this.setSelectedZone(e.dataset.calibrationSelect||this.selectedZoneId),this.renderSidebar(),this.render())})})}calibrationResultMarkup(){if(!this.calibrationResult)return``;let e=this.calibrationResult.metrics;return`
      <div class="calibration-result ${this.calibrationResult.tone}">
        <strong>${h(this.calibrationResult.title)}</strong>
        <p>${h(this.calibrationResult.reason)}</p>
        <p>생성된 보정 구역: ${this.calibrationResult.createdCount}개</p>
        ${e?`<pre>${h([`samples=${e.samples}`,`usedSamples=${e.usedSamples}`,`outliers=${e.outliers}`,`score=${Math.round(e.score)}`,`width=${Math.round(e.width)}mm`,`height=${Math.round(e.height)}mm`,`area=${Math.round(e.area)}mm²`,`meanSpeed=${Math.round(e.meanSpeed)}mm/sample`,`acceptedBy=${e.acceptedBy}`].join(`
`))}</pre>`:``}
      </div>
    `}renderCalibrationDialog(){let e=this.root.querySelector(`[data-calibration-dialog]`);if(!e)return;if(!this.calibrationDialogOpen){e.innerHTML=``;return}let t=!!this.calibrationRun,n=this.calibrationRun?q(this.calibrationRun.samples):this.calibrationResult?.metrics,r=this.calibrationProgress(n),i=this.calibrationResult?.logs||this.calibrationLogs;e.innerHTML=`
      <div class="calibration-dialog-backdrop" role="dialog" aria-modal="true" aria-label="오탐 보정">
        <div class="calibration-dialog">
          <div class="calibration-dialog-header">
            <div>
              <strong>오탐 보정</strong>
              <span>${t?`보정 데이터를 수집하고 있습니다.`:`보정 작업이 종료되었습니다.`}</span>
            </div>
            <button class="calibration-dialog-close" type="button" data-calibration-dialog-close>×</button>
          </div>
          <div class="calibration-dialog-body">
            ${this.calibrationResult?this.calibrationDialogResultMarkup(this.calibrationResult):``}
            <div class="calibration-progress">
              <div class="calibration-progress-header">
                <span>${h(this.calibrationProgressText(n))}</span>
                <strong>${r}%</strong>
              </div>
              <div class="calibration-progress-track">
                <div class="calibration-progress-fill" style="width:${r}%"></div>
              </div>
            </div>
            <div class="calibration-work">
              <strong>작업 내역</strong>
              <ul>
                ${this.calibrationWorkItems(n).map(e=>`<li>${h(e)}</li>`).join(``)}
              </ul>
            </div>
            <div class="calibration-log">
              <strong>${this.calibrationResult?.tone===`error`?`오류 로그`:`디버그 로그`}</strong>
              <pre>${h(i.length?i.join(`
`):`아직 기록된 로그가 없습니다.`)}</pre>
            </div>
            <div class="calibration-dialog-actions">
              ${t?`<button class="calibration-button" type="button" data-calibration-stop>보정 중지</button>`:`<button type="button" data-calibration-dialog-close>닫기</button>`}
            </div>
          </div>
        </div>
      </div>
    `,e.querySelectorAll(`[data-calibration-dialog-close]`).forEach(e=>{e.addEventListener(`click`,()=>{this.calibrationDialogOpen=!1,this.renderCalibrationDialog()})}),e.querySelector(`[data-calibration-stop]`)?.addEventListener(`click`,()=>{this.stopCalibrationRun(`사용자가 보정을 중지했습니다.`,`warn`)})}renderProtectedZoneDialog(){let e=this.root.querySelector(`[data-protected-zone-dialog]`);if(e){if(!this.protectedZoneDialogOpen){e.innerHTML=``;return}e.innerHTML=`
      <div class="protected-zone-dialog-backdrop" role="dialog" aria-modal="true" aria-label="오탐 보정 구역 안내">
        <div class="protected-zone-dialog">
          <strong>오탐 보정 구역은 보호되어 있습니다</strong>
          <p>
            오탐 보정 구역은 자동 보정으로 생성된 제외 영역입니다.
            일반 Zone 편집 중 실수로 변경되는 것을 막기 위해 레이더맵에서는 직접 선택하거나 편집하지 않습니다.
          </p>
          <p>
            비활성화 또는 삭제가 필요하면 왼쪽의 오탐 보정 목록에서 해당 구역을 선택해 관리하세요.
          </p>
          <button type="button" data-protected-zone-close>확인</button>
        </div>
      </div>
    `,e.querySelector(`[data-protected-zone-close]`)?.addEventListener(`click`,()=>{this.protectedZoneDialogOpen=!1,this.renderProtectedZoneDialog()})}}renderShrinkConfirmDialog(){let e=this.root.querySelector(`[data-shrink-confirm-dialog]`);if(e){if(!this.shrinkConfirmZoneId){e.innerHTML=``;return}e.innerHTML=`
      <div class="protected-zone-dialog-backdrop" role="dialog" aria-modal="true" aria-label="오탐 보정 구역 축소 확인">
        <div class="protected-zone-dialog">
          <strong>보정 구역 최소 크기 보호</strong>
          <p>
            최소 기능 보장을 위해 자동으로 설정된 크기보다 작게 수정하는 것은 추천드리지 않습니다.
            진행하시겠습니까?
          </p>
          <p>
            '네'를 선택하면 이 보정 구역의 최소 보장 크기 보호가 영구 해제되어 이후에는 경고 없이 축소할 수 있습니다.
          </p>
          <div class="protected-zone-dialog-actions">
            <button type="button" data-shrink-confirm-no>아니오</button>
            <button type="button" data-shrink-confirm-yes>네</button>
          </div>
        </div>
      </div>
    `,e.querySelector(`[data-shrink-confirm-no]`)?.addEventListener(`click`,()=>{this.shrinkConfirmZoneId=``,this.renderShrinkConfirmDialog()}),e.querySelector(`[data-shrink-confirm-yes]`)?.addEventListener(`click`,()=>{this.unlockCalibrationMinSize(this.shrinkConfirmZoneId)})}}async unlockCalibrationMinSize(e){!this.config||!e||(this.pushHistory(),this.config={...this.config,calibrationZones:(this.config.calibrationZones||[]).map(t=>t.id===e?{...t,minSizeUnlocked:!0}:t)},this.shrinkConfirmZoneId=``,this.renderSidebar(),this.render(),await this.saveConfig())}calibrationDialogResultMarkup(e){return`
      <div class="calibration-result ${e.tone}">
        <strong>${h(e.title)}</strong>
        <p>${h(e.reason)}</p>
        <p>생성된 보정 구역: ${e.createdCount}개</p>
        ${e.metrics&&e.metrics.samples>0?this.calibrationMetricsMarkup(e.metrics):``}
      </div>
    `}calibrationMetricsMarkup(e){return`<pre>${h([`samples=${e.samples}`,`usedSamples=${e.usedSamples}`,`outliers=${e.outliers}`,`score=${Math.round(e.score)}`,`width=${Math.round(e.width)}mm`,`height=${Math.round(e.height)}mm`,`area=${Math.round(e.area)}mm²`,`meanSpeed=${Math.round(e.meanSpeed)}mm/sample`,`acceptedBy=${e.acceptedBy}`].join(`
`))}</pre>`}calibrationProgress(e){return this.calibrationResult?100:Math.min(99,this.calibrationProgressFromMetrics(e))}calibrationProgressFromMetrics(e){if(!this.calibrationRun||!e)return e?Math.round(U(e.score,0,100)):0;let t=U((Date.now()-this.calibrationRun.startedAt)/A,0,1)*100,n=U(e.samples/j,0,1)*45,r=U(e.score/M,0,1)*35;return Math.round(Math.max(t,n+r))}calibrationProgressText(e){return this.calibrationResult?this.calibrationResult.title:this.calibrationRun?!e||e.samples===0?`타겟 샘플 대기 중`:e.samples<j?`샘플 수집 중`:e.acceptedBy===`none`?`안정도 분석 중`:`보정 구역 생성 준비 완료`:`대기 중`}calibrationWorkItems(e){if(!this.calibrationRun&&!this.calibrationResult)return[`보정 작업 대기 중`];let t=this.calibrationRun?Math.floor((Date.now()-this.calibrationRun.startedAt)/1e3):null;return[`PIR 상태: ${this.state?.pirMotion?`움직임 감지됨`:`움직임 없음`}`,t===null?`수집 시간: 종료됨`:`수집 시간: ${t}s / 최소 ${Math.ceil(k/1e3)}s`,`샘플: ${e?.samples??0} / 최소 ${j}`,`사용 샘플: ${e?.usedSamples??0}`,`제외 샘플: ${e?.outliers??0}`,`안정도 점수: ${Math.round(e?.score??0)} / ${M}`,`판정 기준: ${e?.acceptedBy??`none`}`]}calibrationStatusText(e,t){return this.calibrationRun?`안정도 분석 중입니다. ${Math.floor((Date.now()-this.calibrationRun.startedAt)/1e3)}s / 최대 60s`:t?`PIR 움직임이 감지되어 시작할 수 없습니다.`:e>=O?`오탐 보정 구역은 최대 4개까지 저장할 수 있습니다.`:`저장된 보정 구역 ${e}/${O}`}startCalibrationRun(){if(!this.config||!this.state)return;if(this.calibrationDialogOpen=!0,this.calibrationLogs=[],this.calibrationResult=null,this.addCalibrationLog(`보정 시작 요청`),this.state.pirMotion){this.finishCalibrationWithError(`PIR 움직임이 감지되어 보정을 시작할 수 없습니다.`);return}let e=this.state.targets.filter(e=>e.active);if(e.length===0){this.finishCalibrationWithError(`감지된 타겟이 없어 보정을 시작할 수 없습니다.`);return}if(e.length>1){this.finishCalibrationWithError(`타겟이 여러 개 감지되어 보정을 시작할 수 없습니다.`);return}if((this.config.calibrationZones||[]).length>=O){this.finishCalibrationWithError(`오탐 보정 구역은 최대 4개까지 저장할 수 있습니다.`);return}this.calibrationRun={startedAt:Date.now(),samples:[]},this.addCalibrationLog(`PIR 조건 통과`),this.addCalibrationLog(`타겟 샘플 수집 시작`),this.showStatus(`오탐 보정을 시작했습니다.`,`warn`),this.renderSidebar(),this.renderCalibrationDialog()}stopCalibrationRun(e,t){let n=this.calibrationRun?q(this.calibrationRun.samples):void 0;this.addCalibrationLog(e),this.calibrationRun=null,this.calibrationResult={title:t===`error`?`보정 실패`:`보정 중지`,tone:t,createdCount:0,reason:e,metrics:n,logs:[...this.calibrationLogs]},this.showStatus(e,t),this.renderSidebar(),this.renderCalibrationDialog()}updateCalibrationRun(){if(!this.calibrationRun||!this.state||!this.config)return;if(this.state.pirMotion){this.stopCalibrationRun(`PIR 움직임이 감지되어 보정을 취소했습니다.`,`error`);return}let e=this.state.targets.filter(e=>e.active);if(e.length===1){let t=e[0],n=this.calibrationRun.samples[this.calibrationRun.samples.length-1],r=n?Math.hypot(t.x-n.x,t.y-n.y):0;this.calibrationRun.samples.push({x:t.x,y:t.y,speed:r}),(this.calibrationRun.samples.length===1||this.calibrationRun.samples.length%10==0)&&this.addCalibrationLog(`샘플 수집: ${this.calibrationRun.samples.length}개`)}else if(e.length>1){this.stopCalibrationRun(`타겟이 여러 개 감지되어 보정을 취소했습니다.`,`error`);return}let t=Date.now()-this.calibrationRun.startedAt,n=q(this.calibrationRun.samples);if(t>=k&&this.calibrationRun.samples.length>=j&&n.acceptedBy!==`none`){this.addCalibrationLog(`보정 기준 통과: ${n.acceptedBy}`),this.applyCalibrationRun(n);return}t>=A&&this.stopCalibrationRun(`반복 감지 영역이 너무 넓거나 불안정해 보정을 만들지 않았습니다.`,`error`)}async applyCalibrationRun(e){if(!this.config||!this.calibrationRun)return;let t=ke(this.calibrationRun.samples,this.config.calibrationZones||[]);if(this.calibrationRun=null,!t){this.addCalibrationLog(`오탐 보정 후보 구역 생성 실패`),this.calibrationResult={title:`보정 실패`,tone:`error`,createdCount:0,reason:`오탐 보정 후보를 만들지 못했습니다.`,metrics:e,logs:[...this.calibrationLogs]},this.showStatus(`오탐 보정 후보를 만들지 못했습니다.`,`error`),this.renderSidebar(),this.renderCalibrationDialog();return}this.pushHistory(),this.config={...this.config,calibrationZones:[...this.config.calibrationZones||[],t]},this.calibrationResult={title:`보정 완료`,tone:`ok`,createdCount:1,reason:e.acceptedBy===`score`?`안정도 점수 기준을 통과했습니다.`:`반복 감지 영역 기준을 통과했습니다.`,metrics:e,logs:[...this.calibrationLogs,`${t.id} 구역 생성`]},this.renderSidebar(),this.render(),await this.saveConfig(),this.showStatus(`오탐 보정 구역을 저장했습니다. 안정도 ${Math.round(e.score)}점`,`ok`),this.renderCalibrationDialog()}async deleteCalibrationZone(e){this.config&&(this.pushHistory(),this.config={...this.config,calibrationZones:(this.config.calibrationZones||[]).filter(t=>t.id!==e)},this.calibrationResult=null,this.renderSidebar(),this.render(),await this.saveConfig())}async toggleCalibrationZone(e){if(!this.config)return;let t=!1;this.pushHistory(),this.config={...this.config,calibrationZones:(this.config.calibrationZones||[]).map(n=>n.id===e?(t=n.type!==`disabled`,{...n,type:t?`disabled`:`filter`}):n)},this.calibrationResult=null,this.renderSidebar(),this.render(),await this.saveConfig()}finishCalibrationWithError(e){this.addCalibrationLog(e),this.calibrationRun=null,this.calibrationResult={title:`보정 실패`,tone:`error`,createdCount:0,reason:e,logs:[...this.calibrationLogs]},this.showStatus(e,`error`),this.renderSidebar(),this.renderCalibrationDialog()}addCalibrationLog(e){let t=new Date().toLocaleTimeString();this.calibrationLogs=[...this.calibrationLogs,`[${t}] ${e}`].slice(-40)}attachSceneEvents(){this.root.querySelector(`[data-radar-scene] svg`)?.addEventListener(`click`,e=>{this.clearSelectionFromEmptyRadarClick(e)}),this.root.querySelectorAll(`[data-zone-drag]`).forEach(e=>{e.addEventListener(`pointerdown`,e=>this.beginZoneDrag(e))}),this.root.querySelectorAll(`[data-zone-edge]`).forEach(e=>{e.addEventListener(`dblclick`,e=>this.insertPointOnEdge(e))}),this.root.querySelectorAll(`[data-zone-point]`).forEach(e=>{e.addEventListener(`dblclick`,e=>this.deletePointFromEvent(e))}),this.root.querySelectorAll(`[data-zone-select]`).forEach(e=>{e.addEventListener(`click`,()=>{this.setSelectedZone(e.dataset.zoneSelect||this.selectedZoneId),this.renderSidebar(),this.render()})}),this.root.querySelectorAll(`[data-calibration-info]`).forEach(e=>{e.addEventListener(`click`,()=>{this.protectedZoneDialogOpen=!0,this.renderProtectedZoneDialog()})})}clearSelectionFromEmptyRadarClick(e){let t=e.target;t&&(t.closest(`[data-zone-drag], [data-zone-edge], [data-zone-point], [data-calibration-info], .target`)||!this.selectedZoneId&&this.selectedPointIndex<0||(this.setSelectedZone(``),this.renderSidebar(),this.render()))}beginZoneDrag(e){if(!this.config)return;let t=e.target,n=t?.dataset.zoneId,r=t?.dataset.zoneDrag;if(!t||!n||!r)return;let i=G(n)?`calibration`:`zone`;if(i===`calibration`&&r!==`resize`)return;let a=i===`calibration`?(this.config.calibrationZones||[]).find(e=>e.id===n):this.displayZones().find(e=>e.id===n),o=t.closest(`svg`);!a||!o||(e.preventDefault(),this.pushHistory(),t.setPointerCapture?.(e.pointerId),this.setSelectedZone(n,!1),this.selectedPointIndex=t.dataset.zonePoint?Number(t.dataset.zonePoint):-1,this.drag={zoneId:n,source:i,mode:r,pointIndex:t.dataset.zonePoint?Number(t.dataset.zonePoint):void 0,pointerId:e.pointerId,startPoint:this.scene.pointFromEvent(e,o),startZone:structuredClone(a)},window.addEventListener(`pointermove`,this.handleZoneDragMove),window.addEventListener(`pointerup`,this.handleZoneDragEnd),window.addEventListener(`pointercancel`,this.handleZoneDragEnd))}async saveConfig(){this.scheduleSave()}scheduleSave(){this.config&&(this.saveQueued=!0,window.clearTimeout(this.saveTimer),this.saveTimer=window.setTimeout(()=>{this.flushSave()},ve),this.showStatus(`저장 대기 중`,`warn`))}async flushSave(){if(this.config){if(this.saveInFlight){this.scheduleSave();return}this.saveInFlight=!0,this.saveQueued=!1;try{await this.api.saveConfig(Fe(this.config)),this.renderSidebar(),this.showStatus(`저장됨`,`ok`)}catch(e){let t=`저장하지 못했습니다: ${e instanceof Error?e.message:String(e)}`;this.showStatus(t,`error`)}finally{this.saveInFlight=!1,this.saveQueued&&this.scheduleSave()}}}insertPointOnEdge(e){if(!this.config)return;let t=e.target,n=t?.dataset.zoneId,r=Number(t?.dataset.zoneEdge),i=t?.closest(`svg`);if(!t||!n||!Number.isInteger(r)||!i)return;e.preventDefault();let a=this.scene.pointFromEvent(e,i);this.setSelectedZone(n,!1),this.selectedPointIndex=r+1;let o=this.displayZones().find(e=>e.id===n);if(o){if(o.points.length>=ge){this.showStatus(`꼭짓점은 zone당 최대 8개까지 추가할 수 있습니다.`,`error`);return}this.pushHistory(),this.config={...this.config,zones:Q(this.config.zones,{...V(Ee(o,r,a)),placeholder:!1})},this.renderSidebar(),this.render(),this.saveConfig()}}deletePointFromEvent(e){let t=e.target,n=t?.dataset.zoneId,r=Number(t?.dataset.zonePoint);!n||!Number.isInteger(r)||G(n)||(e.preventDefault(),this.setSelectedZone(n,!1),this.selectedPointIndex=r,this.deleteSelectedPoint())}async deleteSelectedPoint(){if(!this.config||this.selectedPointIndex<0)return;let e=this.selectedZone();if(!e||e.shape!==`polygon`||e.points.length<=3){this.showStatus(`다각형은 꼭짓점 3개 이상이 필요합니다.`,`warn`);return}this.pushHistory();let t=Math.min(this.selectedPointIndex,e.points.length-2);this.config={...this.config,zones:this.config.zones.map(t=>t.id===e.id?{...t,points:t.points.filter((e,t)=>t!==this.selectedPointIndex)}:t)},this.selectedPointIndex=t,this.renderSidebar(),this.render(),await this.saveConfig()}selectedZone(){return this.config&&this.config.zones.find(e=>e.id===this.selectedZoneId)||null}selectedCalibrationZone(){return this.config&&(this.config.calibrationZones||[]).find(e=>e.id===this.selectedZoneId)||null}selectedDisplayZone(){return this.displayZones().find(e=>e.id===this.selectedZoneId)||null}displayConfig(){return this.config?{...this.config,zones:this.displayZones(),calibrationZones:this.config.calibrationZones||[]}:{version:1,zones:[],calibrationZones:[]}}displayZones(){return this.config?this.config.zones.filter(e=>!Z(e)).slice(0,D):[]}async addZone(){if(!this.config)return;let e=this.displayZones();if(e.length>=D){this.showStatus(`감지/제외 구역은 최대 6개까지 만들 수 있습니다.`,`warn`);return}let t=Ie(this.config.zones),n={id:t,name:`Zone ${t.replace(`zone_`,``)}`,type:`detection`,shape:`rect`,points:Le(e.length)};this.pushHistory(),this.config={...this.config,zones:Q(this.config.zones,n)},this.setSelectedZone(t),this.renderSidebar(),this.render(),await this.saveConfig()}async deleteSelectedZone(){if(!this.config)return;let e=this.selectedZone();if(!e)return;this.pushHistory();let t=this.config.zones.filter(t=>t.id!==e.id);this.config={...this.config,zones:t},this.setSelectedZone(t[0]?.id||``),this.showStatus(`Zone을 삭제했습니다.`,`warn`),this.selectedPointIndex=-1,this.renderSidebar(),this.render(),await this.saveConfig()}async setSelectedZoneType(e){!this.config||!this.selectedZone()||(this.pushHistory(),this.config={...this.config,zones:this.config.zones.map(t=>t.id===this.selectedZoneId?{...t,type:e}:t)},this.renderSidebar(),this.render(),await this.saveConfig())}setSelectedZoneNameDraft(e){if(!this.config||!this.selectedZone())return;this.nameEditHistoryCaptured||=(this.pushHistory(),!0);let t=De(e);this.config={...this.config,zones:this.config.zones.map(e=>e.id===this.selectedZoneId?{...e,name:t}:e)},this.state&&(this.scene.render(this.state,this.displayConfig(),this.selectedZoneId,!0,this.selectedPointIndex),this.attachSceneEvents())}async commitSelectedZoneName(e){this.config&&this.selectedZone()&&(this.nameEditHistoryCaptured=!1,await this.saveConfig())}async deleteSelectedItem(){if(this.selectedCalibrationZone()){await this.deleteCalibrationZone(this.selectedZoneId);return}await this.deleteSelectedZone()}async convertSelectedZoneToRect(){if(!this.config)return;let e=this.selectedZone();if(!e||e.points.length<3)return;this.pushHistory();let t=e.points.map(([e])=>e),n=e.points.map(([,e])=>e);this.config={...this.config,zones:this.config.zones.map(r=>r.id===e.id?{...r,shape:`rect`,points:$(Math.min(...t),Math.min(...n),Math.max(...t),Math.max(...n))}:r)},this.selectedPointIndex=-1,this.renderSidebar(),this.render(),await this.saveConfig()}async undo(){if(!this.config||this.historyPast.length===0)return;let e=this.historyPast[this.historyPast.length-1];this.historyPast=this.historyPast.slice(0,-1),this.historyFuture=[structuredClone(this.config),...this.historyFuture].slice(0,30),this.config=structuredClone(e),this.setSelectedZone(this.config.zones[0]?.id||this.config.calibrationZones?.[0]?.id||``),this.renderSidebar(),this.render(),await this.saveConfig()}async redo(){if(!this.config||this.historyFuture.length===0)return;let e=this.historyFuture[0];this.historyFuture=this.historyFuture.slice(1),this.historyPast=[...this.historyPast,structuredClone(this.config)].slice(-30),this.config=structuredClone(e),this.setSelectedZone(this.config.zones[0]?.id||this.config.calibrationZones?.[0]?.id||``),this.renderSidebar(),this.render(),await this.saveConfig()}pushHistory(){this.config&&(this.historyPast=[...this.historyPast,structuredClone(this.config)].slice(-30),this.historyFuture=[])}showStatus(e,t){let n=this.root.querySelector(`[data-status]`);if(n&&(n.textContent=e,n.dataset.tone=t),t!==`error`)return;let r=this.root.querySelector(`[data-toast]`);r&&(window.clearTimeout(this.toastTimer),r.textContent=e,r.dataset.visible=`true`,this.toastTimer=window.setTimeout(()=>{r.dataset.visible=`false`,r.textContent=``},5e3))}setSelectedZone(e,t=!0){this.selectedZoneId!==e&&(this.shrinkWarningShownZoneId=``),this.selectedZoneId=e,t&&(this.selectedPointIndex=-1)}};function Se(e,t,n){let r=n.x-t.x,i=n.y-t.y;return V({...e,points:e.points.map(([e,t])=>[Math.round(e+r),Math.round(t+i)])})}function Ce(e,t,n){return t===void 0||t<0||t>=e.points.length?e:e.shape===`rect`?we(e,t,n):V({...e,points:e.points.map((e,r)=>r===t?[n.x,n.y]:e)})}function we(e,t,n){if(e.shape!==`rect`||e.points.length<4)return e;let r=e.points.map(([e])=>e),i=e.points.map(([,e])=>e),a=Math.min(...r),o=Math.max(...r),s=Math.min(...i),c=Math.max(...i);return t===0?(a=n.x,s=n.y):t===1?(o=n.x,s=n.y):t===2?(o=n.x,c=n.y):t===3&&(a=n.x,c=n.y),V({...e,points:$(a,s,o,c)})}function z(e,t,n,r){if(t===void 0||t<0||e.points.length<4)return e;let i=e.points.map(([e])=>e),a=e.points.map(([,e])=>e),o=Math.min(...i),s=Math.max(...i),c=Math.min(...a),l=Math.max(...a),u=o,d=s,f=c,p=l;return t===0?(u=r?n.x:Math.min(o,n.x),f=r?n.y:Math.min(c,n.y)):t===1?(d=r?n.x:Math.max(s,n.x),f=r?n.y:Math.min(c,n.y)):t===2?(d=r?n.x:Math.max(s,n.x),p=r?n.y:Math.max(l,n.y)):t===3&&(u=r?n.x:Math.min(o,n.x),p=r?n.y:Math.max(l,n.y)),V({...e,shape:`rect`,points:$(u,f,d,p)})}function Te(e,t,n){if(t===void 0||t<0||e.points.length<4)return!1;let r=B(e),i=B(z(e,t,n,!0));return i.width<r.width||i.height<r.height}function B(e){let t=e.points.map(([e])=>e),n=e.points.map(([,e])=>e),r=Math.min(...t),i=Math.max(...t),a=Math.min(...n),o=Math.max(...n);return{minX:r,maxX:i,minY:a,maxY:o,width:i-r,height:o-a}}function Ee(e,t,n){let r=Math.min(t+1,e.points.length);return V({...e,shape:`polygon`,points:[...e.points.slice(0,r),[n.x,n.y],...e.points.slice(r)]})}function V(e){if(e.points.length===0)return e;let t=Math.min(...e.points.map(([e])=>e)),n=Math.max(...e.points.map(([e])=>e)),r=Math.min(...e.points.map(([,e])=>e)),i=Math.max(...e.points.map(([,e])=>e)),a=H(t,n,g,ee),o=H(r,i,0,_);return{...e,points:e.points.map(([e,t])=>[U(Math.round(e+a),g,ee),U(Math.round(t+o),0,_)])}}function H(e,t,n,r){return e<n?n-e:t>r?r-t:0}function U(e,t,n){return Math.min(n,Math.max(t,e))}function W(e){let t=/^zone_(\d+)$/.exec(e);return t?`Zone ${t[1]}`:e}function G(e){return/^calibration_\d+$/.test(e)}function K(e){return e.name||W(e.id)}function De(e){return Array.from(e.trim()).slice(0,_e).join(``)}function Oe(e){if(e.length<2)return 0;let t=Ae(e),n=e.map(e=>Math.hypot(e.x-t.x,e.y-t.y)),r=X(n),i=Math.max(...n),a=X(e.map(e=>e.speed)),o=U(45-r/12,0,45),s=U(25-i/28,0,25),c=U(20-a/18,0,20),l=U(e.length/j,0,1)*10;return o+s+c+l}function q(e){if(e.length===0)return{samples:0,usedSamples:0,outliers:0,score:0,width:0,height:0,area:0,meanSpeed:0,acceptedBy:`none`};let t=Oe(e),n=je(e),r=J(n.usedSamples),i=r.maxX-r.minX,a=r.maxY-r.minY,o=i*a,s=X(e.map(e=>e.speed)),c=`none`;return e.length>=j&&t>=M?c=`score`:e.length>=j&&i<=N&&a<=P&&o<=ye&&(c=`area`),{samples:e.length,usedSamples:n.usedSamples.length,outliers:n.outliers,score:t,width:i,height:a,area:o,meanSpeed:s,acceptedBy:c}}function ke(e,t){if(e.length<j)return null;let n=je(e);if(n.usedSamples.length<j)return null;let r=Ae(n.usedSamples),i=J(n.usedSamples),a=i.maxX-i.minX,o=i.maxY-i.minY,s=U(Math.max(L,a+R),L,N),c=U(Math.max(L,o+R),L,P),l=Ne(t);return l?V({id:l,name:`보정 ${l.replace(`calibration_`,``)}`,type:`filter`,shape:`rect`,points:$(r.x-s/2,r.y-c/2,r.x+s/2,r.y+c/2)}):null}function Ae(e){return{x:Math.round(X(e.map(e=>e.x))),y:Math.round(X(e.map(e=>e.y)))}}function je(e){if(e.length<3)return{usedSamples:e,outliers:0};let t=Me(e),n=e.filter(e=>Math.hypot(e.x-t.x,e.y-t.y)<=be);return{usedSamples:n.length>=j?n:e,outliers:n.length>=j?e.length-n.length:0}}function Me(e){return{x:Y(e.map(e=>e.x),.5),y:Y(e.map(e=>e.y),.5)}}function J(e){return e.length===0?{minX:0,maxX:0,minY:0,maxY:0}:{minX:Y(e.map(e=>e.x),F),maxX:Y(e.map(e=>e.x),I),minY:Y(e.map(e=>e.y),F),maxY:Y(e.map(e=>e.y),I)}}function Y(e,t){if(!e.length)return 0;let n=[...e].sort((e,t)=>e-t);return n[U(Math.round((n.length-1)*t),0,n.length-1)]??0}function X(e){return e.length?e.reduce((e,t)=>e+t,0)/e.length:0}function Ne(e){let t=new Set(e.map(e=>e.id));for(let e=1;e<=O;e+=1){let n=`calibration_${e}`;if(!t.has(n))return n}return null}function Pe(e){return{...e,zones:e.zones.filter(e=>!Z(e)).slice(0,D).map(e=>{let{placeholder:t,...n}=e;return V(n)}),calibrationZones:(e.calibrationZones||[]).filter(e=>!Z(e)).slice(0,O).map(e=>V({...e,type:e.type===`disabled`?`disabled`:`filter`}))}}function Fe(e){return{...e,zones:e.zones.filter(e=>!Z(e)).slice(0,D).map(e=>{let{placeholder:t,...n}=e;return V(n)}),calibrationZones:(e.calibrationZones||[]).filter(e=>!Z(e)).slice(0,O).map(e=>V({...e,type:e.type===`disabled`?`disabled`:`filter`}))}}function Z(e){return e.points.length===0||e.points.every(([e,t])=>e===0&&t===0)}function Q(e,t){return(e.some(e=>e.id===t.id)?e.map(e=>e.id===t.id?t:e):[...e,t]).sort((e,t)=>Re(e.id)-Re(t.id)).slice(0,D)}function Ie(e){let t=new Set(e.map(e=>e.id));for(let e=1;e<=D;e+=1){let n=`zone_${e}`;if(!t.has(n))return n}return`zone_${e.length+1}`}function Le(e){let t=Math.min(e,D-1)*180;return $(-900+t,1e3+t,900+t,2400+t)}function Re(e){let t=/^(?:zone|calibration)_(\d+)$/.exec(e);return t?Number(t[1]):99}function $(e,t,n,r){let i=Math.min(e,n),a=Math.max(e,n),o=Math.min(t,r),s=Math.max(t,r);return[[i,o],[a,o],[a,s],[i,s]]}function ze(){return`
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
  `}var Be=document.querySelector(`#app`);if(!Be)throw Error(`App root not found`);new xe(Be).start();
//# sourceMappingURL=index-DnJ1iM6U.js.map