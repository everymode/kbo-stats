/**
 * FA 등급 산정 및 계약 규모 예측 유틸리티
 *
 * - FA 스코어 계산 → 등급 (A/B/C) 배정
 * - 예상 계약 규모 (총액, 연수, 연평균) 산출
 */

import type { FAPlayer } from "@/data/fa2027";

// ─── 타입 ───────────────────────────────────────────────

export type FAGrade = "A" | "B" | "C";

export interface ContractEstimate {
  totalAmount: number;  // 억
  years: number;
  annualAvg: number;    // 억
  breakdown: {
    baseValue: number;
    ageFactor: number;
    durabilityFactor: number;
    positionFactor: number;
    gradePremium: number;
  };
}

export interface CompensationInfo {
  type: "인적보상 대상" | "보상 없음";
  option1?: string; // 인적보상 + 보상금
  option2?: string; // 보상금만
  amount1?: number; // 옵션1 보상금 (억)
  amount2?: number; // 옵션2 보상금 (억)
}

export interface FAPlayerWithGrade {
  player: FAPlayer;
  score: number;
  grade: FAGrade;
  contract: ContractEstimate;
  compensation: CompensationInfo;
}

// ─── FA 스코어 계산 ──────────────────────────────────────

function calculateFAScore(player: FAPlayer): number {
  if (player.type === "hitter") {
    const ops = parseFloat(player.recentStats.ops || "0");
    const hr = player.recentStats.hr || 0;
    const hits = player.recentStats.hits || 0;
    const sb = player.recentStats.sb || 0;
    return (ops * 250) + (hr * 2.0) + (hits * 0.3) + (sb * 0.5) + (player.awards * 5);
  }

  // 투수
  const era = parseFloat(player.recentStats.era || "9.99");
  const wins = player.recentStats.wins || 0;
  const saves = player.recentStats.saves || 0;
  const holds = player.recentStats.holds || 0;
  const ip = parseFloat(player.recentStats.ip || "0");
  const k9 = parseFloat(player.recentStats.k9 || "0");
  return ((4.50 - era) * 40) + (wins * 3) + (saves * 2.5) + (holds * 1.5) + (ip * 0.15) + (k9 * 8) + (player.awards * 5);
}

// ─── 등급 배정 ───────────────────────────────────────────

export function determineFAGrades(players: FAPlayer[]): FAPlayerWithGrade[] {
  const scored = players.map((p) => ({
    player: p,
    score: calculateFAScore(p),
  }));

  // 스코어 내림차순 정렬
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const total = sorted.length;
  const aCount = Math.max(1, Math.round(total * 0.3));
  const bCount = Math.max(1, Math.round(total * 0.4));

  return sorted.map((item, idx) => {
    let grade: FAGrade;
    if (idx < aCount) grade = "A";
    else if (idx < aCount + bCount) grade = "B";
    else grade = "C";

    const contract = estimateContract(item.player, grade);
    const compensation = getCompensation(item.player, grade);

    return { ...item, grade, contract, compensation };
  });
}

// ─── 계약 규모 산출 ──────────────────────────────────────

