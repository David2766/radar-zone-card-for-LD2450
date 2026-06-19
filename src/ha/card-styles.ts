export const CARD_STYLES = `
  :host {
    display: block;
  }
  ha-card {
    overflow: hidden;
    background: #1f2a33;
    color: #d7eefc;
  }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 14px 4px;
  }
  .title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 16px;
    font-weight: 600;
  }
  .card-actions {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 6px;
  }
  .zone-button,
  .configurator-button,
  .dialog-close,
  .danger-button {
    border: 1px solid rgba(123, 184, 216, 0.42);
    border-radius: 6px;
    background: rgba(123, 184, 216, 0.12);
    color: #d7eefc;
    cursor: pointer;
    font: inherit;
  }
  .zone-button {
    flex: 0 0 auto;
    padding: 5px 8px;
    font-size: 12px;
  }
  .zone-button:hover,
  .configurator-button:hover,
  .dialog-close:hover {
    background: rgba(123, 184, 216, 0.22);
  }
  .configurator-button {
    flex: 0 0 auto;
    padding: 5px 8px;
    font-size: 12px;
  }
  .danger-button {
    width: 100%;
    margin-bottom: 8px;
    padding: 8px 10px;
    border-color: rgba(255, 107, 122, 0.48);
    background: rgba(255, 107, 122, 0.12);
    color: #ffd7dd;
    font-size: 13px;
  }
  .danger-button:hover {
    background: rgba(255, 107, 122, 0.2);
  }
  .dialog-close {
    width: 32px;
    height: 32px;
    font-size: 18px;
    line-height: 1;
  }
  .dialog-title {
    padding: 12px 14px 4px;
    font-size: 16px;
    font-weight: 600;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
    background: #1f2a33;
  }
  .dialog-map svg {
    touch-action: none;
  }
  .beam {
    fill: rgba(88, 172, 214, 0.24);
    stroke: rgba(123, 184, 216, 0.65);
    stroke-width: 1.4;
  }
  .grid line,
  .grid path {
    fill: none;
    stroke: rgba(123, 184, 216, 0.38);
    stroke-width: 1;
  }
  .grid text {
    fill: rgba(215, 238, 252, 0.55);
    font-size: 10px;
    text-anchor: middle;
    paint-order: stroke;
    stroke: rgba(31, 42, 51, 0.72);
    stroke-width: 3px;
  }
  .grid .distance-label {
    text-anchor: start;
  }
  .sensor {
    fill: #ffffff;
  }
  .target circle {
    fill: var(--target-color);
    stroke: rgba(255, 255, 255, 0.82);
    stroke-width: 1.5;
  }
  .target text {
    fill: #ffffff;
    font-size: 13px;
    font-weight: 700;
    text-anchor: middle;
    paint-order: stroke;
    stroke: rgba(0, 0, 0, 0.45);
    stroke-width: 3px;
  }
  .target.out-of-coverage circle {
    stroke-dasharray: 3 2;
  }
  .zone-rect rect,
  .zone-rect polygon {
    fill: rgba(123, 184, 216, 0.08);
    stroke: rgba(123, 184, 216, 0.55);
    stroke-width: 1.5;
    stroke-dasharray: 8 5;
  }
  .dialog-map .zone-rect rect {
    cursor: move;
    pointer-events: all;
  }
  .zone-rect.selected rect {
    fill: rgba(255, 209, 102, 0.15);
    stroke: rgba(255, 209, 102, 0.95);
    stroke-width: 2.2;
  }
  .zone-rect.placeholder rect {
    fill: rgba(255, 209, 102, 0.08);
    stroke-dasharray: 4 4;
  }
  .zone-rect.advanced polygon {
    stroke-dasharray: 8 5;
  }
  .zone-rect.advanced.detection polygon {
    fill: rgba(255, 209, 102, 0.1);
    stroke: rgba(255, 209, 102, 0.9);
  }
  .zone-rect.advanced.filter polygon {
    fill: rgba(255, 107, 122, 0.1);
    stroke: rgba(255, 107, 122, 0.9);
  }
  .zone-rect.advanced.reduced polygon {
    fill: rgba(123, 184, 216, 0.12);
    stroke: rgba(123, 184, 216, 0.9);
  }
  .zone-rect.advanced.calibration polygon {
    stroke-dasharray: 3 4;
  }
  .zone-rect.advanced.calibration text {
    fill: #ffd7dd;
  }
  .zone-rect.advanced.disabled polygon {
    fill: rgba(160, 174, 184, 0.06);
    stroke: rgba(160, 174, 184, 0.62);
  }
  .zone-rect text {
    fill: rgba(215, 238, 252, 0.88);
    font-size: 12px;
    font-weight: 700;
    text-anchor: middle;
    pointer-events: none;
    paint-order: stroke;
    stroke: rgba(0, 0, 0, 0.5);
    stroke-width: 3px;
  }
  .zone-rect.selected text {
    fill: #fff3c4;
  }
  .zone-handle {
    fill: #fff3c4;
    stroke: rgba(31, 42, 51, 0.95);
    stroke-width: 2;
    cursor: grab;
    pointer-events: all;
  }
  .zone-handle:active {
    cursor: grabbing;
  }
  .message {
    margin: 0 12px 12px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.45;
  }
  .message-title {
    font-weight: 700;
    margin-bottom: 4px;
  }
  .message.error {
    background: rgba(255, 107, 122, 0.16);
    border: 1px solid rgba(255, 107, 122, 0.5);
  }
  .message.warning {
    background: rgba(255, 209, 102, 0.14);
    border: 1px solid rgba(255, 209, 102, 0.45);
  }
  .message.info {
    background: rgba(123, 184, 216, 0.12);
    border: 1px solid rgba(123, 184, 216, 0.36);
  }
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483640;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: rgba(5, 12, 18, 0.72);
  }
  .dialog {
    width: min(960px, 100%);
    max-height: min(760px, calc(100vh - 36px));
    overflow: auto;
    border: 1px solid rgba(123, 184, 216, 0.34);
    border-radius: 8px;
    background: #1f2a33;
    color: #d7eefc;
    box-shadow: 0 24px 72px rgba(0, 0, 0, 0.48);
  }
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(123, 184, 216, 0.18);
  }
  .dialog-heading {
    min-width: 0;
  }
  .dialog-heading-title {
    font-size: 17px;
    font-weight: 700;
  }
  .dialog-heading-subtitle {
    margin-top: 2px;
    font-size: 12px;
    color: rgba(215, 238, 252, 0.7);
  }
  .dialog-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px;
    gap: 14px;
    padding: 14px;
  }
  .dialog-map {
    min-width: 0;
    border: 1px solid rgba(123, 184, 216, 0.18);
    border-radius: 8px;
    overflow: hidden;
  }
  .dialog-panel {
    display: grid;
    align-content: start;
    gap: 10px;
  }
  .panel-section {
    padding: 10px;
    border: 1px solid rgba(123, 184, 216, 0.18);
    border-radius: 8px;
    background: rgba(123, 184, 216, 0.08);
  }
  .panel-section-warning {
    border-color: rgba(255, 209, 102, 0.42);
    background: rgba(255, 209, 102, 0.12);
  }
  .panel-button {
    width: 100%;
  }
  .panel-label {
    margin-bottom: 4px;
    font-size: 11px;
    color: rgba(215, 238, 252, 0.62);
  }
  .panel-value {
    font-size: 14px;
    font-weight: 700;
  }
  .panel-note {
    font-size: 12px;
    line-height: 1.45;
    color: rgba(215, 238, 252, 0.74);
  }
  .zone-segments {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .zone-segment {
    display: grid;
    gap: 2px;
    min-width: 0;
    padding: 7px 4px;
    border: 1px solid rgba(123, 184, 216, 0.24);
    border-radius: 6px;
    background: rgba(123, 184, 216, 0.08);
    color: #d7eefc;
    cursor: pointer;
    font: inherit;
    text-align: center;
    font-size: 12px;
  }
  .zone-segment-custom {
    min-width: 0;
    overflow: hidden;
    color: rgba(215, 238, 252, 0.68);
    font-size: 10px;
    font-weight: 400;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .zone-segment.active .zone-segment-custom {
    color: rgba(255, 243, 196, 0.78);
  }
  .zone-name-input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 9px;
    border: 1px solid rgba(123, 184, 216, 0.26);
    border-radius: 6px;
    background: rgba(5, 12, 18, 0.18);
    color: #d7eefc;
    font: inherit;
    font-size: 13px;
  }
  .zone-name-input:focus {
    border-color: rgba(255, 209, 102, 0.75);
    outline: none;
  }
  .zone-segment:hover {
    background: rgba(123, 184, 216, 0.18);
  }
  .zone-segment.active {
    border-color: rgba(255, 209, 102, 0.72);
    background: rgba(255, 209, 102, 0.16);
    color: #fff3c4;
  }
  @media (max-width: 720px) {
    .dialog-backdrop {
      align-items: stretch;
      padding: 10px;
    }
    .dialog {
      max-height: calc(100vh - 20px);
    }
    .dialog-body {
      grid-template-columns: 1fr;
    }
  }
`;
