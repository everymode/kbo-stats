/**
 * FA 등급 산정 및 계약 규모 예측 유틸리티
 *
 * - 등급: 직전 연봉 순위 기반 (KBO 규정: 팀 내 상위 3위 & 리그 30위 이내 → A등급)
 * - 계약: 연간 성적가치(APV) × 나이계수 × 등급프리미엄 × 계약연수
 * - 보상: 보호선수 20인 제외 후 인적보상 (2024 개정 규정)
 */

import type { FAPlayer } from "@/data/fa2027";

// ─── 타입 ───────────────────────────────────────────────

export type FAGrade = "A" | "B" | "C";

export interface ContractEstimate {
  totalAmount: number;  // 억
  years: number;
  annualAvg: number;    // 억
  breakdown: {
    baseAPV: number;      // 기본 연간 성적가치 (억/년)
    ageFactor: number;    // 나이 계수
    gradePremium: number; // 등급 프리미엄
  };
}

export interface CompensationInfo {
  type: "인적보상 대상" | "보상 없음";
  option1?: string;
  option2?: string;
  amount1?: number;
  amount2?: number;
}

export interface FAPlayerWithGrade {
  player: FAPlayer;
  score: number;       // 등급 판별 기준 (직전 연봉)
  grade: FAGrade;
  contract: ContractEstimate;
  compensation: CompensationInfo;
}

// ─── 등급 배정 (연봉 순위 기반) ──────────────────────────

export function determineFAGrades(players: FAPlayer[]): FAPlayerWithGrade[] {
  // 직전 연봉 내림차순 정렬 (KBO 등급 = 연봉 순위)
  const sorted = [...players].sort((a, b) => b.previousSalary - a.previousSalary);
  const total = sorted.length;
  const aCount = Math.max(1, Math.round(total * 0.3));
  const bCount = Math.max(1, Math.round(total * 0.4));

  return sorted.map((player, idx) => {
    let grade: FAGrade;
    if (idx < aCount) grade = "A";
    else if (idx < aCount + bCount) grade = "B";
    else grade = "C";

    const contract = estimateContract(player, grade);
    const compensation = getCompensation(player, grade);

    return { player, score: player.previousSalary, grade, contract, compensation };
  });
}

// ─── 연간 성적가치 (APV) 산출 ────────────────────────────

function getBaseAPV(player: FAPlayer): number {
  if (player.type === "hitter") {
    return getHitterAPV(player);
  }
  if (player.role === "starter") return getStarterAPV(player);
  if (player.role === "closer") return getCloserAPV(player);
  return getRelieverAPV(player);
}

function getHitterAPV(player: FAPlayer): number {
  const ops = parseFloat(player.recentStats.ops || "0");
  const hr = player.recentStats.hr || 0;
  const sb = player.recentStats.sb || 0;

  // OPS 기반 베이스
  let base: number;
  if (ops >= 0.900) base = 30;
  else if (ops >= 0.870) base = 25;
  else if (ops >= 0.840) base = 21;
  else if (ops >= 0.810) base = 17;
  else if (ops >= 0.780) base = 14;
  else if (ops >= 0.750) base = 11;
  else if (ops >= 0.720) base = 8;
  else if (ops >= 0.700) base = 6;
  else base = 4;

  // 홈런 보정
  if (hr >= 25) base += 3;
  else if (hr >= 20) base += 2;
  else if (hr >= 15) base += 1;

  // 도루 보정
  if (sb >= 30) base += 2;
  else if (sb >= 20) base += 1;

  return base;
}

function getStarterAPV(player: FAPlayer): number {
  const era = parseFloat(player.recentStats.era || "9.99");
  const ip = parseFloat(player.recentStats.ip || "0");
  const k9 = parseFloat(player.recentStats.k9 || "0");

  // ERA 기반 베이스
  let base: number;
  if (era < 2.50) base = 28;
  else if (era < 3.00) base = 24;
  else if (era < 3.30) base = 20;
  else if (era < 3.60) base = 16;
  else if (era < 4.00) base = 13;
  else if (era < 4.50) base = 9;
  else base = 5;

  // 이닝 보정 (내구성)
  if (ip >= 180) base += 3;
  else if (ip >= 170) base += 2;
  else if (ip >= 160) base += 1;

  // 탈삼진율 보정
  if (k9 >= 9.0) base += 2;
  else if (k9 >= 8.0) base += 1;

  return base;
}

