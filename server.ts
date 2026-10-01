import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { jsonrepair } from "jsonrepair";

/**
 * Repairs unescaped backslashes in JSON strings (frequently caused by LaTeX formulas like \frac, \sqrt).
 * Also safely preserves valid JSON escapes (\", \\, \n, \r, \t, etc.).
 */
function fixJsonBackslashes(jsonStr: string): string {
  let result = "";
  let inString = false;
  let i = 0;

  while (i < jsonStr.length) {
    const char = jsonStr[i];

    if (!inString) {
      if (char === '"') {
        inString = true;
      }
      result += char;
      i++;
    } else {
      if (char === '"') {
        inString = false;
        result += char;
        i++;
      } else if (char === "\\") {
        const nextChar = jsonStr[i + 1];
        if (nextChar === '"') {
          result += '\\"';
          i += 2;
        } else if (nextChar === "\\") {
          result += "\\\\";
          i += 2;
        } else if (nextChar === "u" && /^[0-9a-fA-F]{4}/.test(jsonStr.slice(i + 2, i + 6))) {
          result += jsonStr.slice(i, i + 6);
          i += 6;
        } else if (
          (nextChar === "b" && !/^[a-zA-Z]/.test(jsonStr[i + 2] || "")) ||
          (nextChar === "n" && !/^[a-zA-Z]/.test(jsonStr[i + 2] || "")) ||
          (nextChar === "r" && !/^[a-zA-Z]/.test(jsonStr[i + 2] || "")) ||
          (nextChar === "t" && !/^[a-zA-Z]/.test(jsonStr[i + 2] || "")) ||
          (nextChar === "f" && !/^[a-zA-Z]/.test(jsonStr[i + 2] || "")) ||
          nextChar === "/"
        ) {
          result += "\\" + nextChar;
          i += 2;
        } else {
          // Unescaped LaTeX backslash (e.g. \sqrt, \widehat, \alpha, \circ, \in, etc.)
          result += "\\\\";
          i++;
        }
      } else if (char === "\n") {
        result += "\\n";
        i++;
      } else if (char === "\r") {
        result += "\\r";
        i++;
      } else if (char === "\t") {
        result += "\\t";
        i++;
      } else {
        result += char;
        i++;
      }
    }
  }
  return result;
}

/**
 * Robust JSON parser for LLM outputs. Extracts JSON blocks and handles unescaped LaTeX backslashes
 * and minor syntax flaws using jsonrepair as fallback.
 */
function safeParseLLMJson(raw: string): any {
  if (!raw) throw new Error("Empty response from AI");
  let text = raw.trim();

  // Extract JSON object or array if wrapped in other text or code blocks
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    text = jsonMatch[0];
  }

  // 1. Direct parse attempt
  try {
    return JSON.parse(text);
  } catch (e1) {
    // 2. Fix unescaped backslashes and retry
    try {
      const fixed = fixJsonBackslashes(text);
      return JSON.parse(fixed);
    } catch (e2) {
      // 3. Combine with jsonrepair
      try {
        const repaired = jsonrepair(fixJsonBackslashes(text));
        return JSON.parse(repaired);
      } catch (e3) {
        // 4. Fallback directly to jsonrepair
        const repairedRaw = jsonrepair(text);
        return JSON.parse(repairedRaw);
      }
    }
  }
}

