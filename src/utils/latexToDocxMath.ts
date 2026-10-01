import {
  Math as DocxMath,
  MathRun,
  MathFraction,
  MathRadical,
  MathSuperScript,
  MathSubScript,
  MathSubSuperScript,
  MathRoundBrackets,
  MathSquareBrackets,
  MathCurlyBrackets,
  MathSum,
  MathIntegral,
  TextRun,
  ParagraphChild,
} from 'docx';

export type MathChild =
  | MathRun
  | MathFraction
  | MathRadical
  | MathSuperScript
  | MathSubScript
  | MathSubSuperScript
  | MathRoundBrackets
  | MathSquareBrackets
  | MathCurlyBrackets
  | MathSum
  | MathIntegral;

const LATEX_SYMBOLS: Record<string, string> = {
  // Greek letters
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  varepsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  vartheta: 'ϑ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  varpi: 'ϖ',
  rho: 'ρ',
  varrho: 'ϱ',
  sigma: 'σ',
  varsigma: 'ς',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  varphi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Upsilon: 'Υ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Omega: 'Ω',

  // Relations & Operators
  le: '≤',
  leq: '≤',
  leqslant: '≤',
  ge: '≥',
  geq: '≥',
  geqslant: '≥',
  ne: '≠',
  neq: '≠',
  approx: '≈',
  equiv: '≡',
  sim: '∼',
  simeq: '≃',
  cong: '≅',
  pm: '±',
  mp: '∓',
  times: '×',
  cdot: '⋅',
  div: '÷',
  ast: '∗',
  star: '⋆',
  circ: '°',
  bullet: '∙',
  oplus: '⊕',
  otimes: '⊗',

  // Sets & Logic
  in: '∈',
  notin: '∉',
  ni: '∋',
  subset: '⊂',
  supset: '⊃',
  subseteq: '⊆',
  supseteq: '⊇',
  cup: '∪',
  cap: '∩',
  emptyset: '∅',
  varnothing: '∅',
  setminus: '∖',
  forall: '∀',
  exists: '∃',
  nexists: '∄',
  neg: '¬',
  land: '∧',
  lor: '∨',

  // Arrows
  rightarrow: '→',
  to: '→',
  leftarrow: '←',
  gets: '←',
  leftrightarrow: '↔',
  Rightarrow: '⇒',
  implies: '⇒',
  Leftarrow: '⇐',
  Leftrightarrow: '⇔',
  iff: '⇔',
  uparrow: '↑',
  downarrow: '↓',
  mapsto: '↦',
  longmapsto: '⟼',
  longrightarrow: '⟶',
  Longrightarrow: '⟹',
  Longleftrightarrow: '⟺',

  // Geometry & Misc
  triangle: '△',
  vartriangle: '△',
  angle: '∠',
  measuredangle: '∡',
  perp: '⊥',
  parallel: '∥',
  infty: '∞',
  partial: '∂',
  nabla: '∇',
  therefore: '∴',
  because: '∵',
  dots: '…',
  ldots: '…',
  cdots: '⋯',
  vdots: '⋮',
  ddots: '⋱',
  prime: '′',
  colon: ':',
  mid: '|',
  Vert: '‖',
  quad: '  ',
  qquad: '    ',
};

const BLACKBOARD_BOLD: Record<string, string> = {
  N: 'ℕ',
  Z: 'ℤ',
  Q: 'ℚ',
  R: 'ℝ',
  C: 'ℂ',
  P: 'ℙ',
};

/**
 * Extracts a brace-delimited group `{...}` starting at index `startIdx` (after skipping whitespace).
 * If there is no `{`, extracts a single token (either `\command` or single character).
 */
