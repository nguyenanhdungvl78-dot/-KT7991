import React from 'react';
import katex from 'katex';

interface MathRendererProps {
  content?: string;
  className?: string;
  inline?: boolean;
}

/**
 * Parses a string containing LaTeX markers ($...$ for inline, $$...$$ for block)
 * and renders it with KaTeX.
 */
export function renderMathToHtml(text: string = ''): string {
  if (!text) return '';

  // Standardize block formulas: \[ ... \] -> $$ ... $$
  let processed = text.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$1$$$');
  
  // Standardize inline formulas: \( ... \) -> $ ... $
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$');

  // Match $$...$$ or $...$ (ensure not double-matching escaping)
  const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;

  return processed.replace(regex, (match) => {
    const isBlock = match.startsWith('$$') && match.endsWith('$$');
    const formula = isBlock ? match.slice(2, -2) : match.slice(1, -1);
    
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: isBlock,
        throwOnError: false,
        strict: false,
        output: 'htmlAndMathml',
      });
    } catch {
      return match;
    }
  });
}

export default function MathRenderer({ content = '', className = '', inline = false }: MathRendererProps) {
  if (!content) return null;

  const html = renderMathToHtml(content);

  if (inline) {
    return (
      <span
        className={`math-content ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div
      className={`math-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
