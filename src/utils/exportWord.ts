import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  PageBreak,
  HeightRule,
  PageOrientation,
} from 'docx';
import { saveAs } from 'file-saver';
import { ExamData, ExamQuestion, MatrixRow, SpecRow, MatrixTotals } from '../types';
import { formatAnswerString, formatShortAnswer, parseMultipleChoiceAnswer, parseTrueFalseAnswers } from './answerUtils';

/**
 * Strips HTML tags and preserves line breaks
 */
function cleanText(input: any = ''): string {
  if (input === null || input === undefined) return '';
  const text = typeof input === 'string' ? input : formatAnswerString(input);
  return text
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Helper to split text that may contain newlines into Paragraphs
 */
function createParagraphsFromText(
  text: string,
  options?: { bold?: boolean; italic?: boolean; size?: number }
): Paragraph[] {
  const lines = cleanText(text).split('\n');
  return lines.map(
    (line) =>
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            font: 'Times New Roman',
            size: options?.size ?? 26, // 13pt
            bold: options?.bold,
            italics: options?.italic,
          }),
        ],
        spacing: { line: 276, before: 60, after: 60 }, // 1.15 line spacing
      })
  );
}

/**
 * Creates standard cell borders
 */
const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
};

export async function exportExamToWord(exam: ExamData, title: string = 'De_Kiem_Tra_Toan') {
  const multipleChoiceQs = exam.questions.filter((q) => q.type === 'multipleChoice');
  const trueFalseQs = exam.questions.filter((q) => q.type === 'trueFalse');
  const shortAnswerQs = exam.questions.filter((q) => q.type === 'shortAnswer');
  const essayQs = exam.questions.filter((q) => q.type === 'essay');

  const getLetter = (index: number) => String.fromCharCode(65 + index);

  const docChildren: any[] = [];

  // 1. Header table (2 columns)
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'UBND TỈNH / THÀNH PHỐ', font: 'Times New Roman', size: 24, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'TRƯỜNG THCS .................................', font: 'Times New Roman', size: 24, bold: true }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'ĐỀ KIỂM TRA ĐỊNH KỲ', font: 'Times New Roman', size: 24, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'NĂM HỌC 2025 - 2026', font: 'Times New Roman', size: 24, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'MÔN: TOÁN', font: 'Times New Roman', size: 24, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Thời gian làm bài: 90 phút (không kể thời gian giao đề)', font: 'Times New Roman', size: 22, italics: true }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  docChildren.push(headerTable);

  // Student info line
  docChildren.push(
    new Paragraph({
      spacing: { before: 200, after: 150 },
      children: [
        new TextRun({ text: 'Họ và tên thí sinh: ................................................................ Số báo danh: ....................', font: 'Times New Roman', size: 26, italics: true }),
      ],
    })
  );

  // PHẦN 1: TRẮC NGHIỆM NHIỀU LỰA CHỌN
  if (multipleChoiceQs.length > 0) {
    docChildren.push(
      new Paragraph({
        spacing: { before: 240, after: 80 },
        children: [
          new TextRun({ text: 'PHẦN 1: CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN', font: 'Times New Roman', size: 26, bold: true }),
        ],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: 'Thí sinh trả lời từ câu 1 đến câu ' + multipleChoiceQs.length + '. Mỗi câu hỏi thí sinh chỉ chọn một phương án.', font: 'Times New Roman', size: 24, italics: true }),
        ],
      })
    );

    multipleChoiceQs.forEach((q, idx) => {
      const qNum = String(q.id || '').replace('Câu', '').trim() || (idx + 1);
      docChildren.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({ text: `Câu ${qNum}: `, font: 'Times New Roman', size: 26, bold: true }),
            new TextRun({ text: cleanText(q.content), font: 'Times New Roman', size: 26 }),
          ],
        })
      );

      if (q.options && q.options.length > 0) {
        // Table with 4 choices or 2 choices per row
        const rowCells = q.options.map((opt, oIdx) => {
          const letter = getLetter(oIdx);
          const optText = cleanText(String(opt || '').replace(/^[A-Da-d][.)]\s*/, ''));
          return new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                spacing: { line: 240, before: 40, after: 40 },
                children: [
                  new TextRun({ text: `${letter}. `, font: 'Times New Roman', size: 26, bold: true }),
                  new TextRun({ text: optText, font: 'Times New Roman', size: 26 }),
                ],
              }),
            ],
          });
        });

        docChildren.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [new TableRow({ children: rowCells })],
          })
        );
      }
    });
  }

  // PHẦN 2: TRẮC NGHIỆM ĐÚNG SAI
  if (trueFalseQs.length > 0) {
    docChildren.push(
      new Paragraph({
        spacing: { before: 300, after: 80 },
        children: [
          new TextRun({ text: 'PHẦN 2: CÂU TRẮC NGHIỆM ĐÚNG - SAI', font: 'Times New Roman', size: 26, bold: true }),
        ],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: 'Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.', font: 'Times New Roman', size: 24, italics: true }),
        ],
      })
    );

    trueFalseQs.forEach((q, idx) => {
      const qNum = String(q.id || '').replace('Câu', '').trim() || (idx + 1);
      docChildren.push(
        new Paragraph({
          spacing: { before: 140, after: 60 },
          children: [
            new TextRun({ text: `Câu ${qNum}: `, font: 'Times New Roman', size: 26, bold: true }),
            new TextRun({ text: cleanText(q.content), font: 'Times New Roman', size: 26 }),
          ],
        })
      );

      if (q.options && q.options.length > 0) {
        q.options.forEach((opt, oIdx) => {
          const letter = getLetter(oIdx).toLowerCase();
          const optText = cleanText(String(opt || '').replace(/^[A-Da-d][.)]\s*/, '').replace(/^[a-d][.)]\s*/, ''));
          docChildren.push(
            new Paragraph({
              indent: { left: 400 },
              spacing: { line: 260, before: 40, after: 40 },
              children: [
                new TextRun({ text: `${letter}) `, font: 'Times New Roman', size: 26, bold: true }),
                new TextRun({ text: optText, font: 'Times New Roman', size: 26 }),
              ],
            })
          );
        });
      }
    });
  }

  // PHẦN 3: CÂU TRẢ LỜI NGẮN
  if (shortAnswerQs.length > 0) {
    docChildren.push(
      new Paragraph({
        spacing: { before: 300, after: 80 },
        children: [
          new TextRun({ text: 'PHẦN 3: CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN', font: 'Times New Roman', size: 26, bold: true }),
        ],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: 'Thí sinh điền kết quả vào chỗ trống. Mỗi câu hỏi chỉ điền đáp số là một số (tối đa 4 ký tự).', font: 'Times New Roman', size: 24, italics: true }),
        ],
      })
    );

    shortAnswerQs.forEach((q, idx) => {
      const qNum = q.id.replace('Câu', '').trim() || (idx + 1);
      docChildren.push(
        new Paragraph({
          spacing: { before: 140, after: 80 },
          children: [
            new TextRun({ text: `Câu ${qNum}: `, font: 'Times New Roman', size: 26, bold: true }),
            new TextRun({ text: cleanText(q.content), font: 'Times New Roman', size: 26 }),
          ],
        })
      );
    });
  }

  // PHẦN 4: TỰ LUẬN
  if (essayQs.length > 0) {
    docChildren.push(
      new Paragraph({
        spacing: { before: 300, after: 80 },
        children: [
          new TextRun({ text: 'PHẦN 4: TỰ LUẬN', font: 'Times New Roman', size: 26, bold: true }),
        ],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: 'Thí sinh trình bày chi tiết lời giải cho các bài toán sau.', font: 'Times New Roman', size: 24, italics: true }),
        ],
      })
    );

    essayQs.forEach((q, idx) => {
      const qNum = q.id.replace('Câu', '').trim() || (idx + 1);
      docChildren.push(
        new Paragraph({
          spacing: { before: 140, after: 80 },
          children: [
            new TextRun({ text: `Câu ${qNum}: `, font: 'Times New Roman', size: 26, bold: true }),
            new TextRun({ text: cleanText(q.content), font: 'Times New Roman', size: 26 }),
          ],
        })
      );
    });
  }

  // End of exam
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 400 },
      children: [
        new TextRun({ text: '----------------------- HẾT -----------------------', font: 'Times New Roman', size: 26, bold: true }),
      ],
    })
  );

  // PAGE BREAK for Answers & Explanations
  docChildren.push(new Paragraph({ children: [new PageBreak()] }));

  // HƯỚNG DẪN CHẤM VÀ ĐÁP ÁN
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: 'HƯỚNG DẪN CHẤM VÀ ĐÁP ÁN CHI TIẾT', font: 'Times New Roman', size: 28, bold: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({ text: 'ĐỀ KIỂM TRA ĐỊNH KỲ MÔN TOÁN', font: 'Times New Roman', size: 26, bold: true }),
      ],
    })
  );

  // 1. Multiple choice answers table
  if (multipleChoiceQs.length > 0) {
    docChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({ text: '1. Đáp án Phần 1: Trắc nghiệm 1 lựa chọn', font: 'Times New Roman', size: 26, bold: true }),
        ],
      })
    );

    const qNumCells = [
      new TableCell({
        borders: tableBorders,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Câu', font: 'Times New Roman', size: 24, bold: true })] })],
      }),
      ...multipleChoiceQs.map((q, i) =>
        new TableCell({
          borders: tableBorders,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${q.id.replace(/[^\d]/g, '') || i + 1}`, font: 'Times New Roman', size: 24, bold: true })] })],
        })
      ),
    ];

    const ansCells = [
      new TableCell({
        borders: tableBorders,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Đ/án', font: 'Times New Roman', size: 24, bold: true })] })],
      }),
      ...multipleChoiceQs.map((q) => {
        const ans = parseMultipleChoiceAnswer(q.answer) || cleanText(q.answer);
        return new TableCell({
          borders: tableBorders,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: ans, font: 'Times New Roman', size: 24, bold: true, color: 'B91C1C' })] })],
        });
      }),
    ];

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: qNumCells }), new TableRow({ children: ansCells })],
      })
    );
  }

  // 2. True/False answers table
  if (trueFalseQs.length > 0) {
    docChildren.push(
      new Paragraph({
        spacing: { before: 260, after: 100 },
        children: [
          new TextRun({ text: '2. Đáp án Phần 2: Câu hỏi Đúng - Sai', font: 'Times New Roman', size: 26, bold: true }),
        ],
      })
    );

    const tfHeader = new TableRow({
      children: ['Câu', 'Lệnh hỏi a', 'Lệnh hỏi b', 'Lệnh hỏi c', 'Lệnh hỏi d'].map(
        (header) =>
          new TableCell({
            borders: tableBorders,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: header, font: 'Times New Roman', size: 24, bold: true })] })],
          })
      ),
    });

    const tfRows = trueFalseQs.map((q, i) => {
      const tf = parseTrueFalseAnswers(q.answer);

      return new TableRow({
        children: [
          new TableCell({
            borders: tableBorders,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${q.id.replace(/[^\d]/g, '') || i + 1}`, font: 'Times New Roman', size: 24, bold: true })] })],
          }),
          new TableCell({
            borders: tableBorders,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tf[0], font: 'Times New Roman', size: 24, bold: true, color: 'B91C1C' })] })],
          }),
          new TableCell({
            borders: tableBorders,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tf[1], font: 'Times New Roman', size: 24, bold: true, color: 'B91C1C' })] })],
          }),
          new TableCell({
            borders: tableBorders,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tf[2], font: 'Times New Roman', size: 24, bold: true, color: 'B91C1C' })] })],
          }),
          new TableCell({
            borders: tableBorders,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tf[3], font: 'Times New Roman', size: 24, bold: true, color: 'B91C1C' })] })],
          }),
        ],
      });
    });

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [tfHeader, ...tfRows],
      })
    );
  }

  // 3. Short answer table
  if (shortAnswerQs.length > 0) {
    docChildren.push(
      new Paragraph({
        spacing: { before: 260, after: 100 },
        children: [
          new TextRun({ text: '3. Đáp án Phần 3: Trả lời ngắn', font: 'Times New Roman', size: 26, bold: true }),
        ],
      })
    );

    const saHeader = [
      new TableCell({
        borders: tableBorders,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Câu', font: 'Times New Roman', size: 24, bold: true })] })],
      }),
      ...shortAnswerQs.map((q, i) =>
        new TableCell({
          borders: tableBorders,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${q.id.replace(/[^\d]/g, '') || i + 1}`, font: 'Times New Roman', size: 24, bold: true })] })],
        })
      ),
    ];

    const saBody = [
      new TableCell({
        borders: tableBorders,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Đáp số', font: 'Times New Roman', size: 24, bold: true })] })],
      }),
      ...shortAnswerQs.map((q) =>
        new TableCell({
          borders: tableBorders,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cleanText(formatShortAnswer(q.answer)), font: 'Times New Roman', size: 24, bold: true, color: 'B91C1C' })] })],
        })
      ),
    ];

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: saHeader }), new TableRow({ children: saBody })],
      })
    );
  }

  // 4. Essay answers table
  if (essayQs.length > 0) {
    docChildren.push(
      new Paragraph({
        spacing: { before: 260, after: 100 },
        children: [
          new TextRun({ text: '4. Đáp án và Hướng dẫn giải Phần 4: Tự luận', font: 'Times New Roman', size: 26, bold: true }),
        ],
      })
    );

    const essayHeader = new TableRow({
      children: [
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Câu', font: 'Times New Roman', size: 24, bold: true })] })],
        }),
        new TableCell({
          width: { size: 85, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Đáp án / Lời giải chi tiết', font: 'Times New Roman', size: 24, bold: true })] })],
        }),
      ],
    });

    const essayRows = essayQs.map((q) => {
      const solutionChildren: Paragraph[] = [
        new Paragraph({
          children: [
            new TextRun({ text: 'Kết quả: ', font: 'Times New Roman', size: 26, bold: true }),
            new TextRun({ text: cleanText(q.answer), font: 'Times New Roman', size: 26, color: 'B91C1C' }),
          ],
          spacing: { after: 60 },
        }),
      ];

      if (q.explanation) {
        solutionChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Hướng dẫn giải chi tiết:', font: 'Times New Roman', size: 26, bold: true }),
            ],
            spacing: { before: 60, after: 40 },
          }),
          ...createParagraphsFromText(q.explanation)
        );
      }

      return new TableRow({
        children: [
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: q.id, font: 'Times New Roman', size: 26, bold: true })] })],
          }),
          new TableCell({
            width: { size: 85, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            children: solutionChildren,
          }),
        ],
      });
    });

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [essayHeader, ...essayRows],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~2cm (1440 = 1 inch)
              bottom: 1134,
              left: 1440, // 2.5cm
              right: 1134,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title}.docx`);
}

/**
 * Exports Matrix and/or Specification to Microsoft Word (.docx) in Landscape A4 format
 */
export async function exportMatrixAndSpecToWord(
  matrix: MatrixRow[],
  specification: SpecRow[],
  totals?: MatrixTotals,
  grade: string = 'Lớp 6',
  mode: 'all' | 'matrix' | 'spec' = 'all'
) {
  const docChildren: any[] = [];
  const headerBg = 'F1F5F9';

  // 1. Top Header Table (School & National motto)
  const topHeaderTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'PHÒNG / SỞ GD&ĐT ...................................', font: 'Times New Roman', size: 22, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'TRƯỜNG THCS / THPT ...............................', font: 'Times New Roman', size: 22, bold: true }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', font: 'Times New Roman', size: 22, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', font: 'Times New Roman', size: 22, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: '-----------------------', font: 'Times New Roman', size: 18 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  docChildren.push(topHeaderTable);

  // Title block
  let docTitleText = 'KHUNG MA TRẬN VÀ BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KỲ';
  if (mode === 'matrix') {
    docTitleText = 'KHUNG MA TRẬN ĐỀ KIỂM TRA ĐỊNH KỲ';
  } else if (mode === 'spec') {
    docTitleText = 'BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KỲ';
  }

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 60 },
      children: [
        new TextRun({ text: docTitleText, font: 'Times New Roman', size: 26, bold: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({ text: `MÔN: TOÁN - ${grade.toUpperCase()}`, font: 'Times New Roman', size: 24, bold: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({ text: 'Năm học: 2025 - 2026 - Thời gian làm bài: 90 phút (Chương trình GDPT 2018)', font: 'Times New Roman', size: 20, italics: true }),
      ],
    })
  );

  // Pre-calculate chapter spans for grouping
  const chapterSpans: number[] = [];
  let chCount = 0;
  const chapterNums: number[] = [];
  for (let i = 0; i < matrix.length; i++) {
    if (i === 0 || matrix[i].chapter !== matrix[i - 1].chapter) {
      let count = 1;
      while (i + count < matrix.length && matrix[i + count].chapter === matrix[i].chapter) {
        count++;
      }
      chapterSpans[i] = count;
      chCount++;
      chapterNums[i] = chCount;
    } else {
      chapterSpans[i] = 0;
      chapterNums[i] = chCount;
    }
  }

  // ==========================================
  // PART 1: KHUNG MA TRẬN
  // ==========================================
  if (mode === 'all' || mode === 'matrix') {
    if (mode === 'all') {
      docChildren.push(
        new Paragraph({
          spacing: { before: 100, after: 100 },
          children: [
            new TextRun({ text: 'I. KHUNG MA TRẬN ĐỀ KIỂM TRA', font: 'Times New Roman', size: 24, bold: true, color: '1E293B' }),
          ],
        })
      );
    }

    const matrixHeaderRow1 = new TableRow({
      children: [
        new TableCell({
          rowSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TT', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
        new TableCell({
          rowSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Chủ đề/Chương', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
        new TableCell({
          rowSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nội dung/đơn vị kiến thức', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
        new TableCell({
          columnSpan: 12,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mức độ đánh giá', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
        new TableCell({
          columnSpan: 3,
          rowSpan: 2,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tổng', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
        new TableCell({
          rowSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tỉ lệ\n%\nđiểm', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
      ],
    });

    const matrixHeaderRow2 = new TableRow({
      children: [
        new TableCell({
          columnSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nhiều lựa chọn', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
        new TableCell({
          columnSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Đúng - Sai', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
        new TableCell({
          columnSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Trả lời ngắn', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
        new TableCell({
          columnSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tự luận', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
      ],
    });

    const matrixHeaderRow3 = new TableRow({
      children: [
        // 4 question types x 3 levels = 12 cells
        ...Array.from({ length: 4 }).flatMap(() => [
          new TableCell({
            borders: tableBorders,
            shading: { fill: headerBg },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Biết', font: 'Times New Roman', size: 17, bold: true })] })],
          }),
          new TableCell({
            borders: tableBorders,
            shading: { fill: headerBg },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Hiểu', font: 'Times New Roman', size: 17, bold: true })] })],
          }),
          new TableCell({
            borders: tableBorders,
            shading: { fill: headerBg },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Vận dụng', font: 'Times New Roman', size: 16, bold: true })] })],
          }),
        ]),
        // Tổng (Biết, Hiểu, Vận dụng) = 3 cells
        new TableCell({
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Biết', font: 'Times New Roman', size: 17, bold: true })] })],
        }),
        new TableCell({
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Hiểu', font: 'Times New Roman', size: 17, bold: true })] })],
        }),
        new TableCell({
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Vận dụng', font: 'Times New Roman', size: 16, bold: true })] })],
        }),
      ],
    });

    // Helper for number cell
    const createNumCell = (val: any) =>
      new TableCell({
        borders: tableBorders,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: String(val ?? 0), font: 'Times New Roman', size: 19 })],
          }),
        ],
      });

    // Matrix data rows
    const matrixDataRows = matrix.map((row, idx) => {
      const rowCells: TableCell[] = [];

      if (chapterSpans[idx] > 0) {
        rowCells.push(
          new TableCell({
            rowSpan: chapterSpans[idx] > 1 ? chapterSpans[idx] : undefined,
            borders: tableBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${chapterNums[idx]}`, font: 'Times New Roman', size: 19 })],
              }),
            ],
          }),
          new TableCell({
            rowSpan: chapterSpans[idx] > 1 ? chapterSpans[idx] : undefined,
            borders: tableBorders,
            children: [
              new Paragraph({
                children: [new TextRun({ text: cleanText(row.chapter), font: 'Times New Roman', size: 19, bold: true })],
              }),
            ],
          })
        );
      }

      // Topic
      rowCells.push(
        new TableCell({
          borders: tableBorders,
          children: [
            new Paragraph({
              children: [new TextRun({ text: cleanText(row.topic), font: 'Times New Roman', size: 19 })],
            }),
          ],
        })
      );

      // 12 columns
      rowCells.push(createNumCell(row.multipleChoice.knowledge));
      rowCells.push(createNumCell(row.multipleChoice.comprehension));
      rowCells.push(createNumCell(row.multipleChoice.application));

      rowCells.push(createNumCell(row.trueFalse.knowledge));
      rowCells.push(createNumCell(row.trueFalse.comprehension));
      rowCells.push(createNumCell(row.trueFalse.application));

      rowCells.push(createNumCell(row.shortAnswer.knowledge));
      rowCells.push(createNumCell(row.shortAnswer.comprehension));
      rowCells.push(createNumCell(row.shortAnswer.application));

      rowCells.push(createNumCell(row.essay.knowledge));
      rowCells.push(createNumCell(row.essay.comprehension));
      rowCells.push(createNumCell(row.essay.application));

      // 3 Totals
      rowCells.push(createNumCell(row.totalKnowledge));
      rowCells.push(createNumCell(row.totalComprehension));
      rowCells.push(createNumCell(row.totalApplication));

      // % score
      rowCells.push(
        new TableCell({
          borders: tableBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: String(row.totalPercentage || ''), font: 'Times New Roman', size: 19, bold: true })],
            }),
          ],
        })
      );

      return new TableRow({ children: rowCells });
    });

    // Matrix footer rows (totals)
    const matrixFooterRows: TableRow[] = [];
    if (totals) {
      // Row 1: Tổng số câu(ý)
      matrixFooterRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 3,
              borders: tableBorders,
              shading: { fill: 'F8FAFC' },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tổng số câu (ý)', font: 'Times New Roman', size: 19, bold: true })] })],
            }),
            createNumCell(totals.totalQuestions.multipleChoice.knowledge),
            createNumCell(totals.totalQuestions.multipleChoice.comprehension),
            createNumCell(totals.totalQuestions.multipleChoice.application),

            createNumCell(totals.totalQuestions.trueFalse.knowledge),
            createNumCell(totals.totalQuestions.trueFalse.comprehension),
            createNumCell(totals.totalQuestions.trueFalse.application),

            createNumCell(totals.totalQuestions.shortAnswer.knowledge),
            createNumCell(totals.totalQuestions.shortAnswer.comprehension),
            createNumCell(totals.totalQuestions.shortAnswer.application),

            createNumCell(totals.totalQuestions.essay.knowledge),
            createNumCell(totals.totalQuestions.essay.comprehension),
            createNumCell(totals.totalQuestions.essay.application),

            createNumCell(totals.totalQuestions.totalKnowledge),
            createNumCell(totals.totalQuestions.totalComprehension),
            createNumCell(totals.totalQuestions.totalApplication),
            new TableCell({
              borders: tableBorders,
              shading: { fill: 'F8FAFC' },
              children: [new Paragraph({ children: [] })],
            }),
          ],
        })
      );

      // Row 2: Tổng số điểm
      matrixFooterRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 3,
              borders: tableBorders,
              shading: { fill: 'F1F5F9' },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tổng số điểm', font: 'Times New Roman', size: 19, bold: true })] })],
            }),
            new TableCell({
              columnSpan: 3,
              borders: tableBorders,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(totals.totalPoints.multipleChoice), font: 'Times New Roman', size: 19, bold: true })] })],
            }),
            new TableCell({
              columnSpan: 3,
              borders: tableBorders,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(totals.totalPoints.trueFalse), font: 'Times New Roman', size: 19, bold: true })] })],
            }),
            new TableCell({
              columnSpan: 3,
              borders: tableBorders,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(totals.totalPoints.shortAnswer), font: 'Times New Roman', size: 19, bold: true })] })],
            }),
            new TableCell({
              columnSpan: 3,
              borders: tableBorders,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(totals.totalPoints.essay), font: 'Times New Roman', size: 19, bold: true })] })],
            }),
            createNumCell(totals.totalPoints.totalKnowledge),
            createNumCell(totals.totalPoints.totalComprehension),
            createNumCell(totals.totalPoints.totalApplication),
            new TableCell({
              borders: tableBorders,
              shading: { fill: 'F1F5F9' },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '10,0', font: 'Times New Roman', size: 19, bold: true })] })],
            }),
          ],
        })
      );

      // Row 3: Tỉ lệ %
      matrixFooterRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 3,
              borders: tableBorders,
              shading: { fill: 'F1F5F9' },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tỉ lệ %', font: 'Times New Roman', size: 19, bold: true })] })],
            }),
            new TableCell({
              columnSpan: 3,
              borders: tableBorders,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(totals.totalPercentage.multipleChoice), font: 'Times New Roman', size: 19, bold: true })] })],
            }),
            new TableCell({
              columnSpan: 3,
              borders: tableBorders,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(totals.totalPercentage.trueFalse), font: 'Times New Roman', size: 19, bold: true })] })],
            }),
            new TableCell({
              columnSpan: 3,
              borders: tableBorders,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(totals.totalPercentage.shortAnswer), font: 'Times New Roman', size: 19, bold: true })] })],
            }),
            new TableCell({
              columnSpan: 3,
              borders: tableBorders,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(totals.totalPercentage.essay), font: 'Times New Roman', size: 19, bold: true })] })],
            }),
            createNumCell(totals.totalPercentage.totalKnowledge),
            createNumCell(totals.totalPercentage.totalComprehension),
            createNumCell(totals.totalPercentage.totalApplication),
            new TableCell({
              borders: tableBorders,
              shading: { fill: 'F1F5F9' },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '100%', font: 'Times New Roman', size: 19, bold: true })] })],
            }),
          ],
        })
      );
    }

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [matrixHeaderRow1, matrixHeaderRow2, matrixHeaderRow3, ...matrixDataRows, ...matrixFooterRows],
      })
    );
  }

  // PageBreak between Part 1 and Part 2
  if (mode === 'all') {
    docChildren.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // ==========================================
  // PART 2: BẢN ĐẶC TẢ
  // ==========================================
  if (mode === 'all' || mode === 'spec') {
    docChildren.push(
      new Paragraph({
        spacing: { before: 160, after: 120 },
        children: [
          new TextRun({
            text: mode === 'all' ? 'II. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KỲ MÔN TOÁN' : 'BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KỲ MÔN TOÁN',
            font: 'Times New Roman',
            size: 24,
            bold: true,
            color: '1E293B',
          }),
        ],
      })
    );

    const specHeaderRow1 = new TableRow({
      children: [
        new TableCell({
          rowSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TT', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
        new TableCell({
          rowSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Chủ đề/Chương', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
        new TableCell({
          rowSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nội dung/đơn vị kiến thức', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
        new TableCell({
          rowSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Yêu cầu cần đạt', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
        new TableCell({
          columnSpan: 12,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Số câu hỏi ở các mức độ đánh giá', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
      ],
    });

    const specHeaderRow2 = new TableRow({
      children: [
        new TableCell({
          columnSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nhiều lựa chọn', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
        new TableCell({
          columnSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Đúng - Sai', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
        new TableCell({
          columnSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Trả lời ngắn', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
        new TableCell({
          columnSpan: 3,
          borders: tableBorders,
          shading: { fill: headerBg },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tự luận', font: 'Times New Roman', size: 18, bold: true })] })],
        }),
      ],
    });

    const specHeaderRow3 = new TableRow({
      children: [
        ...Array.from({ length: 4 }).flatMap(() => [
          new TableCell({
            borders: tableBorders,
            shading: { fill: headerBg },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Biết', font: 'Times New Roman', size: 17, bold: true })] })],
          }),
          new TableCell({
            borders: tableBorders,
            shading: { fill: headerBg },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Hiểu', font: 'Times New Roman', size: 17, bold: true })] })],
          }),
          new TableCell({
            borders: tableBorders,
            shading: { fill: headerBg },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Vận dụng', font: 'Times New Roman', size: 16, bold: true })] })],
          }),
        ]),
      ],
    });

    const createSpecNumCell = (val: any) =>
      new TableCell({
        borders: tableBorders,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: String(val ?? 0), font: 'Times New Roman', size: 19 })],
          }),
        ],
      });

    // Specification data rows
    const specDataRows = matrix.map((row, idx) => {
      const rowCells: TableCell[] = [];

      if (chapterSpans[idx] > 0) {
        rowCells.push(
          new TableCell({
            rowSpan: chapterSpans[idx] > 1 ? chapterSpans[idx] : undefined,
            borders: tableBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${chapterNums[idx]}`, font: 'Times New Roman', size: 19 })],
              }),
            ],
          }),
          new TableCell({
            rowSpan: chapterSpans[idx] > 1 ? chapterSpans[idx] : undefined,
            borders: tableBorders,
            children: [
              new Paragraph({
                children: [new TextRun({ text: cleanText(row.chapter), font: 'Times New Roman', size: 19, bold: true })],
              }),
            ],
          })
        );
      }

      // Topic
      rowCells.push(
        new TableCell({
          borders: tableBorders,
          children: [
            new Paragraph({
              children: [new TextRun({ text: cleanText(row.topic), font: 'Times New Roman', size: 19, bold: true })],
            }),
          ],
        })
      );

      // Yêu cầu cần đạt
      const specs = specification.filter((s) => s.topic === row.topic);
      const knowledge = specs.filter((s) => s.level.toLowerCase().includes('biết')).map((s) => s.requirement).join('\n');
      const comprehension = specs.filter((s) => s.level.toLowerCase().includes('hiểu')).map((s) => s.requirement).join('\n');
      const application = specs.filter((s) => s.level.toLowerCase().includes('vận dụng')).map((s) => s.requirement).join('\n');

      const reqParagraphs: Paragraph[] = [];

      const addLevelSection = (levelLabel: string, content: string) => {
        if (!content.trim()) return;
        reqParagraphs.push(
          new Paragraph({
            spacing: { before: 40, after: 20 },
            children: [new TextRun({ text: `${levelLabel}:`, font: 'Times New Roman', size: 19, bold: true, color: '1E293B' })],
          })
        );
        content.split('\n').filter(Boolean).forEach((line) => {
          const cleanLine = line.replace(/^[–-]\s*/, '').trim();
          if (cleanLine) {
            reqParagraphs.push(
              new Paragraph({
                spacing: { line: 240, after: 20 },
                children: [new TextRun({ text: `– ${cleanText(cleanLine)}`, font: 'Times New Roman', size: 19, color: '334155' })],
              })
            );
          }
        });
      };

      addLevelSection('Nhận biết', knowledge);
      addLevelSection('Thông hiểu', comprehension);
      addLevelSection('Vận dụng', application);

      if (reqParagraphs.length === 0) {
        reqParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Thực hiện theo chuẩn yêu cầu cần đạt chương trình GDPT 2018.',
                font: 'Times New Roman',
                size: 19,
                italics: true,
                color: '64748B',
              }),
            ],
          })
        );
      }

      rowCells.push(
        new TableCell({
          borders: tableBorders,
          children: reqParagraphs,
        })
      );

      // 12 question count cells
      rowCells.push(createSpecNumCell(row.multipleChoice.knowledge));
      rowCells.push(createSpecNumCell(row.multipleChoice.comprehension));
      rowCells.push(createSpecNumCell(row.multipleChoice.application));

      rowCells.push(createSpecNumCell(row.trueFalse.knowledge));
      rowCells.push(createSpecNumCell(row.trueFalse.comprehension));
      rowCells.push(createSpecNumCell(row.trueFalse.application));

      rowCells.push(createSpecNumCell(row.shortAnswer.knowledge));
      rowCells.push(createSpecNumCell(row.shortAnswer.comprehension));
      rowCells.push(createSpecNumCell(row.shortAnswer.application));

      rowCells.push(createSpecNumCell(row.essay.knowledge));
      rowCells.push(createSpecNumCell(row.essay.comprehension));
      rowCells.push(createSpecNumCell(row.essay.application));

      return new TableRow({ children: rowCells });
    });

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [specHeaderRow1, specHeaderRow2, specHeaderRow3, ...specDataRows],
      })
    );
  }

  // Signature Block
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 300, after: 40 },
                children: [new TextRun({ text: 'TỔ TRƯỞNG CHUYÊN MÔN', font: 'Times New Roman', size: 22, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 1200 },
                children: [new TextRun({ text: '(Ký và ghi rõ họ tên)', font: 'Times New Roman', size: 20, italics: true })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 300, after: 40 },
                children: [new TextRun({ text: 'Ngày ..... tháng ..... năm 202...', font: 'Times New Roman', size: 20, italics: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
                children: [new TextRun({ text: 'NGƯỜI LẬP MA TRẬN & ĐẶC TẢ', font: 'Times New Roman', size: 22, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 1200 },
                children: [new TextRun({ text: '(Ký và ghi rõ họ tên)', font: 'Times New Roman', size: 20, italics: true })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  docChildren.push(new Paragraph({ spacing: { before: 200 } }));
  docChildren.push(signatureTable);

  // Create Document in Landscape A4
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: 16838,
              height: 11906,
            },
            margin: {
              top: 1134, // ~2cm
              bottom: 1134,
              left: 1134,
              right: 1134,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  let fileName = `Ma_Tran_Va_Ban_Dac_Ta_Toan_${grade.replace(/\s+/g, '_')}`;
  if (mode === 'matrix') {
    fileName = `Khung_Ma_Tran_Toan_${grade.replace(/\s+/g, '_')}`;
  } else if (mode === 'spec') {
    fileName = `Ban_Dac_Ta_Toan_${grade.replace(/\s+/g, '_')}`;
  }

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
}
