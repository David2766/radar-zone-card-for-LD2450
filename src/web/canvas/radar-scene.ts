import { DEFAULT_CARD_CONFIG } from "../../core/defaults";
import { escapeHtml } from "../../core/html";
import { LD2450_FOV_DEGREES, radarViewportRangeX, toRadarPoint, toScreenPoint } from "../../core/radar-math";
import { renderGrid } from "../../core/radar-svg";
import type { RadarScreenPoint, RadarViewport } from "../../core/types";
import type { WebDeviceConfig, WebDeviceState, WebTarget, WebZone } from "../types";

const SCENE_WIDTH = 760;
const SCENE_HEIGHT = 540;
const SCENE_PAD = 34;

export class RadarScene {
  constructor(private readonly host: HTMLElement) {}

  render(state: WebDeviceState, config: WebDeviceConfig, selectedZoneId = "", editable = false, selectedPointIndex = -1): void {
    const width = SCENE_WIDTH;
    const height = SCENE_HEIGHT;
    const pad = SCENE_PAD;
    const viewport = this.viewport();
    const centerX = width / 2;
    const bottomY = height - pad;

    this.host.innerHTML = `
      <svg class="radar-scene" viewBox="0 0 ${width} ${height}" role="img" aria-label="Radar map">
        ${renderGrid(viewport)}
        ${(config.calibrationZones || []).map((zone) => renderZone(zone, viewport, selectedZoneId, editable, selectedPointIndex, true)).join("")}
        ${config.zones.map((zone) => renderZone(zone, viewport, selectedZoneId, editable, selectedPointIndex)).join("")}
        <polygon class="sensor" points="${centerX},${bottomY - 12} ${centerX - 10},${bottomY + 8} ${centerX + 10},${bottomY + 8}" />
        ${state.targets.filter(isRenderableTarget).map((target) => renderTarget(target, viewport)).join("")}
      </svg>
    `;
  }

  pointFromEvent(event: PointerEvent, svg: SVGSVGElement): RadarScreenPoint {
    const rect = svg.getBoundingClientRect();
    const screenX = ((event.clientX - rect.left) / rect.width) * SCENE_WIDTH;
    const screenY = ((event.clientY - rect.top) / rect.height) * SCENE_HEIGHT;
    const point = toRadarPoint(screenX, screenY, this.viewport());
    return {
      x: clamp(Math.round(point.x), -this.viewport().rangeX, this.viewport().rangeX),
      y: clamp(Math.round(point.y), 0, this.viewport().rangeY)
    };
  }

  private viewport(): RadarViewport {
    const rangeY = DEFAULT_CARD_CONFIG.range_y;
    const specRangeX = radarViewportRangeX(rangeY, LD2450_FOV_DEGREES);
    return {
      width: SCENE_WIDTH,
      height: SCENE_HEIGHT,
      pad: SCENE_PAD,
      rangeX: Math.max(DEFAULT_CARD_CONFIG.range_x, specRangeX),
      rangeY,
      fovDegrees: LD2450_FOV_DEGREES
    };
  }
}

function renderTarget(target: WebTarget, viewport: RadarViewport): string {
  const point = toScreenPoint(target.x, target.y, viewport);
  const distanceM = Math.hypot(target.x, target.y) / 1000;
  const distanceLabel = `${distanceM.toFixed(2)} m`;
  return `
    <g class="target" style="--target-color:${target.color}">
      <circle cx="${point.x}" cy="${point.y}" r="9"></circle>
      <text x="${point.x}" y="${point.y - 30}">
        <tspan x="${point.x}" dy="0">${escapeHtml(target.name)}</tspan>
        <tspan x="${point.x}" dy="14">${distanceLabel}</tspan>
      </text>
    </g>
  `;
}

function isRenderableTarget(target: WebTarget): boolean {
  return target.active && Number.isFinite(target.x) && Number.isFinite(target.y) && Math.hypot(target.x, target.y) > 100;
}

function renderZone(
  zone: WebZone,
  viewport: RadarViewport,
  selectedZoneId: string,
  editable: boolean,
  selectedPointIndex: number,
  calibration = false
): string {
  if (!zone.points.length) return "";
  const selected = zone.id === selectedZoneId;
  if (zone.placeholder && !selected) return "";
  const points = zone.points.map(([x, y]) => toScreenPoint(x, y, viewport));
  const pathPoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const labelPoint = points[0];
  const label = zoneSlotLabel(zone.id);
  const customName = zone.placeholder ? "" : zone.name;
  const moveData = editable && !calibration ? `data-zone-drag="move" data-zone-id="${zone.id}"` : "";
  const selectData = calibration ? `data-calibration-info="${zone.id}"` : "";
  const edgeHits = editable && selected && !calibration ? renderEdgeHits(zone, viewport) : "";
  const handles = editable && selected ? renderPointHandles(zone, viewport, selectedPointIndex) : "";
  return `
    <g class="web-zone ${zone.type}${calibration ? " calibration" : ""}${zone.placeholder ? " placeholder" : ""}${selected ? " selected" : ""}">
      <polygon points="${pathPoints}" ${moveData} ${selectData}></polygon>
      ${edgeHits}
      <text x="${labelPoint.x + 8}" y="${labelPoint.y - 8}">
        <tspan x="${labelPoint.x + 8}" dy="0">${escapeHtml(label)}</tspan>
        ${customName ? `<tspan x="${labelPoint.x + 8}" dy="14">${escapeHtml(customName)}</tspan>` : ""}
      </text>
      ${handles}
    </g>
  `;
}

function renderEdgeHits(zone: WebZone, viewport: RadarViewport): string {
  return zone.points
    .map(([x, y], index) => {
      const next = zone.points[(index + 1) % zone.points.length];
      if (!next) return "";
      const start = toScreenPoint(x, y, viewport);
      const end = toScreenPoint(next[0], next[1], viewport);
      return `
        <line
          class="zone-edge-hit"
          x1="${start.x}"
          y1="${start.y}"
          x2="${end.x}"
          y2="${end.y}"
          data-zone-id="${zone.id}"
          data-zone-edge="${index}"
        />
      `;
    })
    .join("");
}

function renderPointHandles(zone: WebZone, viewport: RadarViewport, selectedPointIndex: number): string {
  return zone.points
    .map(([x, y], index) => {
      const point = toScreenPoint(x, y, viewport);
      return `
        <circle
          class="zone-handle${index === selectedPointIndex ? " selected" : ""}"
          cx="${point.x}"
          cy="${point.y}"
          r="7"
          data-zone-drag="resize"
          data-zone-id="${zone.id}"
          data-zone-point="${index}"
        />
      `;
    })
    .join("");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function zoneSlotLabel(zoneId: string): string {
  const match = /^zone_(\d+)$/.exec(zoneId);
  return match ? `Zone ${match[1]}` : zoneId;
}