const generateContentWithRetry = async (ai: GoogleGenAI, params: any, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const isRetryable = error.status === 503 || error.status === 429 || error.message?.includes('503') || error.message?.includes('429');
      if (attempt === maxRetries || !isRetryable) {
        throw error;
      }
      console.log(`Gemini API error. Retrying in ${attempt * 2}s... (Attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
};

function toInt(val: any): number {
  if (typeof val === "number" && !isNaN(val)) return Math.max(0, Math.round(val));
  if (typeof val === "string") {
    const match = val.match(/\d+/);
    return match ? Math.max(0, parseInt(match[0], 10)) : 0;
  }
  return 0;
}

function formatViNumber(num: number): string {
  return num.toFixed(1).replace(".", ",");
}

/**
 * Splits a total integer quantity into [knowledge, comprehension, application]
 * according to cognitive level ratios.
 */
function splitByLevels(
  total: number,
  levels: { knowledge?: number; comprehension?: number; application?: number; highApplication?: number },
  isEssay = false
): [number, number, number] {
  if (total <= 0) return [0, 0, 0];
  if (isEssay) {
    // Essay questions are predominantly Vận dụng / Thông hiểu
    if (total === 1) return [0, 0, 1];
    if (total === 2) return [0, 1, 1];
    const a = Math.max(1, Math.round(total * 0.6));
    const c = Math.max(0, total - a);
    return [0, c, a];
  }

  const kWeight = Math.max(0, Number(levels?.knowledge ?? 40));
  const cWeight = Math.max(0, Number(levels?.comprehension ?? 30));
  const aWeight = Math.max(0, Number(levels?.application ?? 20) + Number(levels?.highApplication ?? 10));
  const weightSum = kWeight + cWeight + aWeight || 100;

  let k = Math.round((total * kWeight) / weightSum);
  let c = Math.round((total * cWeight) / weightSum);
  let a = total - k - c;

  if (a < 0) {
    if (c >= -a) {
      c += a;
    } else {
      k += a + c;
      c = 0;
    }
    a = 0;
  }
  return [k, c, a];
}

/**
 * Normalizes the LLM-generated matrix and totals so that question counts across all rows
 * match 100% the user's configured quantities (e.g. 12 Multiple Choice, 4 True/False, 6 Short Answer, 1 Essay).
 */
function normalizeMatrixResult(rawResult: any, config: any[], levels: any, lessonDetails?: { chapter: string; topic: string }[]) {
  const mcCfg = config?.find((c: any) => c.id === "trac_nghiem") || { quantity: 12, points: 3 };
  const tfCfg = config?.find((c: any) => c.id === "dung_sai") || { quantity: 4, points: 4 };
  const saCfg = config?.find((c: any) => c.id === "tra_loi_ngan") || { quantity: 6, points: 3 };
  const esCfg = config?.find((c: any) => c.id === "tu_luan") || { quantity: 1, points: 0 };

  const targets: Record<string, number> = {
    multipleChoice: toInt(mcCfg.quantity),
    trueFalse: toInt(tfCfg.quantity),
    shortAnswer: toInt(saCfg.quantity),
    essay: toInt(esCfg.quantity),
  };

  const pointsConfig: Record<string, number> = {
    multipleChoice: Number(mcCfg.points) || 0,
    trueFalse: Number(tfCfg.points) || 0,
    shortAnswer: Number(saCfg.points) || 0,
    essay: Number(esCfg.points) || 0,
  };

  let matrix: any[] = Array.isArray(rawResult?.matrix) && rawResult.matrix.length > 0
    ? rawResult.matrix
    : (lessonDetails || []).map((ld) => ({
        chapter: ld.chapter,
        topic: ld.topic,
        multipleChoice: { knowledge: 0, comprehension: 0, application: 0 },
        trueFalse: { knowledge: 0, comprehension: 0, application: 0 },
        shortAnswer: { knowledge: 0, comprehension: 0, application: 0 },
        essay: { knowledge: 0, comprehension: 0, application: 0 },
      }));

  // Clean integer values in every cell
  matrix = matrix.map((row: any, idx: number) => ({
    chapter: row.chapter || lessonDetails?.[idx]?.chapter || "Chủ đề Toán học",
    topic: row.topic || lessonDetails?.[idx]?.topic || `Bài học ${idx + 1}`,
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
    totalPercentage: "0%",
  }));

  const qTypes = ["multipleChoice", "trueFalse", "shortAnswer", "essay"] as const;
  const levelKeys = ["knowledge", "comprehension", "application"] as const;

  const cfgMap: Record<typeof qTypes[number], any> = {
    multipleChoice: mcCfg,
    trueFalse: tfCfg,
    shortAnswer: saCfg,
    essay: esCfg,
  };

  // Enforce exact question count per question type (and per cognitive level if manualLevels is configured)
  for (const qType of qTypes) {
    const targetTotal = targets[qType];
    if (targetTotal === 0) {
      matrix.forEach((row) => {
        row[qType].knowledge = 0;
        row[qType].comprehension = 0;
        row[qType].application = 0;
      });
      continue;
    }

    const qCfg = cfgMap[qType];
    const hasManualLevels =
      qCfg?.manualLevels &&
      toInt(qCfg.manualLevels.knowledge) +
        toInt(qCfg.manualLevels.comprehension) +
        toInt(qCfg.manualLevels.application) +
        toInt(qCfg.manualLevels.highApplication) ===
        targetTotal;

    const currentSum = matrix.reduce(
      (sum, row) => sum + row[qType].knowledge + row[qType].comprehension + row[qType].application,
      0
    );

    if (currentSum !== targetTotal || hasManualLevels) {
      let targetK = 0;
      let targetC = 0;
      let targetA = 0;

      if (hasManualLevels) {
        targetK = toInt(qCfg.manualLevels.knowledge);
        targetC = toInt(qCfg.manualLevels.comprehension);
        targetA =
          toInt(qCfg.manualLevels.application) + toInt(qCfg.manualLevels.highApplication);
      } else {
        [targetK, targetC, targetA] = splitByLevels(targetTotal, levels, qType === "essay");
      }

      const levelTargets: Record<string, number> = {
        knowledge: targetK,
        comprehension: targetC,
        application: targetA,
      };

      for (const lvl of levelKeys) {
        const lvlTarget = levelTargets[lvl];
        let lvlSum = matrix.reduce((s, r) => s + r[qType][lvl], 0);

        // If current sum for this level > target, decrement from rows with highest counts
        let guard = 0;
        while (lvlSum > lvlTarget && guard < 500) {
          guard++;
          let bestIdx = -1;
          let bestVal = 0;
          for (let i = 0; i < matrix.length; i++) {
            if (matrix[i][qType][lvl] > bestVal) {
              bestVal = matrix[i][qType][lvl];
              bestIdx = i;
            }
          }
          if (bestIdx === -1) break;
          matrix[bestIdx][qType][lvl]--;
          lvlSum--;
        }

        // If current sum for this level < target, increment rows with lowest total questions
        guard = 0;
        while (lvlSum < lvlTarget && guard < 500) {
          guard++;
          let bestIdx = 0;
          let minRowTotal = Infinity;
          for (let i = 0; i < matrix.length; i++) {
            const rowQTypeTotal =
              matrix[i][qType].knowledge + matrix[i][qType].comprehension + matrix[i][qType].application;
            const candidateScore = matrix[i][qType][lvl] * 10 + rowQTypeTotal;
            if (candidateScore < minRowTotal) {
              minRowTotal = candidateScore;
              bestIdx = i;
            }
          }
          matrix[bestIdx][qType][lvl]++;
          lvlSum++;
        }
      }
    }
  }

  // Compute per-question point value for each type
  const totalExamPoints =
    pointsConfig.multipleChoice + pointsConfig.trueFalse + pointsConfig.shortAnswer + pointsConfig.essay || 10;

  const pointPerQ: Record<string, number> = {
    multipleChoice: targets.multipleChoice > 0 ? pointsConfig.multipleChoice / targets.multipleChoice : 0,
    trueFalse: targets.trueFalse > 0 ? pointsConfig.trueFalse / targets.trueFalse : 0,
    shortAnswer: targets.shortAnswer > 0 ? pointsConfig.shortAnswer / targets.shortAnswer : 0,
    essay: targets.essay > 0 ? pointsConfig.essay / targets.essay : 0,
  };

  let grandTotalK = 0;
  let grandTotalC = 0;
  let grandTotalA = 0;
  let totalPointsK = 0;
  let totalPointsC = 0;
  let totalPointsA = 0;

  matrix.forEach((row) => {
    const rK =
      row.multipleChoice.knowledge + row.trueFalse.knowledge + row.shortAnswer.knowledge + row.essay.knowledge;
    const rC =
      row.multipleChoice.comprehension +
      row.trueFalse.comprehension +
      row.shortAnswer.comprehension +
      row.essay.comprehension;
    const rA =
      row.multipleChoice.application + row.trueFalse.application + row.shortAnswer.application + row.essay.application;

    row.totalKnowledge = rK;
    row.totalComprehension = rC;
    row.totalApplication = rA;

    grandTotalK += rK;
    grandTotalC += rC;
    grandTotalA += rA;

    let rowPoints = 0;
    for (const qType of qTypes) {
      const pK = row[qType].knowledge * pointPerQ[qType];
      const pC = row[qType].comprehension * pointPerQ[qType];
      const pA = row[qType].application * pointPerQ[qType];
      totalPointsK += pK;
      totalPointsC += pC;
      totalPointsA += pA;
      rowPoints += pK + pC + pA;
    }

    const rowPct = totalExamPoints > 0 ? Math.round((rowPoints / totalExamPoints) * 100) : 0;
    row.totalPercentage = `${rowPct}%`;
  });

  const sumByTypeLevel = (qType: string, lvl: string) =>
    matrix.reduce((s, r) => s + (r[qType]?.[lvl] || 0), 0);

  const totals = {
    totalQuestions: {
      multipleChoice: {
        knowledge: sumByTypeLevel("multipleChoice", "knowledge"),
        comprehension: sumByTypeLevel("multipleChoice", "comprehension"),
        application: sumByTypeLevel("multipleChoice", "application"),
      },
      trueFalse: {
        knowledge: sumByTypeLevel("trueFalse", "knowledge"),
        comprehension: sumByTypeLevel("trueFalse", "comprehension"),
        application: sumByTypeLevel("trueFalse", "application"),
      },
      shortAnswer: {
        knowledge: sumByTypeLevel("shortAnswer", "knowledge"),
        comprehension: sumByTypeLevel("shortAnswer", "comprehension"),
        application: sumByTypeLevel("shortAnswer", "application"),
      },
      essay: {
        knowledge: sumByTypeLevel("essay", "knowledge"),
        comprehension: sumByTypeLevel("essay", "comprehension"),
        application: sumByTypeLevel("essay", "application"),
      },
      totalKnowledge: grandTotalK,
      totalComprehension: grandTotalC,
      totalApplication: grandTotalA,
    },
    totalPoints: {
      multipleChoice: formatViNumber(pointsConfig.multipleChoice),
      trueFalse: formatViNumber(pointsConfig.trueFalse),
      shortAnswer: formatViNumber(pointsConfig.shortAnswer),
      essay: formatViNumber(pointsConfig.essay),
      totalKnowledge: formatViNumber(totalPointsK),
      totalComprehension: formatViNumber(totalPointsC),
      totalApplication: formatViNumber(totalPointsA),
    },
    totalPercentage: {
      multipleChoice: Math.round((pointsConfig.multipleChoice / totalExamPoints) * 100),
      trueFalse: Math.round((pointsConfig.trueFalse / totalExamPoints) * 100),
      shortAnswer: Math.round((pointsConfig.shortAnswer / totalExamPoints) * 100),
      essay: Math.round((pointsConfig.essay / totalExamPoints) * 100),
      totalKnowledge: Math.round((totalPointsK / totalExamPoints) * 100),
      totalComprehension: Math.round((totalPointsC / totalExamPoints) * 100),
      totalApplication: Math.round((totalPointsA / totalExamPoints) * 100),
    },
  };

  return {
    matrix,
    specification: Array.isArray(rawResult?.specification) ? rawResult.specification : [],
    totals,
  };
}

interface QuestionSlot {
  slotIndex: number;
  id: string;
  type: "multipleChoice" | "trueFalse" | "shortAnswer" | "essay";
  level: string;
  chapter: string;
  topic: string;
  points: string;
  requirement: string;
}

/**
 * Builds an exact 1-to-1 list of question slots from the Matrix and Specification.
 * Guarantees the exact number of questions per type and binds each question to its exact YCCĐ.
 */
function buildQuestionSlots(matrix: any[], specification: any[], config?: any[]): QuestionSlot[] {
  const mcCfg = config?.find((c: any) => c.id === "trac_nghiem") || { quantity: 12, points: 3 };
  const tfCfg = config?.find((c: any) => c.id === "dung_sai") || { quantity: 4, points: 4 };
  const saCfg = config?.find((c: any) => c.id === "tra_loi_ngan") || { quantity: 6, points: 3 };
  const esCfg = config?.find((c: any) => c.id === "tu_luan") || { quantity: 1, points: 0 };

  const findRequirement = (topic: string, levelKey: "knowledge" | "comprehension" | "application", includeAllLevels = false): string => {
    const normTopic = (topic || "").trim().toLowerCase();
    const topicSpecs = (specification || []).filter((s: any) => {
      const st = (s.topic || "").trim().toLowerCase();
      return st === normTopic || st.includes(normTopic) || normTopic.includes(st);
    });

    if (topicSpecs.length === 0) {
      return `Bám sát yêu cầu cần đạt Chương trình GDPT 2018 chủ đề: ${topic}`;
    }

    if (includeAllLevels) {
      return topicSpecs
        .map((s: any) => `[${s.level}]: ${s.requirement}`)
        .join("\n");
    }

    const levelSearch =
      levelKey === "knowledge" ? "biết" : levelKey === "comprehension" ? "hiểu" : "vận dụng";

    const matched = topicSpecs.filter((s: any) =>
      String(s.level || "").toLowerCase().includes(levelSearch)
    );

    if (matched.length > 0) {
      return matched.map((s: any) => s.requirement).join("\n");
    }

    return topicSpecs.map((s: any) => s.requirement).join("\n");
  };

  const levelLabels: Record<"knowledge" | "comprehension" | "application", string> = {
    knowledge: "Nhận biết",
    comprehension: "Thông hiểu",
    application: "Vận dụng",
  };

  const slots: QuestionSlot[] = [];
  let globalIdx = 1;

  const typeConfigs: Array<{
    type: "multipleChoice" | "trueFalse" | "shortAnswer" | "essay";
    totalPoints: number;
    defaultPerQ: number;
  }> = [
    { type: "multipleChoice", totalPoints: Number(mcCfg.points) || 3, defaultPerQ: 0.25 },
    { type: "trueFalse", totalPoints: Number(tfCfg.points) || 4, defaultPerQ: 1.0 },
    { type: "shortAnswer", totalPoints: Number(saCfg.points) || 3, defaultPerQ: 0.5 },
    { type: "essay", totalPoints: Number(esCfg.points) || 1, defaultPerQ: 1.0 },
  ];

  for (const tc of typeConfigs) {
    const qType = tc.type;
    // Count total questions of this type in matrix
    const typeCount = matrix.reduce(
      (sum, row) =>
        sum +
        toInt(row[qType]?.knowledge) +
        toInt(row[qType]?.comprehension) +
        toInt(row[qType]?.application),
      0
    );

    const perQPoints =
      typeCount > 0 && tc.totalPoints > 0
        ? Number((tc.totalPoints / typeCount).toFixed(2))
        : tc.defaultPerQ;
    const pointsLabel = `${String(perQPoints).replace(".", ",")} điểm`;

    let sectionNum = 1;
    for (const lvlKey of ["knowledge", "comprehension", "application"] as const) {
      for (const row of matrix) {
        const count = toInt(row[qType]?.[lvlKey]);
        for (let c = 0; c < count; c++) {
          const reqText = findRequirement(
            row.topic,
            lvlKey,
            qType === "trueFalse" || qType === "essay"
          );
          slots.push({
            slotIndex: globalIdx++,
            id: `Câu ${sectionNum++}`,
            type: qType,
            level: levelLabels[lvlKey],
            chapter: row.chapter || "",
            topic: row.topic || "",
            points: pointsLabel,
            requirement: reqText,
          });
        }
      }
    }
  }

  return slots;
}

/**
 * Ensures essay questions always have structured, detailed gradingSteps for the rubric table,
 * and enforces exact question counts matching the matrix slots.
 */
function enforceExamQuestions(rawQuestions: any[], slots: QuestionSlot[]) {
  const safeRaw = Array.isArray(rawQuestions) ? rawQuestions : [];
  const finalQuestions: any[] = [];

  const qTypes = ["multipleChoice", "trueFalse", "shortAnswer", "essay"] as const;

  for (const qType of qTypes) {
    const typeSlots = slots.filter((s) => s.type === qType);
    if (typeSlots.length === 0) continue;

    // Find candidates matching this type
    const candidates = safeRaw.filter((q) => q && q.type === qType);

    for (let i = 0; i < typeSlots.length; i++) {
      const slot = typeSlots[i];
      // Prefer candidate matched by slotIndex, otherwise positional candidate within type
      const bySlotIdx = safeRaw.find((q) => Number(q?.slotIndex) === slot.slotIndex && q?.type === qType);
      const q = bySlotIdx || candidates[i] || candidates[candidates.length - 1] || {};

      let gradingSteps = Array.isArray(q.gradingSteps) ? q.gradingSteps.filter((s: any) => s && (s.content || s.part)) : [];

      // If essay question doesn't have gradingSteps, construct detailed steps from explanation
      if (qType === "essay" && gradingSteps.length === 0 && q.explanation) {
        const lines = String(q.explanation)
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length > 0) {
          const totalPtsNum = parseFloat(String(slot.points).replace(",", ".")) || 1.0;
          const stepCount = lines.length;
          const stepPt = Number((totalPtsNum / stepCount).toFixed(2))
            .toString()
            .replace(".", ",");

          gradingSteps = lines.map((line, idx) => ({
            part: `Bước ${idx + 1}`,
            content: line,
            points: `${stepPt} điểm`,
          }));
        }
      }

      // Ensure explanation is also well-populated if gradingSteps exist
      let explanation = q.explanation || "";
      if (qType === "essay" && gradingSteps.length > 0 && !explanation.trim()) {
        explanation = gradingSteps
          .map((st: any) => `• ${st.part} (${st.points}):\n${st.content}`)
          .join("\n\n");
      }

      finalQuestions.push({
        id: slot.id,
        type: slot.type,
        level: slot.level,
        topic: slot.topic,
        requirement: slot.requirement,
        points: slot.points,
        content: q.content || `Câu hỏi phần ${slot.topic} (${slot.level})`,
        options: Array.isArray(q.options) ? q.options : undefined,
        answer: q.answer ?? "",
        explanation,
        gradingSteps: qType === "essay" ? gradingSteps : undefined,
      });
    }
  }

  return finalQuestions;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Route for Matrix Generation
  app.post("/api/generate-matrix", async (req, res) => {
    try {
      const { grade = "Lớp 6", lessons, lessonDetails, config, levels } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const mcQty = toInt(config?.find((c: any) => c.id === "trac_nghiem")?.quantity ?? 12);
      const tfQty = toInt(config?.find((c: any) => c.id === "dung_sai")?.quantity ?? 4);
      const saQty = toInt(config?.find((c: any) => c.id === "tra_loi_ngan")?.quantity ?? 6);
      const esQty = toInt(config?.find((c: any) => c.id === "tu_luan")?.quantity ?? 1);

      const prompt = `Bạn là một chuyên gia giáo dục phân tích chương trình học Toán THCS (${grade}) theo Chương trình GDPT 2018.
Dựa vào các bài học người dùng đã chọn (${grade}):
${(lessonDetails || lessons.map((t: string) => ({ chapter: "", topic: t }))).map((d: any, idx: number) => `${idx + 1}. Chương: "${d.chapter}" - Bài/Chủ đề: "${d.topic}"`).join("\n")}

Và cấu hình bài kiểm tra bắt buộc:
- PHẦN 1 - Trắc nghiệm nhiều lựa chọn (multipleChoice): TỔNG CỘNG ĐÚNG ${mcQty} CÂU
- PHẦN 2 - Trắc nghiệm Đúng - Sai (trueFalse): TỔNG CỘNG ĐÚNG ${tfQty} CÂU (Lưu ý: tính theo số CÂU HỎI lớn, KHÔNG nhân 4 ý)
- PHẦN 3 - Trắc nghiệm Trả lời ngắn (shortAnswer): TỔNG CỘNG ĐÚNG ${saQty} CÂU
- PHẦN 4 - Tự luận (essay): TỔNG CỘNG ĐÚNG ${esQty} CÂU
- Chi tiết cấu hình điểm: ${JSON.stringify(config)}
- Tỉ lệ nhận thức: Biết ${levels.knowledge}%, Hiểu ${levels.comprehension}%, Vận dụng ${levels.application}%, Vận dụng cao ${levels.highApplication}%

Hãy lập Khung ma trận và Bản đặc tả đề kiểm tra môn Toán ${grade}.
QUY TẮC BẮT BUỘC VỀ SỐ LƯỢNG CÂU HỎI TRONG MA TRẬN:
1. Mọi ô số lượng câu hỏi (knowledge, comprehension, application) trong "matrix" BẮT BUỘC là một SỐ NGUYÊN KHÔNG ÂM (0, 1, 2...). Tuyệt đối không ghi chữ như "C1" vào ô số lượng.
2. Tổng số câu "multipleChoice" (knowledge + comprehension + application) của TẤT CẢ các hàng trong "matrix" cộng lại PHẢI BẰNG ĐÚNG ${mcQty}.
3. Tổng số câu "trueFalse" (knowledge + comprehension + application) của TẤT CẢ các hàng trong "matrix" cộng lại PHẢI BẰNG ĐÚNG ${tfQty}.
4. Tổng số câu "shortAnswer" (knowledge + comprehension + application) của TẤT CẢ các hàng trong "matrix" cộng lại PHẢI BẰNG ĐÚNG ${saQty}.
5. Tổng số câu "essay" (knowledge + comprehension + application) của TẤT CẢ các hàng trong "matrix" cộng lại PHẢI BẰNG ĐÚNG ${esQty}.

ĐỐI VỚI "specification" (Bản đặc tả):
1. BẮT BUỘC mỗi chủ đề ("topic" trùng khớp hoàn toàn với "topic" trong "matrix") phải được tách thành 3 object riêng biệt tương ứng với TỪNG MỨC ĐỘ NHẬN THỨC ("Nhận biết", "Thông hiểu", "Vận dụng").
2. QUAN TRỌNG: "requirement" PHẢI TRÍCH XUẤT CHÍNH XÁC TỪNG CHỮ Yêu cầu cần đạt từ văn bản Chương trình Giáo dục Phổ thông 2018 môn Toán (${grade}). Tuyệt đối không tự ý tóm tắt sơ sài. Ví dụ: "– Nhận biết được các khái niệm về đơn thức, đa thức nhiều biến." (có dấu gạch ngang đầu dòng).

Trả về chính xác định dạng JSON thuần túy (không markdown):
{
  "matrix": [
    {
      "chapter": "Tên chương",
      "topic": "Tên bài/chủ đề",
      "multipleChoice": { "knowledge": 2, "comprehension": 1, "application": 0 },
      "trueFalse": { "knowledge": 0, "comprehension": 1, "application": 0 },
      "shortAnswer": { "knowledge": 0, "comprehension": 1, "application": 1 },
      "essay": { "knowledge": 0, "comprehension": 0, "application": 1 },
      "totalKnowledge": 2,
      "totalComprehension": 3,
      "totalApplication": 2,
      "totalPercentage": "25%"
    }
  ],
  "specification": [
    {
      "topic": "Tên bài/chủ đề",
      "level": "Nhận biết",
      "requirement": "– Yêu cầu thứ nhất trích chính xác từ CT GDPT 2018\\n– Yêu cầu thứ hai",
      "questionCount": 2
    },
    {
      "topic": "Tên bài/chủ đề",
      "level": "Thông hiểu",
      "requirement": "– Yêu cầu trích chính xác từ CT GDPT 2018",
      "questionCount": 3
    },
    {
      "topic": "Tên bài/chủ đề",
      "level": "Vận dụng",
      "requirement": "– Yêu cầu trích chính xác từ CT GDPT 2018",
      "questionCount": 2
    }
  ]
}`;

      const response: any = await generateContentWithRetry(ai, {
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text;
      const rawResult = safeParseLLMJson(responseText);
      const normalized = normalizeMatrixResult(rawResult, config, levels, lessonDetails);
      res.json(normalized);
    } catch (error: any) {
      console.error("API Error:", error);
      res.status(500).json({ error: error.message || "An unexpected error occurred." });
    }
  });

  // API Route for Exam Generation
  app.post("/api/generate-exam", async (req, res) => {
    try {
      const { grade = "Lớp 6", matrix, specification, config, levels } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Preserve the user's exact matrix (including any manual cell edits in MatrixResult),
      // falling back to normalizeMatrixResult only if matrix is empty.
      const effectiveMatrix =
        Array.isArray(matrix) && matrix.length > 0
          ? matrix
          : normalizeMatrixResult({ matrix, specification }, config, levels || {}).matrix;

      const slots = buildQuestionSlots(effectiveMatrix, specification, config);

      const mcSlots = slots.filter((s) => s.type === "multipleChoice");
      const tfSlots = slots.filter((s) => s.type === "trueFalse");
      const saSlots = slots.filter((s) => s.type === "shortAnswer");
      const esSlots = slots.filter((s) => s.type === "essay");

      const slotsBlueprintText = slots
        .map(
          (s) =>
            `[Slot ${s.slotIndex}] id="${s.id}" | type="${s.type}" | Mức độ="${s.level}" | Điểm="${s.points}" | Chương="${s.chapter}" | Chủ đề="${s.topic}"\n   -> YÊU CẦU CẦN ĐẠT BẮT BUỘC PHẢI BÁM SÁT: ${s.requirement.replace(/\n/g, " ; ")}`
        )
        .join("\n\n");

      const prompt = `Bạn là Tổ trưởng Chuyên môn Toán THCS xuất sắc, ra đề kiểm tra định kỳ môn Toán (${grade}) theo đúng Chương trình GDPT 2018.

Dưới đây là DANH SÁCH CHÍNH XÁC TỪNG CÂU HỎI (${slots.length} câu) được trích xuất 1-1 từ Khung Ma Trận và Bản Đặc Tả:
- PHẦN 1 (multipleChoice - Trắc nghiệm nhiều lựa chọn): ĐÚNG ${mcSlots.length} CÂU
- PHẦN 2 (trueFalse - Trắc nghiệm Đúng/Sai): ĐÚNG ${tfSlots.length} CÂU
- PHẦN 3 (shortAnswer - Trắc nghiệm Trả lời ngắn): ĐÚNG ${saSlots.length} CÂU
- PHẦN 4 (essay - Tự luận): ĐÚNG ${esSlots.length} CÂU

CHI TIẾT ĐẶC TẢ TỪNG CÂU HỎI BẮT BUỘC PHẢI TUÂN THỦ:
${slotsBlueprintText}

=====================================================================
QUY ĐỊNH NGHIÊM NGẶT KHI BIÊN SOẠN ĐỀ VÀ HƯỚNG DẪN CHẤM:

1. TUÂN THỦ TUYỆT ĐỐI SỐ LƯỢNG CÂU HỎI & BẢN ĐẶC TẢ:
   - BẮT BUỘC sinh đúng ${slots.length} câu hỏi tương ứng 1-1 với ${slots.length} Slot ở trên (giữ nguyên "slotIndex", "id", "type", "level", "topic").
   - TUYỆT ĐỐI KHÔNG tự ý sinh thêm hay bớt bất kỳ câu hỏi nào (Phần 1 đúng ${mcSlots.length} câu, Phần 2 đúng ${tfSlots.length} câu, Phần 3 đúng ${saSlots.length} câu, Phần 4 đúng ${esSlots.length} câu).
   - Nội dung toán học của mỗi câu hỏi PHẢI ĐÁNH GIÁ ĐÚNG hành vi năng lực và kiến thức được nêu trong mục "YÊU CẦU CẦN ĐẠT BẮT BUỘC PHẢI BÁM SÁT" của chính Slot đó (đúng khối ${grade}, đúng mức độ Nhận biết / Thông hiểu / Vận dụng).

2. QUY ĐỊNH VỀ CÔNG THỨC TOÁN HỌC (LATEX):
   - TẤT CẢ công thức toán học, biểu thức, phương trình, số mũ, phân số, căn thức, góc, tập hợp... BẮT BUỘC viết bằng cú pháp LaTeX chuẩn và kẹp trong dấu đô la $...$ (ví dụ: $x^2 - 4x + 3 = 0$, $\\frac{a}{b}$, $\\sqrt{x}$, $\\widehat{ABC} = 90^\\circ$, $x \\in \\mathbb{Z}$).
   - Các phương án A, B, C, D hoặc a), b), c), d) có chứa biểu thức toán học cũng BẮT BUỘC kẹp trong $...$.

