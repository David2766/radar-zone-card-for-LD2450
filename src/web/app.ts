import { mockApi } from "./api/mock-api";
import { deviceApi } from "./api/device-api";
import { escapeHtml } from "../core/html";
import {
  LD2450_ZONE_MAX_X_MM,
  LD2450_ZONE_MAX_Y_MM,
  LD2450_ZONE_MIN_X_MM,
  LD2450_ZONE_MIN_Y_MM
} from "../core/radar-math";
import { RadarScene } from "./canvas/radar-scene";
import type { RadarScreenPoint } from "../core/types";
import type { DeviceApi, WebDeviceConfig, WebDeviceState, WebZone, WebZoneType } from "./types";

const searchParams = new URLSearchParams(window.location.search);
const deviceBaseUrl = searchParams.get("device")?.trim() || "";
const useMockApi = searchParams.get("mock") === "1" || (!deviceBaseUrl && window.location.hostname === "localhost");
const zoneTypeLabels: Record<WebZoneType, string> = {
  detection: "Detection",
  filter: "Filter",
  reduced: "Reduced",
  disabled: "Disabled"
};
const calibrationTypeLabels: Record<Extract<WebZoneType, "filter" | "reduced" | "disabled">, string> = {
  filter: "\uCC28\uB2E8",
  reduced: "\uB454\uAC10",
  disabled: "\uAEBC\uC9D0"
};

function calibrationType(type: WebZoneType): Extract<WebZoneType, "filter" | "reduced" | "disabled"> {
  if (type === "reduced" || type === "disabled") return type;
  return "filter";
}
const MAX_SOFTWARE_ZONES = 6;
const MAX_CALIBRATION_ZONES = 4;
const MAX_ZONE_POINTS = 8;
const MAX_ZONE_NAME_LENGTH = 10;
const SAVE_DEBOUNCE_MS = 3000;
const CALIBRATION_MIN_MS = 15000;
const CALIBRATION_MAX_MS = 60000;
const CALIBRATION_MIN_SAMPLES = 20;
const CALIBRATION_SCORE_THRESHOLD = 80;
const CALIBRATION_MAX_CLUSTER_WIDTH_MM = 2400;
const CALIBRATION_MAX_CLUSTER_HEIGHT_MM = 2400;
const CALIBRATION_MAX_CLUSTER_AREA_MM2 = 3600000;
const CALIBRATION_OUTLIER_DISTANCE_MM = 1200;
const CALIBRATION_PERCENTILE_LOW = 0.05;
const CALIBRATION_PERCENTILE_HIGH = 0.95;
const CALIBRATION_MIN_BOX_SIZE_MM = 800;
const CALIBRATION_BOX_MARGIN_MM = 700;

interface CalibrationRun {
  startedAt: number;
  samples: Array<{ x: number; y: number; speed: number }>;
}

interface CalibrationMetrics {
  samples: number;
  usedSamples: number;
  outliers: number;
  score: number;
  width: number;
  height: number;
  area: number;
  meanSpeed: number;
  acceptedBy: "score" | "area" | "none";
}

interface CalibrationResult {
  title: string;
  tone: "ok" | "warn" | "error";
  createdCount: number;
  reason: string;
  metrics?: CalibrationMetrics;
  logs?: string[];
}

export class WebConfiguratorApp {
  private readonly api: DeviceApi = useMockApi ? mockApi : deviceApi;
  private readonly scene: RadarScene;
  private state: WebDeviceState | null = null;
  private config: WebDeviceConfig | null = null;
  private timer = 0;
  private toastTimer = 0;
  private saveTimer = 0;
  private saveInFlight = false;
  private saveQueued = false;
  private selectedZoneId = "";
  private selectedPointIndex = -1;
  private calibrationRun: CalibrationRun | null = null;
  private calibrationResult: CalibrationResult | null = null;
  private calibrationDialogOpen = false;
  private calibrationLogs: string[] = [];
  private protectedZoneDialogOpen = false;
  private shrinkConfirmZoneId = "";
  private shrinkWarningShownZoneId = "";
  private historyPast: WebDeviceConfig[] = [];
  private historyFuture: WebDeviceConfig[] = [];
  private nameEditHistoryCaptured = false;
  private drag: {
    zoneId: string;
    source: "zone" | "calibration";
    mode: "move" | "resize";
    pointIndex?: number;
    pointerId: number;
    startPoint: RadarScreenPoint;
    startZone: WebZone;
  } | null = null;

  constructor(private readonly root: HTMLElement) {
    this.root.innerHTML = shellMarkup();
    const sceneHost = this.root.querySelector<HTMLElement>("[data-radar-scene]");
    if (!sceneHost) {
      throw new Error("Radar scene container not found");
    }
    this.scene = new RadarScene(sceneHost);
    window.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("pointerdown", this.handleDocumentPointerDown, true);
  }

  async start(): Promise<void> {
    await this.loadConfig();
    await this.refreshState();
    this.timer = window.setInterval(() => {
      void this.refreshState();
    }, 500);
  }

  stop(): void {
    window.clearInterval(this.timer);
    window.clearTimeout(this.saveTimer);
    window.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("pointerdown", this.handleDocumentPointerDown, true);
  }

  private async loadConfig(): Promise<void> {
    try {
      this.config = normalizeSoftwareConfig(await this.api.getConfig());
      this.setSelectedZone(this.config.zones[0]?.id || "");
      this.renderSidebar();
    } catch (error) {
      this.showStatus(`설정을 읽지 못했습니다: ${error instanceof Error ? error.message : String(error)}`, "error");
    }
  }

  private async refreshState(): Promise<void> {
    try {
      this.state = await this.api.getState();
      this.updateCalibrationRun();
      this.render();
      this.showStatus(this.state.connected ? "연결됨" : "연결 대기", this.state.connected ? "ok" : "warn");
    } catch (error) {
      this.showStatus(`상태를 읽지 못했습니다: ${error instanceof Error ? error.message : String(error)}`, "error");
    }
  }

  private render(): void {
    if (!this.state || !this.config) return;
    if (!this.drag) {
      this.scene.render(this.state, this.displayConfig(), this.selectedZoneId, true, this.selectedPointIndex);
      this.attachSceneEvents();
    }
    const updated = this.root.querySelector<HTMLElement>("[data-updated-at]");
    if (updated) {
      updated.textContent = new Date(this.state.updatedAt).toLocaleTimeString();
    }
    this.renderToolbar();
    this.renderCalibrationDialog();
    this.renderProtectedZoneDialog();
    this.renderShrinkConfirmDialog();
  }

  private renderToolbar(): void {
    const toolbar = this.root.querySelector<HTMLElement>("[data-map-toolbar]");
    if (!toolbar) return;
    const selected = this.selectedZone();
    const selectedCalibration = this.selectedCalibrationZone();
    const selectedLabel = selected
      ? `${zoneDisplayName(selected)} · ${selected.shape === "rect" ? "사각형" : "다각형"} · ${zoneTypeLabels[selected.type]}`
      : selectedCalibration
      ? `${zoneDisplayName(selectedCalibration)} · 오탐 보정 · ${selectedCalibration.type === "disabled" ? "비활성화" : "활성"}`
      : "선택 없음";
    toolbar.innerHTML = `
      <div class="map-toolbar-actions">
        <button type="button" data-history-undo ${this.historyPast.length ? "" : "disabled"} title="되돌리기">↶</button>
        <button type="button" data-history-redo ${this.historyFuture.length ? "" : "disabled"} title="다시 실행">↷</button>
        <button type="button" data-zone-to-rect ${selected && selected.shape !== "rect" ? "" : "disabled"}>사각형</button>
        <button type="button" data-selected-delete ${selected || selectedCalibration ? "" : "disabled"}>삭제</button>
      </div>
      <span>${escapeHtml(selectedLabel)}</span>
      <span>마지막 업데이트</span>
      <strong data-updated-at>${this.state ? new Date(this.state.updatedAt).toLocaleTimeString() : "-"}</strong>
    `;
    toolbar.querySelector<HTMLButtonElement>("[data-history-undo]")?.addEventListener("click", () => {
      void this.undo();
    });
    toolbar.querySelector<HTMLButtonElement>("[data-history-redo]")?.addEventListener("click", () => {
      void this.redo();
    });
    toolbar.querySelector<HTMLButtonElement>("[data-zone-to-rect]")?.addEventListener("click", () => {
      void this.convertSelectedZoneToRect();
    });
    toolbar.querySelector<HTMLButtonElement>("[data-selected-delete]")?.addEventListener("click", () => {
      void this.deleteSelectedItem();
    });
  }

