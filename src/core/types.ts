export interface RadarTargetConfig {
  name?: string;
  color?: string;
  x: string;
  y: string;
}

export interface ResolvedRadarTarget extends RadarTargetConfig {
  name: string;
  color: string;
}

export interface HeldRadarTarget {
  name: string;
  color: string;
  x: number;
  y: number;
  lastSeen: number;
  active: boolean;
}

export type RadarZoneId = "zone_1" | "zone_2" | "zone_3";

export type RadarZoneAxis = "x1" | "y1" | "x2" | "y2";

export interface RadarZoneEntitySet {
  zoneId: RadarZoneId;
  x1?: string;
  y1?: string;
  x2?: string;
  y2?: string;
  name?: string;
}

export interface RadarZoneRect {
  zoneId: RadarZoneId;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RadarZoneDisplay extends RadarZoneRect {
  label: string;
  customName?: string;
  selected: boolean;
  placeholder?: boolean;
}

export interface RadarCardConfig {
  type?: string;
  title: string;
  range_x: number;
  range_y: number;
  hold_ms: number;
  show_distance: boolean;
  distance_decimals: number;
  targets: RadarTargetConfig[];
  device_id: string;
  configurator_url?: string;
  use_yaml_targets?: boolean;
  selected_zone: RadarZoneId;
  zone_names: Partial<Record<RadarZoneId, string>>;
}

export interface RadarScreenPoint {
  x: number;
  y: number;
}

export interface RadarViewport {
  width: number;
  height: number;
  pad: number;
  rangeX: number;
  rangeY: number;
  fovDegrees: number;
}