3. QUY ĐỊNH ĐỐI VỚI CÂU ĐÚNG/SAI (trueFalse):
   - Mỗi câu Đúng/Sai gồm một dẫn nhập bài toán trong "content" và đúng 4 mệnh đề trong mảng "options" (a, b, c, d) được sắp xếp theo mức độ từ Nhận biết (a, b) -> Thông hiểu (c) -> Vận dụng (d) bám sát Yêu cầu cần đạt của chủ đề.
   - "answer" ghi rõ Đ/S cho cả 4 ý (ví dụ: "a. Đ, b. S, c. Đ, d. S").
   - "explanation" giải thích rõ vì sao từng ý a), b), c), d) là Đúng hay Sai.

4. QUY ĐỊNH BẮT BUỘC ĐỐI VỚI CÂU TRẢ LỜI NGẮN (shortAnswer):
   - Kết quả ("answer") của mỗi câu hỏi phần Trả lời ngắn BẮT BUỘC PHẢI LÀ MỘT SỐ có độ dài TỐI ĐA 4 KÝ TỰ (tính cả dấu trừ '-' hoặc dấu chấm thập phân '.').
   - Ví dụ hợp lệ: "12", "-5", "3.5", "0.25", "100", "-1.5", "2025".
   - TUYỆT ĐỐI KHÔNG chứa chữ cái, phân số '/', căn thức hay đơn vị đo trong "answer".
   - "explanation" trình bày rõ các bước tính ra con số đó.