function getCloserAPV(player: FAPlayer): number {
  const era = parseFloat(player.recentStats.era || "9.99");
  const saves = player.recentStats.saves || 0;
  const k9 = parseFloat(player.recentStats.k9 || "0");

  let base: number;
  if (era < 2.00) base = 22;
  else if (era < 2.50) base = 18;
  else if (era < 3.00) base = 14;
  else if (era < 3.50) base = 10;
  else base = 6;

  if (saves >= 35) base += 3;
  else if (saves >= 25) base += 2;
  else if (saves >= 15) base += 1;

  if (k9 >= 10.0) base += 2;
  else if (k9 >= 9.0) base += 1;

  return base;
}

function getRelieverAPV(player: FAPlayer): number {
  const era = parseFloat(player.recentStats.era || "9.99");
  const holds = player.recentStats.holds || 0;

  let base: number;
  if (era < 2.50) base = 12;
  else if (era < 3.00) base = 9;
  else if (era < 3.50) base = 7;
  else if (era < 4.00) base = 5;
  else base = 3;

  if (holds >= 25) base += 2;
  else if (holds >= 15) base += 1;

  return base;
}

// ─── 나이 → 계약연수 & 가치계수 ─────────────────────────

function getAgeFactors(age: number): { years: number; ageFactor: number } {
  if (age <= 27) return { years: 5, ageFactor: 1.20 };
  if (age <= 28) return { years: 5, ageFactor: 1.15 };
  if (age <= 29) return { years: 5, ageFactor: 1.10 };
  if (age <= 30) return { years: 4, ageFactor: 1.05 };
  if (age <= 31) return { years: 4, ageFactor: 1.00 };
  if (age <= 32) return { years: 4, ageFactor: 0.95 };
  if (age <= 33) return { years: 3, ageFactor: 0.85 };
  if (age <= 34) return { years: 3, ageFactor: 0.75 };
  if (age <= 35) return { years: 2, ageFactor: 0.65 };
  return { years: 2, ageFactor: 0.55 };
}

// ─── 계약 규모 산출 ──────────────────────────────────────

function estimateContract(player: FAPlayer, grade: FAGrade): ContractEstimate {
  const baseAPV = getBaseAPV(player);
  const { years, ageFactor } = getAgeFactors(player.age);
  const gradePremium = grade === "A" ? 1.15 : grade === "B" ? 1.00 : 0.90;

  const adjustedAPV = Math.round(baseAPV * ageFactor * gradePremium * 10) / 10;
  const totalAmount = Math.round(adjustedAPV * years);
  const annualAvg = Math.round(adjustedAPV * 10) / 10;

  return {
    totalAmount,
    years,
    annualAvg,
    breakdown: { baseAPV, ageFactor, gradePremium },
  };
}

// ─── 보상 정보 (2024 개정: 보호선수 20인) ────────────────

function getCompensation(player: FAPlayer, grade: FAGrade): CompensationInfo {
  const salary = player.previousSalary;

  if (grade === "A") {
    return {
      type: "인적보상 대상",
      option1: `인적보상 1명 (보호 20인 제외) + 보상금 ${(salary * 2).toFixed(1)}억`,
      option2: `보상금 ${(salary * 3).toFixed(1)}억 (인적보상 면제)`,
      amount1: Math.round(salary * 2 * 10) / 10,
      amount2: Math.round(salary * 3 * 10) / 10,
    };
  }
  if (grade === "B") {
    return {
      type: "인적보상 대상",
      option1: `인적보상 1명 (보호 20인 제외) + 보상금 ${salary.toFixed(1)}억`,
      option2: `보상금 ${(salary * 2).toFixed(1)}억 (인적보상 면제)`,
      amount1: Math.round(salary * 10) / 10,
      amount2: Math.round(salary * 2 * 10) / 10,
    };
  }
  return { type: "보상 없음" };
}

// ─── 유틸리티 ────────────────────────────────────────────

export const GRADE_STYLES: Record<FAGrade, { bg: string; text: string; label: string }> = {
  A: {
    bg: "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-400",
    label: "A등급",
  },
  B: {
    bg: "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
    label: "B등급",
  },
  C: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-400",
    label: "C등급",
  },
};

export function formatAmount(amount: number): string {
  return `${amount}억`;
}
