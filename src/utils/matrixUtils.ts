import {
  CognitiveLevelConfig,
  MatrixRow,
  MatrixTotals,
  QuestionTypeConfig,
} from '../types';

export function toInt(val: any): number {
  if (typeof val === 'number' && !isNaN(val)) return Math.max(0, Math.round(val));
  if (typeof val === 'string') {
    const cleaned = val.trim();
    if (!cleaned) return 0;
    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed)) return Math.max(0, parsed);
    const match = cleaned.match(/\d+/);
    return match ? Math.max(0, parseInt(match[0], 10)) : 0;
  }
  return 0;
}

export function formatViPoints(num: number): string {
  const safe = isNaN(num) ? 0 : num;
  const rounded = Math.round(safe * 100) / 100;
  if (Number.isInteger(rounded)) {
    return `${rounded},0`;
  }
  return rounded.toString().replace('.', ',');
}

export function formatViPercent(num: number): string {
  const safe = isNaN(num) ? 0 : num;
  const rounded = Math.round(safe * 10) / 10;
  if (Number.isInteger(rounded)) {
    return `${rounded}%`;
  }
  return `${rounded.toString().replace('.', ',')}%`;
}

/**
 * Splits a total question count for one question type into 4 cognitive levels
 * [knowledge, comprehension, application, highApplication]
 */
export function splitCountByFourLevels(
  total: number,
  levels: CognitiveLevelConfig,
  isEssay = false
): { knowledge: number; comprehension: number; application: number; highApplication: number } {
  if (total <= 0) {
    return { knowledge: 0, comprehension: 0, application: 0, highApplication: 0 };
  }
  if (isEssay) {
    if (total === 1) {
      return levels.highApplication >= levels.application
        ? { knowledge: 0, comprehension: 0, application: 0, highApplication: 1 }
        : { knowledge: 0, comprehension: 0, application: 1, highApplication: 0 };
    }
    if (total === 2) {
      return { knowledge: 0, comprehension: 0, application: 1, highApplication: 1 };
    }
  }

  const wK = Math.max(0, Number(levels.knowledge) || 0);
  const wC = Math.max(0, Number(levels.comprehension) || 0);
  const wA = Math.max(0, Number(levels.application) || 0);
  const wHA = Math.max(0, Number(levels.highApplication) || 0);
  const sumW = wK + wC + wA + wHA || 100;

  const exact = [
    (total * wK) / sumW,
    (total * wC) / sumW,
    (total * wA) / sumW,
    (total * wHA) / sumW,
  ];
  const floors = exact.map((v) => Math.floor(v));
  const remainder = total - floors.reduce((a, b) => a + b, 0);

  const remainders = exact
    .map((v, idx) => ({ idx, frac: v - floors[idx] }))
    .sort((a, b) => b.frac - a.frac);

  for (let i = 0; i < remainder; i++) {
    floors[remainders[i % 4].idx]++;
  }

  return {
    knowledge: floors[0],
    comprehension: floors[1],
    application: floors[2],
    highApplication: floors[3],
  };
}

/**
 * Automatically calculates the cognitive level percentages (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao)
 * from the manual question counts per level across all question types, weighted by each question's point value.
 */