  private renderSidebar(): void {
    if (!this.config) return;
    const list = this.root.querySelector<HTMLElement>("[data-zone-list]");
    if (!list) return;
    const zones = this.displayZones();
    list.innerHTML = `
      ${
        zones.length
          ? zones
              .map(
                (zone) => `
                <button class="zone-list-item ${zone.type}${zone.id === this.selectedZoneId ? " selected" : ""}" type="button" data-zone-id="${zone.id}">
                  <div>
                    <strong>${escapeHtml(zoneDisplayName(zone))}</strong>
                    <span>${escapeHtml(zoneSlotLabel(zone.id))}</span>
                  </div>
                  <em>${zoneTypeLabels[zone.type]}</em>
                </button>
              `
              )
              .join("")
          : `<p class="empty-zone-message">아직 설정된 구역이 없습니다. Zone 추가를 눌러 감지 또는 제외 구역을 만들어보세요.</p>`
      }
      <div class="zone-add-area">
        <button class="zone-add-button" type="button" data-zone-add ${zones.length >= MAX_SOFTWARE_ZONES ? "disabled" : ""}>Zone 추가</button>
        <p>${zones.length >= MAX_SOFTWARE_ZONES ? "최대 6개까지 설정되었습니다." : "감지/제외 구역은 최대 6개까지 만들 수 있습니다."}</p>
      </div>
    `;
    list.querySelectorAll<HTMLElement>("[data-zone-id]").forEach((button) => {
      button.addEventListener("click", () => {
        this.setSelectedZone(button.dataset.zoneId || this.selectedZoneId);
        this.renderSidebar();
        this.render();
      });
    });
    list.querySelector<HTMLButtonElement>("[data-zone-add]")?.addEventListener("click", () => {
      void this.addZone();
    });
    this.renderZoneTypeControls();
    this.renderCalibrationPanel();
  }

