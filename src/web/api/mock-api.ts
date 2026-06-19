import type { DeviceApi, WebDeviceConfig, WebDeviceState } from "../types";

const startTime = Date.now();

let config: WebDeviceConfig = {
  version: 1,
  zones: [
    {
      id: "zone_1",
      name: "침대",
      type: "detection",
      shape: "rect",
      points: [
        [-900, 1000],
        [900, 1000],
        [900, 2600],
        [-900, 2600]
      ]
    },
    {
      id: "filter_1",
      name: "커튼 오탐",
      type: "filter",
      shape: "rect",
      points: [
        [1800, 2600],
        [2600, 2600],
        [2600, 3800],
        [1800, 3800]
      ]
    }
  ],
  calibrationZones: [],
  floorplan: {
    enabled: false,
    hasImage: false
  }
};

export const mockApi: DeviceApi = {
  async getState(): Promise<WebDeviceState> {
    const elapsed = (Date.now() - startTime) / 1000;
    return {
      connected: true,
      updatedAt: Date.now(),
      pirMotion: false,
      targets: [
        {
          id: "target_1",
          name: "T1",
          color: "#ff6b7a",
          x: Math.round(Math.sin(elapsed / 2) * 1100),
          y: Math.round(1800 + Math.cos(elapsed / 2.8) * 700),
          active: true
        },
        {
          id: "target_2",
          name: "T2",
          color: "#ffd166",
          x: 0,
          y: 0,
          active: false
        },
        {
          id: "target_3",
          name: "T3",
          color: "#06d6a0",
          x: 0,
          y: 0,
          active: false
        }
      ]
    };
  },

  async getConfig(): Promise<WebDeviceConfig> {
    return structuredClone(config);
  },

  async saveConfig(nextConfig: WebDeviceConfig): Promise<void> {
    config = structuredClone(nextConfig);
  }
};
