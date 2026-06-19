import { DEFAULT_CARD_CONFIG, zoneLabel } from "../core/defaults";
import { escapeHtml } from "../core/html";
import { LD2450_FOV_DEGREES, radarViewportRangeX, toRadarPoint, toScreenPoint } from "../core/radar-math";
import { renderGrid, renderTargets, renderZoneRects } from "../core/radar-svg";
import { TargetStore } from "../core/target-store";
import type {
  RadarCardConfig,
  RadarScreenPoint,
  RadarViewport,
  RadarZoneDisplay,
  RadarZoneId,
  RadarZoneRect,
  ResolvedRadarTarget
} from "../core/types";
import { CARD_STYLES } from "./card-styles";
import type { HomeAssistantLike, RadarZoneCardElement } from "./ha-types";
import {
  resolveDeviceEntitiesFromDevice,
  resolveTargets,
  resolveZoneEntitiesFromDevice,
  usesYamlTargetsForConfig
} from "./ha-target-source";

type ZoneDragMode = "move" | "resize";
type ZoneCorner = "x1y1" | "x1y2" | "x2y1" | "x2y2";

interface AdvancedZoneDisplay {
  id: string;
  name: string;
  type: string;
  points: Array<[number, number]>;
  calibration: boolean;
}

interface ZoneDragState {
  zoneId: RadarZoneId;
  mode: ZoneDragMode;
  corner?: ZoneCorner;
  pointerId: number;
  startPoint: RadarScreenPoint;
  startRect: RadarZoneRect;
}

interface ZoneAxisBounds {
  min: number;
  max: number;
}

interface ZoneBounds {
  x: ZoneAxisBounds;
  y: ZoneAxisBounds;
}

export class RadarZoneCard extends HTMLElement implements RadarZoneCardElement {
  private config: RadarCardConfig | null = null;
  private hassValue: HomeAssistantLike | null = null;
  private readonly targetStore = new TargetStore();
  private errors: string[] = [];
  private warnings: string[] = [];
  private resolvedTargets: ResolvedRadarTarget[] = [];
  private zoneDialogOpen = false;
  private readonly zoneDrafts: Partial<Record<RadarZoneId, RadarZoneRect>> = {};
  private zoneDrag: ZoneDragState | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static getStubConfig(): Partial<RadarCardConfig> {
    return {
      title: "Radar Map",
      range_x: 3000,
      range_y: 6000,
      hold_ms: 1500,
      show_distance: true,
      distance_decimals: 2
    };
  }

  static getConfigElement(): HTMLElement {
    return document.createElement("radar-zone-card-editor");
  }

  setConfig(config: Partial<RadarCardConfig>): void {
    const errors: string[] = [];
    if (!config || typeof config !== "object") {
      errors.push("카드 설정을 읽을 수 없습니다.");
      config = {};
    }

    const hasTargets = Array.isArray(config.targets) && config.targets.length > 0;
    const usesYamlTargets = config.use_yaml_targets ?? hasTargets;
    if (usesYamlTargets && !hasTargets) {
      errors.push("YAML 타겟 직접 설정이 켜져 있지만 targets 설정이 없습니다.");
    }
    if (!usesYamlTargets && !config.device_id) {
      errors.push("기기 자동 인식을 사용하려면 레이더 기기를 선택하세요.");
    }

    this.config = {
      ...DEFAULT_CARD_CONFIG,
      ...config,
      targets: config.targets || DEFAULT_CARD_CONFIG.targets
    };
    this.errors = [...errors, ...this.validateConfig(this.config)];
    this.render();
  }

  set hass(hass: HomeAssistantLike) {
    this.hassValue = hass;
    this.updateTargets();
    if (this.zoneDrag) {
      this.updateRadarOnly();
      return;
    }
    if (this.isEditingZoneName()) {
      this.updateRadarOnly();
      return;
    }
    this.render();
  }

  getCardSize(): number {
    return 4;
  }

  private readNumber(entityId: string): number | null {
    if (!entityId) return null;
    const state = this.hassValue?.states?.[entityId]?.state;
    const value = Number.parseFloat(String(state));
    return Number.isFinite(value) ? value : null;
  }

  private zoneRect(zoneId: RadarZoneId): RadarZoneRect | null {
    const draft = this.zoneDrafts[zoneId];
    if (draft) return draft;

    if (!this.config || !this.hassValue || !this.config.device_id) return null;

    const entities = resolveZoneEntitiesFromDevice(
      this.config.device_id,
      zoneId,
      this.hassValue
    );
    if (!entities.x1 || !entities.y1 || !entities.x2 || !entities.y2) return null;

    const x1 = this.readNumber(entities.x1);
    const y1 = this.readNumber(entities.y1);
    const x2 = this.readNumber(entities.x2);
    const y2 = this.readNumber(entities.y2);
    if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

    return {
      zoneId,
      x1,
      y1,
      x2,
      y2
    };
  }