  private renderZoneTypeControls(): void {
    if (!this.config) return;
    const host = this.root.querySelector<HTMLElement>("[data-zone-type-controls]");
    if (!host) return;
    const selectedZone = this.selectedDisplayZone();
    if (!selectedZone) {
      host.innerHTML = `<p class="panel-help">Zone을 추가하거나 선택하세요.</p>`;
      return;
    }

    host.innerHTML = `
      <div class="zone-type-card ${selectedZone.type}">
        <div>
          <strong>${escapeHtml(zoneDisplayName(selectedZone))}</strong>
          <span>원하는 구역을 지정하여 이름을 붙이거나 탐지 제외를 하도록 설정할 수 있습니다.</span>
        </div>
        <label class="zone-name-field">
          <span>Zone 이름</span>
          <input type="text" data-zone-name-input value="${escapeHtml(selectedZone.name || "")}" maxlength="${MAX_ZONE_NAME_LENGTH}" placeholder="예: 침대, 책상, 커튼" />
        </label>
        <div class="zone-type-buttons">
          ${(["detection", "filter", "disabled"] as WebZoneType[])
            .map(
              (type) => `
                <button
                  class="zone-type-button ${type}${selectedZone.type === type ? " selected" : ""}"
                  type="button"
                  data-zone-type="${type}"
                >
                  ${zoneTypeLabels[type]}
                </button>
              `
            )
            .join("")}
        </div>
        <button class="danger-button" type="button" data-zone-delete>Zone 삭제</button>
      </div>
    `;

    const nameInput = host.querySelector<HTMLInputElement>("[data-zone-name-input]");
    nameInput?.addEventListener("input", () => {
      this.setSelectedZoneNameDraft(nameInput.value);
    });
    nameInput?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void this.commitSelectedZoneName(nameInput.value);
    });
    nameInput?.addEventListener("change", () => {
      void this.commitSelectedZoneName(nameInput.value);
    });
    nameInput?.addEventListener("blur", () => {
      void this.commitSelectedZoneName(nameInput.value);
    });
    host.querySelectorAll<HTMLButtonElement>("[data-zone-type]").forEach((button) => {
      button.addEventListener("click", () => {
        const type = button.dataset.zoneType as WebZoneType | undefined;
        if (!type) return;
        void this.setSelectedZoneType(type);
      });
    });
    host.querySelector<HTMLButtonElement>("[data-zone-delete]")?.addEventListener("click", () => {
      void this.deleteSelectedZone();
    });
  }

  private renderCalibrationPanel(): void {
    if (!this.config) return;
    const host = this.root.querySelector<HTMLElement>("[data-calibration-panel]");
    if (!host) return;
    const count = this.config.calibrationZones?.length || 0;
    const running = Boolean(this.calibrationRun);
    const pirBlocked = Boolean(this.state?.pirMotion);
    const calibrationZones = this.config.calibrationZones || [];
    host.innerHTML = `
      <div class="calibration-card">
        <div>
          <strong>\uC624\uD0D0 \uBCF4\uC815</strong>
          <span>\uC0AC\uB78C\uC774 \uC5C6\uB294 \uC0C1\uD0DC\uC5D0\uC11C \uBC18\uBCF5\uC801\uC73C\uB85C \uAC10\uC9C0\uB418\uB294 \uC704\uCE58\uB97C \uBCF4\uC815 \uAD6C\uC5ED\uC73C\uB85C \uC800\uC7A5\uD569\uB2C8\uB2E4.</span>
        </div>
        <button class="calibration-button" type="button" ${running ? "data-calibration-stop" : "data-calibration-start"} ${!running && (pirBlocked || count >= MAX_CALIBRATION_ZONES) ? "disabled" : ""}>
          ${running ? "\uBCF4\uC815 \uC911\uC9C0" : "\uC624\uD0D0 \uBCF4\uC815 \uC2DC\uC791"}
        </button>
        <p>${this.calibrationStatusText(count, pirBlocked)}</p>
        ${
          calibrationZones.length
            ? `<div class="calibration-list">
                ${calibrationZones
                  .map(
                    (zone) => `
                    <div class="calibration-list-item ${calibrationType(zone.type)}${zone.id === this.selectedZoneId ? " selected" : ""}" data-calibration-select="${escapeHtml(zone.id)}">
                      <span>
                        ${escapeHtml(zone.name || zone.id)}
                        <em>${calibrationTypeLabels[calibrationType(zone.type)]}</em>
                      </span>
                      <div class="calibration-list-actions">
                        <select data-calibration-type="${escapeHtml(zone.id)}" aria-label="\uC624\uD0D0 \uBCF4\uC815 \uB3D9\uC791">
                          ${(["filter", "reduced", "disabled"] as const)
                            .map(
                              (type) => `
                                <option value="${type}" ${calibrationType(zone.type) === type ? "selected" : ""}>
                                  ${calibrationTypeLabels[type]}
                                </option>
                              `
                            )
                            .join("")}
                        </select>
                        <button type="button" data-calibration-delete="${escapeHtml(zone.id)}">\uC0AD\uC81C</button>
                      </div>
                    </div>
                  `
                  )
                  .join("")}
              </div>`
            : ""
        }
      </div>
    `;
    host.querySelector<HTMLButtonElement>("[data-calibration-start]")?.addEventListener("click", () => {
      this.startCalibrationRun();
    });
    host.querySelector<HTMLButtonElement>("[data-calibration-stop]")?.addEventListener("click", () => {
      this.stopCalibrationRun("\uC0AC\uC6A9\uC790\uAC00 \uBCF4\uC815\uC744 \uC911\uC9C0\uD588\uC2B5\uB2C8\uB2E4.", "warn");
    });
    host.querySelectorAll<HTMLButtonElement>("[data-calibration-delete]").forEach((button) => {
      button.addEventListener("click", () => {
        const zoneId = button.dataset.calibrationDelete;
        if (zoneId) void this.deleteCalibrationZone(zoneId);
      });
    });
    host.querySelectorAll<HTMLSelectElement>("[data-calibration-type]").forEach((select) => {
      select.addEventListener("change", () => {
        const zoneId = select.dataset.calibrationType;
        const type = select.value;
        if (zoneId && (type === "filter" || type === "reduced" || type === "disabled")) {
          void this.setCalibrationZoneType(zoneId, type);
        }
      });
    });
    host.querySelectorAll<HTMLElement>("[data-calibration-select]").forEach((item) => {
      item.addEventListener("click", (event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest("button, select")) return;
        this.setSelectedZone(item.dataset.calibrationSelect || this.selectedZoneId);
        this.renderSidebar();
        this.render();
      });
    });
  }
  private calibrationResultMarkup(): string {
    if (!this.calibrationResult) return "";
    const metrics = this.calibrationResult.metrics;
    return `
      <div class="calibration-result ${this.calibrationResult.tone}">
        <strong>${escapeHtml(this.calibrationResult.title)}</strong>
        <p>${escapeHtml(this.calibrationResult.reason)}</p>
        <p>생성된 보정 구역: ${this.calibrationResult.createdCount}개</p>
        ${
          metrics
            ? `<pre>${escapeHtml(
                [
                  `samples=${metrics.samples}`,
                  `usedSamples=${metrics.usedSamples}`,
                  `outliers=${metrics.outliers}`,
                  `score=${Math.round(metrics.score)}`,
                  `width=${Math.round(metrics.width)}mm`,
                  `height=${Math.round(metrics.height)}mm`,
                  `area=${Math.round(metrics.area)}mm²`,
                  `meanSpeed=${Math.round(metrics.meanSpeed)}mm/sample`,
                  `acceptedBy=${metrics.acceptedBy}`
                ].join("\n")
              )}</pre>`
            : ""
        }
      </div>
    `;
  }

  private renderCalibrationDialog(): void {
    const host = this.root.querySelector<HTMLElement>("[data-calibration-dialog]");
    if (!host) return;
    if (!this.calibrationDialogOpen) {
      host.innerHTML = "";
      return;
    }

    const running = Boolean(this.calibrationRun);
    const metrics = this.calibrationRun ? calibrationMetrics(this.calibrationRun.samples) : this.calibrationResult?.metrics;
    const progress = this.calibrationProgress(metrics);
    const logs = this.calibrationResult?.logs || this.calibrationLogs;
    host.innerHTML = `
      <div class="calibration-dialog-backdrop" role="dialog" aria-modal="true" aria-label="오탐 보정">
        <div class="calibration-dialog">
          <div class="calibration-dialog-header">
            <div>
              <strong>오탐 보정</strong>
              <span>${running ? "보정 데이터를 수집하고 있습니다." : "보정 작업이 종료되었습니다."}</span>
            </div>
            <button class="calibration-dialog-close" type="button" data-calibration-dialog-close>×</button>
          </div>
          <div class="calibration-dialog-body">
            ${this.calibrationResult ? this.calibrationDialogResultMarkup(this.calibrationResult) : ""}
            <div class="calibration-progress">
              <div class="calibration-progress-header">
                <span>${escapeHtml(this.calibrationProgressText(metrics))}</span>
                <strong>${progress}%</strong>
              </div>
              <div class="calibration-progress-track">
                <div class="calibration-progress-fill" style="width:${progress}%"></div>
              </div>
            </div>
            <div class="calibration-work">
              <strong>작업 내역</strong>
              <ul>
                ${this.calibrationWorkItems(metrics).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
              </ul>
            </div>
            <div class="calibration-log">
              <strong>${this.calibrationResult?.tone === "error" ? "오류 로그" : "디버그 로그"}</strong>
              <pre>${escapeHtml(logs.length ? logs.join("\n") : "아직 기록된 로그가 없습니다.")}</pre>
            </div>
            <div class="calibration-dialog-actions">
              ${
                running
                  ? `<button class="calibration-button" type="button" data-calibration-stop>보정 중지</button>`
                  : `<button type="button" data-calibration-dialog-close>닫기</button>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
    host.querySelectorAll<HTMLButtonElement>("[data-calibration-dialog-close]").forEach((button) => {
      button.addEventListener("click", () => {
        this.calibrationDialogOpen = false;
        this.renderCalibrationDialog();
      });
    });
    host.querySelector<HTMLButtonElement>("[data-calibration-stop]")?.addEventListener("click", () => {
      this.stopCalibrationRun("사용자가 보정을 중지했습니다.", "warn");
    });
  }

  private renderProtectedZoneDialog(): void {
    const host = this.root.querySelector<HTMLElement>("[data-protected-zone-dialog]");
    if (!host) return;
    if (!this.protectedZoneDialogOpen) {
      host.innerHTML = "";
      return;
    }
    host.innerHTML = `
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
    `;
    host.querySelector<HTMLButtonElement>("[data-protected-zone-close]")?.addEventListener("click", () => {
      this.protectedZoneDialogOpen = false;
      this.renderProtectedZoneDialog();
    });
  }

  private renderShrinkConfirmDialog(): void {
    const host = this.root.querySelector<HTMLElement>("[data-shrink-confirm-dialog]");
    if (!host) return;
    if (!this.shrinkConfirmZoneId) {
      host.innerHTML = "";
      return;
    }
    host.innerHTML = `
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
    `;
    host.querySelector<HTMLButtonElement>("[data-shrink-confirm-no]")?.addEventListener("click", () => {
      this.shrinkConfirmZoneId = "";
      this.renderShrinkConfirmDialog();
    });
    host.querySelector<HTMLButtonElement>("[data-shrink-confirm-yes]")?.addEventListener("click", () => {
      void this.unlockCalibrationMinSize(this.shrinkConfirmZoneId);
    });
  }

  private async unlockCalibrationMinSize(zoneId: string): Promise<void> {
    if (!this.config || !zoneId) return;
    this.pushHistory();
    this.config = {
      ...this.config,
      calibrationZones: (this.config.calibrationZones || []).map((zone) =>
        zone.id === zoneId
          ? {
              ...zone,
              minSizeUnlocked: true
            }
          : zone
      )
    };
    this.shrinkConfirmZoneId = "";
    this.renderSidebar();
    this.render();
    await this.saveConfig();
  }

  private calibrationDialogResultMarkup(result: CalibrationResult): string {
    return `
      <div class="calibration-result ${result.tone}">
        <strong>${escapeHtml(result.title)}</strong>
        <p>${escapeHtml(result.reason)}</p>
        <p>생성된 보정 구역: ${result.createdCount}개</p>
        ${result.metrics && result.metrics.samples > 0 ? this.calibrationMetricsMarkup(result.metrics) : ""}
      </div>
    `;
  }

  private calibrationMetricsMarkup(metrics: CalibrationMetrics): string {
    return `<pre>${escapeHtml(
      [
        `samples=${metrics.samples}`,
        `usedSamples=${metrics.usedSamples}`,
        `outliers=${metrics.outliers}`,
        `score=${Math.round(metrics.score)}`,
        `width=${Math.round(metrics.width)}mm`,
        `height=${Math.round(metrics.height)}mm`,
        `area=${Math.round(metrics.area)}mm²`,
        `meanSpeed=${Math.round(metrics.meanSpeed)}mm/sample`,
        `acceptedBy=${metrics.acceptedBy}`
      ].join("\n")
    )}</pre>`;
  }

  private calibrationProgress(metrics?: CalibrationMetrics): number {
    if (this.calibrationResult) return 100;
    return Math.min(99, this.calibrationProgressFromMetrics(metrics));
  }

  private calibrationProgressFromMetrics(metrics?: CalibrationMetrics): number {
    if (!this.calibrationRun || !metrics) return metrics ? Math.round(clamp(metrics.score, 0, 100)) : 0;
    const elapsedProgress = clamp((Date.now() - this.calibrationRun.startedAt) / CALIBRATION_MAX_MS, 0, 1) * 100;
    const sampleProgress = clamp(metrics.samples / CALIBRATION_MIN_SAMPLES, 0, 1) * 45;
    const scoreProgress = clamp(metrics.score / CALIBRATION_SCORE_THRESHOLD, 0, 1) * 35;
    return Math.round(Math.max(elapsedProgress, sampleProgress + scoreProgress));
  }

  private calibrationProgressText(metrics?: CalibrationMetrics): string {
    if (this.calibrationResult) return this.calibrationResult.title;
    if (!this.calibrationRun) return "대기 중";
    if (!metrics || metrics.samples === 0) return "타겟 샘플 대기 중";
    if (metrics.samples < CALIBRATION_MIN_SAMPLES) return "샘플 수집 중";
    if (metrics.acceptedBy === "none") return "안정도 분석 중";
    return "보정 구역 생성 준비 완료";
  }

  private calibrationWorkItems(metrics?: CalibrationMetrics): string[] {
    if (!this.calibrationRun && !this.calibrationResult) return ["보정 작업 대기 중"];
    const elapsed = this.calibrationRun ? Math.floor((Date.now() - this.calibrationRun.startedAt) / 1000) : null;
    return [
      `PIR 상태: ${this.state?.pirMotion ? "움직임 감지됨" : "움직임 없음"}`,
      elapsed === null ? "수집 시간: 종료됨" : `수집 시간: ${elapsed}s / 최소 ${Math.ceil(CALIBRATION_MIN_MS / 1000)}s`,
      `샘플: ${metrics?.samples ?? 0} / 최소 ${CALIBRATION_MIN_SAMPLES}`,
      `사용 샘플: ${metrics?.usedSamples ?? 0}`,
      `제외 샘플: ${metrics?.outliers ?? 0}`,
      `안정도 점수: ${Math.round(metrics?.score ?? 0)} / ${CALIBRATION_SCORE_THRESHOLD}`,
      `판정 기준: ${metrics?.acceptedBy ?? "none"}`
    ];
  }

  private calibrationStatusText(count: number, pirBlocked: boolean): string {
    if (this.calibrationRun) {
      const elapsed = Math.floor((Date.now() - this.calibrationRun.startedAt) / 1000);
      return `안정도 분석 중입니다. ${elapsed}s / 최대 60s`;
    }
    if (pirBlocked) return "PIR 움직임이 감지되어 시작할 수 없습니다.";
    if (count >= MAX_CALIBRATION_ZONES) return "오탐 보정 구역은 최대 4개까지 저장할 수 있습니다.";
    return `저장된 보정 구역 ${count}/${MAX_CALIBRATION_ZONES}`;
  }

  private startCalibrationRun(): void {
    if (!this.config || !this.state) return;
    this.calibrationDialogOpen = true;
    this.calibrationLogs = [];
    this.calibrationResult = null;
    this.addCalibrationLog("보정 시작 요청");
    if (this.state.pirMotion) {
      this.finishCalibrationWithError("PIR 움직임이 감지되어 보정을 시작할 수 없습니다.");
      return;
    }
    const activeTargets = this.state.targets.filter((target) => target.active);
    if (activeTargets.length === 0) {
      this.finishCalibrationWithError("감지된 타겟이 없어 보정을 시작할 수 없습니다.");
      return;
    }
    if (activeTargets.length > 1) {
      this.finishCalibrationWithError("타겟이 여러 개 감지되어 보정을 시작할 수 없습니다.");
      return;
    }
    if ((this.config.calibrationZones || []).length >= MAX_CALIBRATION_ZONES) {
      this.finishCalibrationWithError("오탐 보정 구역은 최대 4개까지 저장할 수 있습니다.");
      return;
    }
    this.calibrationRun = { startedAt: Date.now(), samples: [] };
    this.addCalibrationLog("PIR 조건 통과");
    this.addCalibrationLog("타겟 샘플 수집 시작");
    this.showStatus("오탐 보정을 시작했습니다.", "warn");
    this.renderSidebar();
    this.renderCalibrationDialog();
  }

  private stopCalibrationRun(reason: string, tone: "warn" | "error"): void {
    const metrics = this.calibrationRun ? calibrationMetrics(this.calibrationRun.samples) : undefined;
    this.addCalibrationLog(reason);
    this.calibrationRun = null;
    this.calibrationResult = {
      title: tone === "error" ? "보정 실패" : "보정 중지",
      tone,
      createdCount: 0,
      reason,
      metrics,
      logs: [...this.calibrationLogs]
    };
    this.showStatus(reason, tone);
    this.renderSidebar();
    this.renderCalibrationDialog();
  }

  private updateCalibrationRun(): void {
    if (!this.calibrationRun || !this.state || !this.config) return;
    if (this.state.pirMotion) {
      this.stopCalibrationRun("PIR 움직임이 감지되어 보정을 취소했습니다.", "error");
      return;
    }

    const activeTargets = this.state.targets.filter((target) => target.active);
    if (activeTargets.length === 1) {
      const target = activeTargets[0];
      const last = this.calibrationRun.samples[this.calibrationRun.samples.length - 1];
      const speed = last ? Math.hypot(target.x - last.x, target.y - last.y) : 0;
      this.calibrationRun.samples.push({ x: target.x, y: target.y, speed });
      if (this.calibrationRun.samples.length === 1 || this.calibrationRun.samples.length % 10 === 0) {
        this.addCalibrationLog(`샘플 수집: ${this.calibrationRun.samples.length}개`);
      }
    } else if (activeTargets.length > 1) {
      this.stopCalibrationRun("타겟이 여러 개 감지되어 보정을 취소했습니다.", "error");
      return;
    }

    const elapsed = Date.now() - this.calibrationRun.startedAt;
    const metrics = calibrationMetrics(this.calibrationRun.samples);
    if (
      elapsed >= CALIBRATION_MIN_MS &&
      this.calibrationRun.samples.length >= CALIBRATION_MIN_SAMPLES &&
      metrics.acceptedBy !== "none"
    ) {
      this.addCalibrationLog(`보정 기준 통과: ${metrics.acceptedBy}`);
      void this.applyCalibrationRun(metrics);
      return;
    }
    if (elapsed >= CALIBRATION_MAX_MS) {
      this.stopCalibrationRun("반복 감지 영역이 너무 넓거나 불안정해 보정을 만들지 않았습니다.", "error");
    }
  }

  private async applyCalibrationRun(metrics: CalibrationMetrics): Promise<void> {
    if (!this.config || !this.calibrationRun) return;
    const zone = calibrationZoneFromSamples(this.calibrationRun.samples, this.config.calibrationZones || []);
    this.calibrationRun = null;
    if (!zone) {
      this.addCalibrationLog("오탐 보정 후보 구역 생성 실패");
      this.calibrationResult = {
        title: "보정 실패",
        tone: "error",
        createdCount: 0,
        reason: "오탐 보정 후보를 만들지 못했습니다.",
        metrics,
        logs: [...this.calibrationLogs]
      };
      this.showStatus("오탐 보정 후보를 만들지 못했습니다.", "error");
      this.renderSidebar();
      this.renderCalibrationDialog();
      return;
    }
    this.pushHistory();
    this.config = {
      ...this.config,
      calibrationZones: [...(this.config.calibrationZones || []), zone]
    };
    this.calibrationResult = {
      title: "보정 완료",
      tone: "ok",
      createdCount: 1,
      reason: metrics.acceptedBy === "score" ? "안정도 점수 기준을 통과했습니다." : "반복 감지 영역 기준을 통과했습니다.",
      metrics,
      logs: [...this.calibrationLogs, `${zone.id} 구역 생성`]
    };
    this.renderSidebar();
    this.render();
    await this.saveConfig();
    this.showStatus(`오탐 보정 구역을 저장했습니다. 안정도 ${Math.round(metrics.score)}점`, "ok");
    this.renderCalibrationDialog();
  }

  private async deleteCalibrationZone(zoneId: string): Promise<void> {
    if (!this.config) return;
    this.pushHistory();
    this.config = {
      ...this.config,
      calibrationZones: (this.config.calibrationZones || []).filter((zone) => zone.id !== zoneId)
    };
    this.calibrationResult = null;
    this.renderSidebar();
    this.render();
    await this.saveConfig();
  }

  private async setCalibrationZoneType(zoneId: string, type: Extract<WebZoneType, "filter" | "reduced" | "disabled">): Promise<void> {
    if (!this.config) return;
    this.pushHistory();
    this.config = {
      ...this.config,
      calibrationZones: (this.config.calibrationZones || []).map((zone) => (zone.id === zoneId ? { ...zone, type } : zone))
    };
    this.calibrationResult = null;
    this.renderSidebar();
    this.render();
    await this.saveConfig();
  }
  private finishCalibrationWithError(reason: string): void {
    this.addCalibrationLog(reason);
    this.calibrationRun = null;
    this.calibrationResult = {
      title: "보정 실패",
      tone: "error",
      createdCount: 0,
      reason,
      logs: [...this.calibrationLogs]
    };
    this.showStatus(reason, "error");
    this.renderSidebar();
    this.renderCalibrationDialog();
  }

  private addCalibrationLog(message: string): void {
    const time = new Date().toLocaleTimeString();
    this.calibrationLogs = [...this.calibrationLogs, `[${time}] ${message}`].slice(-40);
  }

  private attachSceneEvents(): void {
    this.root.querySelector<SVGSVGElement>("[data-radar-scene] svg")?.addEventListener("click", (event) => {
      this.clearSelectionFromEmptyRadarClick(event);
    });
    this.root.querySelectorAll<SVGElement>("[data-zone-drag]").forEach((element) => {
      element.addEventListener("pointerdown", (event) => this.beginZoneDrag(event));
    });
    this.root.querySelectorAll<SVGElement>("[data-zone-edge]").forEach((element) => {
      element.addEventListener("dblclick", (event) => this.insertPointOnEdge(event));
    });
    this.root.querySelectorAll<SVGElement>("[data-zone-point]").forEach((element) => {
      element.addEventListener("dblclick", (event) => this.deletePointFromEvent(event));
    });
    this.root.querySelectorAll<SVGElement>("[data-zone-select]").forEach((element) => {
      element.addEventListener("click", () => {
        this.setSelectedZone(element.dataset.zoneSelect || this.selectedZoneId);
        this.renderSidebar();
        this.render();
      });
    });
    this.root.querySelectorAll<SVGElement>("[data-calibration-info]").forEach((element) => {
      element.addEventListener("click", () => {
        this.protectedZoneDialogOpen = true;
        this.renderProtectedZoneDialog();
      });
    });
  }

  private clearSelectionFromEmptyRadarClick(event: MouseEvent): void {
    const target = event.target as SVGElement | null;
    if (!target) return;
    if (target.closest("[data-zone-drag], [data-zone-edge], [data-zone-point], [data-calibration-info], .target")) return;
    if (!this.selectedZoneId && this.selectedPointIndex < 0) return;
    this.setSelectedZone("");
    this.renderSidebar();
    this.render();
  }

  private readonly handleDocumentPointerDown = (event: PointerEvent): void => {
    if (!this.selectedZoneId && this.selectedPointIndex < 0) return;
    const target = event.target as Element | null;
    if (!target) return;
    if (this.isSelectionPreservingTarget(target)) return;
    this.clearSelection();
  };

  private isSelectionPreservingTarget(target: Element): boolean {
    return Boolean(
      target.closest(
        [
          "button",
          "input",
          "textarea",
          "select",
          "option",
          "a",
          "[data-zone-id]",
          "[data-calibration-select]",
          "[data-zone-drag]",
          "[data-zone-edge]",
          "[data-zone-point]",
          "[data-zone-select]",
          "[data-calibration-info]",
          "[data-calibration-dialog]",
          "[data-protected-zone-dialog]",
          "[data-shrink-confirm-dialog]",
          ".target"
        ].join(", ")
      )
    );
  }

  private clearSelection(): void {
    this.setSelectedZone("");
    this.renderSidebar();
    this.render();
  }

  private beginZoneDrag(event: PointerEvent): void {
    if (!this.config) return;
    const target = event.target as SVGElement | null;
    const zoneId = target?.dataset.zoneId;
    const mode = target?.dataset.zoneDrag as "move" | "resize" | undefined;
    if (!target || !zoneId || !mode) return;
    const source = isCalibrationZoneId(zoneId) ? "calibration" : "zone";
    if (source === "calibration" && mode !== "resize") return;
    const zone =
      source === "calibration"
        ? (this.config.calibrationZones || []).find((item) => item.id === zoneId)
        : this.displayZones().find((item) => item.id === zoneId);
    const svg = target.closest("svg") as SVGSVGElement | null;
    if (!zone || !svg) return;

    event.preventDefault();
    this.pushHistory();
    target.setPointerCapture?.(event.pointerId);
    this.setSelectedZone(zoneId, false);
    this.selectedPointIndex = target.dataset.zonePoint ? Number(target.dataset.zonePoint) : -1;
    this.drag = {
      zoneId,
      source,
      mode,
      pointIndex: target.dataset.zonePoint ? Number(target.dataset.zonePoint) : undefined,
      pointerId: event.pointerId,
      startPoint: this.scene.pointFromEvent(event, svg),
      startZone: structuredClone(zone)
    };

    window.addEventListener("pointermove", this.handleZoneDragMove);
    window.addEventListener("pointerup", this.handleZoneDragEnd);
    window.addEventListener("pointercancel", this.handleZoneDragEnd);
  }

  private readonly handleZoneDragMove = (event: PointerEvent): void => {
    if (!this.drag || !this.config || event.pointerId !== this.drag.pointerId) return;
    const svg = this.root.querySelector("[data-radar-scene] svg") as SVGSVGElement | null;
    if (!svg) return;
    event.preventDefault();
    const zoneId = this.drag.zoneId;

    const point = this.scene.pointFromEvent(event, svg);
    const nextZone =
      this.drag.source === "calibration"
        ? resizeCalibrationZone(this.drag.startZone, this.drag.pointIndex, point, Boolean(this.drag.startZone.minSizeUnlocked))
        : this.drag.mode === "move"
        ? moveZone(this.drag.startZone, this.drag.startPoint, point)
        : updateZonePoint(this.drag.startZone, this.drag.pointIndex, point);

    if (
      this.drag.source === "calibration" &&
      !this.drag.startZone.minSizeUnlocked &&
      calibrationResizeShrinks(this.drag.startZone, this.drag.pointIndex, point)
    ) {
      if (this.shrinkWarningShownZoneId !== zoneId) {
        this.shrinkWarningShownZoneId = zoneId;
        this.shrinkConfirmZoneId = zoneId;
        this.renderShrinkConfirmDialog();
      }
    }

    this.config =
      this.drag.source === "calibration"
        ? {
            ...this.config,
            calibrationZones: (this.config.calibrationZones || []).map((zone) =>
              zone.id === zoneId ? { ...clampZoneToHardwareBounds(nextZone), placeholder: false } : zone
            )
          }
        : {
            ...this.config,
            zones: upsertZone(this.config.zones, { ...clampZoneToHardwareBounds(nextZone), placeholder: false })
          };
    if (this.state) {
      this.scene.render(this.state, this.displayConfig(), this.selectedZoneId, true, this.selectedPointIndex);
      this.attachSceneEvents();
    }
  };

  private readonly handleZoneDragEnd = (event: PointerEvent): void => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    event.preventDefault();
    this.drag = null;
    window.removeEventListener("pointermove", this.handleZoneDragMove);
    window.removeEventListener("pointerup", this.handleZoneDragEnd);
    window.removeEventListener("pointercancel", this.handleZoneDragEnd);
    this.renderSidebar();
    this.render();
    void this.saveConfig();
  };

  private async saveConfig(): Promise<void> {
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (!this.config) return;
    this.saveQueued = true;
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      void this.flushSave();
    }, SAVE_DEBOUNCE_MS);
    this.showStatus("저장 대기 중", "warn");
  }

  private async flushSave(): Promise<void> {
    if (!this.config) return;
    if (this.saveInFlight) {
      this.scheduleSave();
      return;
    }
    this.saveInFlight = true;
    this.saveQueued = false;
    try {
      await this.api.saveConfig(stripPlaceholders(this.config));
      this.renderSidebar();
      this.showStatus("저장됨", "ok");
    } catch (error) {
      const message = `저장하지 못했습니다: ${error instanceof Error ? error.message : String(error)}`;
      this.showStatus(message, "error");
    } finally {
      this.saveInFlight = false;
      if (this.saveQueued) {
        this.scheduleSave();
      }
    }
  }

  private insertPointOnEdge(event: MouseEvent): void {
    if (!this.config) return;
    const target = event.target as SVGElement | null;
    const zoneId = target?.dataset.zoneId;
    const edgeIndex = Number(target?.dataset.zoneEdge);
    const svg = target?.closest("svg") as SVGSVGElement | null;
    if (!target || !zoneId || !Number.isInteger(edgeIndex) || !svg) return;

    event.preventDefault();
    const point = this.scene.pointFromEvent(event as unknown as PointerEvent, svg);
    this.setSelectedZone(zoneId, false);
    this.selectedPointIndex = edgeIndex + 1;
    const zone = this.displayZones().find((item) => item.id === zoneId);
    if (!zone) return;
    if (zone.points.length >= MAX_ZONE_POINTS) {
      this.showStatus("꼭짓점은 zone당 최대 8개까지 추가할 수 있습니다.", "error");
      return;
    }
    this.pushHistory();
    this.config = {
      ...this.config,
      zones: upsertZone(this.config.zones, { ...clampZoneToHardwareBounds(insertZonePoint(zone, edgeIndex, point)), placeholder: false })
    };
    this.renderSidebar();
    this.render();
    void this.saveConfig();
  }

  private deletePointFromEvent(event: MouseEvent): void {
    const target = event.target as SVGElement | null;
    const zoneId = target?.dataset.zoneId;
    const pointIndex = Number(target?.dataset.zonePoint);
    if (!zoneId || !Number.isInteger(pointIndex)) return;
    if (isCalibrationZoneId(zoneId)) return;
    event.preventDefault();
    this.setSelectedZone(zoneId, false);
    this.selectedPointIndex = pointIndex;
    void this.deleteSelectedPoint();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    const tag = document.activeElement?.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    event.preventDefault();
    if (this.selectedCalibrationZone()) {
      void this.deleteSelectedItem();
      return;
    }
    if (this.selectedPointIndex >= 0) {
      void this.deleteSelectedPoint();
      return;
    }
    void this.deleteSelectedItem();
  };

  private async deleteSelectedPoint(): Promise<void> {
    if (!this.config || this.selectedPointIndex < 0) return;
    const zone = this.selectedZone();
    if (!zone || zone.shape !== "polygon" || zone.points.length <= 3) {
      this.showStatus("다각형은 꼭짓점 3개 이상이 필요합니다.", "warn");
      return;
    }

    this.pushHistory();
    const nextIndex = Math.min(this.selectedPointIndex, zone.points.length - 2);
    this.config = {
      ...this.config,
      zones: this.config.zones.map((item) =>
        item.id === zone.id
          ? {
              ...item,
              points: item.points.filter((_, index) => index !== this.selectedPointIndex)
            }
          : item
      )
    };
    this.selectedPointIndex = nextIndex;
    this.renderSidebar();
    this.render();
    await this.saveConfig();
  }

  private selectedZone(): WebZone | null {
    if (!this.config) return null;
    return this.config.zones.find((zone) => zone.id === this.selectedZoneId) || null;
  }

  private selectedCalibrationZone(): WebZone | null {
    if (!this.config) return null;
    return (this.config.calibrationZones || []).find((zone) => zone.id === this.selectedZoneId) || null;
  }

  private selectedDisplayZone(): WebZone | null {
    return this.displayZones().find((zone) => zone.id === this.selectedZoneId) || null;
  }

  private displayConfig(): WebDeviceConfig {
    if (!this.config) {
      return { version: 1, zones: [], calibrationZones: [] };
    }
    return {
      ...this.config,
      zones: this.displayZones(),
      calibrationZones: this.config.calibrationZones || []
    };
  }

  private displayZones(): WebZone[] {
    if (!this.config) return [];
    return this.config.zones.filter((zone) => !isEmptyZone(zone)).slice(0, MAX_SOFTWARE_ZONES);
  }

  private async addZone(): Promise<void> {
    if (!this.config) return;
    const zones = this.displayZones();
    if (zones.length >= MAX_SOFTWARE_ZONES) {
      this.showStatus("감지/제외 구역은 최대 6개까지 만들 수 있습니다.", "warn");
      return;
    }
    const nextId = nextZoneId(this.config.zones);
    const zone: WebZone = {
      id: nextId,
      name: `Zone ${nextId.replace("zone_", "")}`,
      type: "detection",
      shape: "rect",
      points: defaultZonePoints(zones.length)
    };
    this.pushHistory();
    this.config = {
      ...this.config,
      zones: upsertZone(this.config.zones, zone)
    };
    this.setSelectedZone(nextId);
    this.renderSidebar();
    this.render();
    await this.saveConfig();
  }

  private async deleteSelectedZone(): Promise<void> {
    if (!this.config) return;
    const zone = this.selectedZone();
    if (!zone) return;

    this.pushHistory();
    const nextZones = this.config.zones.filter((item) => item.id !== zone.id);
    this.config = {
      ...this.config,
      zones: nextZones
    };
    this.setSelectedZone(nextZones[0]?.id || "");
    this.showStatus("Zone을 삭제했습니다.", "warn");

    this.selectedPointIndex = -1;
    this.renderSidebar();
    this.render();
    await this.saveConfig();
  }

  private async setSelectedZoneType(type: WebZoneType): Promise<void> {
    if (!this.config || !this.selectedZone()) return;
    this.pushHistory();
    this.config = {
      ...this.config,
      zones: this.config.zones.map((zone) => (zone.id === this.selectedZoneId ? { ...zone, type } : zone))
    };
    this.renderSidebar();
    this.render();
    await this.saveConfig();
  }

  private setSelectedZoneNameDraft(name: string): void {
    if (!this.config || !this.selectedZone()) return;
    if (!this.nameEditHistoryCaptured) {
      this.pushHistory();
      this.nameEditHistoryCaptured = true;
    }
    const normalizedName = limitZoneName(name);
    this.config = {
      ...this.config,
      zones: this.config.zones.map((zone) => (zone.id === this.selectedZoneId ? { ...zone, name: normalizedName } : zone))
    };
    if (this.state) {
      this.scene.render(this.state, this.displayConfig(), this.selectedZoneId, true, this.selectedPointIndex);
      this.attachSceneEvents();
    }
  }

  private async commitSelectedZoneName(_name: string): Promise<void> {
    if (!this.config) return;
    const zone = this.selectedZone();
    if (!zone) return;

    this.nameEditHistoryCaptured = false;
    await this.saveConfig();
  }

  private async deleteSelectedItem(): Promise<void> {
    if (this.selectedCalibrationZone()) {
      await this.deleteCalibrationZone(this.selectedZoneId);
      return;
    }
    await this.deleteSelectedZone();
  }

  private async convertSelectedZoneToRect(): Promise<void> {
    if (!this.config) return;
    const zone = this.selectedZone();
    if (!zone || zone.points.length < 3) return;
    this.pushHistory();
    const xs = zone.points.map(([x]) => x);
    const ys = zone.points.map(([, y]) => y);
    this.config = {
      ...this.config,
      zones: this.config.zones.map((item) =>
        item.id === zone.id
          ? {
              ...item,
              shape: "rect",
              points: rectPoints(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys))
            }
          : item
      )
    };
    this.selectedPointIndex = -1;
    this.renderSidebar();
    this.render();
    await this.saveConfig();
  }

  private async undo(): Promise<void> {
    if (!this.config || this.historyPast.length === 0) return;
    const previous = this.historyPast[this.historyPast.length - 1];
    this.historyPast = this.historyPast.slice(0, -1);
    this.historyFuture = [structuredClone(this.config), ...this.historyFuture].slice(0, 30);
    this.config = structuredClone(previous);
    this.setSelectedZone(this.config.zones[0]?.id || this.config.calibrationZones?.[0]?.id || "");
    this.renderSidebar();
    this.render();
    await this.saveConfig();
  }

  private async redo(): Promise<void> {
    if (!this.config || this.historyFuture.length === 0) return;
    const next = this.historyFuture[0];
    this.historyFuture = this.historyFuture.slice(1);
    this.historyPast = [...this.historyPast, structuredClone(this.config)].slice(-30);
    this.config = structuredClone(next);
    this.setSelectedZone(this.config.zones[0]?.id || this.config.calibrationZones?.[0]?.id || "");
    this.renderSidebar();
    this.render();
    await this.saveConfig();
  }

  private pushHistory(): void {
    if (!this.config) return;
    this.historyPast = [...this.historyPast, structuredClone(this.config)].slice(-30);
    this.historyFuture = [];
  }

  private showStatus(message: string, tone: "ok" | "warn" | "error"): void {
    const status = this.root.querySelector<HTMLElement>("[data-status]");
    if (status) {
      status.textContent = message;
      status.dataset.tone = tone;
    }
    if (tone !== "error") return;
    const toast = this.root.querySelector<HTMLElement>("[data-toast]");
    if (!toast) return;
    window.clearTimeout(this.toastTimer);
    toast.textContent = message;
    toast.dataset.visible = "true";
    this.toastTimer = window.setTimeout(() => {
      toast.dataset.visible = "false";
      toast.textContent = "";
    }, 5000);
  }

  private setSelectedZone(zoneId: string, resetPoint = true): void {
    if (this.selectedZoneId !== zoneId) {
      this.shrinkWarningShownZoneId = "";
    }
    this.selectedZoneId = zoneId;
    if (resetPoint) {
      this.selectedPointIndex = -1;
    }
  }
}