5. QUY ĐỊNH ĐẶC BIỆT ĐỐI VỚI PHẦN TỰ LUẬN (essay) - YÊU CẦU ĐÁP ÁN & BIỂU ĐIỂM CỰC KỲ CHI TIẾT:
   - Đề bài câu tự luận ("content") phải sát với Yêu cầu cần đạt trong Bản đặc tả (nên chia thành các ý nhỏ a), b)... hoặc bài toán có các bước giải rõ ràng).
   - Đáp án và Hướng dẫn chấm phần Tự luận PHẢI CHI TIẾT TỪNG BƯỚC NHƯ ĐÁP ÁN CHÍNH THỨC CỦA BỘ/SỞ GD&ĐT:
     + Trường "answer": Tóm tắt đáp số / kết luận cuối cùng của từng ý (ví dụ: "a) $P = \\frac{x+1}{x-1}$; b) $x = 4$").
     + Trường "gradingSteps": BẮT BUỘC phải có mảng "gradingSteps" chia nhỏ lời giải thành từng bước chấm điểm cụ thể (từ 3 đến 6 bước/ý). Mỗi phần tử trong "gradingSteps" gồm:
       * "part": Tên ý hoặc bước giải (ví dụ: "Ý a: Tìm điều kiện và rút gọn biểu thức", "Ý b: Tính giá trị của biểu thức khi $x = ...$").
       * "content": Lời giải toán học chi tiết TỪNG DÒNG, TỪNG BƯỚC BIẾN ĐỔI TƯƠNG ĐƯƠNG, lập luận chặt chẽ, ghi rõ áp dụng công thức/định lý nào, tính toán ra sao, đối chiếu điều kiện và kết luận. Dùng ký tự xuống dòng (\\n) để trình bày từng dòng biến đổi rõ ràng. TUYỆT ĐỐI KHÔNG làm tắt hay chỉ ghi đáp số!
       * "points": Điểm thành phần của bước đó (ví dụ: "0,25 điểm", "0,5 điểm") sao cho tổng điểm các bước trong "gradingSteps" bằng đúng điểm số của câu tự luận đó.
     + Trường "explanation": Bản tổng hợp đầy đủ toàn bộ lời giải chi tiết từng bước từ đầu đến cuối.