  private selectedZoneRect(): RadarZoneRect | null {
    if (!this.config) return null;
    return this.zoneRect(this.config.selected_zone);
  }

  private isEmptyZoneRect(rect: RadarZoneRect | null): boolean {
    if (!rect) return true;
    return rect.x1 === rect.x2 || rect.y1 === rect.y2;
  }

  private editableZoneRect(zoneId: RadarZoneId): RadarZoneRect | null {
    const rect = this.zoneRect(zoneId);
    if (this.hasAdvancedZoneConfig()) return rect;
    if (!this.isEmptyZoneRect(rect)) return rect;
    if (zoneId !== this.config?.selected_zone || !this.zoneDialogOpen) return null;
    return this.defaultZoneRect(zoneId);
  }

  private defaultZoneRect(zoneId: RadarZoneId): RadarZoneRect {
    const bounds = this.zoneBounds(zoneId);
    const xMin = bounds?.x.min ?? -1000;
    const xMax = bounds?.x.max ?? 1000;
    const yMin = bounds?.y.min ?? 0;
    const yMax = bounds?.y.max ?? 2000;
    const width = Math.min(1200, Math.max(400, xMax - xMin));
    const height = Math.min(1200, Math.max(400, yMax - yMin));
    const centerX = this.clamp(0, xMin + width / 2, xMax - width / 2);
    const nearY = this.clamp(800, yMin, Math.max(yMin, yMax - height));

    return {
      zoneId,
      x1: Math.round(centerX - width / 2),
      x2: Math.round(centerX + width / 2),
      y1: Math.round(nearY),
      y2: Math.round(nearY + height)
    };
  }

  private zoneCustomName(zoneId: RadarZoneId): string {
    const entityId = this.zoneNameEntity(zoneId);
    const deviceName = entityId ? this.hassValue?.states[entityId]?.state?.trim() : "";
    if (
      deviceName &&
      deviceName !== "unknown" &&
      deviceName !== "unavailable" &&
      deviceName !== zoneLabel(zoneId)
    ) {
      return deviceName;
    }
    return this.config?.zone_names?.[zoneId]?.trim() || "";
  }

  private zoneNameEntity(zoneId: RadarZoneId): string | null {
    if (!this.config?.device_id || !this.hassValue) return null;
    const entities = resolveZoneEntitiesFromDevice(this.config.device_id, zoneId, this.hassValue);
    return entities.name || null;
  }

  private deviceEntity(entityName: "customZoneConfigured" | "zoneSummary" | "zoneConfigJson" | "ipAddress"): string | null {
    if (!this.config?.device_id || !this.hassValue) return null;
    const entities = resolveDeviceEntitiesFromDevice(this.config.device_id, this.hassValue);
    return entities[entityName] || null;
  }

  private entityState(entityId: string | null): string {
    if (!entityId) return "";
    return this.hassValue?.states[entityId]?.state?.trim() || "";
  }

  private hasCustomZoneConfiguredFlag(): boolean {
    const configured = this.entityState(this.deviceEntity("customZoneConfigured")).toLowerCase();
    return ["on", "true", "yes", "1"].includes(configured);
  }

  private hasAdvancedZoneConfig(): boolean {
    return this.hasAdvancedZoneDataConfig() || this.hasCustomZoneConfiguredFlag();
  }

  private hasAdvancedZoneDataConfig(): boolean {
    return this.advancedZones().length > 0;
  }

  private softwareZoneConfigStates(): string[] {
    if (!this.config?.device_id || !this.hassValue) return [];
    const entities = resolveDeviceEntitiesFromDevice(this.config.device_id, this.hassValue);
    return [...entities.softwareZoneConfigs, ...entities.calibrationZoneConfigs]
      .map((entityId) => this.entityState(entityId))
      .filter((value) => value && value !== "unknown" && value !== "unavailable" && value !== "__EMPTY__");
  }

  private advancedZoneFromConfig(rawJson: string): AdvancedZoneDisplay | null {
    try {
      const zone = JSON.parse(rawJson) as {
        id?: unknown;
        name?: unknown;
        type?: unknown;
        points?: unknown;
      };
      return this.normalizeAdvancedZone(zone);
    } catch {
      return null;
    }
  }

