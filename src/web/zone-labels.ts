import type { WebZone, WebZoneType } from "./types";
import { MAX_ZONE_NAME_LENGTH } from "./constants";

export const zoneTypeLabels: Record<WebZoneType, string> = {
  detection: "Detection",
  filter: "Filter",
  reduced: "Reduced",
  disabled: "Disabled"
};

export const calibrationTypeLabels: Record<Extract<WebZoneType, "filter" | "reduced" | "disabled">, string> = {
  filter: "\uCC28\uB2E8",
  reduced: "\uB454\uAC10",
  disabled: "\uAEBC\uC9D0"
};

export function calibrationType(type: WebZoneType): Extract<WebZoneType, "filter" | "reduced" | "disabled"> {
  if (type === "reduced" || type === "disabled") return type;
  return "filter";
}

export function zoneSlotLabel(zoneId: string): string {
  const match = /^zone_(\d+)$/.exec(zoneId);
  return match ? `Zone ${match[1]}` : zoneId;
}

export function isCalibrationZoneId(zoneId: string): boolean {
  return /^calibration_\d+$/.test(zoneId);
}

export function zoneDisplayName(zone: WebZone): string {
  return zone.name || zoneSlotLabel(zone.id);
}

export function limitZoneName(name: string): string {
  return Array.from(name.trim()).slice(0, MAX_ZONE_NAME_LENGTH).join("");
}
