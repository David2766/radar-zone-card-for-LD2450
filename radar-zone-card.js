class RadarZoneCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    // Holds the last valid points briefly so HA update timing does not make targets blink.
    this._lastTargets = new Map();
    this._errors = [];
    this._warnings = [];
    this._resolvedTargets = [];
    this._targetSignature = "";
  }

  setConfig(config) {
    const errors = [];
    if (!config || typeof config !== "object") {
      errors.push("카드 설정을 읽을 수 없습니다.");
      config = {};
    }
    const hasTargets = Array.isArray(config.targets) && config.targets.length > 0;
    const usesYamlTargets = config.use_yaml_targets ?? hasTargets;
    if (usesYamlTargets && !hasTargets) {
      errors.push("YAML targets 사용이 켜져 있지만 targets 설정이 없습니다.");
    }
    if (!usesYamlTargets && !config.device_id) {
      errors.push("기기 자동 인식을 사용하려면 Radar device를 선택하세요.");
    }

    this._config = {
      title: "Radar Map",
      range_x: 3000,
      range_y: 6000,
      hold_ms: 1500,
      show_distance: true,
      distance_decimals: 2,
      targets: [],
      device_id: "",
      use_yaml_targets: undefined,
      ...config,
    };
    this._errors = errors.concat(this._validateConfig(this._config));
    this._render();
  }

  static getStubConfig() {
    return {
      title: "Radar Map",
      range_x: 3000,
      range_y: 6000,
      hold_ms: 1500,
      show_distance: true,
      distance_decimals: 2,
    };
  }

  static getConfigForm() {
    return {
      schema: [
        { name: "use_yaml_targets", selector: { boolean: {} } },
        { name: "device_id", selector: { device: {} } },
        { name: "title", selector: { text: {} } },
        {
          type: "grid",
          name: "",
          flatten: true,
          schema: [
            { name: "range_x", selector: { number: { min: 1, mode: "box", unit_of_measurement: "mm" } } },
            { name: "range_y", selector: { number: { min: 1, mode: "box", unit_of_measurement: "mm" } } },
          ],
        },
        {
          type: "grid",
          name: "",
          flatten: true,
          schema: [
            { name: "hold_ms", selector: { number: { min: 0, mode: "box", unit_of_measurement: "ms" } } },
            { name: "distance_decimals", selector: { number: { min: 0, mode: "box" } } },
          ],
        },
        { name: "show_distance", selector: { boolean: {} } },
      ],
      computeLabel: (schema) => {
        const labels = {
          use_yaml_targets: "Use manual YAML targets",
          device_id: "Radar device",
          title: "Title",
          range_x: "X range",
          range_y: "Y range",
          hold_ms: "Hold time",
          distance_decimals: "Distance decimals",
          show_distance: "Show distance",
        };
        return labels[schema.name] || schema.name;
      },
      computeHelper: (schema) => {
        const helpers = {
          use_yaml_targets: "When enabled, YAML targets are used and the selected device is ignored.",
          device_id: "Select the ESPHome radar device. Ignored while manual YAML targets are enabled.",
          hold_ms: "Keeps the last valid target position briefly to avoid flicker.",
        };
        return helpers[schema.name];
      },
    };
  }

  static getConfigElement() {
    return document.createElement("radar-zone-card-editor");
  }

  set hass(hass) {
    this._hass = hass;
    this._updateTargets();
    this._render();
  }

  getCardSize() {
    return 4;
  }

  _readNumber(entityId) {
    if (!entityId) return null;
    const state = this._hass?.states?.[entityId]?.state;
    const value = Number.parseFloat(state);
    return Number.isFinite(value) ? value : null;
  }

  _validateConfig(config) {
    const errors = [];
    const targets = this._usesYamlTargetsForConfig(config) ? config.targets : [];

    targets.forEach((target, index) => {
      if (!target || typeof target !== "object") {
        errors.push(`Target ${index + 1} 설정이 올바르지 않습니다.`);
        return;
      }
      if (!target.x) {
        errors.push(`${target.name || `Target ${index + 1}`} X 엔티티가 없습니다.`);
      }
      if (!target.y) {
        errors.push(`${target.name || `Target ${index + 1}`} Y 엔티티가 없습니다.`);
      }
    });

    if (!Number.isFinite(Number(config.range_x)) || Number(config.range_x) <= 0) {
      errors.push("range_x는 0보다 큰 숫자여야 합니다.");
    }
    if (!Number.isFinite(Number(config.range_y)) || Number(config.range_y) <= 0) {
      errors.push("range_y는 0보다 큰 숫자여야 합니다.");
    }
    if (!Number.isFinite(Number(config.hold_ms)) || Number(config.hold_ms) < 0) {
      errors.push("hold_ms는 0 이상의 숫자여야 합니다.");
    }
    if (!Number.isFinite(Number(config.distance_decimals)) || Number(config.distance_decimals) < 0) {
      errors.push("distance_decimals는 0 이상의 숫자여야 합니다.");
    }

    return errors;
  }

  _usesYamlTargetsForConfig(config) {
    const hasTargets = Array.isArray(config?.targets) && config.targets.length > 0;
    // Existing YAML-only cards should keep working even before the toggle existed.
    return Boolean(config?.use_yaml_targets ?? hasTargets);
  }

  _targets() {
    if (this._usesYamlTargets()) {
      return this._config.targets;
    }

    if (!this._hass || !this._config?.device_id) {
      return [];
    }

    return this._resolveTargetsFromDevice(this._config.device_id);
  }

  _resolveTargetsFromDevice(deviceId) {
    const registry = this._hass?.entities;
    if (!registry || typeof registry !== "object") {
      return [];
    }

    // Auto mode depends on HA's entity registry, not just hass.states.
    const entities = Object.entries(registry)
      .map(([entityId, info]) => ({
        entity_id: info?.entity_id || entityId,
        device_id: info?.device_id,
        name: info?.name || "",
        original_name: info?.original_name || "",
      }))
      .filter((entity) => entity.device_id === deviceId && this._hass.states[entity.entity_id]);

    const targets = [];
    for (let index = 1; index <= 3; index += 1) {
      const x = this._findTargetAxisEntity(entities, index, "x");
      const y = this._findTargetAxisEntity(entities, index, "y");
      if (x && y) {
        targets.push({
          name: `T${index}`,
          color: this._targetColor(index - 1),
          x,
          y,
        });
      }
    }

    return targets;
  }

  _findTargetAxisEntity(entities, targetNumber, axis) {
    const patterns = [
      `tages${targetNumber}_${axis}`,
      `target_${targetNumber}_${axis}`,
      `target${targetNumber}_${axis}`,
      `target-${targetNumber}_${axis}`,
      `target_${targetNumber}_${axis}_display`,
      `타겟${targetNumber} ${axis}`,
      `타겟${targetNumber}_${axis}`,
    ].map((pattern) => this._normalize(pattern));

    let bestMatch = null;
    let bestScore = -1;

    for (const entity of entities) {
      const haystack = this._normalize([
        entity.entity_id,
        entity.name,
        entity.original_name,
      ].join(" "));

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

  _normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "");
  }

  _updateWarnings() {
    const warnings = [];
    if (!this._config || !this._hass || this._errors.length) {
      this._warnings = warnings;
      return;
    }

    this._resolvedTargets = this._targets();
    this._syncTargetSource();

    if (this._usesAutoDevice()) {
      if (!this._hass.entities || typeof this._hass.entities !== "object") {
        warnings.push("기기 자동 인식을 위한 HA 엔티티 레지스트리를 읽을 수 없습니다. targets 수동 설정을 사용하세요.");
      } else if (this._resolvedTargets.length === 0) {
        warnings.push("선택한 기기에서 Target X/Y 엔티티를 찾지 못했습니다.");
      } else if (this._resolvedTargets.length < 3) {
        warnings.push(`선택한 기기에서 ${this._resolvedTargets.length}개 Target만 자동 인식했습니다.`);
      }
    }

    this._resolvedTargets.forEach((target, index) => {
      const label = target.name || `Target ${index + 1}`;
      if (target.x && !this._hass.states[target.x]) {
        warnings.push(`${label} X 엔티티를 찾을 수 없습니다: ${target.x}`);
      }
      if (target.y && !this._hass.states[target.y]) {
        warnings.push(`${label} Y 엔티티를 찾을 수 없습니다: ${target.y}`);
      }
    });

    this._warnings = warnings;
  }

  _usesAutoDevice() {
    return Boolean(
      this._config?.device_id &&
      !this._usesYamlTargets()
    );
  }

  _usesYamlTargets() {
    return this._usesYamlTargetsForConfig(this._config);
  }

  _syncTargetSource() {
    const signature = this._resolvedTargets
      .map((target) => `${target.x || ""}|${target.y || ""}`)
      .join(";");

    if (signature !== this._targetSignature) {
      this._targetSignature = signature;
      // Drop held points when switching between YAML targets and auto-discovered device targets.
      this._lastTargets.clear();
    }
  }

  _updateTargets() {
    if (!this._config || !this._hass) return;
    this._updateWarnings();
    if (this._errors.length) return;

    const now = Date.now();
    this._resolvedTargets.forEach((target, index) => {
      const x = this._readNumber(target.x);
      const y = this._readNumber(target.y);
      const valid = x !== null && y !== null && !(x === 0 && y === 0);

      if (valid) {
        this._lastTargets.set(index, {
          name: target.name || `T${index + 1}`,
          color: target.color || this._targetColor(index),
          x,
          y,
          lastSeen: now,
          active: true,
        });
        return;
      }

      const previous = this._lastTargets.get(index);
      if (!previous) return;

      previous.active = now - previous.lastSeen <= this._config.hold_ms;
      this._lastTargets.set(index, previous);
    });
  }

  _targetColor(index) {
    return ["#ff6b7a", "#ffd166", "#06d6a0"][index] || "#d7eefc";
  }

  _toScreen(x, y, width, height, pad) {
    const usableWidth = width - pad * 2;
    const usableHeight = height - pad * 2;
    const centerX = width / 2;
    const bottomY = height - pad;
    // Radar coordinates are centered on X=0 at the sensor and extend forward on +Y.
    const screenX = centerX + (x / Number(this._config.range_x)) * (usableWidth / 2);
    const screenY = bottomY - (y / Number(this._config.range_y)) * usableHeight;
    return { x: screenX, y: screenY };
  }

  _grid(width, height, pad) {
    const centerX = width / 2;
    const bottomY = height - pad;
    const topY = pad;
    const radius = bottomY - topY;
    const lines = [];

    for (const angle of [-45, -30, -15, 0, 15, 30, 45]) {
      const rad = (angle * Math.PI) / 180;
      const x = centerX + Math.sin(rad) * radius;
      const y = bottomY - Math.cos(rad) * radius;
      lines.push(`<line x1="${centerX}" y1="${bottomY}" x2="${x}" y2="${y}" />`);
    }

    for (const fraction of [0.2, 0.4, 0.6, 0.8, 1]) {
      const r = radius * fraction;
      lines.push(`<path d="M ${centerX - r} ${bottomY} A ${r} ${r} 0 0 1 ${centerX + r} ${bottomY}" />`);
    }

    return `
      <path class="beam" d="M ${centerX} ${bottomY} L ${centerX - radius} ${bottomY - radius} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${bottomY - radius} Z" />
      <g class="grid">${lines.join("")}</g>
    `;
  }

  _targetMarkup(width, height, pad) {
    const now = Date.now();
    const targets = [];

    for (const [index, target] of this._lastTargets.entries()) {
      const age = now - target.lastSeen;
      if (age > this._config.hold_ms) continue;

      const point = this._toScreen(target.x, target.y, width, height, pad);
      const opacity = target.active ? 1 : Math.max(0, 1 - age / this._config.hold_ms);
      const distance = this._distanceLabel(target.x, target.y);
      const label = this._escape(target.name);
      targets.push(`
        <g class="target" style="--target-color:${target.color}; opacity:${opacity}">
          <circle cx="${point.x}" cy="${point.y}" r="9"></circle>
          <text x="${point.x}" y="${point.y - 18}">
            <tspan x="${point.x}" dy="0">${label}</tspan>
            ${distance ? `<tspan x="${point.x}" dy="14">${distance}</tspan>` : ""}
          </text>
        </g>
      `);
    }

    return targets.join("");
  }

  _distanceLabel(x, y) {
    if (!this._config.show_distance) return "";
    const distanceM = Math.sqrt(x * x + y * y) / 1000;
    const decimals = Math.max(0, Math.floor(Number(this._config.distance_decimals)));
    return `${distanceM.toFixed(decimals)}m`;
  }

  _activeTargetCount() {
    const now = Date.now();
    let count = 0;
    for (const target of this._lastTargets.values()) {
      if (now - target.lastSeen <= Number(this._config.hold_ms)) count += 1;
    }
    return count;
  }

  _messageMarkup() {
    const messages = [];

    if (this._errors.length) {
      messages.push(`
        <div class="message error">
          <div class="message-title">Radar Zone Card 설정 필요</div>
          ${this._errors.map((error) => `<div>${this._escape(error)}</div>`).join("")}
        </div>
      `);
    }

    if (!this._errors.length && this._warnings.length) {
      messages.push(`
        <div class="message warning">
          <div class="message-title">일부 엔티티를 찾을 수 없습니다</div>
          ${this._warnings.map((warning) => `<div>${this._escape(warning)}</div>`).join("")}
        </div>
      `);
    }

    if (!this._errors.length && !this._warnings.length && this._hass && this._activeTargetCount() === 0) {
      messages.push(`
        <div class="message info">
          <div class="message-title">현재 감지된 타겟이 없습니다</div>
        </div>
      `);
    }

    return messages.join("");
  }

  _escape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  _render() {
    if (!this._config) return;

    const width = 360;
    const height = 320;
    const pad = 24;
    const centerX = width / 2;
    const bottomY = height - pad;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          overflow: hidden;
          background: #1f2a33;
          color: #d7eefc;
        }
        .title {
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
      </style>
      <ha-card>
        <div class="title">${this._config.title}</div>
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${this._config.title}">
          ${this._grid(width, height, pad)}
          <polygon class="sensor" points="${centerX},${bottomY - 12} ${centerX - 10},${bottomY + 8} ${centerX + 10},${bottomY + 8}" />
          ${this._targetMarkup(width, height, pad)}
        </svg>
        ${this._messageMarkup()}
      </ha-card>
    `;
  }
}

customElements.define("radar-zone-card", RadarZoneCard);

class RadarZoneCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._modeForm = null;
    this._deviceForm = null;
    this._settingsForm = null;
    this._notice = null;
    this._modeSchemaCache = null;
    this._deviceSchemaCache = null;
    this._settingsSchemaCache = null;
    this._boundValueChanged = this._valueChanged.bind(this);
  }

  setConfig(config) {
    this._config = {
      title: "Radar Map",
      range_x: 3000,
      range_y: 6000,
      hold_ms: 1500,
      show_distance: true,
      distance_decimals: 2,
      ...config,
    };
    this._ensureRender();
    this._updateNotice();
    this._updateForm();
  }

  set hass(hass) {
    this._hass = hass;
    this._ensureRender();
    this._updateForm();
  }

  _modeSchema() {
    if (this._modeSchemaCache) {
      return this._modeSchemaCache;
    }

    this._modeSchemaCache = [
      { name: "use_yaml_targets", selector: { boolean: {} } },
    ];
    return this._modeSchemaCache;
  }

  _deviceSchema() {
    if (this._deviceSchemaCache) {
      return this._deviceSchemaCache;
    }

    this._deviceSchemaCache = [
      { name: "device_id", selector: { device: {} } },
    ];
    return this._deviceSchemaCache;
  }

  _settingsSchema() {
    if (this._settingsSchemaCache) {
      return this._settingsSchemaCache;
    }

    this._settingsSchemaCache = [
      { name: "title", selector: { text: {} } },
      {
        type: "grid",
        name: "",
        flatten: true,
        schema: [
          { name: "range_x", selector: { number: { min: 1, mode: "box", unit_of_measurement: "mm" } } },
          { name: "range_y", selector: { number: { min: 1, mode: "box", unit_of_measurement: "mm" } } },
        ],
      },
      {
        type: "grid",
        name: "",
        flatten: true,
        schema: [
          { name: "hold_ms", selector: { number: { min: 0, mode: "box", unit_of_measurement: "ms" } } },
          { name: "distance_decimals", selector: { number: { min: 0, mode: "box" } } },
        ],
      },
      { name: "show_distance", selector: { boolean: {} } },
    ];
    return this._settingsSchemaCache;
  }

  _computeLabel(schema) {
    const labels = {
      use_yaml_targets: "YAML 타겟 직접 설정 사용",
      device_id: "레이더 기기",
      title: "제목",
      range_x: "X 범위",
      range_y: "Y 범위",
      hold_ms: "유지 시간",
      distance_decimals: "거리 소수점 자리",
      show_distance: "거리 표시",
    };
    return labels[schema.name] || schema.name;
  }

  _computeHelper(schema) {
    const helpers = {
      use_yaml_targets: "켜면 YAML에 직접 입력한 targets만 사용합니다.",
      device_id: "ESPHome 레이더 기기를 선택합니다. YAML 타겟 직접 설정이 켜져 있으면 무시됩니다.",
      hold_ms: "깜빡임을 줄이기 위해 마지막 유효 타겟 위치를 잠시 유지합니다.",
    };
    return helpers[schema.name];
  }

  _valueChanged(event) {
    event.stopPropagation();
    const nextConfig = {
      ...this._config,
      ...event.detail.value,
    };

    this._config = nextConfig;
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: nextConfig },
      bubbles: true,
      composed: true,
    }));
    this._updateNotice();
    this._updateForm();
  }

  _ensureRender() {
    if (!this.shadowRoot || this._modeForm) return;

    // Build the editor DOM once. Recreating ha-form on every hass update makes HA pickers flicker.
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .mode-form,
        .notice,
        .device-form {
          display: block;
          margin-bottom: 24px;
        }
        .notice[hidden],
        .device-form[hidden] {
          display: none !important;
        }
        .notice {
          padding: 10px 12px;
          border-radius: 8px;
          color: var(--error-color, #db4437);
          background: color-mix(in srgb, var(--error-color, #db4437) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--error-color, #db4437) 55%, transparent);
          font-size: 13px;
          line-height: 1.45;
        }
        .notice-title {
          font-weight: 700;
          margin-bottom: 4px;
        }
      </style>
      <ha-form class="mode-form"></ha-form>
      <div class="notice" hidden>
        <div class="notice-title">YAML 타겟 직접 설정 모드</div>
        <div>YAML에 입력한 targets만 사용합니다. 이 토글을 끄기 전까지 레이더 기기 선택은 무시됩니다.</div>
      </div>
      <ha-form class="device-form"></ha-form>
      <ha-form class="settings-form"></ha-form>
    `;

    this._notice = this.shadowRoot.querySelector(".notice");
    this._modeForm = this.shadowRoot.querySelector(".mode-form");
    this._deviceForm = this.shadowRoot.querySelector(".device-form");
    this._settingsForm = this.shadowRoot.querySelector(".settings-form");

    this._setupForm(this._modeForm, this._modeSchema());
    this._setupForm(this._deviceForm, this._deviceSchema());
    this._setupForm(this._settingsForm, this._settingsSchema());
  }

  _setupForm(form, schema) {
    form.schema = schema;
    form.computeLabel = this._computeLabel.bind(this);
    form.computeHelper = this._computeHelper.bind(this);
    form.addEventListener("value-changed", this._boundValueChanged);
  }

  _updateNotice() {
    if (!this._notice) return;
    const yamlMode = Boolean(this._config?.use_yaml_targets);
    // Keep the layout slot stable: YAML mode shows the warning, auto mode shows the device picker.
    this._notice.hidden = !yamlMode;
    if (this._deviceForm) {
      this._deviceForm.hidden = yamlMode;
    }
  }

  _updateForm() {
    for (const form of [this._modeForm, this._deviceForm, this._settingsForm]) {
      if (!form) continue;
      form.hass = this._hass;
      form.data = this._config;
    }
  }
}

customElements.define("radar-zone-card-editor", RadarZoneCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "radar-zone-card",
  name: "Radar Zone Card",
  description: "Realtime radar target map for LD2450-style mmWave sensors",
});