  private normalizeAdvancedZone(zone: {
    id?: unknown;
    name?: unknown;
    type?: unknown;
    points?: unknown;
  }): AdvancedZoneDisplay | null {
    if (typeof zone.id !== "string") return null;
    if (!Array.isArray(zone.points)) return null;
    const points = zone.points
      .map((point): [number, number] | null => {
        if (!Array.isArray(point) || point.length < 2) return null;
        const x = Number(point[0]);
        const y = Number(point[1]);
        return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
      })
      .filter((point): point is [number, number] => point !== null)
      .slice(0, 8);
    if (points.length < 3) return null;
    return {
      id: zone.id,
      name: typeof zone.name === "string" ? zone.name : "",
      type: typeof zone.type === "string" ? zone.type : "detection",
      points,
      calibration: zone.id.startsWith("calibration_")
    };
  }

  private advancedZonesFromFullJson(): AdvancedZoneDisplay[] {
    const rawJson = this.entityState(this.deviceEntity("zoneConfigJson"));
    if (!rawJson || rawJson === "unknown" || rawJson === "unavailable" || rawJson === "{}") {
      return [];
    }

    try {
      const parsed = JSON.parse(rawJson) as {
        advanced?: boolean;
        zones?: Array<{
          id?: unknown;
          name?: unknown;
          type?: unknown;
          points?: unknown;
        }>;
        calibrationZones?: Array<{
          id?: unknown;
          name?: unknown;
          type?: unknown;
          points?: unknown;
        }>;
      };
      if (!parsed.advanced) return [];
      return [...(Array.isArray(parsed.zones) ? parsed.zones : []), ...(Array.isArray(parsed.calibrationZones) ? parsed.calibrationZones : [])]
        .map((zone) => this.normalizeAdvancedZone(zone))
        .filter((zone): zone is AdvancedZoneDisplay => zone !== null);
    } catch {
      return [];
    }
  }

  private advancedZones(): AdvancedZoneDisplay[] {
    const zones = this.softwareZoneConfigStates()
      .map((value) => this.advancedZoneFromConfig(value))
      .filter((zone): zone is AdvancedZoneDisplay => zone !== null);

    return zones.length > 0 ? zones : this.advancedZonesFromFullJson();
  }

  private deviceZoneSummary(): string {
    const summary = this.entityState(this.deviceEntity("zoneSummary"));
    return summary && summary !== "unknown" && summary !== "unavailable" ? summary : "고급 Zone 설정 정보가 없습니다.";
  }

  private zoneDisplays(): RadarZoneDisplay[] {
    if (!this.config) return [];
    const advancedMode = this.hasAdvancedZoneDataConfig();
    return (["zone_1", "zone_2", "zone_3"] as RadarZoneId[])
      .map((zoneId): RadarZoneDisplay | null => {
        const rawRect = this.zoneRect(zoneId);
        const rect = advancedMode ? rawRect : this.editableZoneRect(zoneId);
        if (!rect) return null;
        return {
          ...rect,
          label: zoneLabel(zoneId),
          customName: this.zoneCustomName(zoneId),
          selected: zoneId === this.config?.selected_zone,
          placeholder: !advancedMode && this.isEmptyZoneRect(rawRect)
        };
      })
      .filter((zone): zone is RadarZoneDisplay => zone !== null);
  }

  private isEditingZoneName(): boolean {
    return this.shadowRoot?.activeElement?.hasAttribute("data-zone-name-input") ?? false;
  }

  private updateRadarOnly(): void {
    const mainMap = this.shadowRoot?.querySelector("[data-radar-main]");
    if (mainMap) {
      mainMap.innerHTML = this.radarSvgMarkup(360, 320, 24);
    }

    const dialogMap = this.shadowRoot?.querySelector("[data-radar-dialog-map]");
    if (dialogMap) {
      dialogMap.innerHTML = this.radarSvgMarkup(720, 520, 32, true);
    }
    this.attachRadarDragEvents();
  }

  private validateConfig(config: RadarCardConfig): string[] {
    const errors: string[] = [];
    const targets = usesYamlTargetsForConfig(config) ? config.targets : [];

    targets.forEach((target, index) => {
      if (!target || typeof target !== "object") {
        errors.push(`Target ${index + 1} 설정이 올바르지 않습니다.`);
        return;
      }
      if (!target.x) {
        errors.push(`${target.name || `Target ${index + 1}`} X 엔티티가 없습니다.`);
      }
      if (!target.y) {
        errors.push(`${target.name || `Target ${index + 1}`} Y 엔티티가 없습니다.`);
      }
    });

    if (!Number.isFinite(Number(config.range_x)) || Number(config.range_x) <= 0) {
      errors.push("X 범위는 0보다 큰 숫자여야 합니다.");
    }
    if (!Number.isFinite(Number(config.range_y)) || Number(config.range_y) <= 0) {
      errors.push("Y 범위는 0보다 큰 숫자여야 합니다.");
    }
    if (!Number.isFinite(Number(config.hold_ms)) || Number(config.hold_ms) < 0) {
      errors.push("유지 시간은 0 이상의 숫자여야 합니다.");
    }
    if (
      !Number.isFinite(Number(config.distance_decimals)) ||
      Number(config.distance_decimals) < 0
    ) {
      errors.push("거리 소수점 자리는 0 이상의 숫자여야 합니다.");
    }

    return errors;
  }