function moveZone(zone: WebZone, startPoint: RadarScreenPoint, currentPoint: RadarScreenPoint): WebZone {
  const dx = currentPoint.x - startPoint.x;
  const dy = currentPoint.y - startPoint.y;
  return clampZoneToHardwareBounds({
    ...zone,
    points: zone.points.map(([x, y]): [number, number] => [Math.round(x + dx), Math.round(y + dy)])
  });
}

function updateZonePoint(zone: WebZone, pointIndex: number | undefined, point: RadarScreenPoint): WebZone {
  if (pointIndex === undefined || pointIndex < 0 || pointIndex >= zone.points.length) return zone;
  if (zone.shape === "rect") {
    return resizeRectZone(zone, pointIndex, point);
  }
  return clampZoneToHardwareBounds({
    ...zone,
    points: zone.points.map((existing, index): [number, number] => (index === pointIndex ? [point.x, point.y] : existing))
  });
}

function resizeRectZone(zone: WebZone, pointIndex: number, point: RadarScreenPoint): WebZone {
  if (zone.shape !== "rect" || zone.points.length < 4) return zone;
  const xs = zone.points.map(([x]) => x);
  const ys = zone.points.map(([, y]) => y);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);

  if (pointIndex === 0) {
    minX = point.x;
    minY = point.y;
  } else if (pointIndex === 1) {
    maxX = point.x;
    minY = point.y;
  } else if (pointIndex === 2) {
    maxX = point.x;
    maxY = point.y;
  } else if (pointIndex === 3) {
    minX = point.x;
    maxY = point.y;
  }

  return clampZoneToHardwareBounds({
    ...zone,
    points: rectPoints(minX, minY, maxX, maxY)
  });
}

