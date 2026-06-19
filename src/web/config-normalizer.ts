import { MAX_CALIBRATION_ZONES, MAX_SOFTWARE_ZONES } from "./constants";
import type { WebDeviceConfig, WebZone } from "./types";
import { calibrationType } from "./zone-labels";
import { clampZoneToHardwareBounds, rectPoints } from "./zone-geometry";

export function normalizeSoftwareConfig(config: WebDeviceConfig): WebDeviceConfig {
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

export function stripPlaceholders(config: WebDeviceConfig): WebDeviceConfig {
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

export function isEmptyZone(zone: WebZone): boolean {
  return zone.points.length === 0 || zone.points.every(([x, y]) => x === 0 && y === 0);
}

export function upsertZone(zones: WebZone[], nextZone: WebZone): WebZone[] {
  const found = zones.some((zone) => zone.id === nextZone.id);
  const next = found ? zones.map((zone) => (zone.id === nextZone.id ? nextZone : zone)) : [...zones, nextZone];
  return next.sort((a, b) => zoneOrder(a.id) - zoneOrder(b.id)).slice(0, MAX_SOFTWARE_ZONES);
}

export function nextZoneId(zones: WebZone[]): string {
  const used = new Set(zones.map((zone) => zone.id));
  for (let index = 1; index <= MAX_SOFTWARE_ZONES; index += 1) {
    const id = `zone_${index}`;
    if (!used.has(id)) return id;
  }
  return `zone_${zones.length + 1}`;
}

export function defaultZonePoints(index: number): Array<[number, number]> {
  const offset = Math.min(index, MAX_SOFTWARE_ZONES - 1) * 180;
  return rectPoints(-900 + offset, 1000 + offset, 900 + offset, 2400 + offset);
}

function zoneOrder(zoneId: string): number {
  const match = /^(?:zone|calibration)_(\d+)$/.exec(zoneId);
  return match ? Number(match[1]) : 99;
}