  private updateWarnings(): void {
    const warnings: string[] = [];
    if (!this.config || !this.hassValue || this.errors.length) {
      this.warnings = warnings;
      return;
    }

    this.resolvedTargets = resolveTargets(this.config, this.hassValue);

    if (this.usesAutoDevice()) {
      if (!this.hassValue.entities || typeof this.hassValue.entities !== "object") {
        warnings.push(
          "기기 자동 인식을 위한 HA 엔티티 레지스트리를 읽을 수 없습니다. 수동 targets 설정을 사용하세요."
        );
      } else if (this.resolvedTargets.length === 0) {
        warnings.push("선택한 기기에서 Target X/Y 엔티티를 찾지 못했습니다.");
      } else if (this.resolvedTargets.length < 3) {
        warnings.push(`선택한 기기에서 ${this.resolvedTargets.length}개 Target만 자동 인식했습니다.`);
      }
    }

    this.resolvedTargets.forEach((target, index) => {
      const label = target.name || `Target ${index + 1}`;
      if (target.x && !this.hassValue?.states[target.x]) {
        warnings.push(`${label} X 엔티티를 찾을 수 없습니다: ${target.x}`);
      }
      if (target.y && !this.hassValue?.states[target.y]) {
        warnings.push(`${label} Y 엔티티를 찾을 수 없습니다: ${target.y}`);
      }
    });

    this.warnings = warnings;
  }

  private usesAutoDevice(): boolean {
    return Boolean(this.config?.device_id && !usesYamlTargetsForConfig(this.config));
  }

  private updateTargets(): void {
    if (!this.config || !this.hassValue) return;
    this.updateWarnings();
    if (this.errors.length) return;

    this.targetStore.update(
      this.resolvedTargets,
      Number(this.config.hold_ms),
      (entityId) => this.readNumber(entityId)
    );
  }

  private messageMarkup(): string {
    const messages: string[] = [];

    if (this.errors.length) {
      messages.push(`
        <div class="message error">
          <div class="message-title">Radar Zone Card 설정 필요</div>
          ${this.errors.map((error) => `<div>${escapeHtml(error)}</div>`).join("")}
        </div>
      `);
    }

    if (!this.errors.length && this.warnings.length) {
      messages.push(`
        <div class="message warning">
          <div class="message-title">일부 엔티티를 찾을 수 없습니다</div>
          ${this.warnings.map((warning) => `<div>${escapeHtml(warning)}</div>`).join("")}
        </div>
      `);
    }

    if (
      !this.errors.length &&
      !this.warnings.length &&
      this.hassValue &&
      this.targetStore.activeCount(Number(this.config?.hold_ms || 0)) === 0
    ) {
      messages.push(`
        <div class="message info">
          <div class="message-title">현재 감지된 타겟이 없습니다</div>
        </div>
      `);
    }

    return messages.join("");
  }

  private radarViewport(width: number, height: number, pad: number): RadarViewport {
    const rangeY = Number(this.config?.range_y || 6000);
    const specRangeX = radarViewportRangeX(rangeY, LD2450_FOV_DEGREES);
    return {
      width,
      height,
      pad,
      rangeX: Math.max(Number(this.config?.range_x || 0), specRangeX),
      rangeY,
      fovDegrees: LD2450_FOV_DEGREES
    };
  }

  private radarSvgMarkup(width: number, height: number, pad: number, editable = false): string {
    if (!this.config) return "";

    const centerX = width / 2;
    const bottomY = height - pad;
    const viewport = this.radarViewport(width, height, pad);
    const targets = this.targetStore.activeTargets(Number(this.config.hold_ms));
    const zones = this.zoneDisplays();
    const advancedMode = this.hasAdvancedZoneDataConfig();
    const advancedZones = advancedMode ? this.renderAdvancedZones(viewport) : "";

    return `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(
        this.config.title
      )}">
        ${renderGrid(viewport)}
        ${advancedMode ? advancedZones : renderZoneRects(zones, viewport, editable)}
        <polygon class="sensor" points="${centerX},${bottomY - 12} ${centerX - 10},${
          bottomY + 8
        } ${centerX + 10},${bottomY + 8}" />
        ${renderTargets(targets, this.config, viewport)}
      </svg>
    `;
  }