function readGroupOrToken(src: string, startIdx: number): { content: string; nextIdx: number } {
  let i = startIdx;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (i >= src.length) return { content: '', nextIdx: i };

  if (src[i] === '{') {
    let depth = 0;
    const contentStart = i + 1;
    while (i < src.length) {
      if (src[i] === '\\' && (src[i + 1] === '{' || src[i + 1] === '}')) {
        i += 2;
        continue;
      }
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) {
          return { content: src.slice(contentStart, i), nextIdx: i + 1 };
        }
      }
      i++;
    }
    return { content: src.slice(contentStart), nextIdx: src.length };
  }

  // Optional bracket group check is handled separately; here handle `\command` or single char
  if (src[i] === '\\') {
    let cmdEnd = i + 1;
    if (cmdEnd < src.length && /[a-zA-Z]/.test(src[cmdEnd])) {
      while (cmdEnd < src.length && /[a-zA-Z]/.test(src[cmdEnd])) cmdEnd++;
    } else if (cmdEnd < src.length) {
      cmdEnd++;
    }
    const cmd = src.slice(i, cmdEnd);
    // If command is \frac, \sqrt, \mathbb, \widehat, \overline, \vec, include its arguments
    if (cmd === '\\mathbb' || cmd === '\\widehat' || cmd === '\\overline' || cmd === '\\vec' || cmd === '\\sqrt') {
      const sub = readGroupOrToken(src, cmdEnd);
      return { content: `${cmd}{${sub.content}}`, nextIdx: sub.nextIdx };
    }
    return { content: cmd, nextIdx: cmdEnd };
  }

  return { content: src[i], nextIdx: i + 1 };
}

/**
 * Reads an optional bracket argument `[...]` starting at `startIdx` (after skipping whitespace).
 */
function readOptionalBracket(src: string, startIdx: number): { content: string | null; nextIdx: number } {
  let i = startIdx;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (i >= src.length || src[i] !== '[') {
    return { content: null, nextIdx: startIdx };
  }
  let depth = 0;
  const contentStart = i + 1;
  while (i < src.length) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) {
        return { content: src.slice(contentStart, i), nextIdx: i + 1 };
      }
    }
    i++;
  }
  return { content: src.slice(contentStart), nextIdx: src.length };
}

/**
 * Pre-processes LaTeX environments like \begin{cases}...\end{cases} or \left\{\begin{matrix}...\end{matrix}\right.
 * into clean expressions before AST parsing.
 */
function preprocessLatex(latex: string): string {
  let s = latex.trim();

  // Handle \begin{cases} ... \end{cases}
  s = s.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_match, inner) => {
    const rows = String(inner)
      .split(/\\\\/)
      .map((r) => r.replace(/&/g, ' ').trim())
      .filter(Boolean);
    return `\\{ ${rows.join(' ; ')} \\}`;
  });

  // Handle \begin{matrix} / \begin{array} / \begin{aligned}
  s = s.replace(
    /\\begin\{(?:matrix|pmatrix|bmatrix|array|aligned)\}(?:\{[^}]*\})?([\s\S]*?)\\end\{(?:matrix|pmatrix|bmatrix|array|aligned)\}/g,
    (_match, inner) => {
      const rows = String(inner)
        .split(/\\\\/)
        .map((r) => r.replace(/&/g, ' ').trim())
        .filter(Boolean);
      return rows.join(' ; ');
    }
  );

  // Remove \left and \right sizing markers while keeping delimiters
  s = s.replace(/\\left\s*\\\{/g, '\\{');
  s = s.replace(/\\right\s*\\\}/g, '\\}');
  s = s.replace(/\\left\s*\./g, '');
  s = s.replace(/\\right\s*\./g, '');
  s = s.replace(/\\left\s*/g, '');
  s = s.replace(/\\right\s*/g, '');

  return s;
}

/**
 * Parses a LaTeX math string into an array of docx MathChild nodes (OMML).
 */