function resizeCalibrationZone(zone: WebZone, pointIndex: number | undefined, point: RadarScreenPoint, allowShrink: boolean): WebZone {
  if (pointIndex === undefined || pointIndex < 0 || zone.points.length < 4) return zone;
  const xs = zone.points.map(([x]) => x);
  const ys = zone.points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  let nextMinX = minX;
  let nextMaxX = maxX;
  let nextMinY = minY;
  let nextMaxY = maxY;

  if (pointIndex === 0) {
    nextMinX = allowShrink ? point.x : Math.min(minX, point.x);
    nextMinY = allowShrink ? point.y : Math.min(minY, point.y);
  } else if (pointIndex === 1) {
    nextMaxX = allowShrink ? point.x : Math.max(maxX, point.x);
    nextMinY = allowShrink ? point.y : Math.min(minY, point.y);
  } else if (pointIndex === 2) {
    nextMaxX = allowShrink ? point.x : Math.max(maxX, point.x);
    nextMaxY = allowShrink ? point.y : Math.max(maxY, point.y);
  } else if (pointIndex === 3) {
    nextMinX = allowShrink ? point.x : Math.min(minX, point.x);
    nextMaxY = allowShrink ? point.y : Math.max(maxY, point.y);
  }

  return clampZoneToHardwareBounds({
    ...zone,
    shape: "rect",
    points: rectPoints(nextMinX, nextMinY, nextMaxX, nextMaxY)
  });
}