  private renderAdvancedZones(viewport: RadarViewport): string {
    return this.advancedZones()
      .map((zone) => {
        const points = zone.points.map(([x, y]) => toScreenPoint(x, y, viewport));
        const polygonPoints = points.map((point) => `${point.x},${point.y}`).join(" ");
        const labelPoint = points[0];
        const label = zone.calibration ? zone.id.replace("calibration_", "보정 ") : zone.id.replace("zone_", "Zone ");
        const customName = zone.name.trim();
        return `
          <g class="zone-rect advanced ${zone.calibration ? "calibration" : ""} ${escapeHtml(zone.type)}">
            <polygon points="${polygonPoints}" />
            <text x="${labelPoint.x + 8}" y="${labelPoint.y - 8}">
              <tspan x="${labelPoint.x + 8}" dy="0">${escapeHtml(label)}</tspan>
              ${customName ? `<tspan x="${labelPoint.x + 8}" dy="14">${escapeHtml(customName)}</tspan>` : ""}
            </text>
          </g>
        `;
      })
      .join("");
  }

  private zoneDialogMarkup(): string {
    if (!this.config || !this.zoneDialogOpen) return "";

    const zoneItems = [
      ["zone_1", "1"],
      ["zone_2", "2"],
      ["zone_3", "3"]
    ]
      .map(([zoneId, label]) => {
        const active = zoneId === this.config?.selected_zone ? " active" : "";
        const customName = this.zoneCustomName(zoneId as RadarZoneId);
        return `
          <button class="zone-segment${active}" type="button" data-zone-select="${zoneId}">
            <span>Zone ${label}</span>
            ${customName ? `<span class="zone-segment-custom">${escapeHtml(customName)}</span>` : ""}
          </button>
        `;
      })
      .join("");
    const zoneRect = this.selectedZoneRect();
    const selectedZoneIsEmpty = this.isEmptyZoneRect(zoneRect);
    const customName = this.zoneCustomName(this.config.selected_zone);
    const advancedMode = this.hasAdvancedZoneConfig();
    const zoneSummary = zoneRect
      ? selectedZoneIsEmpty
        ? "아직 설정되지 않았습니다. 지도에 표시된 기본 박스를 끌어서 새 Zone을 만드세요."
        : `X ${zoneRect.x1} ~ ${zoneRect.x2} mm / Y ${zoneRect.y1} ~ ${zoneRect.y2} mm`
      : "선택한 Zone 좌표 엔티티를 찾지 못했거나 값이 없습니다.";
    const advancedPanel = `
      <div class="panel-section panel-section-warning">
        <div class="panel-label">고급 Zone 설정</div>
        <div class="panel-note">기기 웹 설정에서 저장한 Zone 설정이 적용되어 있습니다. 이 카드에서는 편집할 수 없고 현재 설정만 표시합니다.</div>
      </div>
      <div class="panel-section">
        <div class="panel-label">Zone 요약</div>
        <div class="panel-note">${escapeHtml(this.deviceZoneSummary())}</div>
      </div>
      ${
        this.configuratorUrl()
          ? `<div class="panel-section"><button class="configurator-button panel-button" type="button" data-configurator-open>고급 Zone 설정 열기</button></div>`
          : ""
      }
    `;
    const basicPanel = `
      <div class="panel-section">
        <div class="panel-label">Zone 좌표</div>
        <div class="panel-note">${escapeHtml(zoneSummary)}</div>
      </div>
      <div class="panel-section">
        <label class="panel-label" for="zone-name-input">커스텀 이름</label>
        <input
          id="zone-name-input"
          class="zone-name-input"
          data-zone-name-input
          value="${escapeHtml(customName)}"
          placeholder="예: 침대, 책상 앞"
        />
      </div>
      <div class="panel-section">
        <div class="panel-label">Zone 선택</div>
        <div class="zone-segments">${zoneItems}</div>
      </div>
      <div class="panel-section">
        <button class="danger-button" type="button" data-zone-delete>선택 Zone 삭제</button>
        <div class="panel-note">좌표를 0으로 초기화합니다. 다시 만들려면 지도에 표시된 기본 박스를 끌어 저장하세요.</div>
      </div>
    `;

    return `
      <div class="dialog-backdrop" data-dialog-backdrop>
        <div class="dialog" role="dialog" aria-modal="true" aria-label="Zone 설정">
          <div class="dialog-header">
            <div class="dialog-heading">
              <div class="dialog-heading-title">Zone 설정</div>
              <div class="dialog-heading-subtitle">원하는 구역을 지정하여 이름을 붙이거나 탐지 제외를 하도록 설정할 수 있습니다</div>
            </div>
            <button class="dialog-close" type="button" data-dialog-close aria-label="닫기">×</button>
          </div>
          <div class="dialog-body">
            <div class="dialog-map" data-radar-dialog-map>
              ${this.radarSvgMarkup(720, 520, 32, !advancedMode)}
            </div>
            <div class="dialog-panel">
              ${advancedMode ? advancedPanel : basicPanel}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private openZoneDialog(): void {
    this.zoneDialogOpen = true;
    this.render();
  }

  private closeZoneDialog(): void {
    if (!this.hasAdvancedZoneConfig()) {
      this.commitZoneNameInput();
    }
    this.zoneDialogOpen = false;
    this.render();
  }

  private selectZone(zoneId: RadarZoneId): void {
    if (!this.config) return;
    if (!this.hasAdvancedZoneConfig()) {
      this.commitZoneNameInput();
    }
    this.config = {
      ...this.config,
      selected_zone: zoneId
    };
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this.config },
        bubbles: true,
        composed: true
      })
    );
    this.render();
  }

  private async deleteSelectedZone(): Promise<void> {
    if (!this.config) return;
    if (this.hasAdvancedZoneConfig()) return;
    this.commitZoneNameInput();
    const zoneId = this.config.selected_zone;
    this.zoneDrafts[zoneId] = {
      zoneId,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0
    };
    await this.commitZoneRect(zoneId);
    this.render();
  }

  private commitZoneNameInput(): void {
    if (this.hasAdvancedZoneConfig()) return;
    const input = this.shadowRoot?.querySelector("[data-zone-name-input]") as HTMLInputElement | null;
    if (!this.config || !input) return;
    this.updateZoneNameDraft(this.config.selected_zone, input.value);
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this.config },
        bubbles: true,
        composed: true
      })
    );
  }

  private async setZoneName(zoneId: RadarZoneId, name: string): Promise<void> {
    if (!this.config) return;
    if (this.hasAdvancedZoneConfig()) return;
    const trimmedName = name.trim();
    const zoneNames = {
      ...(this.config.zone_names || {}),
      [zoneId]: trimmedName
    };
    if (!zoneNames[zoneId]) {
      delete zoneNames[zoneId];
    }

    this.config = {
      ...this.config,
      zone_names: zoneNames
    };
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this.config },
        bubbles: true,
        composed: true
      })
    );
    const entityId = this.zoneNameEntity(zoneId);
    if (entityId && this.hassValue?.callService) {
      await this.hassValue.callService("text", "set_value", {
        entity_id: entityId,
        value: trimmedName || zoneLabel(zoneId)
      });
    }
    this.render();
  }

  private updateZoneNameDraft(zoneId: RadarZoneId, name: string): void {
    if (!this.config) return;
    const zoneNames = {
      ...(this.config.zone_names || {}),
      [zoneId]: name
    };
    if (!zoneNames[zoneId]) {
      delete zoneNames[zoneId];
    }
    this.config = {
      ...this.config,
      zone_names: zoneNames
    };
  }

  private editableViewport(): RadarViewport | null {
    if (!this.config) return null;
    return this.radarViewport(720, 520, 32);
  }

  private pointerToRadarPoint(event: PointerEvent, svg: SVGSVGElement): RadarScreenPoint | null {
    const viewport = this.editableViewport();
    if (!viewport) return null;

    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const screenX = ((event.clientX - rect.left) / rect.width) * viewport.width;
    const screenY = ((event.clientY - rect.top) / rect.height) * viewport.height;
    const point = toRadarPoint(screenX, screenY, viewport);

    return {
      x: this.clamp(Math.round(point.x), -viewport.rangeX, viewport.rangeX),
      y: this.clamp(Math.round(point.y), 0, viewport.rangeY)
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private zoneBounds(zoneId: RadarZoneId): ZoneBounds | null {
    const viewport = this.editableViewport();
    if (!this.config || !this.hassValue || !viewport) return null;

    const entities = resolveZoneEntitiesFromDevice(this.config.device_id, zoneId, this.hassValue);
    return {
      x: this.combinedBounds([entities.x1, entities.x2], -viewport.rangeX, viewport.rangeX),
      y: this.combinedBounds([entities.y1, entities.y2], 0, viewport.rangeY)
    };
  }

  private combinedBounds(
    entityIds: Array<string | undefined>,
    fallbackMin: number,
    fallbackMax: number
  ): ZoneAxisBounds {
    let min = fallbackMin;
    let max = fallbackMax;

    for (const entityId of entityIds) {
      if (!entityId) continue;
      const attributes = this.hassValue?.states[entityId]?.attributes;
      const entityMin = Number(attributes?.min);
      const entityMax = Number(attributes?.max);
      if (Number.isFinite(entityMin)) min = Math.max(min, entityMin);
      if (Number.isFinite(entityMax)) max = Math.min(max, entityMax);
    }

    return min <= max ? { min, max } : { min: fallbackMin, max: fallbackMax };
  }

  private beginZoneDrag(event: PointerEvent): void {
    if (this.hasAdvancedZoneConfig()) return;
    const target = event.target as SVGElement | null;
    const mode = target?.dataset.zoneDrag as ZoneDragMode | undefined;
    const zoneId = target?.dataset.zoneId as RadarZoneId | undefined;
    if (!target || !mode || !zoneId) return;

    const svg = target.closest("svg") as SVGSVGElement | null;
    const startPoint = svg ? this.pointerToRadarPoint(event, svg) : null;
    const startRect = this.editableZoneRect(zoneId);
    if (!svg || !startPoint || !startRect) return;

    event.preventDefault();
    event.stopPropagation();

    if (zoneId !== this.config?.selected_zone) {
      this.config = {
        ...this.config!,
        selected_zone: zoneId
      };
    }

    this.zoneDrag = {
      zoneId,
      mode,
      corner: target.dataset.zoneCorner as ZoneCorner | undefined,
      pointerId: event.pointerId,
      startPoint,
      startRect
    };

    window.addEventListener("pointermove", this.handleZoneDragMove);
    window.addEventListener("pointerup", this.handleZoneDragEnd);
    window.addEventListener("pointercancel", this.handleZoneDragEnd);
  }

  private readonly handleZoneDragMove = (event: PointerEvent): void => {
    if (!this.zoneDrag || event.pointerId !== this.zoneDrag.pointerId) return;

    const svg = this.shadowRoot?.querySelector("[data-radar-dialog-map] svg") as SVGSVGElement | null;
    const point = svg ? this.pointerToRadarPoint(event, svg) : null;
    if (!point) return;

    event.preventDefault();
    const draft =
      this.zoneDrag.mode === "move"
        ? this.movedZoneRect(this.zoneDrag.startRect, this.zoneDrag.startPoint, point)
        : this.resizedZoneRect(this.zoneDrag.startRect, this.zoneDrag.corner, point);

    this.zoneDrafts[this.zoneDrag.zoneId] = draft;
    this.updateRadarOnly();
  };

  private readonly handleZoneDragEnd = (event: PointerEvent): void => {
    if (!this.zoneDrag || event.pointerId !== this.zoneDrag.pointerId) return;
    event.preventDefault();

    const zoneId = this.zoneDrag.zoneId;
    this.zoneDrag = null;
    window.removeEventListener("pointermove", this.handleZoneDragMove);
    window.removeEventListener("pointerup", this.handleZoneDragEnd);
    window.removeEventListener("pointercancel", this.handleZoneDragEnd);
    void this.commitZoneRect(zoneId);
    this.render();
  };

  private movedZoneRect(
    startRect: RadarZoneRect,
    startPoint: RadarScreenPoint,
    currentPoint: RadarScreenPoint
  ): RadarZoneRect {
    const bounds = this.zoneBounds(startRect.zoneId);
    if (!bounds) return startRect;
    const dx = currentPoint.x - startPoint.x;
    const dy = currentPoint.y - startPoint.y;
    const minX = Math.min(startRect.x1, startRect.x2) + dx;
    const maxX = Math.max(startRect.x1, startRect.x2) + dx;
    const minY = Math.min(startRect.y1, startRect.y2) + dy;
    const maxY = Math.max(startRect.y1, startRect.y2) + dy;
    const shiftX = this.clampShift(minX, maxX, bounds.x.min, bounds.x.max);
    const shiftY = this.clampShift(minY, maxY, bounds.y.min, bounds.y.max);

    return {
      ...startRect,
      x1: Math.round(startRect.x1 + dx + shiftX),
      y1: Math.round(startRect.y1 + dy + shiftY),
      x2: Math.round(startRect.x2 + dx + shiftX),
      y2: Math.round(startRect.y2 + dy + shiftY)
    };
  }

  private resizedZoneRect(
    startRect: RadarZoneRect,
    corner: ZoneCorner | undefined,
    point: RadarScreenPoint
  ): RadarZoneRect {
    if (!corner) return startRect;
    const bounds = this.zoneBounds(startRect.zoneId);
    if (!bounds) return startRect;
    const next = { ...startRect };
    if (corner.includes("x1")) next.x1 = this.clamp(point.x, bounds.x.min, bounds.x.max);
    if (corner.includes("x2")) next.x2 = this.clamp(point.x, bounds.x.min, bounds.x.max);
    if (corner.includes("y1")) next.y1 = this.clamp(point.y, bounds.y.min, bounds.y.max);
    if (corner.includes("y2")) next.y2 = this.clamp(point.y, bounds.y.min, bounds.y.max);
    return next;
  }

  private clampShift(minValue: number, maxValue: number, minLimit: number, maxLimit: number): number {
    if (minValue < minLimit) return minLimit - minValue;
    if (maxValue > maxLimit) return maxLimit - maxValue;
    return 0;
  }

  private async commitZoneRect(zoneId: RadarZoneId): Promise<void> {
    if (this.hasAdvancedZoneConfig()) return;
    const rect = this.zoneDrafts[zoneId];
    if (!rect || !this.config || !this.hassValue?.callService) return;

    const entities = resolveZoneEntitiesFromDevice(this.config.device_id, zoneId, this.hassValue);
    const safeRect = this.clampZoneRect(zoneId, rect);
    await Promise.all(
      (["x1", "y1", "x2", "y2"] as const).map((axis) => {
        const entityId = entities[axis];
        if (!entityId) return Promise.resolve();
        return this.hassValue!.callService!("number", "set_value", {
          entity_id: entityId,
          value: safeRect[axis]
        });
      })
    );
  }

  private clampZoneRect(zoneId: RadarZoneId, rect: RadarZoneRect): RadarZoneRect {
    const bounds = this.zoneBounds(zoneId);
    if (!bounds) return rect;
    return {
      ...rect,
      x1: this.clamp(rect.x1, bounds.x.min, bounds.x.max),
      x2: this.clamp(rect.x2, bounds.x.min, bounds.x.max),
      y1: this.clamp(rect.y1, bounds.y.min, bounds.y.max),
      y2: this.clamp(rect.y2, bounds.y.min, bounds.y.max)
    };
  }

  private attachRadarDragEvents(): void {
    this.shadowRoot?.querySelectorAll("[data-zone-drag]").forEach((element) => {
      element.addEventListener("pointerdown", (event) => this.beginZoneDrag(event as PointerEvent));
    });
  }

  private attachEvents(): void {
    this.attachRadarDragEvents();
    this.shadowRoot?.querySelectorAll("[data-configurator-open]").forEach((button) => {
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.openConfigurator();
      });
    });
    this.shadowRoot
      ?.querySelector("[data-zone-dialog-open]")
      ?.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.openZoneDialog();
      });
    this.shadowRoot
      ?.querySelector("[data-dialog-close]")
      ?.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.closeZoneDialog();
      });
    this.shadowRoot
      ?.querySelector("[data-dialog-backdrop]")
      ?.addEventListener("pointerdown", (event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          this.closeZoneDialog();
        }
      });
    this.shadowRoot?.querySelectorAll("[data-zone-select]").forEach((button) => {
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        const zoneId = (button as HTMLElement).dataset.zoneSelect as RadarZoneId | undefined;
        if (zoneId) {
          this.selectZone(zoneId);
        }
      });
    });
    this.shadowRoot
      ?.querySelector("[data-zone-delete]")
      ?.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        void this.deleteSelectedZone();
      });
    this.shadowRoot
      ?.querySelector("[data-zone-name-input]")
      ?.addEventListener("input", (event) => {
        if (!this.config) return;
        this.updateZoneNameDraft(this.config.selected_zone, (event.target as HTMLInputElement).value);
      });
    this.shadowRoot
      ?.querySelector("[data-zone-name-input]")
      ?.addEventListener("change", (event) => {
        if (!this.config) return;
        void this.setZoneName(this.config.selected_zone, (event.target as HTMLInputElement).value);
      });
  }

  private openConfigurator(): void {
    const url = this.configuratorUrl();
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  private configuratorUrl(): string {
    const explicitUrl = this.config?.configurator_url?.trim();
    if (explicitUrl) return explicitUrl;
    if (!this.config?.device_id || !this.hassValue) return "";

    const entities = resolveDeviceEntitiesFromDevice(this.config.device_id, this.hassValue);
    const ipAddress = entities.ipAddress ? this.hassValue.states[entities.ipAddress]?.state?.trim() : "";
    if (!ipAddress || ipAddress === "unknown" || ipAddress === "unavailable") return "";
    return `http://${ipAddress}/`;
  }

  private render(): void {
    if (!this.config || !this.shadowRoot) return;
    const configuratorUrl = this.configuratorUrl();
    const configuratorButton = configuratorUrl
      ? `<button class="configurator-button" type="button" data-configurator-open>고급 Zone 설정 열기</button>`
      : "";

    this.shadowRoot.innerHTML = `
      <style>${CARD_STYLES}</style>
      <ha-card>
        <div class="card-header">
          <div class="title">${escapeHtml(this.config.title)}</div>
          <div class="card-actions">
            ${configuratorButton}
            <button class="zone-button" type="button" data-zone-dialog-open>Zone 설정</button>
          </div>
        </div>
        <div data-radar-main>${this.radarSvgMarkup(360, 320, 24)}</div>
        ${this.messageMarkup()}
      </ha-card>
      ${this.zoneDialogMarkup()}
    `;
    this.attachEvents();
  }
}
