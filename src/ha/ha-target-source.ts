import { targetColor } from "../core/defaults";
import type {
  RadarCardConfig,
  RadarTargetConfig,
  RadarZoneAxis,
  RadarZoneEntitySet,
  RadarZoneId,
  ResolvedRadarTarget
} from "../core/types";
import type { HassEntityRegistryEntry, HomeAssistantLike } from "./ha-types";

interface RegistryEntity {
  entity_id: string;
  device_id?: string;
  name: string;
  original_name: string;
}

export interface RadarDeviceEntitySet {
  ipAddress?: string;
  customZoneConfigured?: string;
  zoneSummary?: string;
  zoneConfigJson?: string;
  softwareZoneConfigs: string[];
  calibrationZoneConfigs: string[];
}

export function usesYamlTargetsForConfig(config: Partial<RadarCardConfig>): boolean {
  const hasTargets = Array.isArray(config.targets) && config.targets.length > 0;
  return Boolean(config.use_yaml_targets ?? hasTargets);
}

export function resolveTargets(
  config: RadarCardConfig,
  hass: HomeAssistantLike | null
): ResolvedRadarTarget[] {
  if (usesYamlTargetsForConfig(config)) {
    return normalizeYamlTargets(config.targets);
  }

  if (!hass || !config.device_id) {
    return [];
  }

  return resolveTargetsFromDevice(config.device_id, hass);
}

export function resolveTargetsFromDevice(
  deviceId: string,
  hass: HomeAssistantLike
): ResolvedRadarTarget[] {
  const entities = entitiesForDevice(deviceId, hass);

  const targets: ResolvedRadarTarget[] = [];
  for (let index = 1; index <= 3; index += 1) {
    const x = findTargetAxisEntity(entities, index, "x");
    const y = findTargetAxisEntity(entities, index, "y");
    if (x && y) {
      targets.push({
        name: `T${index}`,
        color: targetColor(index - 1),
        x,
        y
      });
    }
  }

  return targets;
}

export function resolveZoneEntitiesFromDevice(
  deviceId: string,
  zoneId: RadarZoneId,
  hass: HomeAssistantLike
): RadarZoneEntitySet {
  const result: RadarZoneEntitySet = { zoneId };
  const zoneNumber = Number(zoneId.replace("zone_", ""));
  const entities = entitiesForDevice(deviceId, hass);

  for (const axis of ["x1", "y1", "x2", "y2"] as RadarZoneAxis[]) {
    result[axis] = findZoneAxisEntity(entities, zoneNumber, axis) || undefined;
  }
  result.name = findZoneNameEntity(entities, zoneNumber) || undefined;

  return result;
}

export function resolveDeviceEntitiesFromDevice(
  deviceId: string,
  hass: HomeAssistantLike
): RadarDeviceEntitySet {
  const entities = entitiesForDevice(deviceId, hass);
  return {
    ipAddress: findDeviceIpEntity(entities) || undefined,
    customZoneConfigured: findCustomZoneConfiguredEntity(entities) || undefined,
    zoneSummary: findZoneSummaryEntity(entities) || undefined,
    zoneConfigJson: findZoneConfigJsonEntity(entities) || undefined,
    softwareZoneConfigs: findSoftwareZoneConfigEntities(entities),
    calibrationZoneConfigs: findCalibrationZoneConfigEntities(entities)
  };
}

export function findTargetAxisEntity(
  entities: RegistryEntity[],
  targetNumber: number,
  axis: "x" | "y"
): string | null {
  const patterns = [
    `tages${targetNumber}_${axis}`,
    `target_${targetNumber}_${axis}`,
    `target${targetNumber}_${axis}`,
    `target-${targetNumber}_${axis}`,
    `target_${targetNumber}_${axis}_display`,
    `타겟${targetNumber} ${axis}`,
    `타겟${targetNumber}_${axis}`
  ].map((pattern) => normalize(pattern));

  return findBestEntityMatch(entities, patterns);
}

export function findZoneAxisEntity(
  entities: RegistryEntity[],
  zoneNumber: number,
  axis: RadarZoneAxis
): string | null {
  const patterns = [
    `zone${zoneNumber}${axis}`,
    `zone_${zoneNumber}_${axis}`,
    `zone-${zoneNumber}-${axis}`,
    `zone ${zoneNumber} ${axis}`
  ].map((pattern) => normalize(pattern));

  return findBestEntityMatch(entities, patterns);
}

