//#region src/core/defaults.ts
var e = {
	title: "Radar Map",
	range_x: 3e3,
	range_y: 6e3,
	hold_ms: 1500,
	show_distance: !0,
	distance_decimals: 2,
	targets: [],
	device_id: "",
	configurator_url: "",
	use_yaml_targets: void 0,
	selected_zone: "zone_1",
	zone_names: {}
};
function t(e) {
	return [
		"#ff6b7a",
		"#ffd166",
		"#06d6a0"
	][e] || "#d7eefc";
}
function n(e) {
	return {
		zone_1: "Zone 1",
		zone_2: "Zone 2",
		zone_3: "Zone 3"
	}[e];
}
//#endregion
//#region src/core/html.ts
function r(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function i(e, t, n) {
	let r = n.width - n.pad * 2, i = n.height - n.pad * 2, a = n.width / 2, o = n.height - n.pad;
	return {
		x: a + e / n.rangeX * (r / 2),
		y: o - t / n.rangeY * i
	};
}
function a(e, t, n) {
	let r = n.width - n.pad * 2, i = n.height - n.pad * 2, a = n.width / 2, o = n.height - n.pad;
	return {
		x: (e - a) / (r / 2) * n.rangeX,
		y: (o - t) / i * n.rangeY
	};
}
function o(e, t = 120) {
	let n = t / 2 * Math.PI / 180;
	return Math.sin(n) * e;
}
function s(e, t) {
	let n = t * Math.PI / 180;
	return {
		x: Math.sin(n) * e,
		y: Math.cos(n) * e
	};
}
function c(e, t, n) {
	if (t < 0 || Math.sqrt(e * e + t * t) > n.rangeY) return !1;
	let r = 180 / Math.PI * Math.atan2(e, t);
	return Math.abs(r) <= n.fovDegrees / 2;
}
function l(e, t) {
	return Math.sqrt(e * e + t * t) / 1e3;
}
function u(e, t, n, r) {
	if (!n) return "";
	let i = Math.max(0, Math.floor(Number(r)));
	return `${l(e, t).toFixed(i)}m`;
}
//#endregion
//#region src/core/radar-svg.ts
function d(e) {
	let t = e.width / 2, n = e.height - e.pad, r = e.fovDegrees / 2;
	return `
    <path class="beam" d="M ${t} ${n} L ${m(e.rangeY, -r, r, e, !1)} Z" />
    <g class="grid">${[
		-60,
		-30,
		0,
		30,
		60
	].filter((e) => Math.abs(e) <= r).map((r) => {
		let a = i(...h(e.rangeY, r), e), o = i(...h(e.rangeY * .92, r), e);
		return `
        <line x1="${t}" y1="${n}" x2="${a.x}" y2="${a.y}" />
        <text class="angle-label" x="${o.x}" y="${o.y}">${r}°</text>
      `;
	}).join("")}${p(e.rangeY).map((t) => {
		let n = i(0, t, e);
		return `
        <path d="${m(t, -r, r, e)}" />
        <text class="distance-label" x="${n.x + 5}" y="${n.y - 5}">${t / 1e3}m</text>
      `;
	}).join("")}</g>
  `;
}
function f(e, t, n, a = Date.now()) {
	return e.map((e) => {
		let o = a - e.lastSeen, s = i(e.x, e.y, n), l = c(e.x, e.y, n), d = (e.active ? 1 : Math.max(0, 1 - o / t.hold_ms)) * (l ? 1 : .35), f = u(e.x, e.y, t.show_distance, t.distance_decimals), p = r(e.name);
		return `
        <g class="target${l ? "" : " out-of-coverage"}" style="--target-color:${e.color}; opacity:${d}">
          <circle cx="${s.x}" cy="${s.y}" r="9"></circle>
          <text x="${s.x}" y="${s.y - 18}">
            <tspan x="${s.x}" dy="0">${p}</tspan>
            ${f ? `<tspan x="${s.x}" dy="14">${f}</tspan>` : ""}
          </text>
        </g>
      `;
	}).join("");
}
function p(e) {
	let t = [];
	for (let n = 1e3; n <= e; n += 1e3) t.push(n);
	return t;
}
function m(e, t, n, r, a = !0) {
	let o = [];
	for (let s = 0; s <= 36; s += 1) {
		let c = i(...h(e, t + (n - t) * s / 36), r), l = s === 0 ? a ? "M " : "" : "L ";
		o.push(`${l}${c.x} ${c.y}`);
	}
	return o.join(" ");
}
function h(e, t) {
	let n = s(e, t);
	return [n.x, n.y];
}
function g(e, t, n = !1) {
	return e.map((e) => _(e, t, n)).join("");
}
function _(e, t, n) {
	let a = Math.min(e.x1, e.x2), o = Math.max(e.x1, e.x2), s = Math.min(e.y1, e.y2), c = Math.max(e.y1, e.y2);
	if (a === o || s === c) return "";
	let l = i(a, c, t), u = i(o, s, t), d = u.x - l.x, f = u.y - l.y, p = l.x + d / 2, m = l.y + Math.max(18, Math.min(f / 2, 34)), h = e.customName?.trim(), g = n && e.selected ? v(e, t) : "";
	return `
    <g class="zone-rect${e.selected ? " selected" : ""}${e.placeholder ? " placeholder" : ""}">
      <rect
        x="${l.x}"
        y="${l.y}"
        width="${d}"
        height="${f}"
        ${n ? `data-zone-drag="move" data-zone-id="${e.zoneId}"` : ""}
      />
      <text x="${p}" y="${m}">
        <tspan x="${p}" dy="0">${r(e.label)}</tspan>
        ${h ? `<tspan x="${p}" dy="14">${r(h)}</tspan>` : ""}
      </text>
      ${g}
    </g>
  `;
}
function v(e, t) {
	return [
		[
			"x1y1",
			e.x1,
			e.y1
		],
		[
			"x1y2",
			e.x1,
			e.y2
		],
		[
			"x2y1",
			e.x2,
			e.y1
		],
		[
			"x2y2",
			e.x2,
			e.y2
		]
	].map(([n, r, a]) => {
		let o = i(r, a, t);
		return `
        <circle
          class="zone-handle"
          cx="${o.x}"
          cy="${o.y}"
          r="7"
          data-zone-drag="resize"
          data-zone-id="${e.zoneId}"
          data-zone-corner="${n}"
        />
      `;
	}).join("");
}
//#endregion
//#region src/core/target-store.ts
var y = class {
	constructor() {
		this.lastTargets = /* @__PURE__ */ new Map(), this.targetSignature = "";
	}
	syncSource(e) {
		let t = e.map((e) => `${e.x || ""}|${e.y || ""}`).join(";");
		t !== this.targetSignature && (this.targetSignature = t, this.lastTargets.clear());
	}
	update(e, t, n, r = Date.now()) {
		this.syncSource(e), e.forEach((e, i) => {
			let a = n(e.x), o = n(e.y);
			if (a !== null && o !== null && !(a === 0 && o === 0)) {
				this.lastTargets.set(i, {
					name: e.name,
					color: e.color,
					x: a,
					y: o,
					lastSeen: r,
					active: !0
				});
				return;
			}
			let s = this.lastTargets.get(i);
			s && (s.active = r - s.lastSeen <= t, this.lastTargets.set(i, s));
		});
	}
	activeTargets(e, t = Date.now()) {
		return [...this.lastTargets.values()].filter((n) => t - n.lastSeen <= e);
	}
	activeCount(e, t = Date.now()) {
		return this.activeTargets(e, t).length;
	}
}, b = "\n  :host {\n    display: block;\n  }\n  ha-card {\n    overflow: hidden;\n    background: #1f2a33;\n    color: #d7eefc;\n  }\n  .card-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 8px;\n    padding: 12px 14px 4px;\n  }\n  .title {\n    min-width: 0;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n    font-size: 16px;\n    font-weight: 600;\n  }\n  .card-actions {\n    display: flex;\n    flex: 0 0 auto;\n    align-items: center;\n    gap: 6px;\n  }\n  .zone-button,\n  .configurator-button,\n  .dialog-close,\n  .danger-button {\n    border: 1px solid rgba(123, 184, 216, 0.42);\n    border-radius: 6px;\n    background: rgba(123, 184, 216, 0.12);\n    color: #d7eefc;\n    cursor: pointer;\n    font: inherit;\n  }\n  .zone-button {\n    flex: 0 0 auto;\n    padding: 5px 8px;\n    font-size: 12px;\n  }\n  .zone-button:hover,\n  .configurator-button:hover,\n  .dialog-close:hover {\n    background: rgba(123, 184, 216, 0.22);\n  }\n  .configurator-button {\n    flex: 0 0 auto;\n    padding: 5px 8px;\n    font-size: 12px;\n  }\n  .danger-button {\n    width: 100%;\n    margin-bottom: 8px;\n    padding: 8px 10px;\n    border-color: rgba(255, 107, 122, 0.48);\n    background: rgba(255, 107, 122, 0.12);\n    color: #ffd7dd;\n    font-size: 13px;\n  }\n  .danger-button:hover {\n    background: rgba(255, 107, 122, 0.2);\n  }\n  .dialog-close {\n    width: 32px;\n    height: 32px;\n    font-size: 18px;\n    line-height: 1;\n  }\n  .dialog-title {\n    padding: 12px 14px 4px;\n    font-size: 16px;\n    font-weight: 600;\n  }\n  svg {\n    display: block;\n    width: 100%;\n    height: auto;\n    background: #1f2a33;\n  }\n  .dialog-map svg {\n    touch-action: none;\n  }\n  .beam {\n    fill: rgba(88, 172, 214, 0.24);\n    stroke: rgba(123, 184, 216, 0.65);\n    stroke-width: 1.4;\n  }\n  .grid line,\n  .grid path {\n    fill: none;\n    stroke: rgba(123, 184, 216, 0.38);\n    stroke-width: 1;\n  }\n  .grid text {\n    fill: rgba(215, 238, 252, 0.55);\n    font-size: 10px;\n    text-anchor: middle;\n    paint-order: stroke;\n    stroke: rgba(31, 42, 51, 0.72);\n    stroke-width: 3px;\n  }\n  .grid .distance-label {\n    text-anchor: start;\n  }\n  .sensor {\n    fill: #ffffff;\n  }\n  .target circle {\n    fill: var(--target-color);\n    stroke: rgba(255, 255, 255, 0.82);\n    stroke-width: 1.5;\n  }\n  .target text {\n    fill: #ffffff;\n    font-size: 13px;\n    font-weight: 700;\n    text-anchor: middle;\n    paint-order: stroke;\n    stroke: rgba(0, 0, 0, 0.45);\n    stroke-width: 3px;\n  }\n  .target.out-of-coverage circle {\n    stroke-dasharray: 3 2;\n  }\n  .zone-rect rect,\n  .zone-rect polygon {\n    fill: rgba(123, 184, 216, 0.08);\n    stroke: rgba(123, 184, 216, 0.55);\n    stroke-width: 1.5;\n    stroke-dasharray: 8 5;\n  }\n  .dialog-map .zone-rect rect {\n    cursor: move;\n    pointer-events: all;\n  }\n  .zone-rect.selected rect {\n    fill: rgba(255, 209, 102, 0.15);\n    stroke: rgba(255, 209, 102, 0.95);\n    stroke-width: 2.2;\n  }\n  .zone-rect.placeholder rect {\n    fill: rgba(255, 209, 102, 0.08);\n    stroke-dasharray: 4 4;\n  }\n  .zone-rect.advanced polygon {\n    stroke-dasharray: 8 5;\n  }\n  .zone-rect.advanced.detection polygon {\n    fill: rgba(255, 209, 102, 0.1);\n    stroke: rgba(255, 209, 102, 0.9);\n  }\n  .zone-rect.advanced.filter polygon {\n    fill: rgba(255, 107, 122, 0.1);\n    stroke: rgba(255, 107, 122, 0.9);\n  }\n  .zone-rect.advanced.reduced polygon {\n    fill: rgba(123, 184, 216, 0.12);\n    stroke: rgba(123, 184, 216, 0.9);\n  }\n  .zone-rect.advanced.calibration polygon {\n    stroke-dasharray: 3 4;\n  }\n  .zone-rect.advanced.calibration text {\n    fill: #ffd7dd;\n  }\n  .zone-rect.advanced.disabled polygon {\n    fill: rgba(160, 174, 184, 0.06);\n    stroke: rgba(160, 174, 184, 0.62);\n  }\n  .zone-rect text {\n    fill: rgba(215, 238, 252, 0.88);\n    font-size: 12px;\n    font-weight: 700;\n    text-anchor: middle;\n    pointer-events: none;\n    paint-order: stroke;\n    stroke: rgba(0, 0, 0, 0.5);\n    stroke-width: 3px;\n  }\n  .zone-rect.selected text {\n    fill: #fff3c4;\n  }\n  .zone-handle {\n    fill: #fff3c4;\n    stroke: rgba(31, 42, 51, 0.95);\n    stroke-width: 2;\n    cursor: grab;\n    pointer-events: all;\n  }\n  .zone-handle:active {\n    cursor: grabbing;\n  }\n  .message {\n    margin: 0 12px 12px;\n    padding: 10px 12px;\n    border-radius: 8px;\n    font-size: 13px;\n    line-height: 1.45;\n  }\n  .message-title {\n    font-weight: 700;\n    margin-bottom: 4px;\n  }\n  .message.error {\n    background: rgba(255, 107, 122, 0.16);\n    border: 1px solid rgba(255, 107, 122, 0.5);\n  }\n  .message.warning {\n    background: rgba(255, 209, 102, 0.14);\n    border: 1px solid rgba(255, 209, 102, 0.45);\n  }\n  .message.info {\n    background: rgba(123, 184, 216, 0.12);\n    border: 1px solid rgba(123, 184, 216, 0.36);\n  }\n  .dialog-backdrop {\n    position: fixed;\n    inset: 0;\n    z-index: 2147483640;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    padding: 18px;\n    background: rgba(5, 12, 18, 0.72);\n  }\n  .dialog {\n    width: min(960px, 100%);\n    max-height: min(760px, calc(100vh - 36px));\n    overflow: auto;\n    border: 1px solid rgba(123, 184, 216, 0.34);\n    border-radius: 8px;\n    background: #1f2a33;\n    color: #d7eefc;\n    box-shadow: 0 24px 72px rgba(0, 0, 0, 0.48);\n  }\n  .dialog-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 12px;\n    padding: 12px 14px;\n    border-bottom: 1px solid rgba(123, 184, 216, 0.18);\n  }\n  .dialog-heading {\n    min-width: 0;\n  }\n  .dialog-heading-title {\n    font-size: 17px;\n    font-weight: 700;\n  }\n  .dialog-heading-subtitle {\n    margin-top: 2px;\n    font-size: 12px;\n    color: rgba(215, 238, 252, 0.7);\n  }\n  .dialog-body {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr) 220px;\n    gap: 14px;\n    padding: 14px;\n  }\n  .dialog-map {\n    min-width: 0;\n    border: 1px solid rgba(123, 184, 216, 0.18);\n    border-radius: 8px;\n    overflow: hidden;\n  }\n  .dialog-panel {\n    display: grid;\n    align-content: start;\n    gap: 10px;\n  }\n  .panel-section {\n    padding: 10px;\n    border: 1px solid rgba(123, 184, 216, 0.18);\n    border-radius: 8px;\n    background: rgba(123, 184, 216, 0.08);\n  }\n  .panel-section-warning {\n    border-color: rgba(255, 209, 102, 0.42);\n    background: rgba(255, 209, 102, 0.12);\n  }\n  .panel-button {\n    width: 100%;\n  }\n  .panel-label {\n    margin-bottom: 4px;\n    font-size: 11px;\n    color: rgba(215, 238, 252, 0.62);\n  }\n  .panel-value {\n    font-size: 14px;\n    font-weight: 700;\n  }\n  .panel-note {\n    font-size: 12px;\n    line-height: 1.45;\n    color: rgba(215, 238, 252, 0.74);\n  }\n  .zone-segments {\n    display: grid;\n    grid-template-columns: repeat(3, 1fr);\n    gap: 6px;\n  }\n  .zone-segment {\n    display: grid;\n    gap: 2px;\n    min-width: 0;\n    padding: 7px 4px;\n    border: 1px solid rgba(123, 184, 216, 0.24);\n    border-radius: 6px;\n    background: rgba(123, 184, 216, 0.08);\n    color: #d7eefc;\n    cursor: pointer;\n    font: inherit;\n    text-align: center;\n    font-size: 12px;\n  }\n  .zone-segment-custom {\n    min-width: 0;\n    overflow: hidden;\n    color: rgba(215, 238, 252, 0.68);\n    font-size: 10px;\n    font-weight: 400;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n  }\n  .zone-segment.active .zone-segment-custom {\n    color: rgba(255, 243, 196, 0.78);\n  }\n  .zone-name-input {\n    width: 100%;\n    box-sizing: border-box;\n    padding: 8px 9px;\n    border: 1px solid rgba(123, 184, 216, 0.26);\n    border-radius: 6px;\n    background: rgba(5, 12, 18, 0.18);\n    color: #d7eefc;\n    font: inherit;\n    font-size: 13px;\n  }\n  .zone-name-input:focus {\n    border-color: rgba(255, 209, 102, 0.75);\n    outline: none;\n  }\n  .zone-segment:hover {\n    background: rgba(123, 184, 216, 0.18);\n  }\n  .zone-segment.active {\n    border-color: rgba(255, 209, 102, 0.72);\n    background: rgba(255, 209, 102, 0.16);\n    color: #fff3c4;\n  }\n  @media (max-width: 720px) {\n    .dialog-backdrop {\n      align-items: stretch;\n      padding: 10px;\n    }\n    .dialog {\n      max-height: calc(100vh - 20px);\n    }\n    .dialog-body {\n      grid-template-columns: 1fr;\n    }\n  }\n";
//#endregion
//#region src/ha/ha-target-source.ts
function x(e) {
	let t = Array.isArray(e.targets) && e.targets.length > 0;
	return !!(e.use_yaml_targets ?? t);
}
function S(e, t) {
	return x(e) ? R(e.targets) : !t || !e.device_id ? [] : C(e.device_id, t);
}
function C(e, n) {
	let r = I(e, n), i = [];
	for (let e = 1; e <= 3; e += 1) {
		let n = E(r, e, "x"), a = E(r, e, "y");
		n && a && i.push({
			name: `T${e}`,
			color: t(e - 1),
			x: n,
			y: a
		});
	}
	return i;
}
function w(e, t, n) {
	let r = { zoneId: t }, i = Number(t.replace("zone_", "")), a = I(e, n);
	for (let e of [
		"x1",
		"y1",
		"x2",
		"y2"
	]) r[e] = D(a, i, e) || void 0;
	return r.name = O(a, i) || void 0, r;
}
function T(e, t) {
	let n = I(e, t);
	return {
		ipAddress: k(n) || void 0,
		customZoneConfigured: A(n) || void 0,
		zoneSummary: j(n) || void 0,
		zoneConfigJson: M(n) || void 0,
		softwareZoneConfigs: N(n),
		calibrationZoneConfigs: P(n)
	};
}
function E(e, t, n) {
	return L(e, [
		`tages${t}_${n}`,
		`target_${t}_${n}`,
		`target${t}_${n}`,
		`target-${t}_${n}`,
		`target_${t}_${n}_display`,
		`타겟${t} ${n}`,
		`타겟${t}_${n}`
	].map((e) => F(e)));
}
function D(e, t, n) {
	return L(e, [
		`zone${t}${n}`,
		`zone_${t}_${n}`,
		`zone-${t}-${n}`,
		`zone ${t} ${n}`
	].map((e) => F(e)));
}
function O(e, t) {
	return L(e, [
		`zone${t}name`,
		`zone_${t}_name`,
		`zone-${t}-name`,
		`zone ${t} name`
	].map((e) => F(e)));
}
function k(e) {
	return L(e, [
		"deviceipaddress",
		"ipaddress",
		"wifiip",
		"wifiinfoipaddress"
	].map((e) => F(e)));
}
function A(e) {
	return L(e, [
		"customzoneconfigured",
		"advancedzoneconfigured",
		"zoneconfigured"
	].map((e) => F(e)));
}
function j(e) {
	return L(e, ["zonesummary", "zoneconfigsummary"].map((e) => F(e)));
}
function M(e) {
	return L(e, [
		"zoneconfigjson",
		"zonejson",
		"advancedzoneconfig"
	].map((e) => F(e)));
}
function N(e) {
	let t = [];
	for (let n = 1; n <= 6; n += 1) {
		let r = [
			`softwarezone${n}config`,
			`software_zone_${n}_config`,
			`software zone ${n} config`
		].map((e) => F(e));
		t.push(L(e, r) || "");
	}
	return t;
}
function P(e) {
	let t = [];
	for (let n = 1; n <= 4; n += 1) {
		let r = [
			`calibrationfilter${n}config`,
			`calibration_filter_${n}_config`,
			`calibration filter ${n} config`,
			`calibration${n}config`,
			`calibration_${n}_config`
		].map((e) => F(e));
		t.push(L(e, r) || "");
	}
	return t;
}
function F(e) {
	return String(e || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}
function I(e, t) {
	let n = t.entities;
	return !n || typeof n != "object" ? [] : Object.entries(n).map(([e, t]) => z(e, t)).filter((n) => n.device_id === e && t.states[n.entity_id]);
}
function L(e, t) {
	let n = null, r = -1;
	for (let i of e) {
		let e = F([
			i.entity_id,
			i.name,
			i.original_name
		].join(" "));
		for (let a of t) {
			if (!e.includes(a)) continue;
			let t = a.length;
			t > r && (r = t, n = i.entity_id);
		}
	}
	return n;
}
function R(e) {
	return e.map((e, n) => ({
		name: e.name || `T${n + 1}`,
		color: e.color || t(n),
		x: e.x,
		y: e.y
	}));
}
function z(e, t) {
	return {
		entity_id: t?.entity_id || e,
		device_id: t?.device_id,
		name: t?.name || "",
		original_name: t?.original_name || ""
	};
}
//#endregion
//#region src/ha/radar-zone-card.ts
var B = class extends HTMLElement {
	constructor() {
		super(), this.config = null, this.hassValue = null, this.targetStore = new y(), this.errors = [], this.warnings = [], this.resolvedTargets = [], this.zoneDialogOpen = !1, this.zoneDrafts = {}, this.zoneDrag = null, this.handleZoneDragMove = (e) => {
			if (!this.zoneDrag || e.pointerId !== this.zoneDrag.pointerId) return;
			let t = this.shadowRoot?.querySelector("[data-radar-dialog-map] svg"), n = t ? this.pointerToRadarPoint(e, t) : null;
			if (!n) return;
			e.preventDefault();
			let r = this.zoneDrag.mode === "move" ? this.movedZoneRect(this.zoneDrag.startRect, this.zoneDrag.startPoint, n) : this.resizedZoneRect(this.zoneDrag.startRect, this.zoneDrag.corner, n);
			this.zoneDrafts[this.zoneDrag.zoneId] = r, this.updateRadarOnly();
		}, this.handleZoneDragEnd = (e) => {
			if (!this.zoneDrag || e.pointerId !== this.zoneDrag.pointerId) return;
			e.preventDefault();
			let t = this.zoneDrag.zoneId;
			this.zoneDrag = null, window.removeEventListener("pointermove", this.handleZoneDragMove), window.removeEventListener("pointerup", this.handleZoneDragEnd), window.removeEventListener("pointercancel", this.handleZoneDragEnd), this.commitZoneRect(t), this.render();
		}, this.attachShadow({ mode: "open" });
	}
	static getStubConfig() {
		return {
			title: "Radar Map",
			range_x: 3e3,
			range_y: 6e3,
			hold_ms: 1500,
			show_distance: !0,
			distance_decimals: 2
		};
	}
	static getConfigElement() {
		return document.createElement("radar-zone-card-editor");
	}
	setConfig(t) {
		let n = [];
		(!t || typeof t != "object") && (n.push("카드 설정을 읽을 수 없습니다."), t = {});
		let r = Array.isArray(t.targets) && t.targets.length > 0, i = t.use_yaml_targets ?? r;
		i && !r && n.push("YAML 타겟 직접 설정이 켜져 있지만 targets 설정이 없습니다."), !i && !t.device_id && n.push("기기 자동 인식을 사용하려면 레이더 기기를 선택하세요."), this.config = {
			...e,
			...t,
			targets: t.targets || e.targets
		}, this.errors = [...n, ...this.validateConfig(this.config)], this.render();
	}
	set hass(e) {
		if (this.hassValue = e, this.updateTargets(), this.zoneDrag) {
			this.updateRadarOnly();
			return;
		}
		if (this.isEditingZoneName()) {
			this.updateRadarOnly();
			return;
		}
		this.render();
	}
	getCardSize() {
		return 4;
	}
	readNumber(e) {
		if (!e) return null;
		let t = this.hassValue?.states?.[e]?.state, n = Number.parseFloat(String(t));
		return Number.isFinite(n) ? n : null;
	}
	zoneRect(e) {
		let t = this.zoneDrafts[e];
		if (t) return t;
		if (!this.config || !this.hassValue || !this.config.device_id) return null;
		let n = w(this.config.device_id, e, this.hassValue);
		if (!n.x1 || !n.y1 || !n.x2 || !n.y2) return null;
		let r = this.readNumber(n.x1), i = this.readNumber(n.y1), a = this.readNumber(n.x2), o = this.readNumber(n.y2);
		return r === null || i === null || a === null || o === null ? null : {
			zoneId: e,
			x1: r,
			y1: i,
			x2: a,
			y2: o
		};
	}
	selectedZoneRect() {
		return this.config ? this.zoneRect(this.config.selected_zone) : null;
	}
	isEmptyZoneRect(e) {
		return e ? e.x1 === e.x2 || e.y1 === e.y2 : !0;
	}
	editableZoneRect(e) {
		let t = this.zoneRect(e);
		return this.hasAdvancedZoneConfig() || !this.isEmptyZoneRect(t) ? t : e !== this.config?.selected_zone || !this.zoneDialogOpen ? null : this.defaultZoneRect(e);
	}
	defaultZoneRect(e) {
		let t = this.zoneBounds(e), n = t?.x.min ?? -1e3, r = t?.x.max ?? 1e3, i = t?.y.min ?? 0, a = t?.y.max ?? 2e3, o = Math.min(1200, Math.max(400, r - n)), s = Math.min(1200, Math.max(400, a - i)), c = this.clamp(0, n + o / 2, r - o / 2), l = this.clamp(800, i, Math.max(i, a - s));
		return {
			zoneId: e,
			x1: Math.round(c - o / 2),
			x2: Math.round(c + o / 2),
			y1: Math.round(l),
			y2: Math.round(l + s)
		};
	}
	zoneCustomName(e) {
		let t = this.zoneNameEntity(e), r = t ? this.hassValue?.states[t]?.state?.trim() : "";
		return r && r !== "unknown" && r !== "unavailable" && r !== n(e) ? r : this.config?.zone_names?.[e]?.trim() || "";
	}
	zoneNameEntity(e) {
		return !this.config?.device_id || !this.hassValue ? null : w(this.config.device_id, e, this.hassValue).name || null;
	}
	deviceEntity(e) {
		return !this.config?.device_id || !this.hassValue ? null : T(this.config.device_id, this.hassValue)[e] || null;
	}
	entityState(e) {
		return e && this.hassValue?.states[e]?.state?.trim() || "";
	}
	hasCustomZoneConfiguredFlag() {
		let e = this.entityState(this.deviceEntity("customZoneConfigured")).toLowerCase();
		return [
			"on",
			"true",
			"yes",
			"1"
		].includes(e);
	}
	hasAdvancedZoneConfig() {
		return this.hasAdvancedZoneDataConfig() || this.hasCustomZoneConfiguredFlag();
	}
	hasAdvancedZoneDataConfig() {
		return this.advancedZones().length > 0;
	}
	softwareZoneConfigStates() {
		if (!this.config?.device_id || !this.hassValue) return [];
		let e = T(this.config.device_id, this.hassValue);
		return [...e.softwareZoneConfigs, ...e.calibrationZoneConfigs].map((e) => this.entityState(e)).filter((e) => e && e !== "unknown" && e !== "unavailable" && e !== "__EMPTY__");
	}
	advancedZoneFromConfig(e) {
		try {
			let t = JSON.parse(e);
			return this.normalizeAdvancedZone(t);
		} catch {
			return null;
		}
	}
	normalizeAdvancedZone(e) {
		if (typeof e.id != "string" || !Array.isArray(e.points)) return null;
		let t = e.points.map((e) => {
			if (!Array.isArray(e) || e.length < 2) return null;
			let t = Number(e[0]), n = Number(e[1]);
			return Number.isFinite(t) && Number.isFinite(n) ? [t, n] : null;
		}).filter((e) => e !== null).slice(0, 8);
		return t.length < 3 ? null : {
			id: e.id,
			name: typeof e.name == "string" ? e.name : "",
			type: typeof e.type == "string" ? e.type : "detection",
			points: t,
			calibration: e.id.startsWith("calibration_")
		};
	}
	advancedZonesFromFullJson() {
		let e = this.entityState(this.deviceEntity("zoneConfigJson"));
		if (!e || e === "unknown" || e === "unavailable" || e === "{}") return [];
		try {
			let t = JSON.parse(e);
			return t.advanced ? [...Array.isArray(t.zones) ? t.zones : [], ...Array.isArray(t.calibrationZones) ? t.calibrationZones : []].map((e) => this.normalizeAdvancedZone(e)).filter((e) => e !== null) : [];
		} catch {
			return [];
		}
	}
	advancedZones() {
		let e = this.softwareZoneConfigStates().map((e) => this.advancedZoneFromConfig(e)).filter((e) => e !== null);
		return e.length > 0 ? e : this.advancedZonesFromFullJson();
	}
	deviceZoneSummary() {
		let e = this.entityState(this.deviceEntity("zoneSummary"));
		return e && e !== "unknown" && e !== "unavailable" ? e : "고급 Zone 설정 정보가 없습니다.";
	}
	zoneDisplays() {
		if (!this.config) return [];
		let e = this.hasAdvancedZoneDataConfig();
		return [
			"zone_1",
			"zone_2",
			"zone_3"
		].map((t) => {
			let r = this.zoneRect(t), i = e ? r : this.editableZoneRect(t);
			return i ? {
				...i,
				label: n(t),
				customName: this.zoneCustomName(t),
				selected: t === this.config?.selected_zone,
				placeholder: !e && this.isEmptyZoneRect(r)
			} : null;
		}).filter((e) => e !== null);
	}
	isEditingZoneName() {
		return this.shadowRoot?.activeElement?.hasAttribute("data-zone-name-input") ?? !1;
	}
	updateRadarOnly() {
		let e = this.shadowRoot?.querySelector("[data-radar-main]");
		e && (e.innerHTML = this.radarSvgMarkup(360, 320, 24));
		let t = this.shadowRoot?.querySelector("[data-radar-dialog-map]");
		t && (t.innerHTML = this.radarSvgMarkup(720, 520, 32, !0)), this.attachRadarDragEvents();
	}
	validateConfig(e) {
		let t = [];
		return (x(e) ? e.targets : []).forEach((e, n) => {
			if (!e || typeof e != "object") {
				t.push(`Target ${n + 1} 설정이 올바르지 않습니다.`);
				return;
			}
			e.x || t.push(`${e.name || `Target ${n + 1}`} X 엔티티가 없습니다.`), e.y || t.push(`${e.name || `Target ${n + 1}`} Y 엔티티가 없습니다.`);
		}), (!Number.isFinite(Number(e.range_x)) || Number(e.range_x) <= 0) && t.push("X 범위는 0보다 큰 숫자여야 합니다."), (!Number.isFinite(Number(e.range_y)) || Number(e.range_y) <= 0) && t.push("Y 범위는 0보다 큰 숫자여야 합니다."), (!Number.isFinite(Number(e.hold_ms)) || Number(e.hold_ms) < 0) && t.push("유지 시간은 0 이상의 숫자여야 합니다."), (!Number.isFinite(Number(e.distance_decimals)) || Number(e.distance_decimals) < 0) && t.push("거리 소수점 자리는 0 이상의 숫자여야 합니다."), t;
	}
	updateWarnings() {
		let e = [];
		if (!this.config || !this.hassValue || this.errors.length) {
			this.warnings = e;
			return;
		}
		this.resolvedTargets = S(this.config, this.hassValue), this.usesAutoDevice() && (!this.hassValue.entities || typeof this.hassValue.entities != "object" ? e.push("기기 자동 인식을 위한 HA 엔티티 레지스트리를 읽을 수 없습니다. 수동 targets 설정을 사용하세요.") : this.resolvedTargets.length === 0 ? e.push("선택한 기기에서 Target X/Y 엔티티를 찾지 못했습니다.") : this.resolvedTargets.length < 3 && e.push(`선택한 기기에서 ${this.resolvedTargets.length}개 Target만 자동 인식했습니다.`)), this.resolvedTargets.forEach((t, n) => {
			let r = t.name || `Target ${n + 1}`;
			t.x && !this.hassValue?.states[t.x] && e.push(`${r} X 엔티티를 찾을 수 없습니다: ${t.x}`), t.y && !this.hassValue?.states[t.y] && e.push(`${r} Y 엔티티를 찾을 수 없습니다: ${t.y}`);
		}), this.warnings = e;
	}
	usesAutoDevice() {
		return !!(this.config?.device_id && !x(this.config));
	}
	updateTargets() {
		!this.config || !this.hassValue || (this.updateWarnings(), !this.errors.length && this.targetStore.update(this.resolvedTargets, Number(this.config.hold_ms), (e) => this.readNumber(e)));
	}
	messageMarkup() {
		let e = [];
		return this.errors.length && e.push(`
        <div class="message error">
          <div class="message-title">Radar Zone Card 설정 필요</div>
          ${this.errors.map((e) => `<div>${r(e)}</div>`).join("")}
        </div>
      `), !this.errors.length && this.warnings.length && e.push(`
        <div class="message warning">
          <div class="message-title">일부 엔티티를 찾을 수 없습니다</div>
          ${this.warnings.map((e) => `<div>${r(e)}</div>`).join("")}
        </div>
      `), !this.errors.length && !this.warnings.length && this.hassValue && this.targetStore.activeCount(Number(this.config?.hold_ms || 0)) === 0 && e.push("\n        <div class=\"message info\">\n          <div class=\"message-title\">현재 감지된 타겟이 없습니다</div>\n        </div>\n      "), e.join("");
	}
	radarViewport(e, t, n) {
		let r = Number(this.config?.range_y || 6e3), i = o(r, 120);
		return {
			width: e,
			height: t,
			pad: n,
			rangeX: Math.max(Number(this.config?.range_x || 0), i),
			rangeY: r,
			fovDegrees: 120
		};
	}
	radarSvgMarkup(e, t, n, i = !1) {
		if (!this.config) return "";
		let a = e / 2, o = t - n, s = this.radarViewport(e, t, n), c = this.targetStore.activeTargets(Number(this.config.hold_ms)), l = this.zoneDisplays(), u = this.hasAdvancedZoneDataConfig(), p = u ? this.renderAdvancedZones(s) : "";
		return `
      <svg viewBox="0 0 ${e} ${t}" role="img" aria-label="${r(this.config.title)}">
        ${d(s)}
        ${u ? p : g(l, s, i)}
        <polygon class="sensor" points="${a},${o - 12} ${a - 10},${o + 8} ${a + 10},${o + 8}" />
        ${f(c, this.config, s)}
      </svg>
    `;
	}
	renderAdvancedZones(e) {
		return this.advancedZones().map((t) => {
			let n = t.points.map(([t, n]) => i(t, n, e)), a = n.map((e) => `${e.x},${e.y}`).join(" "), o = n[0], s = t.calibration ? t.id.replace("calibration_", "보정 ") : t.id.replace("zone_", "Zone "), c = t.name.trim();
			return `
          <g class="zone-rect advanced ${t.calibration ? "calibration" : ""} ${r(t.type)}">
            <polygon points="${a}" />
            <text x="${o.x + 8}" y="${o.y - 8}">
              <tspan x="${o.x + 8}" dy="0">${r(s)}</tspan>
              ${c ? `<tspan x="${o.x + 8}" dy="14">${r(c)}</tspan>` : ""}
            </text>
          </g>
        `;
		}).join("");
	}
	zoneDialogMarkup() {
		if (!this.config || !this.zoneDialogOpen) return "";
		let e = [
			["zone_1", "1"],
			["zone_2", "2"],
			["zone_3", "3"]
		].map(([e, t]) => {
			let n = e === this.config?.selected_zone ? " active" : "", i = this.zoneCustomName(e);
			return `
          <button class="zone-segment${n}" type="button" data-zone-select="${e}">
            <span>Zone ${t}</span>
            ${i ? `<span class="zone-segment-custom">${r(i)}</span>` : ""}
          </button>
        `;
		}).join(""), t = this.selectedZoneRect(), n = this.isEmptyZoneRect(t), i = this.zoneCustomName(this.config.selected_zone), a = this.hasAdvancedZoneConfig(), o = t ? n ? "아직 설정되지 않았습니다. 지도에 표시된 기본 박스를 끌어서 새 Zone을 만드세요." : `X ${t.x1} ~ ${t.x2} mm / Y ${t.y1} ~ ${t.y2} mm` : "선택한 Zone 좌표 엔티티를 찾지 못했거나 값이 없습니다.", s = `
      <div class="panel-section panel-section-warning">
        <div class="panel-label">고급 Zone 설정</div>
        <div class="panel-note">기기 웹 설정에서 저장한 Zone 설정이 적용되어 있습니다. 이 카드에서는 편집할 수 없고 현재 설정만 표시합니다.</div>
      </div>
      <div class="panel-section">
        <div class="panel-label">Zone 요약</div>
        <div class="panel-note">${r(this.deviceZoneSummary())}</div>
      </div>
      ${this.configuratorUrl() ? "<div class=\"panel-section\"><button class=\"configurator-button panel-button\" type=\"button\" data-configurator-open>고급 Zone 설정 열기</button></div>" : ""}
    `, c = `
      <div class="panel-section">
        <div class="panel-label">Zone 좌표</div>
        <div class="panel-note">${r(o)}</div>
      </div>
      <div class="panel-section">
        <label class="panel-label" for="zone-name-input">커스텀 이름</label>
        <input
          id="zone-name-input"
          class="zone-name-input"
          data-zone-name-input
          value="${r(i)}"
          placeholder="예: 침대, 책상 앞"
        />
      </div>
      <div class="panel-section">
        <div class="panel-label">Zone 선택</div>
        <div class="zone-segments">${e}</div>
      </div>
      <div class="panel-section">
        <button class="danger-button" type="button" data-zone-delete>선택 Zone 삭제</button>
        <div class="panel-note">좌표를 0으로 초기화합니다. 다시 만들려면 지도에 표시된 기본 박스를 끌어 저장하세요.</div>
      </div>
    `;
		return `
      <div class="dialog-backdrop" data-dialog-backdrop>
        <div class="dialog" role="dialog" aria-modal="true" aria-label="Zone 설정">
          <div class="dialog-header">
            <div class="dialog-heading">
              <div class="dialog-heading-title">Zone 설정</div>
              <div class="dialog-heading-subtitle">원하는 구역을 지정하여 이름을 붙이거나 탐지 제외를 하도록 설정할 수 있습니다</div>
            </div>
            <button class="dialog-close" type="button" data-dialog-close aria-label="닫기">×</button>
          </div>
          <div class="dialog-body">
            <div class="dialog-map" data-radar-dialog-map>
              ${this.radarSvgMarkup(720, 520, 32, !a)}
            </div>
            <div class="dialog-panel">
              ${a ? s : c}
            </div>
          </div>
        </div>
      </div>
    `;
	}
	openZoneDialog() {
		this.zoneDialogOpen = !0, this.render();
	}
	closeZoneDialog() {
		this.hasAdvancedZoneConfig() || this.commitZoneNameInput(), this.zoneDialogOpen = !1, this.render();
	}
	selectZone(e) {
		this.config && (this.hasAdvancedZoneConfig() || this.commitZoneNameInput(), this.config = {
			...this.config,
			selected_zone: e
		}, this.dispatchEvent(new CustomEvent("config-changed", {
			detail: { config: this.config },
			bubbles: !0,
			composed: !0
		})), this.render());
	}
	async deleteSelectedZone() {
		if (!this.config || this.hasAdvancedZoneConfig()) return;
		this.commitZoneNameInput();
		let e = this.config.selected_zone;
		this.zoneDrafts[e] = {
			zoneId: e,
			x1: 0,
			y1: 0,
			x2: 0,
			y2: 0
		}, await this.commitZoneRect(e), this.render();
	}
	commitZoneNameInput() {
		if (this.hasAdvancedZoneConfig()) return;
		let e = this.shadowRoot?.querySelector("[data-zone-name-input]");
		!this.config || !e || (this.updateZoneNameDraft(this.config.selected_zone, e.value), this.dispatchEvent(new CustomEvent("config-changed", {
			detail: { config: this.config },
			bubbles: !0,
			composed: !0
		})));
	}
	async setZoneName(e, t) {
		if (!this.config || this.hasAdvancedZoneConfig()) return;
		let r = t.trim(), i = {
			...this.config.zone_names || {},
			[e]: r
		};
		i[e] || delete i[e], this.config = {
			...this.config,
			zone_names: i
		}, this.dispatchEvent(new CustomEvent("config-changed", {
			detail: { config: this.config },
			bubbles: !0,
			composed: !0
		}));
		let a = this.zoneNameEntity(e);
		a && this.hassValue?.callService && await this.hassValue.callService("text", "set_value", {
			entity_id: a,
			value: r || n(e)
		}), this.render();
	}
	updateZoneNameDraft(e, t) {
		if (!this.config) return;
		let n = {
			...this.config.zone_names || {},
			[e]: t
		};
		n[e] || delete n[e], this.config = {
			...this.config,
			zone_names: n
		};
	}
	editableViewport() {
		return this.config ? this.radarViewport(720, 520, 32) : null;
	}
	pointerToRadarPoint(e, t) {
		let n = this.editableViewport();
		if (!n) return null;
		let r = t.getBoundingClientRect();
		if (!r.width || !r.height) return null;
		let i = a((e.clientX - r.left) / r.width * n.width, (e.clientY - r.top) / r.height * n.height, n);
		return {
			x: this.clamp(Math.round(i.x), -n.rangeX, n.rangeX),
			y: this.clamp(Math.round(i.y), 0, n.rangeY)
		};
	}
	clamp(e, t, n) {
		return Math.min(n, Math.max(t, e));
	}
	zoneBounds(e) {
		let t = this.editableViewport();
		if (!this.config || !this.hassValue || !t) return null;
		let n = w(this.config.device_id, e, this.hassValue);
		return {
			x: this.combinedBounds([n.x1, n.x2], -t.rangeX, t.rangeX),
			y: this.combinedBounds([n.y1, n.y2], 0, t.rangeY)
		};
	}
	combinedBounds(e, t, n) {
		let r = t, i = n;
		for (let t of e) {
			if (!t) continue;
			let e = this.hassValue?.states[t]?.attributes, n = Number(e?.min), a = Number(e?.max);
			Number.isFinite(n) && (r = Math.max(r, n)), Number.isFinite(a) && (i = Math.min(i, a));
		}
		return r <= i ? {
			min: r,
			max: i
		} : {
			min: t,
			max: n
		};
	}
	beginZoneDrag(e) {
		if (this.hasAdvancedZoneConfig()) return;
		let t = e.target, n = t?.dataset.zoneDrag, r = t?.dataset.zoneId;
		if (!t || !n || !r) return;
		let i = t.closest("svg"), a = i ? this.pointerToRadarPoint(e, i) : null, o = this.editableZoneRect(r);
		!i || !a || !o || (e.preventDefault(), e.stopPropagation(), r !== this.config?.selected_zone && (this.config = {
			...this.config,
			selected_zone: r
		}), this.zoneDrag = {
			zoneId: r,
			mode: n,
			corner: t.dataset.zoneCorner,
			pointerId: e.pointerId,
			startPoint: a,
			startRect: o
		}, window.addEventListener("pointermove", this.handleZoneDragMove), window.addEventListener("pointerup", this.handleZoneDragEnd), window.addEventListener("pointercancel", this.handleZoneDragEnd));
	}
	movedZoneRect(e, t, n) {
		let r = this.zoneBounds(e.zoneId);
		if (!r) return e;
		let i = n.x - t.x, a = n.y - t.y, o = Math.min(e.x1, e.x2) + i, s = Math.max(e.x1, e.x2) + i, c = Math.min(e.y1, e.y2) + a, l = Math.max(e.y1, e.y2) + a, u = this.clampShift(o, s, r.x.min, r.x.max), d = this.clampShift(c, l, r.y.min, r.y.max);
		return {
			...e,
			x1: Math.round(e.x1 + i + u),
			y1: Math.round(e.y1 + a + d),
			x2: Math.round(e.x2 + i + u),
			y2: Math.round(e.y2 + a + d)
		};
	}
	resizedZoneRect(e, t, n) {
		if (!t) return e;
		let r = this.zoneBounds(e.zoneId);
		if (!r) return e;
		let i = { ...e };
		return t.includes("x1") && (i.x1 = this.clamp(n.x, r.x.min, r.x.max)), t.includes("x2") && (i.x2 = this.clamp(n.x, r.x.min, r.x.max)), t.includes("y1") && (i.y1 = this.clamp(n.y, r.y.min, r.y.max)), t.includes("y2") && (i.y2 = this.clamp(n.y, r.y.min, r.y.max)), i;
	}
	clampShift(e, t, n, r) {
		return e < n ? n - e : t > r ? r - t : 0;
	}
	async commitZoneRect(e) {
		if (this.hasAdvancedZoneConfig()) return;
		let t = this.zoneDrafts[e];
		if (!t || !this.config || !this.hassValue?.callService) return;
		let n = w(this.config.device_id, e, this.hassValue), r = this.clampZoneRect(e, t);
		await Promise.all([
			"x1",
			"y1",
			"x2",
			"y2"
		].map((e) => {
			let t = n[e];
			return t ? this.hassValue.callService("number", "set_value", {
				entity_id: t,
				value: r[e]
			}) : Promise.resolve();
		}));
	}
	clampZoneRect(e, t) {
		let n = this.zoneBounds(e);
		return n ? {
			...t,
			x1: this.clamp(t.x1, n.x.min, n.x.max),
			x2: this.clamp(t.x2, n.x.min, n.x.max),
			y1: this.clamp(t.y1, n.y.min, n.y.max),
			y2: this.clamp(t.y2, n.y.min, n.y.max)
		} : t;
	}
	attachRadarDragEvents() {
		this.shadowRoot?.querySelectorAll("[data-zone-drag]").forEach((e) => {
			e.addEventListener("pointerdown", (e) => this.beginZoneDrag(e));
		});
	}
	attachEvents() {
		this.attachRadarDragEvents(), this.shadowRoot?.querySelectorAll("[data-configurator-open]").forEach((e) => {
			e.addEventListener("pointerdown", (e) => {
				e.preventDefault(), this.openConfigurator();
			});
		}), this.shadowRoot?.querySelector("[data-zone-dialog-open]")?.addEventListener("pointerdown", (e) => {
			e.preventDefault(), this.openZoneDialog();
		}), this.shadowRoot?.querySelector("[data-dialog-close]")?.addEventListener("pointerdown", (e) => {
			e.preventDefault(), this.closeZoneDialog();
		}), this.shadowRoot?.querySelector("[data-dialog-backdrop]")?.addEventListener("pointerdown", (e) => {
			e.target === e.currentTarget && (e.preventDefault(), this.closeZoneDialog());
		}), this.shadowRoot?.querySelectorAll("[data-zone-select]").forEach((e) => {
			e.addEventListener("pointerdown", (t) => {
				t.preventDefault();
				let n = e.dataset.zoneSelect;
				n && this.selectZone(n);
			});
		}), this.shadowRoot?.querySelector("[data-zone-delete]")?.addEventListener("pointerdown", (e) => {
			e.preventDefault(), this.deleteSelectedZone();
		}), this.shadowRoot?.querySelector("[data-zone-name-input]")?.addEventListener("input", (e) => {
			this.config && this.updateZoneNameDraft(this.config.selected_zone, e.target.value);
		}), this.shadowRoot?.querySelector("[data-zone-name-input]")?.addEventListener("change", (e) => {
			this.config && this.setZoneName(this.config.selected_zone, e.target.value);
		});
	}
	openConfigurator() {
		let e = this.configuratorUrl();
		e && window.open(e, "_blank", "noopener,noreferrer");
	}
	configuratorUrl() {
		let e = this.config?.configurator_url?.trim();
		if (e) return e;
		if (!this.config?.device_id || !this.hassValue) return "";
		let t = T(this.config.device_id, this.hassValue), n = t.ipAddress ? this.hassValue.states[t.ipAddress]?.state?.trim() : "";
		return !n || n === "unknown" || n === "unavailable" ? "" : `http://${n}/`;
	}
	render() {
		if (!this.config || !this.shadowRoot) return;
		let e = this.configuratorUrl() ? "<button class=\"configurator-button\" type=\"button\" data-configurator-open>고급 Zone 설정 열기</button>" : "";
		this.shadowRoot.innerHTML = `
      <style>${b}</style>
      <ha-card>
        <div class="card-header">
          <div class="title">${r(this.config.title)}</div>
          <div class="card-actions">
            ${e}
            <button class="zone-button" type="button" data-zone-dialog-open>Zone 설정</button>
          </div>
        </div>
        <div data-radar-main>${this.radarSvgMarkup(360, 320, 24)}</div>
        ${this.messageMarkup()}
      </ha-card>
      ${this.zoneDialogMarkup()}
    `, this.attachEvents();
	}
}, V = class extends HTMLElement {
	constructor() {
		super(), this.config = {}, this.hassValue = null, this.modeForm = null, this.deviceForm = null, this.settingsForm = null, this.notice = null, this.modeSchemaCache = null, this.deviceSchemaCache = null, this.settingsSchemaCache = null, this.boundValueChanged = this.valueChanged.bind(this), this.attachShadow({ mode: "open" });
	}
	setConfig(t) {
		this.config = {
			title: e.title,
			range_x: e.range_x,
			range_y: e.range_y,
			hold_ms: e.hold_ms,
			show_distance: e.show_distance,
			distance_decimals: e.distance_decimals,
			selected_zone: e.selected_zone,
			...t
		}, this.ensureRender(), this.updateNotice(), this.updateForm();
	}
	set hass(e) {
		this.hassValue = e, this.ensureRender(), this.updateForm();
	}
	modeSchema() {
		return this.modeSchemaCache ||= [{
			name: "use_yaml_targets",
			selector: { boolean: {} }
		}], this.modeSchemaCache;
	}
	deviceSchema() {
		return this.deviceSchemaCache ||= [{
			name: "device_id",
			selector: { device: {} }
		}], this.deviceSchemaCache;
	}
	settingsSchema() {
		return this.settingsSchemaCache ||= [
			{
				name: "title",
				selector: { text: {} }
			},
			{
				name: "selected_zone",
				selector: { select: {
					mode: "dropdown",
					options: [
						{
							value: "zone_1",
							label: "Zone 1"
						},
						{
							value: "zone_2",
							label: "Zone 2"
						},
						{
							value: "zone_3",
							label: "Zone 3"
						}
					]
				} }
			},
			{
				name: "configurator_url",
				selector: { text: {} }
			},
			{
				type: "grid",
				name: "",
				flatten: !0,
				schema: [{
					name: "range_x",
					selector: { number: {
						min: 1,
						mode: "box",
						unit_of_measurement: "mm"
					} }
				}, {
					name: "range_y",
					selector: { number: {
						min: 1,
						mode: "box",
						unit_of_measurement: "mm"
					} }
				}]
			},
			{
				type: "grid",
				name: "",
				flatten: !0,
				schema: [{
					name: "hold_ms",
					selector: { number: {
						min: 0,
						mode: "box",
						unit_of_measurement: "ms"
					} }
				}, {
					name: "distance_decimals",
					selector: { number: {
						min: 0,
						mode: "box"
					} }
				}]
			},
			{
				name: "show_distance",
				selector: { boolean: {} }
			}
		], this.settingsSchemaCache;
	}
	computeLabel(e) {
		return e.name ? {
			use_yaml_targets: "YAML 타겟 직접 설정 사용",
			device_id: "레이더 기기",
			title: "제목",
			selected_zone: "Zone 선택",
			configurator_url: "고급 설정 URL",
			range_x: "X 범위",
			range_y: "Y 범위",
			hold_ms: "유지 시간",
			distance_decimals: "거리 소수점 자리",
			show_distance: "거리 표시"
		}[e.name] || e.name : void 0;
	}
	computeHelper(e) {
		return e.name ? {
			use_yaml_targets: "켜면 YAML에 직접 입력한 targets만 사용합니다.",
			device_id: "ESPHome 레이더 기기를 선택합니다. YAML 타겟 직접 설정이 켜져 있으면 무시됩니다.",
			configurator_url: "비워두면 선택한 기기의 Device IP Address 엔티티로 자동 인식합니다.",
			hold_ms: "깜빡임을 줄이기 위해 마지막 유효 타겟 위치를 잠시 유지합니다."
		}[e.name] : void 0;
	}
	valueChanged(e) {
		e.stopPropagation();
		let t = { ...e.detail.value }, n = this.autoConfiguratorUrl();
		!this.config.configurator_url && t.configurator_url === n && delete t.configurator_url;
		let r = {
			...this.config,
			...t
		};
		this.config = r, this.dispatchEvent(new CustomEvent("config-changed", {
			detail: { config: r },
			bubbles: !0,
			composed: !0
		})), this.updateNotice(), this.updateForm();
	}
	ensureRender() {
		!this.shadowRoot || this.modeForm || (this.shadowRoot.innerHTML = "\n      <style>\n        :host {\n          display: block;\n        }\n        .mode-form,\n        .notice,\n        .device-form {\n          display: block;\n          margin-bottom: 24px;\n        }\n        .notice[hidden],\n        .device-form[hidden] {\n          display: none !important;\n        }\n        .notice {\n          padding: 10px 12px;\n          border-radius: 8px;\n          color: var(--error-color, #db4437);\n          background: color-mix(in srgb, var(--error-color, #db4437) 12%, transparent);\n          border: 1px solid color-mix(in srgb, var(--error-color, #db4437) 55%, transparent);\n          font-size: 13px;\n          line-height: 1.45;\n        }\n        .notice-title {\n          font-weight: 700;\n          margin-bottom: 4px;\n        }\n      </style>\n      <ha-form class=\"mode-form\"></ha-form>\n      <div class=\"notice\" hidden>\n        <div class=\"notice-title\">YAML 타겟 직접 설정 모드</div>\n        <div>YAML에 입력한 targets만 사용합니다. 이 토글을 끄기 전까지 레이더 기기 선택은 무시됩니다.</div>\n      </div>\n      <ha-form class=\"device-form\"></ha-form>\n      <ha-form class=\"settings-form\"></ha-form>\n    ", this.notice = this.shadowRoot.querySelector(".notice"), this.modeForm = this.shadowRoot.querySelector(".mode-form"), this.deviceForm = this.shadowRoot.querySelector(".device-form"), this.settingsForm = this.shadowRoot.querySelector(".settings-form"), this.setupForm(this.modeForm, this.modeSchema()), this.setupForm(this.deviceForm, this.deviceSchema()), this.setupForm(this.settingsForm, this.settingsSchema()));
	}
	setupForm(e, t) {
		e && (e.schema = t, e.computeLabel = this.computeLabel.bind(this), e.computeHelper = this.computeHelper.bind(this), e.addEventListener("value-changed", this.boundValueChanged));
	}
	updateNotice() {
		if (!this.notice) return;
		let e = !!this.config.use_yaml_targets;
		this.notice.hidden = !e, this.deviceForm && (this.deviceForm.hidden = e);
	}
	updateForm() {
		let e = {
			...this.config,
			configurator_url: this.config.configurator_url || this.autoConfiguratorUrl()
		};
		for (let t of [
			this.modeForm,
			this.deviceForm,
			this.settingsForm
		]) t && (t.hass = this.hassValue, t.data = e);
	}
	autoConfiguratorUrl() {
		if (!this.config.device_id || !this.hassValue) return "";
		let e = T(this.config.device_id, this.hassValue), t = e.ipAddress ? this.hassValue.states[e.ipAddress]?.state?.trim() : "";
		return !t || t === "unknown" || t === "unavailable" ? "" : `http://${t}/`;
	}
};
customElements.get("radar-zone-card") || customElements.define("radar-zone-card", B), customElements.get("radar-zone-card-editor") || customElements.define("radar-zone-card-editor", V), window.customCards = window.customCards || [], window.customCards.push({
	type: "radar-zone-card",
	name: "Radar Zone Card",
	description: "Realtime radar target map for LD2450-style mmWave sensors"
});
//#endregion

//# sourceMappingURL=radar-zone-card.js.map