import { escapeHtml } from "../../core/html";
import type { WebDeviceState } from "../types";
import type { CalibrationMetrics, CalibrationRun } from "../calibration";
import {
  CALIBRATION_MAX_MS,
  CALIBRATION_MIN_MS,
  CALIBRATION_MIN_SAMPLES,
  CALIBRATION_SCORE_THRESHOLD,
  MAX_CALIBRATION_ZONES
} from "../constants";
import { clamp } from "../zone-geometry";

export interface CalibrationResult {
  title: string;
  tone: "ok" | "warn" | "error";
  createdCount: number;
  reason: string;
  metrics?: CalibrationMetrics;
  logs?: string[];
}

export function calibrationDialogResultMarkup(result: CalibrationResult): string {
  return `
    <div class="calibration-result ${result.tone}">
      <strong>${escapeHtml(result.title)}</strong>
      <p>${escapeHtml(result.reason)}</p>
      <p>생성된 보정 구역: ${result.createdCount}개</p>
      ${result.metrics && result.metrics.samples > 0 ? calibrationMetricsMarkup(result.metrics) : ""}
    </div>
  `;
}

export function calibrationMetricsMarkup(metrics: CalibrationMetrics): string {
  return `<pre>${escapeHtml(
    [
      `samples=${metrics.samples}`,
      `usedSamples=${metrics.usedSamples}`,
      `outliers=${metrics.outliers}`,
      `score=${Math.round(metrics.score)}`,
      `width=${Math.round(metrics.width)}mm`,
      `height=${Math.round(metrics.height)}mm`,
      `area=${Math.round(metrics.area)}mm2`,
      `meanSpeed=${Math.round(metrics.meanSpeed)}mm/sample`,
      `acceptedBy=${metrics.acceptedBy}`
    ].join("\n")
  )}</pre>`;
}

export function calibrationProgress(
  result: CalibrationResult | null,
  run: CalibrationRun | null,
  metrics?: CalibrationMetrics
): number {
  if (result) return 100;
  return Math.min(99, calibrationProgressFromMetrics(run, metrics));
}

function calibrationProgressFromMetrics(run: CalibrationRun | null, metrics?: CalibrationMetrics): number {
  if (!run || !metrics) return metrics ? Math.round(clamp(metrics.score, 0, 100)) : 0;
  const elapsedProgress = clamp((Date.now() - run.startedAt) / CALIBRATION_MAX_MS, 0, 1) * 100;
  const sampleProgress = clamp(metrics.samples / CALIBRATION_MIN_SAMPLES, 0, 1) * 45;
  const scoreProgress = clamp(metrics.score / CALIBRATION_SCORE_THRESHOLD, 0, 1) * 35;
  return Math.round(Math.max(elapsedProgress, sampleProgress + scoreProgress));
}

export function calibrationProgressText(
  result: CalibrationResult | null,
  run: CalibrationRun | null,
  metrics?: CalibrationMetrics
): string {
  if (result) return result.title;
  if (!run) return "대기 중";
  if (!metrics || metrics.samples === 0) return "타겟 샘플 대기 중";
  if (metrics.samples < CALIBRATION_MIN_SAMPLES) return "샘플 수집 중";
  if (metrics.acceptedBy === "none") return "안정도 분석 중";
  return "보정 구역 생성 준비 완료";
}

export function calibrationWorkItems(
  run: CalibrationRun | null,
  result: CalibrationResult | null,
  state: WebDeviceState | null,
  metrics?: CalibrationMetrics
): string[] {
  if (!run && !result) return ["보정 작업 대기 중"];
  const elapsed = run ? Math.floor((Date.now() - run.startedAt) / 1000) : null;
  return [
    `PIR 상태: ${state?.pirMotion ? "움직임 감지" : "움직임 없음"}`,
    elapsed === null ? "수집 시간: 종료됨" : `수집 시간: ${elapsed}s / 최소 ${Math.ceil(CALIBRATION_MIN_MS / 1000)}s`,
    `샘플: ${metrics?.samples ?? 0} / 최소 ${CALIBRATION_MIN_SAMPLES}`,
    `사용 샘플: ${metrics?.usedSamples ?? 0}`,
    `제외 샘플: ${metrics?.outliers ?? 0}`,
    `안정도 점수: ${Math.round(metrics?.score ?? 0)} / ${CALIBRATION_SCORE_THRESHOLD}`,
    `판정 기준: ${metrics?.acceptedBy ?? "none"}`
  ];
}

export function calibrationStatusText(run: CalibrationRun | null, count: number, pirBlocked: boolean): string {
  if (run) {
    const elapsed = Math.floor((Date.now() - run.startedAt) / 1000);
    return `안정도 분석 중입니다. ${elapsed}s / 최대 60s`;
  }
  if (pirBlocked) return "PIR 움직임이 감지되어 시작할 수 없습니다.";
  if (count >= MAX_CALIBRATION_ZONES) return "오탐 보정 구역은 최대 4개까지 저장할 수 있습니다.";
  return `저장된 보정 구역 ${count}/${MAX_CALIBRATION_ZONES}`;
}
