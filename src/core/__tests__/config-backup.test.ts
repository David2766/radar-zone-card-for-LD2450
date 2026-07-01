import { describe, expect, it } from "vitest";
import { createConfigBackup, validateConfigBackupText } from "../config-backup";
import type { WebDeviceConfig } from "../types";

const validConfig: WebDeviceConfig = {
  version: 1,
  zones: [
    {
      id: "zone_1",
      name: "Desk",
      type: "detection",
      shape: "polygon",
      points: [
        [-500, 1000],
        [500, 1000],
        [600, 1800],
        [-400, 1900]
      ]
    },
    {
      id: "zone_2",
      name: "",
      type: "filter",
      shape: "rect",
      points: [
        [1000, 2000],
        [1800, 2000],
        [1800, 2600],
        [1000, 2600]
      ]
    }
  ],
  calibrationZones: [
    {
      id: "calibration_1",
      name: "Fan",
      type: "reduced",
      shape: "rect",
      points: [
        [-1200, 3000],
        [-700, 3000],
        [-700, 3500],
        [-1200, 3500]
      ],
      minPoints: [
        [-1200, 3000],
        [-700, 3000],
        [-700, 3500],
        [-1200, 3500]
      ]
    }
  ],
  floorplan: {
    enabled: false,
    hasImage: false
  }
};

async function backupText(config: WebDeviceConfig = validConfig): Promise<string> {
  return JSON.stringify(await createConfigBackup(config, { sourceUrl: "http://device.local", id: "test-device" }), null, 2);
}

describe("config-backup", () => {
  it("round-trips a valid backup and preserves empty zone names", async () => {
    const result = await validateConfigBackupText(await backupText());

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.checksumValid).toBe(true);
    expect(result.config?.zones.map((zone) => zone.id)).toEqual(["zone_1", "zone_2"]);
    expect(result.config?.zones[1].name).toBe("");
  });

  it("warns but does not block when checksum does not match", async () => {
    const raw = await backupText();
    const tampered = raw.replace('"Desk"', '"Desk2"');
    const result = await validateConfigBackupText(tampered);

    expect(result.errors).toEqual([]);
    expect(result.warnings.some((warning) => warning.path === "checksum")).toBe(true);
    expect(result.config?.zones[0].name).toBe("Desk2");
  });

  it("rejects software zones outside supported slots", async () => {
    const config: WebDeviceConfig = {
      ...validConfig,
      zones: [{ ...validConfig.zones[0], id: "zone_7" }]
    };
    const result = await validateConfigBackupText(await backupText(config));

    expect(result.config).toBeNull();
    expect(result.errors.some((error) => error.path.endsWith(".id"))).toBe(true);
  });

  it("rejects calibration zones outside supported slots", async () => {
    const config: WebDeviceConfig = {
      ...validConfig,
      calibrationZones: [{ ...validConfig.calibrationZones![0], id: "calibration_5" }]
    };
    const result = await validateConfigBackupText(await backupText(config));

    expect(result.config).toBeNull();
    expect(result.errors.some((error) => error.path.endsWith(".id"))).toBe(true);
  });

  it("rejects coordinates outside LD2450 writable bounds", async () => {
    const config: WebDeviceConfig = {
      ...validConfig,
      zones: [{ ...validConfig.zones[0], points: [[5000, 1000], [5100, 1000], [5100, 1600], [5000, 1600]] }]
    };
    const result = await validateConfigBackupText(await backupText(config));

    expect(result.config).toBeNull();
    expect(result.errors.some((error) => error.path.includes(".x"))).toBe(true);
  });

  it("rejects rectangles with the wrong number of points", async () => {
    const config: WebDeviceConfig = {
      ...validConfig,
      zones: [{ ...validConfig.zones[1], points: [[0, 1000], [100, 1000], [100, 1200]] }]
    };
    const result = await validateConfigBackupText(await backupText(config));

    expect(result.config).toBeNull();
    expect(result.errors.some((error) => error.path.endsWith(".points"))).toBe(true);
  });

  it("rejects polygons with more than eight points", async () => {
    const config: WebDeviceConfig = {
      ...validConfig,
      zones: [
        {
          ...validConfig.zones[0],
          points: [
            [-400, 1000],
            [-200, 900],
            [0, 850],
            [200, 900],
            [400, 1000],
            [500, 1200],
            [300, 1400],
            [0, 1500],
            [-300, 1400]
          ]
        }
      ]
    };
    const result = await validateConfigBackupText(await backupText(config));

    expect(result.config).toBeNull();
    expect(result.errors.some((error) => error.path.endsWith(".points"))).toBe(true);
  });

  it("rejects zone names that are too long", async () => {
    const config: WebDeviceConfig = {
      ...validConfig,
      zones: [{ ...validConfig.zones[0], name: "12345678901" }]
    };
    const result = await validateConfigBackupText(await backupText(config));

    expect(result.config).toBeNull();
    expect(result.errors.some((error) => error.path.endsWith(".name"))).toBe(true);
  });

  it("rejects zones whose every point is 0,0", async () => {
    const config: WebDeviceConfig = {
      ...validConfig,
      zones: [{ ...validConfig.zones[0], shape: "rect", points: [[0, 0], [0, 0], [0, 0], [0, 0]] }]
    };
    const result = await validateConfigBackupText(await backupText(config));

    expect(result.config).toBeNull();
    expect(result.errors.some((error) => error.path.endsWith(".points"))).toBe(true);
  });

  it("returns a friendly parse error for invalid json", async () => {
    const result = await validateConfigBackupText("{not json");

    expect(result.config).toBeNull();
    expect(result.errors[0].path).toBe("$");
  });
});
