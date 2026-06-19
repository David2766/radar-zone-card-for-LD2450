export type WebZoneType = "detection" | "filter" | "reduced" | "disabled";

export interface WebTarget {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  active: boolean;
}

export interface WebZone {
  id: string;
  name: string;
  type: WebZoneType;
  shape: "rect" | "polygon";
  points: Array<[number, number]>;
  placeholder?: boolean;
  minSizeUnlocked?: boolean;
}

export interface WebDeviceState {
  connected: boolean;
  targets: WebTarget[];
  updatedAt: number;
  pirMotion?: boolean;
}

export interface WebDeviceConfig {
  version: number;
  zones: WebZone[];
  calibrationZones?: WebZone[];
  floorplan?: {
    enabled: boolean;
    hasImage: boolean;
    scaleMmPerPx?: number;
  };
}

export interface DeviceApi {
  getState(): Promise<WebDeviceState>;
  getConfig(): Promise<WebDeviceConfig>;
  saveConfig(config: WebDeviceConfig): Promise<void>;
}
