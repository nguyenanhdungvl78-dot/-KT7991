/**
 * Utility functions to safely handle and format question answers,
 * supporting strings, arrays, booleans, and objects returned by LLMs.
 */

export function formatAnswerString(answer: any): string {
  if (answer === null || answer === undefined) return '';
  if (typeof answer === 'string') return answer;
  if (typeof answer === 'number' || typeof answer === 'boolean') return String(answer);
  if (Array.isArray(answer)) {
    return answer
      .map((item) => (typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item)))
      .join(', ');
  }
  if (typeof answer === 'object') {
    return Object.entries(answer)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  }
  return String(answer);
}

/**
 * Parses multiple choice answer (e.g. "A", "Đáp án A", ["A"], etc.) into a clean letter A-D
 */
export function parseMultipleChoiceAnswer(answer: any): string {
  const str = formatAnswerString(answer).trim();
  const match = str.match(/[A-D]/i);
  return match ? match[0].toUpperCase() : str;
}

/**
 * Parses True/False answer (supports array ['Đ','S','Đ','S'], object {a:'Đ',b:'S',...}, or string)
 * into a 4-element array of 'Đ' | 'S'.
 */
export function parseTrueFalseAnswers(answer: any): string[] {
  if (answer === null || answer === undefined) return ['S', 'S', 'S', 'S'];

  // Case 1: Array, e.g. ["Đ", "S", "Đ", "S"] or [true, false, true, false]
  if (Array.isArray(answer)) {
    return [0, 1, 2, 3].map((idx) => {
      const val = answer[idx];
      if (val === true || val === 1) return 'Đ';
      if (val === false || val === 0) return 'S';
      const str = String(val || '').trim().toUpperCase();
      return str.startsWith('Đ') || str === 'D' || str === 'TRUE' || str === 'T' ? 'Đ' : 'S';
    });
  }

  // Case 2: Object, e.g. { a: 'Đ', b: 'S', c: 'Đ', d: 'S' }
  if (typeof answer === 'object') {
    const keys = ['a', 'b', 'c', 'd'];
    return keys.map((k) => {
      const val = answer[k] ?? answer[k.toUpperCase()];
      if (val === true) return 'Đ';
      if (val === false) return 'S';
      const str = String(val || '').trim().toUpperCase();
      return str.startsWith('Đ') || str === 'D' || str === 'TRUE' || str === 'T' ? 'Đ' : 'S';
    });
  }

  // Case 3: String, e.g. "a. Đ, b. S, c. Đ, d. S" or "Đ, S, Đ, S"
  const str = String(answer);
  const matches = str.match(/Đ|S|đúng|sai|Đúng|Sai|true|false/gi) || [];
  return [0, 1, 2, 3].map((idx) => {
    const item = matches[idx];
    if (!item) return 'S';
    const upper = item.toUpperCase();
    return upper.startsWith('Đ') || upper === 'TRUE' ? 'Đ' : 'S';
  });
}

/**
 * Formats a short answer according to the new Vietnam exam format:
 * Result MUST be a number with at most 4 characters (e.g. "12", "-5", "3.5", "0.25", "100").
 */
export function formatShortAnswer(answer: any): string {
  if (answer === null || answer === undefined) return '';
  const raw = formatAnswerString(answer).trim();

  // If already at most 4 chars and is numeric, return as-is
  if (raw.length <= 4 && /^-?\d+(?:[\.,]\d+)?$/.test(raw)) {
    return raw;
  }

  // Extract the numeric portion (supports negative, integers, decimals)
  const numMatch = raw.match(/-?\d+(?:[\.,]\d+)?/);
  if (numMatch) {
    let numStr = numMatch[0];
    if (numStr.length > 4) {
      const floatVal = parseFloat(numStr.replace(',', '.'));
      if (!isNaN(floatVal)) {
        // Try to format to fit in 4 chars: e.g. 1.25, -2.5, 3.14
        const rounded = Number(floatVal.toPrecision(3)).toString();
        if (rounded.length <= 4) return rounded;
      }
      return numStr.slice(0, 4).replace(/[\.,]$/, '');
    }
    return numStr;
  }

  // Fallback: trim to max 4 chars
  return raw.slice(0, 4).replace(/[\.,]$/, '');
}

