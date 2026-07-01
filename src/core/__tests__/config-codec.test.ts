import { describe, expect, it } from "vitest";
import { advancedZoneFromConfig, advancedZonesFromConfigTexts, advancedZonesFromDeviceConfigJson, advancedZonesFromFullJson } from "../config-codec";

const softwareZone = '{"id":"zone_1","name":"Desk","type":"detection","shape":"polygon","points":[[0,100],[100,100],[100,200],[0,200]]}';
const calibrationZone = '{"id":"calibration_1","name":"Fan","type":"filter","shape":"rect","points":[[300,300],[600,300],[600,600],[300,600]]}';

describe("config-codec", () => {
  it("parses a single software zone config", () => {
    expect(advancedZoneFromConfig(softwareZone)).toMatchObject({
      id: "zone_1",
      name: "Desk",
      type: "detection",
      calibration: false
    });
  });

  it("ignores invalid or empty config text", () => {
    expect(advancedZoneFromConfig("__EMPTY__")).toBeNull();
    expect(advancedZoneFromConfig("{bad json")).toBeNull();
  });

  it("uses only advanced full json for display zones", () => {
    const advanced = JSON.stringify({
      version: 1,
      advanced: true,
      zones: [JSON.parse(softwareZone)],
      calibrationZones: [JSON.parse(calibrationZone)]
    });
    const fallback = JSON.stringify({
      version: 1,
      advanced: false,
      zones: [JSON.parse(softwareZone)]
    });

    expect(advancedZonesFromFullJson(advanced).map((zone) => zone.id)).toEqual(["zone_1", "calibration_1"]);
    expect(advancedZonesFromFullJson(fallback)).toEqual([]);
  });

  it("prefers individual config entities over full json fallback", () => {
    const fullJson = JSON.stringify({
      version: 1,
      advanced: true,
      zones: [{ ...JSON.parse(softwareZone), id: "zone_2" }]
    });

    expect(advancedZonesFromConfigTexts([softwareZone], fullJson).map((zone) => zone.id)).toEqual(["zone_1"]);
  });

  it("parses device api config without legacy advanced flag", () => {
    const apiConfig = JSON.stringify({
      version: 1,
      zones: [JSON.parse(softwareZone)],
      calibrationZones: [JSON.parse(calibrationZone)]
    });

    expect(advancedZonesFromDeviceConfigJson(apiConfig).map((zone) => zone.id)).toEqual(["zone_1", "calibration_1"]);
  });
});
