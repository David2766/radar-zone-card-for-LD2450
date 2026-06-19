import { RadarZoneCard } from "./ha/radar-zone-card";
import { RadarZoneCardEditor } from "./ha/radar-zone-card-editor";

if (!customElements.get("radar-zone-card")) {
  customElements.define("radar-zone-card", RadarZoneCard);
}

if (!customElements.get("radar-zone-card-editor")) {
  customElements.define("radar-zone-card-editor", RadarZoneCardEditor);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "radar-zone-card",
  name: "Radar Zone Card",
  description: "Realtime radar target map for LD2450-style mmWave sensors"
});