function estimateContract(player: FAPlayer, grade: FAGrade): ContractEstimate {
  let baseValue: number;

  if (player.type === "hitter") {
    const ops = parseFloat(player.recentStats.ops || "0");
    const hr = player.recentStats.hr || 0;

    if (ops >= 0.900) baseValue = 90;
    else if (ops >= 0.850) baseValue = 70;
    else if (ops >= 0.800) baseValue = 55;
    else if (ops >= 0.750) baseValue = 40;
    else if (ops >= 0.700) baseValue = 28;
    else baseValue = 18;

    // 홈런 보정 (15개 초과분)
    if (hr > 15) baseValue += (hr - 15) * 2;
  } else {
    const era = parseFloat(player.recentStats.era || "9.99");
    const ip = parseFloat(player.recentStats.ip || "0");
    const saves = player.recentStats.saves || 0;
    const holds = player.recentStats.holds || 0;

    if (player.role === "starter") {
      if (era < 3.00) baseValue = 85;
      else if (era < 3.50) baseValue = 65;
      else if (era < 4.00) baseValue = 48;
      else if (era < 4.50) baseValue = 32;
      else baseValue = 20;
      // 이닝 보정
      if (ip > 150) baseValue += (parseFloat(ip) - 150) * 0.3;
    } else if (player.role === "closer") {
      if (era < 2.50) baseValue = 55;
      else if (era < 3.50) baseValue = 40;
      else if (era < 4.50) baseValue = 25;
      else baseValue = 15;
      // 세이브 보정
      baseValue += saves * 0.8;
    } else {
      // 중계
      if (era < 2.50) baseValue = 38;
      else if (era < 3.50) baseValue = 28;
      else if (era < 4.50) baseValue = 18;
      else baseValue = 12;
      // 홀드 보정
      baseValue += holds * 0.4;
    }
  }

  // 나이 계수
  let ageFactor: number;
  let years: number;
  if (player.age <= 29) { ageFactor = 1.25; years = 5; }
  else if (player.age <= 31) { ageFactor = 1.10; years = 4; }
  else if (player.age <= 33) { ageFactor = 0.95; years = 4; }
  else if (player.age <= 35) { ageFactor = 0.75; years = 3; }
  else { ageFactor = 0.55; years = 2; }

  // 내구성 계수
  const games = player.recentStats.games || 0;
  const ip = parseFloat(player.recentStats.ip || "0");
  let durabilityFactor: number;

  if (player.type === "hitter") {
    if (games >= 130) durabilityFactor = 1.15;
    else if (games >= 110) durabilityFactor = 1.00;
    else if (games >= 90) durabilityFactor = 0.85;
    else durabilityFactor = 0.65;
  } else {
    if (player.role === "starter") {
      if (ip >= 170) durabilityFactor = 1.15;
      else if (ip >= 140) durabilityFactor = 1.00;
      else if (ip >= 110) durabilityFactor = 0.85;
      else durabilityFactor = 0.65;
    } else {
      if (games >= 55) durabilityFactor = 1.15;
      else if (games >= 45) durabilityFactor = 1.00;
      else if (games >= 35) durabilityFactor = 0.85;
      else durabilityFactor = 0.65;
    }
  }

  // 포지션 계수
  let positionFactor: number;
  if (player.type === "hitter") {
    const pos = player.position;
    if (pos.includes("포수") || pos.includes("유격")) positionFactor = 1.10;
    else if (pos.includes("2루") || pos.includes("3루") || pos.includes("중견")) positionFactor = 1.05;
    else positionFactor = 1.00;
  } else {
    if (player.role === "starter") positionFactor = 1.05;
    else if (player.role === "closer") positionFactor = 1.00;
    else positionFactor = 0.90;
  }

  // 등급 보정 (시장 경쟁 프리미엄)
  const gradePremium = grade === "A" ? 1.15 : grade === "B" ? 1.00 : 0.90;

  const totalAmount = Math.round(baseValue * ageFactor * durabilityFactor * positionFactor * gradePremium);
  const annualAvg = Math.round((totalAmount / years) * 10) / 10;

  return {
    totalAmount,
    years,
    annualAvg,
    breakdown: { baseValue, ageFactor, durabilityFactor, positionFactor, gradePremium },
  };
}

// ─── 보상 정보 ───────────────────────────────────────────

function getCompensation(player: FAPlayer, grade: FAGrade): CompensationInfo {
  const salary = player.previousSalary;

  if (grade === "A") {
    return {
      type: "인적보상 대상",
      option1: `인적보상 1명 + 보상금 ${(salary * 2).toFixed(1)}억`,
      option2: `보상금 ${(salary * 3).toFixed(1)}억 (인적보상 없이)`,
      amount1: Math.round(salary * 2 * 10) / 10,
      amount2: Math.round(salary * 3 * 10) / 10,
    };
  }
  if (grade === "B") {
    return {
      type: "인적보상 대상",
      option1: `인적보상 1명 + 보상금 ${salary.toFixed(1)}억`,
      option2: `보상금 ${(salary * 2).toFixed(1)}억 (인적보상 없이)`,
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
  if (amount >= 100) return `${amount}억`;
  return `${amount}억`;
}
