import { DEFAULT_CARD_CONFIG } from "../core/defaults";
import type { RadarCardConfig } from "../core/types";
import type { HaFormElement, HomeAssistantLike } from "./ha-types";
import { resolveDeviceEntitiesFromDevice } from "./ha-target-source";

type SchemaItem = { name?: string; selector?: unknown; type?: string; flatten?: boolean; schema?: SchemaItem[] };

export class RadarZoneCardEditor extends HTMLElement {
  private config: Partial<RadarCardConfig> = {};
  private hassValue: HomeAssistantLike | null = null;
  private modeForm: HaFormElement | null = null;
  private deviceForm: HaFormElement | null = null;
  private settingsForm: HaFormElement | null = null;
  private notice: HTMLElement | null = null;
  private modeSchemaCache: SchemaItem[] | null = null;
  private deviceSchemaCache: SchemaItem[] | null = null;
  private settingsSchemaCache: SchemaItem[] | null = null;
  private readonly boundValueChanged = this.valueChanged.bind(this);

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config: Partial<RadarCardConfig>): void {
    this.config = {
      title: DEFAULT_CARD_CONFIG.title,
      range_x: DEFAULT_CARD_CONFIG.range_x,
      range_y: DEFAULT_CARD_CONFIG.range_y,
      hold_ms: DEFAULT_CARD_CONFIG.hold_ms,
      show_distance: DEFAULT_CARD_CONFIG.show_distance,
      distance_decimals: DEFAULT_CARD_CONFIG.distance_decimals,
      ...config
    };
    this.ensureRender();
    this.updateNotice();
    this.updateForm();
  }

  set hass(hass: HomeAssistantLike) {
    this.hassValue = hass;
    this.ensureRender();
    this.updateForm();
  }

  private modeSchema(): SchemaItem[] {
    this.modeSchemaCache ||= [{ name: "use_yaml_targets", selector: { boolean: {} } }];
    return this.modeSchemaCache;
  }

  private deviceSchema(): SchemaItem[] {
    this.deviceSchemaCache ||= [{ name: "device_id", selector: { device: {} } }];
    return this.deviceSchemaCache;
  }

  private settingsSchema(): SchemaItem[] {
    this.settingsSchemaCache ||= [
      { name: "title", selector: { text: {} } },
      { name: "configurator_url", selector: { text: {} } },
      {
        type: "grid",
        name: "",
        flatten: true,
        schema: [
          { name: "range_x", selector: { number: { min: 1, mode: "box", unit_of_measurement: "mm" } } },
          { name: "range_y", selector: { number: { min: 1, mode: "box", unit_of_measurement: "mm" } } }
        ]
      },
      {
        type: "grid",
        name: "",
        flatten: true,
        schema: [
          { name: "hold_ms", selector: { number: { min: 0, mode: "box", unit_of_measurement: "ms" } } },
          { name: "distance_decimals", selector: { number: { min: 0, mode: "box" } } }
        ]
      },
      { name: "show_distance", selector: { boolean: {} } }
    ];
    return this.settingsSchemaCache;
  }

  private computeLabel(schema: { name?: string }): string | undefined {
    const labels: Record<string, string> = {
      use_yaml_targets: "YAML 타겟 직접 설정 사용",
      device_id: "레이더 기기",
      title: "제목",
      configurator_url: "고급 설정 URL",
      range_x: "X 범위",
      range_y: "Y 범위",
      hold_ms: "유지 시간",
      distance_decimals: "거리 소수점 자리",
      show_distance: "거리 표시"
    };
    return schema.name ? labels[schema.name] || schema.name : undefined;
  }

  private computeHelper(schema: { name?: string }): string | undefined {
    const helpers: Record<string, string> = {
      use_yaml_targets: "켜면 YAML에 직접 입력한 targets만 사용합니다.",
      device_id: "ESPHome 레이더 기기를 선택합니다. YAML 타겟 직접 설정이 켜져 있으면 무시됩니다.",
      configurator_url: "비워두면 선택한 기기의 Device IP Address 엔티티로 자동 인식합니다.",
      hold_ms: "깜빡임을 줄이기 위해 마지막 유효 타겟 위치를 잠시 유지합니다."
    };
    return schema.name ? helpers[schema.name] : undefined;
  }

  private valueChanged(event: Event): void {
    event.stopPropagation();
    const detail = (event as CustomEvent<{ value: Partial<RadarCardConfig> }>).detail;
    const value = { ...detail.value };
    const autoUrl = this.autoConfiguratorUrl();
    if (!this.config.configurator_url && value.configurator_url === autoUrl) {
      delete value.configurator_url;
    }
    const nextConfig = {
      ...this.config,
      ...value
    };

    this.config = nextConfig;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: nextConfig },
        bubbles: true,
        composed: true
      })
    );
    this.updateNotice();
    this.updateForm();
  }

  private ensureRender(): void {
    if (!this.shadowRoot || this.modeForm) return;

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

    this.notice = this.shadowRoot.querySelector(".notice");
    this.modeForm = this.shadowRoot.querySelector(".mode-form") as HaFormElement | null;
    this.deviceForm = this.shadowRoot.querySelector(".device-form") as HaFormElement | null;
    this.settingsForm = this.shadowRoot.querySelector(".settings-form") as HaFormElement | null;

    this.setupForm(this.modeForm, this.modeSchema());
    this.setupForm(this.deviceForm, this.deviceSchema());
    this.setupForm(this.settingsForm, this.settingsSchema());
  }

  private setupForm(form: HaFormElement | null, schema: SchemaItem[]): void {
    if (!form) return;
    form.schema = schema;
    form.computeLabel = this.computeLabel.bind(this);
    form.computeHelper = this.computeHelper.bind(this);
    form.addEventListener("value-changed", this.boundValueChanged);
  }

  private updateNotice(): void {
    if (!this.notice) return;
    const yamlMode = Boolean(this.config.use_yaml_targets);
    this.notice.hidden = !yamlMode;
    if (this.deviceForm) {
      this.deviceForm.hidden = yamlMode;
    }
  }

  private updateForm(): void {
    const formData = {
      ...this.config,
      configurator_url: this.config.configurator_url || this.autoConfiguratorUrl()
    };
    for (const form of [this.modeForm, this.deviceForm, this.settingsForm]) {
      if (!form) continue;
      form.hass = this.hassValue;
      form.data = formData;
    }
  }

  private autoConfiguratorUrl(): string {
    if (!this.config.device_id || !this.hassValue) return "";
    const entities = resolveDeviceEntitiesFromDevice(this.config.device_id, this.hassValue);
    const ipAddress = entities.ipAddress ? this.hassValue.states[entities.ipAddress]?.state?.trim() : "";
    if (!ipAddress || ipAddress === "unknown" || ipAddress === "unavailable") return "";
    return `http://${ipAddress}/`;
  }
}