export function findZoneNameEntity(
  entities: RegistryEntity[],
  zoneNumber: number
): string | null {
  const patterns = [
    `zone${zoneNumber}name`,
    `zone_${zoneNumber}_name`,
    `zone-${zoneNumber}-name`,
    `zone ${zoneNumber} name`
  ].map((pattern) => normalize(pattern));

  return findBestEntityMatch(entities, patterns);
}

export function findDeviceIpEntity(entities: RegistryEntity[]): string | null {
  const patterns = [
    "deviceipaddress",
    "ipaddress",
    "wifiip",
    "wifiinfoipaddress"
  ].map((pattern) => normalize(pattern));

  return findBestEntityMatch(entities, patterns);
}

export function findCustomZoneConfiguredEntity(entities: RegistryEntity[]): string | null {
  const patterns = [
    "customzoneconfigured",
    "advancedzoneconfigured",
    "zoneconfigured"
  ].map((pattern) => normalize(pattern));

  return findBestEntityMatch(entities, patterns);
}

export function findZoneSummaryEntity(entities: RegistryEntity[]): string | null {
  const patterns = [
    "zonesummary",
    "zoneconfigsummary"
  ].map((pattern) => normalize(pattern));

  return findBestEntityMatch(entities, patterns);
}

export function findZoneConfigJsonEntity(entities: RegistryEntity[]): string | null {
  const patterns = [
    "zoneconfigjson",
    "zonejson",
    "advancedzoneconfig"
  ].map((pattern) => normalize(pattern));

  return findBestEntityMatch(entities, patterns);
}

export function findSoftwareZoneConfigEntities(entities: RegistryEntity[]): string[] {
  const result: string[] = [];

  for (let index = 1; index <= 6; index += 1) {
    const patterns = [
      `softwarezone${index}config`,
      `software_zone_${index}_config`,
      `software zone ${index} config`
    ].map((pattern) => normalize(pattern));
    result.push(findBestEntityMatch(entities, patterns) || "");
  }

  return result;
}

export function findCalibrationZoneConfigEntities(entities: RegistryEntity[]): string[] {
  const result: string[] = [];

  for (let index = 1; index <= 4; index += 1) {
    const patterns = [
      `calibrationfilter${index}config`,
      `calibration_filter_${index}_config`,
      `calibration filter ${index} config`,
      `calibration${index}config`,
      `calibration_${index}_config`
    ].map((pattern) => normalize(pattern));
    result.push(findBestEntityMatch(entities, patterns) || "");
  }

  return result;
}

export function normalize(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "");
}

function entitiesForDevice(deviceId: string, hass: HomeAssistantLike): RegistryEntity[] {
  const registry = hass.entities;
  if (!registry || typeof registry !== "object") {
    return [];
  }

  return Object.entries(registry)
    .map(([entityId, info]) => toRegistryEntity(entityId, info))
    .filter((entity) => entity.device_id === deviceId && hass.states[entity.entity_id]);
}

function findBestEntityMatch(entities: RegistryEntity[], patterns: string[]): string | null {
  let bestMatch: string | null = null;
  let bestScore = -1;

  for (const entity of entities) {
    const haystack = normalize([entity.entity_id, entity.name, entity.original_name].join(" "));

    for (const pattern of patterns) {
      if (!haystack.includes(pattern)) continue;
      const score = pattern.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entity.entity_id;
      }
    }
  }

  return bestMatch;
}

function normalizeYamlTargets(targets: RadarTargetConfig[]): ResolvedRadarTarget[] {
  return targets.map((target, index) => ({
    name: target.name || `T${index + 1}`,
    color: target.color || targetColor(index),
    x: target.x,
    y: target.y
  }));
}

function toRegistryEntity(
  entityId: string,
  info: HassEntityRegistryEntry | undefined
): RegistryEntity {
  return {
    entity_id: info?.entity_id || entityId,
    device_id: info?.device_id,
    name: info?.name || "",
    original_name: info?.original_name || ""
  };
}