export function calculateLevelsFromManualConfig(questionTypes: QuestionTypeConfig[]): {
  levels: CognitiveLevelConfig;
  levelPoints: { knowledge: number; comprehension: number; application: number; highApplication: number };
  levelCounts: { knowledge: number; comprehension: number; application: number; highApplication: number };
  totalPoints: number;
  totalQuestions: number;
} {
  let ptsK = 0;
  let ptsC = 0;
  let ptsA = 0;
  let ptsHA = 0;

  let cntK = 0;
  let cntC = 0;
  let cntA = 0;
  let cntHA = 0;

  for (const qt of questionTypes) {
    const ml = qt.manualLevels || {
      knowledge: qt.quantity,
      comprehension: 0,
      application: 0,
      highApplication: 0,
    };
    const k = toInt(ml.knowledge);
    const c = toInt(ml.comprehension);
    const a = toInt(ml.application);
    const ha = toInt(ml.highApplication);
    const sumQ = k + c + a + ha;

    cntK += k;
    cntC += c;
    cntA += a;
    cntHA += ha;

    const sectionPts = Math.max(0, Number(qt.points) || 0);
    const pointPerQ = sumQ > 0 ? sectionPts / sumQ : 0;

    ptsK += k * pointPerQ;
    ptsC += c * pointPerQ;
    ptsA += a * pointPerQ;
    ptsHA += ha * pointPerQ;
  }

  const totalPoints = ptsK + ptsC + ptsA + ptsHA;
  const totalQuestions = cntK + cntC + cntA + cntHA;

  // Use point weights if totalPoints > 0, otherwise fall back to question count weights
  const denom = totalPoints > 0 ? totalPoints : totalQuestions;
  const valK = totalPoints > 0 ? ptsK : cntK;
  const valC = totalPoints > 0 ? ptsC : cntC;
  const valA = totalPoints > 0 ? ptsA : cntA;
  const valHA = totalPoints > 0 ? ptsHA : cntHA;

  if (denom <= 0) {
    return {
      levels: { knowledge: 40, comprehension: 30, application: 20, highApplication: 10 },
      levelPoints: { knowledge: 0, comprehension: 0, application: 0, highApplication: 0 },
      levelCounts: { knowledge: 0, comprehension: 0, application: 0, highApplication: 0 },
      totalPoints: 0,
      totalQuestions: 0,
    };
  }

  const rawPcts = [
    (valK / denom) * 100,
    (valC / denom) * 100,
    (valA / denom) * 100,
    (valHA / denom) * 100,
  ];
  const rounded = rawPcts.map((v) => Math.floor(v));
  const rem = 100 - rounded.reduce((a, b) => a + b, 0);

  const order = rawPcts
    .map((v, i) => ({ i, frac: v - rounded[i] }))
    .sort((a, b) => b.frac - a.frac);

  for (let idx = 0; idx < rem; idx++) {
    rounded[order[idx % 4].i]++;
  }

  return {
    levels: {
      knowledge: rounded[0],
      comprehension: rounded[1],
      application: rounded[2],
      highApplication: rounded[3],
    },
    levelPoints: {
      knowledge: Math.round(ptsK * 100) / 100,
      comprehension: Math.round(ptsC * 100) / 100,
      application: Math.round(ptsA * 100) / 100,
      highApplication: Math.round(ptsHA * 100) / 100,
    },
    levelCounts: {
      knowledge: cntK,
      comprehension: cntC,
      application: cntA,
      highApplication: cntHA,
    },
    totalPoints: Math.round(totalPoints * 100) / 100,
    totalQuestions,
  };
}

/**
 * Recalculates all row totals, row percentages, and footer totals (totalQuestions, totalPoints, totalPercentage)
 * whenever any cell in the Matrix or any section point value is modified.
 */