export function parseLatexToMathChildren(rawLatex: string): MathChild[] {
  const src = preprocessLatex(rawLatex);
  const nodes: MathChild[] = [];
  let textBuffer = '';

  const flushBuffer = () => {
    if (textBuffer.length > 0) {
      nodes.push(new MathRun(textBuffer));
      textBuffer = '';
    }
  };

  /**
   * Extracts the last atom from `textBuffer` or `nodes` to act as the base of a `_` or `^` script.
   */
  const popLastBaseForScript = (): MathChild[] => {
    if (textBuffer.length > 0) {
      // Check if textBuffer ends with a closing parenthesis/bracket or single variable/number
      const chars = Array.from(textBuffer);
      const lastChar = chars.pop()!;
      textBuffer = chars.join('');
      flushBuffer();
      return [new MathRun(lastChar)];
    }
    if (nodes.length > 0) {
      const lastNode = nodes.pop()!;
      return [lastNode];
    }
    return [new MathRun('')];
  };

  let i = 0;
  while (i < src.length) {
    const ch = src[i];

    // 1. Handle Superscript / Subscript on previous element
    if (ch === '^' || ch === '_') {
      const baseChildren = popLastBaseForScript();
      let subContent: string | null = null;
      let supContent: string | null = null;

      if (ch === '_') {
        const subGroup = readGroupOrToken(src, i + 1);
        subContent = subGroup.content;
        i = subGroup.nextIdx;

        // Check if immediately followed by '^'
        let lookahead = i;
        while (lookahead < src.length && /\s/.test(src[lookahead])) lookahead++;
        if (lookahead < src.length && src[lookahead] === '^') {
          const supGroup = readGroupOrToken(src, lookahead + 1);
          supContent = supGroup.content;
          i = supGroup.nextIdx;
        }
      } else {
        const supGroup = readGroupOrToken(src, i + 1);
        supContent = supGroup.content;
        i = supGroup.nextIdx;

        // Check if immediately followed by '_'
        let lookahead = i;
        while (lookahead < src.length && /\s/.test(src[lookahead])) lookahead++;
        if (lookahead < src.length && src[lookahead] === '_') {
          const subGroup = readGroupOrToken(src, lookahead + 1);
          subContent = subGroup.content;
          i = subGroup.nextIdx;
        }
      }

      // Special case: `^\circ` or `^{\circ}` -> degree symbol `°` directly if no subscript
      if (
        subContent === null &&
        supContent !== null &&
        (supContent.trim() === '\\circ' || supContent.trim() === '°')
      ) {
        nodes.push(...baseChildren, new MathRun('°'));
        continue;
      }

      const subNodes = subContent !== null ? parseLatexToMathChildren(subContent) : null;
      const supNodes = supContent !== null ? parseLatexToMathChildren(supContent) : null;

      if (subNodes && supNodes) {
        nodes.push(
          new MathSubSuperScript({
            children: baseChildren.length > 0 ? baseChildren : [new MathRun('')],
            subScript: subNodes.length > 0 ? subNodes : [new MathRun('')],
            superScript: supNodes.length > 0 ? supNodes : [new MathRun('')],
          })
        );
      } else if (supNodes) {
        nodes.push(
          new MathSuperScript({
            children: baseChildren.length > 0 ? baseChildren : [new MathRun('')],
            superScript: supNodes.length > 0 ? supNodes : [new MathRun('')],
          })
        );
      } else if (subNodes) {
        nodes.push(
          new MathSubScript({
            children: baseChildren.length > 0 ? baseChildren : [new MathRun('')],
            subScript: subNodes.length > 0 ? subNodes : [new MathRun('')],
          })
        );
      }
      continue;
    }

    // 2. Handle Brace Group `{...}`
    if (ch === '{') {
      flushBuffer();
      const grp = readGroupOrToken(src, i);
      const innerNodes = parseLatexToMathChildren(grp.content);
      nodes.push(...innerNodes);
      i = grp.nextIdx;
      continue;
    }

    // 3. Handle LaTeX Commands `\...`
    if (ch === '\\') {
      const nextCh = src[i + 1];
      if (!nextCh) {
        i++;
        continue;
      }

      // Escaped symbols: \{, \}, \%, \_, \&, \#, \; \, \: \!
      if (!/[a-zA-Z]/.test(nextCh)) {
        if (nextCh === '{' || nextCh === '}') {
          textBuffer += nextCh;
        } else if (nextCh === ',' || nextCh === ';' || nextCh === ':' || nextCh === ' ') {
          textBuffer += ' ';
        } else if (nextCh === '!') {
          // negative thin space - ignore
        } else if (nextCh === '\\') {
          textBuffer += ' ; ';
        } else {
          textBuffer += nextCh;
        }
        i += 2;
        continue;
      }

      // Read alphabetic command name
      let cmdEnd = i + 1;
      while (cmdEnd < src.length && /[a-zA-Z]/.test(src[cmdEnd])) {
        cmdEnd++;
      }
      const cmdName = src.slice(i + 1, cmdEnd);
      i = cmdEnd;

      // Skip single trailing space after command if not followed by `{` or `[`
      if (i < src.length && src[i] === ' ' && !['frac', 'dfrac', 'tfrac', 'sqrt', 'mathbb', 'text', 'mathrm', 'textbf', 'textit', 'widehat', 'hat', 'overline', 'bar', 'vec', 'overrightarrow', 'sum', 'int'].includes(cmdName)) {
        i++;
      }

      // Handle fractions: \frac{num}{den}, \dfrac{num}{den}, \tfrac{num}{den}
      if (cmdName === 'frac' || cmdName === 'dfrac' || cmdName === 'tfrac') {
        flushBuffer();
        const numGrp = readGroupOrToken(src, i);
        const denGrp = readGroupOrToken(src, numGrp.nextIdx);
        i = denGrp.nextIdx;

        const numChildren = parseLatexToMathChildren(numGrp.content);
        const denChildren = parseLatexToMathChildren(denGrp.content);

        nodes.push(
          new MathFraction({
            numerator: numChildren.length > 0 ? numChildren : [new MathRun('')],
            denominator: denChildren.length > 0 ? denChildren : [new MathRun('')],
          })
        );
        continue;
      }

      // Handle roots: \sqrt{x} or \sqrt[n]{x}
      if (cmdName === 'sqrt') {
        flushBuffer();
        const degOpt = readOptionalBracket(src, i);
        const radGrp = readGroupOrToken(src, degOpt.nextIdx);
        i = radGrp.nextIdx;

        const radChildren = parseLatexToMathChildren(radGrp.content);
        const degChildren =
          degOpt.content !== null ? parseLatexToMathChildren(degOpt.content) : undefined;

        nodes.push(
          new MathRadical({
            degree: degChildren && degChildren.length > 0 ? degChildren : undefined,
            children: radChildren.length > 0 ? radChildren : [new MathRun('')],
          })
        );
        continue;
      }

      // Handle \sum and \int
      if (cmdName === 'sum' || cmdName === 'int') {
        flushBuffer();
        let subNodes: MathChild[] | undefined;
        let supNodes: MathChild[] | undefined;

        // Check for optional _ and ^
        let cursor = i;
        for (let k = 0; k < 2; k++) {
          while (cursor < src.length && /\s/.test(src[cursor])) cursor++;
          if (cursor < src.length && src[cursor] === '_') {
            const g = readGroupOrToken(src, cursor + 1);
            subNodes = parseLatexToMathChildren(g.content);
            cursor = g.nextIdx;
          } else if (cursor < src.length && src[cursor] === '^') {
            const g = readGroupOrToken(src, cursor + 1);
            supNodes = parseLatexToMathChildren(g.content);
            cursor = g.nextIdx;
          }
        }
        i = cursor;
        // Read operand group or next token
        const bodyGrp = readGroupOrToken(src, i);
        i = bodyGrp.nextIdx;
        const bodyNodes = parseLatexToMathChildren(bodyGrp.content);

        if (cmdName === 'sum') {
          nodes.push(
            new MathSum({
              subScript: subNodes,
              superScript: supNodes,
              children: bodyNodes.length > 0 ? bodyNodes : [new MathRun('')],
            })
          );
        } else {
          nodes.push(
            new MathIntegral({
              subScript: subNodes,
              superScript: supNodes,
              children: bodyNodes.length > 0 ? bodyNodes : [new MathRun('')],
            })
          );
        }
        continue;
      }

      // Handle \mathbb{R}, \mathbb{Z}, \mathbb{N}, \mathbb{Q}
      if (cmdName === 'mathbb') {
        const grp = readGroupOrToken(src, i);
        i = grp.nextIdx;
        const key = grp.content.trim();
        textBuffer += BLACKBOARD_BOLD[key] || key;
        continue;
      }

      // Handle \widehat{ABC} or \hat{x}
      if (cmdName === 'widehat' || cmdName === 'hat') {
        const grp = readGroupOrToken(src, i);
        i = grp.nextIdx;
        const inner = grp.content.trim();
        if (inner.length > 1) {
          // Angle notation in Vietnamese curriculum: \widehat{ABC} -> ∠ABC
          textBuffer += `∠${inner}`;
        } else {
          textBuffer += `${inner}\u0302`;
        }
        continue;
      }

      // Handle \overline{AB} or \bar{x}
      if (cmdName === 'overline' || cmdName === 'bar') {
        const grp = readGroupOrToken(src, i);
        i = grp.nextIdx;
        const inner = grp.content.trim();
        // Combine overline or keep clean
        if (inner.length <= 3) {
          textBuffer += inner
            .split('')
            .map((c) => `${c}\u0305`)
            .join('');
        } else {
          flushBuffer();
          nodes.push(...parseLatexToMathChildren(inner));
        }
        continue;
      }

      // Handle \vec{a} or \overrightarrow{AB}
      if (cmdName === 'vec' || cmdName === 'overrightarrow') {
        const grp = readGroupOrToken(src, i);
        i = grp.nextIdx;
        const inner = grp.content.trim();
        textBuffer += `${inner}\u20D7`;
        continue;
      }

      // Handle text commands: \text{...}, \mathrm{...}, \textbf{...}, \textit{...}, \operatorname{...}
      if (
        cmdName === 'text' ||
        cmdName === 'mathrm' ||
        cmdName === 'textbf' ||
        cmdName === 'textit' ||
        cmdName === 'mathit' ||
        cmdName === 'mathbf' ||
        cmdName === 'operatorname'
      ) {
        const grp = readGroupOrToken(src, i);
        i = grp.nextIdx;
        textBuffer += grp.content;
        continue;
      }

      // Handle standard math functions: \sin, \cos, \tan, \cot, \log, \ln, \lim, \min, \max, \gcd, \lcm
      if (
        [
          'sin',
          'cos',
          'tan',
          'cot',
          'arcsin',
          'arccos',
          'arctan',
          'log',
          'ln',
          'lim',
          'min',
          'max',
          'gcd',
          'lcm',
          'deg',
          'det',
          'dim',
          'mod',
        ].includes(cmdName)
      ) {
        textBuffer += cmdName;
        continue;
      }

      // Handle known symbols
      if (LATEX_SYMBOLS[cmdName] !== undefined) {
        const sym = LATEX_SYMBOLS[cmdName];
        // Add spacing around binary relations/operators for clean Word Equation rendering
        const needsSpace = [
          'le',
          'leq',
          'leqslant',
          'ge',
          'geq',
          'geqslant',
          'ne',
          'neq',
          'approx',
          'equiv',
          'sim',
          'simeq',
          'cong',
          'in',
          'notin',
          'subset',
          'supset',
          'subseteq',
          'supseteq',
          'cup',
          'cap',
          'Rightarrow',
          'Leftarrow',
          'Leftrightarrow',
          'rightarrow',
          'to',
          'mapsto',
          'perp',
          'parallel',
        ].includes(cmdName);
        if (needsSpace) {
          if (textBuffer.length > 0 && !textBuffer.endsWith(' ')) textBuffer += ' ';
          textBuffer += sym + ' ';
        } else {
          textBuffer += sym;
        }
        continue;
      }

      // Unknown command fallback: keep command name or ignore formatting commands
      if (['displaystyle', 'textstyle', 'scriptstyle', 'limits', 'nolimits', 'hfill', 'noindent'].includes(cmdName)) {
        continue;
      }
      textBuffer += cmdName;
      continue;
    }

    // 4. Regular characters
    textBuffer += ch;
    i++;
  }

  flushBuffer();
  return nodes.length > 0 ? nodes : [new MathRun(rawLatex)];
}

