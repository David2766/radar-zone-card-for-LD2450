import type { RadarCardConfig } from "../core/types";

export interface HassEntityState {
  state: string;
  attributes?: Record<string, unknown>;
}

export interface HassEntityRegistryEntry {
  entity_id?: string;
  device_id?: string;
  name?: string;
  original_name?: string;
}

export interface HomeAssistantLike {
  states: Record<string, HassEntityState | undefined>;
  entities?: Record<string, HassEntityRegistryEntry | undefined>;
  callService?: (domain: string, service: string, serviceData?: Record<string, unknown>) => Promise<unknown>;
}

export interface RadarZoneCardElement extends HTMLElement {
  hass?: HomeAssistantLike;
  setConfig(config: Partial<RadarCardConfig>): void;
  getCardSize?(): number;
}

export interface HaFormElement extends HTMLElement {
  hass?: HomeAssistantLike | null;
  data?: Partial<RadarCardConfig>;
  schema?: unknown[];
  computeLabel?: (schema: { name?: string }) => string | undefined;
  computeHelper?: (schema: { name?: string }) => string | undefined;
}

declare global {
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      description: string;
    }>;
  }
}