export function recalculateMatrixAndTotals(
  rawMatrix: MatrixRow[],
  questionTypes: QuestionTypeConfig[]
): {
  matrix: MatrixRow[];
  totals: MatrixTotals;
  computedLevels: CognitiveLevelConfig;
} {
  const mcCfg = questionTypes.find((c) => c.id === 'trac_nghiem') || {
    id: 'trac_nghiem',
    name: 'Trắc nghiệm',
    quantity: 12,
    points: 3,
  };
  const tfCfg = questionTypes.find((c) => c.id === 'dung_sai') || {
    id: 'dung_sai',
    name: 'Đúng/Sai',
    quantity: 4,
    points: 4,
  };
  const saCfg = questionTypes.find((c) => c.id === 'tra_loi_ngan') || {
    id: 'tra_loi_ngan',
    name: 'Trả lời ngắn',
    quantity: 6,
    points: 3,
  };
  const esCfg = questionTypes.find((c) => c.id === 'tu_luan') || {
    id: 'tu_luan',
    name: 'Tự luận',
    quantity: 1,
    points: 0,
  };

  const matrix: MatrixRow[] = rawMatrix.map((row) => ({
    ...row,
    multipleChoice: {
      knowledge: toInt(row.multipleChoice?.knowledge),
      comprehension: toInt(row.multipleChoice?.comprehension),
      application: toInt(row.multipleChoice?.application),
    },
    trueFalse: {
      knowledge: toInt(row.trueFalse?.knowledge),
      comprehension: toInt(row.trueFalse?.comprehension),
      application: toInt(row.trueFalse?.application),
    },
    shortAnswer: {
      knowledge: toInt(row.shortAnswer?.knowledge),
      comprehension: toInt(row.shortAnswer?.comprehension),
      application: toInt(row.shortAnswer?.application),
    },
    essay: {
      knowledge: toInt(row.essay?.knowledge),
      comprehension: toInt(row.essay?.comprehension),
      application: toInt(row.essay?.application),
    },
    totalKnowledge: 0,
    totalComprehension: 0,
    totalApplication: 0,
    totalPercentage: '0%',
  }));

  const qTypes = ['multipleChoice', 'trueFalse', 'shortAnswer', 'essay'] as const;

  const typeQuestionCounts: Record<typeof qTypes[number], number> = {
    multipleChoice: 0,
    trueFalse: 0,
    shortAnswer: 0,
    essay: 0,
  };

  for (const row of matrix) {
    for (const qt of qTypes) {
      typeQuestionCounts[qt] +=
        toInt(row[qt].knowledge) + toInt(row[qt].comprehension) + toInt(row[qt].application);
    }
  }

  const sectionPoints: Record<typeof qTypes[number], number> = {
    multipleChoice: Math.max(0, Number(mcCfg.points) || 0),
    trueFalse: Math.max(0, Number(tfCfg.points) || 0),
    shortAnswer: Math.max(0, Number(saCfg.points) || 0),
    essay: Math.max(0, Number(esCfg.points) || 0),
  };

  const pointPerQ: Record<typeof qTypes[number], number> = {
    multipleChoice:
      typeQuestionCounts.multipleChoice > 0
        ? sectionPoints.multipleChoice / typeQuestionCounts.multipleChoice
        : 0,
    trueFalse:
      typeQuestionCounts.trueFalse > 0
        ? sectionPoints.trueFalse / typeQuestionCounts.trueFalse
        : 0,
    shortAnswer:
      typeQuestionCounts.shortAnswer > 0
        ? sectionPoints.shortAnswer / typeQuestionCounts.shortAnswer
        : 0,
    essay: typeQuestionCounts.essay > 0 ? sectionPoints.essay / typeQuestionCounts.essay : 0,
  };

  const totalExamPoints =
    sectionPoints.multipleChoice +
    sectionPoints.trueFalse +
    sectionPoints.shortAnswer +
    sectionPoints.essay;

  const totalExamQuestions =
    typeQuestionCounts.multipleChoice +
    typeQuestionCounts.trueFalse +
    typeQuestionCounts.shortAnswer +
    typeQuestionCounts.essay;

  let grandTotalK = 0;
  let grandTotalC = 0;
  let grandTotalA = 0;

  let totalPointsK = 0;
  let totalPointsC = 0;
  let totalPointsA = 0;

  matrix.forEach((row) => {
    const rK =
      toInt(row.multipleChoice.knowledge) +
      toInt(row.trueFalse.knowledge) +
      toInt(row.shortAnswer.knowledge) +
      toInt(row.essay.knowledge);
    const rC =
      toInt(row.multipleChoice.comprehension) +
      toInt(row.trueFalse.comprehension) +
      toInt(row.shortAnswer.comprehension) +
      toInt(row.essay.comprehension);
    const rA =
      toInt(row.multipleChoice.application) +
      toInt(row.trueFalse.application) +
      toInt(row.shortAnswer.application) +
      toInt(row.essay.application);

    row.totalKnowledge = rK;
    row.totalComprehension = rC;
    row.totalApplication = rA;

    grandTotalK += rK;
    grandTotalC += rC;
    grandTotalA += rA;

    let rowPts = 0;
    for (const qt of qTypes) {
      const pK = toInt(row[qt].knowledge) * pointPerQ[qt];
      const pC = toInt(row[qt].comprehension) * pointPerQ[qt];
      const pA = toInt(row[qt].application) * pointPerQ[qt];
      totalPointsK += pK;
      totalPointsC += pC;
      totalPointsA += pA;
      rowPts += pK + pC + pA;
    }

    const rowTotalQ = rK + rC + rA;
    const rawPct =
      totalExamPoints > 0
        ? (rowPts / totalExamPoints) * 100
        : totalExamQuestions > 0
        ? (rowTotalQ / totalExamQuestions) * 100
        : 0;
    row.totalPercentage = formatViPercent(rawPct);
  });

  const sumByTypeLevel = (
    qt: typeof qTypes[number],
    lvl: 'knowledge' | 'comprehension' | 'application'
  ) => matrix.reduce((s, r) => s + toInt(r[qt][lvl]), 0);

  const pctMC =
    totalExamPoints > 0
      ? Math.round((sectionPoints.multipleChoice / totalExamPoints) * 1000) / 10
      : 0;
  const pctTF =
    totalExamPoints > 0 ? Math.round((sectionPoints.trueFalse / totalExamPoints) * 1000) / 10 : 0;
  const pctSA =
    totalExamPoints > 0
      ? Math.round((sectionPoints.shortAnswer / totalExamPoints) * 1000) / 10
      : 0;
  const pctES =
    totalExamPoints > 0 ? Math.round((sectionPoints.essay / totalExamPoints) * 1000) / 10 : 0;

  const pctK =
    totalExamPoints > 0
      ? Math.round((totalPointsK / totalExamPoints) * 1000) / 10
      : totalExamQuestions > 0
      ? Math.round((grandTotalK / totalExamQuestions) * 1000) / 10
      : 0;
  const pctC =
    totalExamPoints > 0
      ? Math.round((totalPointsC / totalExamPoints) * 1000) / 10
      : totalExamQuestions > 0
      ? Math.round((grandTotalC / totalExamQuestions) * 1000) / 10
      : 0;
  const pctA =
    totalExamPoints > 0
      ? Math.round((totalPointsA / totalExamPoints) * 1000) / 10
      : totalExamQuestions > 0
      ? Math.round((grandTotalA / totalExamQuestions) * 1000) / 10
      : 0;

  const totals: MatrixTotals = {
    totalQuestions: {
      knowledge: grandTotalK,
      comprehension: grandTotalC,
      application: grandTotalA,
      multipleChoice: {
        knowledge: sumByTypeLevel('multipleChoice', 'knowledge'),
        comprehension: sumByTypeLevel('multipleChoice', 'comprehension'),
        application: sumByTypeLevel('multipleChoice', 'application'),
      },
      trueFalse: {
        knowledge: sumByTypeLevel('trueFalse', 'knowledge'),
        comprehension: sumByTypeLevel('trueFalse', 'comprehension'),
        application: sumByTypeLevel('trueFalse', 'application'),
      },
      shortAnswer: {
        knowledge: sumByTypeLevel('shortAnswer', 'knowledge'),
        comprehension: sumByTypeLevel('shortAnswer', 'comprehension'),
        application: sumByTypeLevel('shortAnswer', 'application'),
      },
      essay: {
        knowledge: sumByTypeLevel('essay', 'knowledge'),
        comprehension: sumByTypeLevel('essay', 'comprehension'),
        application: sumByTypeLevel('essay', 'application'),
      },
      totalKnowledge: grandTotalK,
      totalComprehension: grandTotalC,
      totalApplication: grandTotalA,
    },
    totalPoints: {
      knowledge: formatViPoints(totalPointsK),
      comprehension: formatViPoints(totalPointsC),
      application: formatViPoints(totalPointsA),
      multipleChoice: formatViPoints(sectionPoints.multipleChoice),
      trueFalse: formatViPoints(sectionPoints.trueFalse),
      shortAnswer: formatViPoints(sectionPoints.shortAnswer),
      essay: formatViPoints(sectionPoints.essay),
      totalKnowledge: formatViPoints(totalPointsK),
      totalComprehension: formatViPoints(totalPointsC),
      totalApplication: formatViPoints(totalPointsA),
    },
    totalPercentage: {
      knowledge: `${pctK.toString().replace('.', ',')}%`,
      comprehension: `${pctC.toString().replace('.', ',')}%`,
      application: `${pctA.toString().replace('.', ',')}%`,
      multipleChoice: `${pctMC.toString().replace('.', ',')}%`,
      trueFalse: `${pctTF.toString().replace('.', ',')}%`,
      shortAnswer: `${pctSA.toString().replace('.', ',')}%`,
      essay: `${pctES.toString().replace('.', ',')}%`,
      totalKnowledge: `${pctK.toString().replace('.', ',')}%`,
      totalComprehension: `${pctC.toString().replace('.', ',')}%`,
      totalApplication: `${pctA.toString().replace('.', ',')}%`,
    },
  };

  const intPctK = Math.round(pctK);
  const intPctC = Math.round(pctC);
  const intPctA = Math.max(0, 100 - intPctK - intPctC);

  return {
    matrix,
    totals,
    computedLevels: {
      knowledge: intPctK,
      comprehension: intPctC,
      application: intPctA,
      highApplication: 0,
    },
  };
}