Trả về định dạng JSON thuần túy (không markdown) theo cấu trúc sau:
{
  "questions": [
    {
      "slotIndex": 1,
      "id": "Câu 1",
      "type": "multipleChoice",
      "level": "Nhận biết",
      "topic": "Tên chủ đề",
      "content": "Nội dung câu hỏi (dùng LaTeX $...$)...",
      "options": ["A. $...$", "B. $...$", "C. $...$", "D. $...$"],
      "answer": "A",
      "explanation": "Lời giải chi tiết..."
    },
    {
      "slotIndex": 23,
      "id": "Câu 1",
      "type": "essay",
      "level": "Vận dụng",
      "topic": "Tên chủ đề",
      "content": "Nội dung bài toán tự luận...",
      "answer": "a) ...; b) ...",
      "explanation": "Lời giải đầy đủ từng bước...",
      "gradingSteps": [
        {
          "part": "Ý a) ...",
          "content": "Trình bày chi tiết bước 1...\\nBiến đổi bước 2...\\nVậy ...",
          "points": "0,5 điểm"
        },
        {
          "part": "Ý b) ...",
          "content": "Ta có ...\\nSuy ra ...\\nKết luận ...",
          "points": "0,5 điểm"
        }
      ]
    }
  ]
}
LƯU Ý KỸ VỀ CHUỖI JSON: Mọi dấu gạch chéo ngược trong lệnh LaTeX cần được viết là \\\\ (ví dụ: \\\\frac{a}{b}, \\\\sqrt{x}, \\\\widehat{ABC}) để chuỗi JSON hợp lệ.`;

      const response: any = await generateContentWithRetry(ai, {
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text;
      const rawResult = safeParseLLMJson(responseText);
      const enforcedQuestions = enforceExamQuestions(rawResult?.questions || [], slots);
      res.json({ questions: enforcedQuestions });
    } catch (error: any) {
      console.error("API Error:", error);
      res.status(500).json({ error: error.message || "An unexpected error occurred." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
