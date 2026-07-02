/**
 * FA 등급 및 계약 분석 유틸리티
 *
 * - 등급: 리서치 기반 예상 등급 (expectedGrade) 사용
 * - 계약: 최근 FA 비교 사례(엄상백·최원태·박해민·양의지·박동원 등) 기반 리서치 데이터 사용
 *   ※ 계약금+연봉+옵션 합산 최대총액 기준
 * - 보상: A(보호 20인), B(보호 25인), C(보상금만 150%)
 */

import type { FAPlayer } from "@/data/fa2027";

// ─── 타입 ───────────────────────────────────────────────

export type FAGrade = "A" | "B" | "C";

export interface ContractEstimate {
  totalAmount: number;     // 예상 총액 (억)
  years: string;           // "6년", "3+1년" 등
  annualAvg: number;       // 연평균 (억)
  rangeMin: number;        // 현실적 범위 최소
  rangeMax: number;        // 현실적 범위 최대
  rationale: string;       // 판단 근거 (비교 사례)
}

export interface CompensationInfo {
  type: "인적보상 대상" | "보상금만";
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

// ─── 계약연수 파싱 ("3+1년" → 4) ─────────────────────────

function parseYearsNum(years: string): number {
  const match = years.match(/(\d+)\+?(\d+)?/);
  if (!match) return 1;
  return parseInt(match[1]) + (match[2] ? parseInt(match[2]) : 0);
}

// ─── 등급 배정 + 계약 산출 (리서치 데이터 사용) ───────────

export function determineFAGrades(players: FAPlayer[]): FAPlayerWithGrade[] {
  const result = players.map((player) => {
    const grade = player.expectedGrade;
    const ec = player.expectedContract;
    const yearsNum = parseYearsNum(ec.years);

    const contract: ContractEstimate = {
      totalAmount: ec.totalAmount,
      years: ec.years,
      annualAvg: Math.round(ec.totalAmount / yearsNum * 10) / 10,
      rangeMin: ec.rangeMin,
      rangeMax: ec.rangeMax,
      rationale: ec.rationale,
    };

    const compensation = getCompensation(player, grade);
    return { player, score: player.previousSalary, grade, contract, compensation };
  });

  // 등급순(우선) → 계약규모순 정렬
  const gradeOrder: Record<FAGrade, number> = { A: 0, B: 1, C: 2 };
  return result.sort((a, b) => {
    const g = gradeOrder[a.grade] - gradeOrder[b.grade];
    if (g !== 0) return g;
    return b.contract.totalAmount - a.contract.totalAmount;
  });
}

// ─── 보상 정보 (A: 보호 20인, B: 보호 25인, C: 보상금만) ─

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
      option1: `인적보상 1명 (보호 25인 제외) + 보상금 ${salary.toFixed(1)}억`,
      option2: `보상금 ${(salary * 2).toFixed(1)}억 (인적보상 면제)`,
      amount1: Math.round(salary * 10) / 10,
      amount2: Math.round(salary * 2 * 10) / 10,
    };
  }
  // C등급: 보상선수 없이 연봉 150%
  return {
    type: "보상금만",
    option1: `보상금 ${(salary * 1.5).toFixed(1)}억 (전년 연봉의 150%)`,
    amount1: Math.round(salary * 1.5 * 10) / 10,
  };
}

// ─── 유틸리티 ────────────────────────────────────────────

export const GRADE_STYLES: Record<FAGrade, { bg: string; text: string; label: string }> = {
  A: {
    bg: "bg-destructive/10 border-destructive/40",
    text: "text-destructive",
    label: "A등급",
  },
  B: {
    bg: "bg-warning/10 border-warning/40",
    text: "text-warning",
    label: "B등급",
  },
  C: {
    bg: "bg-success/10 border-success/40",
    text: "text-success",
    label: "C등급",
  },
};

export function formatAmount(amount: number): string {
  return `${amount}억`;
}