/**
 * Automatically distributes questions across the rows of the matrix according to the target questionTypes and cognitive levels.
 */
export function autoDistributeMatrixRows(
  currentMatrix: MatrixRow[],
  questionTypes: QuestionTypeConfig[],
  levels: CognitiveLevelConfig
): {
  matrix: MatrixRow[];
  totals: MatrixTotals;
  computedLevels: CognitiveLevelConfig;
} {
  if (!currentMatrix || currentMatrix.length === 0) {
    return recalculateMatrixAndTotals([], questionTypes);
  }

  const rowCount = currentMatrix.length;
  const freshMatrix: MatrixRow[] = currentMatrix.map((r) => ({
    ...r,
    multipleChoice: { knowledge: 0, comprehension: 0, application: 0 },
    trueFalse: { knowledge: 0, comprehension: 0, application: 0 },
    shortAnswer: { knowledge: 0, comprehension: 0, application: 0 },
    essay: { knowledge: 0, comprehension: 0, application: 0 },
  }));

  const typeMapping: Array<{
    cfgId: string;
    key: 'multipleChoice' | 'trueFalse' | 'shortAnswer' | 'essay';
    isEssay?: boolean;
  }> = [
    { cfgId: 'trac_nghiem', key: 'multipleChoice' },
    { cfgId: 'dung_sai', key: 'trueFalse' },
    { cfgId: 'tra_loi_ngan', key: 'shortAnswer' },
    { cfgId: 'tu_luan', key: 'essay', isEssay: true },
  ];

  let rowCursor = 0;

  for (const tm of typeMapping) {
    const cfg = questionTypes.find((c) => c.id === tm.cfgId);
    if (!cfg || cfg.quantity <= 0) continue;

    let targetK = 0;
    let targetC = 0;
    let targetA = 0;

    if (cfg.manualLevels) {
      targetK = toInt(cfg.manualLevels.knowledge);
      targetC = toInt(cfg.manualLevels.comprehension);
      targetA = toInt(cfg.manualLevels.application) + toInt(cfg.manualLevels.highApplication);
    } else {
      const split = splitCountByFourLevels(cfg.quantity, levels, tm.isEssay);
      targetK = split.knowledge;
      targetC = split.comprehension;
      targetA = split.application + split.highApplication;
    }

    const levelTargets: Array<{ lvl: 'knowledge' | 'comprehension' | 'application'; count: number }> = [
      { lvl: 'knowledge', count: targetK },
      { lvl: 'comprehension', count: targetC },
      { lvl: 'application', count: targetA },
    ];

    for (const lt of levelTargets) {
      for (let i = 0; i < lt.count; i++) {
        const rIdx = rowCursor % rowCount;
        freshMatrix[rIdx][tm.key][lt.lvl] = toInt(freshMatrix[rIdx][tm.key][lt.lvl]) + 1;
        rowCursor++;
      }
    }
  }

  return recalculateMatrixAndTotals(freshMatrix, questionTypes);
}
