import {
  LD2450_ZONE_MAX_X_MM,
  LD2450_ZONE_MAX_Y_MM,
  LD2450_ZONE_MIN_X_MM,
  LD2450_ZONE_MIN_Y_MM
} from "../core/radar-math";
import type { RadarScreenPoint } from "../core/types";
import type { WebZone } from "./types";

export function moveZone(zone: WebZone, startPoint: RadarScreenPoint, currentPoint: RadarScreenPoint): WebZone {
  const dx = currentPoint.x - startPoint.x;
  const dy = currentPoint.y - startPoint.y;
  return clampZoneToHardwareBounds({
    ...zone,
    points: zone.points.map(([x, y]): [number, number] => [Math.round(x + dx), Math.round(y + dy)])
  });
}

export function updateZonePoint(zone: WebZone, pointIndex: number | undefined, point: RadarScreenPoint): WebZone {
  if (pointIndex === undefined || pointIndex < 0 || pointIndex >= zone.points.length) return zone;
  if (zone.shape === "rect") {
    return resizeRectZone(zone, pointIndex, point);
  }
  return clampZoneToHardwareBounds({
    ...zone,
    points: zone.points.map((existing, index): [number, number] => (index === pointIndex ? [point.x, point.y] : existing))
  });
}

export function resizeRectZone(zone: WebZone, pointIndex: number, point: RadarScreenPoint): WebZone {
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

export function resizeCalibrationZone(
  zone: WebZone,
  pointIndex: number | undefined,
  point: RadarScreenPoint,
  allowShrink: boolean
): WebZone {
  if (pointIndex === undefined || pointIndex < 0 || zone.points.length < 4) return zone;
  const bounds = zoneBounds(zone);
  let nextMinX = bounds.minX;
  let nextMaxX = bounds.maxX;
  let nextMinY = bounds.minY;
  let nextMaxY = bounds.maxY;

  if (pointIndex === 0) {
    nextMinX = allowShrink ? point.x : Math.min(bounds.minX, point.x);
    nextMinY = allowShrink ? point.y : Math.min(bounds.minY, point.y);
  } else if (pointIndex === 1) {
    nextMaxX = allowShrink ? point.x : Math.max(bounds.maxX, point.x);
    nextMinY = allowShrink ? point.y : Math.min(bounds.minY, point.y);
  } else if (pointIndex === 2) {
    nextMaxX = allowShrink ? point.x : Math.max(bounds.maxX, point.x);
    nextMaxY = allowShrink ? point.y : Math.max(bounds.maxY, point.y);
  } else if (pointIndex === 3) {
    nextMinX = allowShrink ? point.x : Math.min(bounds.minX, point.x);
    nextMaxY = allowShrink ? point.y : Math.max(bounds.maxY, point.y);
  }

  return clampZoneToHardwareBounds({
    ...zone,
    shape: "rect",
    points: rectPoints(nextMinX, nextMinY, nextMaxX, nextMaxY)
  });
}

export function calibrationResizeShrinks(zone: WebZone, pointIndex: number | undefined, point: RadarScreenPoint): boolean {
  if (pointIndex === undefined || pointIndex < 0 || zone.points.length < 4) return false;
  const current = zoneBounds(zone);
  const resized = zoneBounds(resizeCalibrationZone(zone, pointIndex, point, true));
  return resized.width < current.width || resized.height < current.height;
}

export function zoneBounds(zone: WebZone): { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number } {
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

export function insertZonePoint(zone: WebZone, edgeIndex: number, point: RadarScreenPoint): WebZone {
  const insertIndex = Math.min(edgeIndex + 1, zone.points.length);
  return clampZoneToHardwareBounds({
    ...zone,
    shape: "polygon",
    points: [...zone.points.slice(0, insertIndex), [point.x, point.y], ...zone.points.slice(insertIndex)]
  });
}

export function clampZoneToHardwareBounds(zone: WebZone): WebZone {
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

export function rectPoints(x1: number, y1: number, x2: number, y2: number): Array<[number, number]> {
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

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampShift(minValue: number, maxValue: number, minLimit: number, maxLimit: number): number {
  if (minValue < minLimit) return minLimit - minValue;
  if (maxValue > maxLimit) return maxLimit - maxValue;
  return 0;
}