/**
 * Converts a LaTeX math expression into a native Microsoft Word Equation (`DocxMath` / `<m:oMath>`).
 */
export function createWordEquationFromLatex(latex: string): DocxMath {
  const children = parseLatexToMathChildren(latex);
  return new DocxMath({
    children,
  });
}

/**
 * Heuristic check if a string without `$` delimiters is actually a standalone LaTeX math formula
 * (e.g. contains `\frac`, `\sqrt`, `\widehat`, `\mathbb`, etc.)
 */
function containsRawLatexCommands(text: string): boolean {
  return /\\(?:frac|dfrac|tfrac|sqrt|widehat|overline|overrightarrow|vec|mathbb|alpha|beta|gamma|Delta|pi|le|leq|ge|geq|ne|neq|pm|times|cdot|div|in|notin|subset|cup|cap|emptyset|Rightarrow|Leftrightarrow|perp|parallel|angle|circ|infty|sum|int)\b/.test(
    text
  );
}

/**
 * Normalizes text so that any naked LaTeX math commands outside `$...$` are wrapped in `$...$`
 * or parsed cleanly into TextRun + DocxMath children.
 */
function tokenizeTextAndMath(rawInput: string): Array<{ type: 'text' | 'math'; value: string }> {
  if (!rawInput) return [];

  // Normalize \[ ... \] and \( ... \) to $ ... $
  let input = rawInput
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, p1) => `$${p1}$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, p1) => `$${p1}$`)
    .replace(/\$\$([\s\S]*?)\$\$/g, (_m, p1) => `$${p1}$`);

  const tokens: Array<{ type: 'text' | 'math'; value: string }> = [];
  const regex = /\$([^$]+)\$/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIdx) {
      const textSegment = input.slice(lastIdx, match.index);
      if (textSegment) {
        tokens.push({ type: 'text', value: textSegment });
      }
    }
    const mathContent = match[1].trim();
    if (mathContent) {
      tokens.push({ type: 'math', value: mathContent });
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < input.length) {
    const remaining = input.slice(lastIdx);
    if (remaining) {
      tokens.push({ type: 'text', value: remaining });
    }
  }

  // Secondary pass: if a 'text' token has raw LaTeX commands (when AI forgot `$...$`),
  // split out the LaTeX expression segments into 'math' tokens
  const finalTokens: Array<{ type: 'text' | 'math'; value: string }> = [];
  const rawLatexPattern =
    /((?:[a-zA-Z0-9_()[\]]+\s*(?:=|\+|−|-|<|>|\\le|\\ge|\\ne|\\in)\s*)?\\(?:frac|dfrac|tfrac|sqrt|widehat|overline|overrightarrow|vec|mathbb|Delta|triangle|angle|perp|parallel|Rightarrow|Leftrightarrow|pm|times|cdot|div|le|leq|ge|geq|ne|neq|in|notin|subset|cup|cap|emptyset)(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\[[^\]]*\]|\^[0-9a-zA-Z\\{}]+|_[0-9a-zA-Z\\{}]+|\s*[+\-*/=<>]\s*[a-zA-Z0-9\\{}^_]+)*)/g;

  for (const tok of tokens) {
    if (tok.type === 'math' || !containsRawLatexCommands(tok.value)) {
      finalTokens.push(tok);
      continue;
    }

    let subLastIdx = 0;
    let subMatch: RegExpExecArray | null;
    rawLatexPattern.lastIndex = 0;
    while ((subMatch = rawLatexPattern.exec(tok.value)) !== null) {
      if (subMatch.index > subLastIdx) {
        finalTokens.push({
          type: 'text',
          value: tok.value.slice(subLastIdx, subMatch.index),
        });
      }
      finalTokens.push({
        type: 'math',
        value: subMatch[1],
      });
      subLastIdx = rawLatexPattern.lastIndex;
    }
    if (subLastIdx < tok.value.length) {
      finalTokens.push({
        type: 'text',
        value: tok.value.slice(subLastIdx),
      });
    }
  }

  return finalTokens;
}

/**
 * Converts a string containing mixed Vietnamese text and `$...$` LaTeX formulas into
 * an array of `ParagraphChild` (`TextRun` + native Word `DocxMath` Equation objects)
 * when `useEquation = true`, or clean Unicode `TextRun` when `useEquation = false`.
 */
export function createRichRunsWithEquation(
  text: string,
  options?: {
    bold?: boolean;
    italics?: boolean;
    size?: number;
    color?: string;
    font?: string;
    useEquation?: boolean;
  }
): ParagraphChild[] {
  const useEquation = options?.useEquation ?? true;
  const font = options?.font ?? 'Times New Roman';
  const size = options?.size ?? 26;

  if (!text) return [];

  const tokens = tokenizeTextAndMath(text);
  const children: ParagraphChild[] = [];

  for (const tok of tokens) {
    if (tok.type === 'math') {
      if (useEquation) {
        children.push(createWordEquationFromLatex(tok.value));
      } else {
        // Fallback readable Unicode math if useEquation is false
        children.push(
          new TextRun({
            text: latexToReadableUnicode(tok.value),
            font,
            size,
            bold: options?.bold,
            italics: options?.italics ?? true,
            color: options?.color,
          })
        );
      }
    } else {
      children.push(
        new TextRun({
          text: tok.value,
          font,
          size,
          bold: options?.bold,
          italics: options?.italics,
          color: options?.color,
        })
      );
    }
  }

  return children;
}

/**
 * Converts LaTeX string to readable Unicode text (used when exporting plain Word without Equation objects)
 */
export function latexToReadableUnicode(latex: string): string {
  let s = preprocessLatex(latex);
  s = s.replace(/\\(?:d|t)?frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)');
  s = s.replace(/\\sqrt\[([^\]]*)\]\{([^{}]*)\}/g, '√($1& $2)');
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');
  s = s.replace(/\\widehat\{([^{}]*)\}/g, '∠$1');
  s = s.replace(/\\mathbb\{([A-Z])\}/g, (_m, k) => BLACKBOARD_BOLD[k] || k);
  s = s.replace(/\^\\circ|\^\{\\circ\}/g, '°');
  for (const [cmd, sym] of Object.entries(LATEX_SYMBOLS)) {
    s = s.replace(new RegExp(`\\\\${cmd}\\b`, 'g'), sym);
  }
  s = s.replace(/[{}]/g, '');
  return s;
}
