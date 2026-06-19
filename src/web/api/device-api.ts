import type { DeviceApi, WebDeviceConfig, WebDeviceState, WebZoneType } from "../types";

interface EsphomeEntityJson {
  value?: unknown;
  state?: unknown;
}

const deviceBaseUrl = normalizeDeviceBaseUrl(new URLSearchParams(window.location.search).get("device") || "");

function normalizeDeviceBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

function endpoint(path: string): string {
  return `${deviceBaseUrl}${path}`;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(endpoint(url), init);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function requestOk(url: string, init?: RequestInit): Promise<void> {
  const response = await fetch(endpoint(url), init);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
}

async function readJsonTextEntity<T>(name: string): Promise<T> {
  const payload = await requestJson<EsphomeEntityJson>(`/text_sensor/${encodeURIComponent(name)}`);
  const raw = typeof payload.value === "string" ? payload.value : payload.state;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`${name} is empty`);
  }
  return JSON.parse(raw) as T;
}

async function postEntity(domain: "number" | "select" | "text", name: string, action: "set", values: Record<string, string>): Promise<void> {
  const body = new URLSearchParams(values);
  await requestOk(`/${domain}/${encodeURIComponent(name)}/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
}

const SOFTWARE_ZONE_SLOTS = 6;
const CALIBRATION_FILTER_SLOTS = 4;
const EMPTY_ZONE_CONFIG = "__EMPTY__";

export const deviceApi: DeviceApi = {
  async getState(): Promise<WebDeviceState> {
    const state = await readJsonTextEntity<WebDeviceState>("Radar State JSON");
    return {
      ...state,
      updatedAt: Date.now()
    };
  },

  getConfig(): Promise<WebDeviceConfig> {
    return readJsonTextEntity<WebDeviceConfig>("Zone Config JSON");
  },

  async saveConfig(config: WebDeviceConfig): Promise<void> {
    for (let index = 0; index < SOFTWARE_ZONE_SLOTS; index += 1) {
      const zoneId = `zone_${index + 1}`;
      const zone = config.zones.find((item) => item.id === zoneId);
      const value = zone ? JSON.stringify(zone) : EMPTY_ZONE_CONFIG;
      if (value.length > 255) {
        throw new Error(`${zoneId} config is too large to store on this device`);
      }
      await postEntity("text", `Software Zone ${index + 1} Config`, "set", { value });
      await postEntity("select", `Software Zone ${index + 1} Type`, "set", {
        option: zone ? toEsphomeZoneType(zone.type) : "Disabled"
      });
    }
    for (let index = 0; index < CALIBRATION_FILTER_SLOTS; index += 1) {
      const zoneId = `calibration_${index + 1}`;
      const zone = config.calibrationZones?.find((item) => item.id === zoneId);
      const value = zone ? JSON.stringify(zone) : EMPTY_ZONE_CONFIG;
      if (value.length > 255) {
        throw new Error(`${zoneId} config is too large to store on this device`);
      }
      await postEntity("text", `Calibration Filter ${index + 1} Config`, "set", { value });
    }
  }
};

function toEsphomeZoneType(type: WebZoneType): string {
  if (type === "filter") return "Filter";
  if (type === "disabled") return "Disabled";
  if (type === "reduced") return "Filter";
  return "Detection";
}