function calibrationResizeShrinks(zone: WebZone, pointIndex: number | undefined, point: RadarScreenPoint): boolean {
  if (pointIndex === undefined || pointIndex < 0 || zone.points.length < 4) return false;
  const current = zoneBounds(zone);
  const resized = zoneBounds(resizeCalibrationZone(zone, pointIndex, point, true));
  return resized.width < current.width || resized.height < current.height;
}

function zoneBounds(zone: WebZone): { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number } {
  const xs = zone.points.map(([x]) => x);
  const ys = zone.points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function insertZonePoint(zone: WebZone, edgeIndex: number, point: RadarScreenPoint): WebZone {
  const insertIndex = Math.min(edgeIndex + 1, zone.points.length);
  return clampZoneToHardwareBounds({
    ...zone,
    shape: "polygon",
    points: [
      ...zone.points.slice(0, insertIndex),
      [point.x, point.y],
      ...zone.points.slice(insertIndex)
    ]
  });
}

function clampZoneToHardwareBounds(zone: WebZone): WebZone {
  if (zone.points.length === 0) return zone;
  const minX = Math.min(...zone.points.map(([x]) => x));
  const maxX = Math.max(...zone.points.map(([x]) => x));
  const minY = Math.min(...zone.points.map(([, y]) => y));
  const maxY = Math.max(...zone.points.map(([, y]) => y));
  const shiftX = clampShift(minX, maxX, LD2450_ZONE_MIN_X_MM, LD2450_ZONE_MAX_X_MM);
  const shiftY = clampShift(minY, maxY, LD2450_ZONE_MIN_Y_MM, LD2450_ZONE_MAX_Y_MM);

  return {
    ...zone,
    points: zone.points.map(([x, y]): [number, number] => [
      clamp(Math.round(x + shiftX), LD2450_ZONE_MIN_X_MM, LD2450_ZONE_MAX_X_MM),
      clamp(Math.round(y + shiftY), LD2450_ZONE_MIN_Y_MM, LD2450_ZONE_MAX_Y_MM)
    ])
  };
}

function clampShift(minValue: number, maxValue: number, minLimit: number, maxLimit: number): number {
  if (minValue < minLimit) return minLimit - minValue;
  if (maxValue > maxLimit) return maxLimit - maxValue;
  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function zoneSlotLabel(zoneId: string): string {
  const match = /^zone_(\d+)$/.exec(zoneId);
  return match ? `Zone ${match[1]}` : zoneId;
}

function isCalibrationZoneId(zoneId: string): boolean {
  return /^calibration_\d+$/.test(zoneId);
}

function zoneDisplayName(zone: WebZone): string {
  return zone.name || zoneSlotLabel(zone.id);
}

function limitZoneName(name: string): string {
  return Array.from(name.trim()).slice(0, MAX_ZONE_NAME_LENGTH).join("");
}

function calibrationScore(samples: Array<{ x: number; y: number; speed: number }>): number {
  if (samples.length < 2) return 0;
  const center = sampleCenter(samples);
  const distances = samples.map((sample) => Math.hypot(sample.x - center.x, sample.y - center.y));
  const meanSpread = average(distances);
  const maxSpread = Math.max(...distances);
  const meanSpeed = average(samples.map((sample) => sample.speed));
  const spreadScore = clamp(45 - meanSpread / 12, 0, 45);
  const maxSpreadScore = clamp(25 - maxSpread / 28, 0, 25);
  const speedScore = clamp(20 - meanSpeed / 18, 0, 20);
  const sampleScore = clamp(samples.length / CALIBRATION_MIN_SAMPLES, 0, 1) * 10;
  return spreadScore + maxSpreadScore + speedScore + sampleScore;
}

function calibrationMetrics(samples: Array<{ x: number; y: number; speed: number }>): CalibrationMetrics {
  if (samples.length === 0) {
    return {
      samples: 0,
      usedSamples: 0,
      outliers: 0,
      score: 0,
      width: 0,
      height: 0,
      area: 0,
      meanSpeed: 0,
      acceptedBy: "none"
    };
  }
  const score = calibrationScore(samples);
  const prepared = prepareCalibrationSamples(samples);
  const bounds = percentileBounds(prepared.usedSamples);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const area = width * height;
  const meanSpeed = average(samples.map((sample) => sample.speed));
  let acceptedBy: CalibrationMetrics["acceptedBy"] = "none";
  if (samples.length >= CALIBRATION_MIN_SAMPLES && score >= CALIBRATION_SCORE_THRESHOLD) {
    acceptedBy = "score";
  } else if (
    samples.length >= CALIBRATION_MIN_SAMPLES &&
    width <= CALIBRATION_MAX_CLUSTER_WIDTH_MM &&
    height <= CALIBRATION_MAX_CLUSTER_HEIGHT_MM &&
    area <= CALIBRATION_MAX_CLUSTER_AREA_MM2
  ) {
    acceptedBy = "area";
  }
  return {
    samples: samples.length,
    usedSamples: prepared.usedSamples.length,
    outliers: prepared.outliers,
    score,
    width,
    height,
    area,
    meanSpeed,
    acceptedBy
  };
}

function calibrationZoneFromSamples(
  samples: Array<{ x: number; y: number; speed: number }>,
  existingZones: WebZone[]
): WebZone | null {
  if (samples.length < CALIBRATION_MIN_SAMPLES) return null;
  const prepared = prepareCalibrationSamples(samples);
  if (prepared.usedSamples.length < CALIBRATION_MIN_SAMPLES) return null;
  const center = sampleCenter(prepared.usedSamples);
  const bounds = percentileBounds(prepared.usedSamples);
  const spreadX = bounds.maxX - bounds.minX;
  const spreadY = bounds.maxY - bounds.minY;
  const width = clamp(Math.max(CALIBRATION_MIN_BOX_SIZE_MM, spreadX + CALIBRATION_BOX_MARGIN_MM), CALIBRATION_MIN_BOX_SIZE_MM, CALIBRATION_MAX_CLUSTER_WIDTH_MM);
  const height = clamp(Math.max(CALIBRATION_MIN_BOX_SIZE_MM, spreadY + CALIBRATION_BOX_MARGIN_MM), CALIBRATION_MIN_BOX_SIZE_MM, CALIBRATION_MAX_CLUSTER_HEIGHT_MM);
  const id = nextCalibrationZoneId(existingZones);
  if (!id) return null;
  return clampZoneToHardwareBounds({
    id,
    name: `보정 ${id.replace("calibration_", "")}`,
    type: "filter",
    shape: "rect",
    points: rectPoints(center.x - width / 2, center.y - height / 2, center.x + width / 2, center.y + height / 2)
  });
}

function sampleCenter(samples: Array<{ x: number; y: number }>): { x: number; y: number } {
  return {
    x: Math.round(average(samples.map((sample) => sample.x))),
    y: Math.round(average(samples.map((sample) => sample.y)))
  };
}

function prepareCalibrationSamples<T extends { x: number; y: number }>(samples: T[]): { usedSamples: T[]; outliers: number } {
  if (samples.length < 3) return { usedSamples: samples, outliers: 0 };
  const center = sampleMedianCenter(samples);
  const usedSamples = samples.filter((sample) => Math.hypot(sample.x - center.x, sample.y - center.y) <= CALIBRATION_OUTLIER_DISTANCE_MM);
  return {
    usedSamples: usedSamples.length >= CALIBRATION_MIN_SAMPLES ? usedSamples : samples,
    outliers: usedSamples.length >= CALIBRATION_MIN_SAMPLES ? samples.length - usedSamples.length : 0
  };
}

function sampleMedianCenter(samples: Array<{ x: number; y: number }>): { x: number; y: number } {
  return {
    x: percentile(samples.map((sample) => sample.x), 0.5),
    y: percentile(samples.map((sample) => sample.y), 0.5)
  };
}

function percentileBounds(samples: Array<{ x: number; y: number }>): { minX: number; maxX: number; minY: number; maxY: number } {
  if (samples.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  return {
    minX: percentile(samples.map((sample) => sample.x), CALIBRATION_PERCENTILE_LOW),
    maxX: percentile(samples.map((sample) => sample.x), CALIBRATION_PERCENTILE_HIGH),
    minY: percentile(samples.map((sample) => sample.y), CALIBRATION_PERCENTILE_LOW),
    maxY: percentile(samples.map((sample) => sample.y), CALIBRATION_PERCENTILE_HIGH)
  };
}

function percentile(values: number[], ratio: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp(Math.round((sorted.length - 1) * ratio), 0, sorted.length - 1);
  return sorted[index] ?? 0;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function nextCalibrationZoneId(zones: WebZone[]): string | null {
  const used = new Set(zones.map((zone) => zone.id));
  for (let index = 1; index <= MAX_CALIBRATION_ZONES; index += 1) {
    const id = `calibration_${index}`;
    if (!used.has(id)) return id;
  }
  return null;
}

function normalizeSoftwareConfig(config: WebDeviceConfig): WebDeviceConfig {
  return {
    ...config,
    zones: config.zones
      .filter((zone) => !isEmptyZone(zone))
      .slice(0, MAX_SOFTWARE_ZONES)
      .map((zone) => {
        const { placeholder: _placeholder, ...rest } = zone;
        return clampZoneToHardwareBounds(rest);
      }),
    calibrationZones: (config.calibrationZones || [])
      .filter((zone) => !isEmptyZone(zone))
      .slice(0, MAX_CALIBRATION_ZONES)
      .map((zone) => clampZoneToHardwareBounds({ ...zone, type: calibrationType(zone.type) }))
  };
}

function stripPlaceholders(config: WebDeviceConfig): WebDeviceConfig {
  return {
    ...config,
    zones: config.zones
      .filter((zone) => !isEmptyZone(zone))
      .slice(0, MAX_SOFTWARE_ZONES)
      .map((zone) => {
        const { placeholder: _placeholder, ...rest } = zone;
        return clampZoneToHardwareBounds(rest);
      }),
    calibrationZones: (config.calibrationZones || [])
      .filter((zone) => !isEmptyZone(zone))
      .slice(0, MAX_CALIBRATION_ZONES)
      .map((zone) => clampZoneToHardwareBounds({ ...zone, type: calibrationType(zone.type) }))
  };
}

function isEmptyZone(zone: WebZone): boolean {
  return zone.points.length === 0 || zone.points.every(([x, y]) => x === 0 && y === 0);
}

function upsertZone(zones: WebZone[], nextZone: WebZone): WebZone[] {
  const found = zones.some((zone) => zone.id === nextZone.id);
  const next = found ? zones.map((zone) => (zone.id === nextZone.id ? nextZone : zone)) : [...zones, nextZone];
  return next.sort((a, b) => zoneOrder(a.id) - zoneOrder(b.id)).slice(0, MAX_SOFTWARE_ZONES);
}

function nextZoneId(zones: WebZone[]): string {
  const used = new Set(zones.map((zone) => zone.id));
  for (let index = 1; index <= MAX_SOFTWARE_ZONES; index += 1) {
    const id = `zone_${index}`;
    if (!used.has(id)) return id;
  }
  return `zone_${zones.length + 1}`;
}

function defaultZonePoints(index: number): Array<[number, number]> {
  const offset = Math.min(index, MAX_SOFTWARE_ZONES - 1) * 180;
  return rectPoints(-900 + offset, 1000 + offset, 900 + offset, 2400 + offset);
}

function zoneOrder(zoneId: string): number {
  const match = /^(?:zone|calibration)_(\d+)$/.exec(zoneId);
  return match ? Number(match[1]) : 99;
}

function rectPoints(x1: number, y1: number, x2: number, y2: number): Array<[number, number]> {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY]
  ];
}

function shellMarkup(): string {
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
