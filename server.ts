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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Matrix Generation
  app.post("/api/generate-matrix", async (req, res) => {
    try {
      const { lessons, config, levels } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Bạn là một chuyên gia giáo dục phân tích chương trình học THCS.
Dựa vào các bài học người dùng đã chọn: ${lessons.join(", ")}
Và cấu hình bài kiểm tra:
- Các loại câu hỏi và điểm số: ${JSON.stringify(config)}
- Tỉ lệ nhận thức: Biết ${levels.knowledge}%, Hiểu ${levels.comprehension}%, Vận dụng ${levels.application}%, Vận dụng cao ${levels.highApplication}%

Hãy lập Khung ma trận đề kiểm tra môn Toán.
Cấu trúc ma trận chuẩn (tương tự như ảnh mẫu người dùng cung cấp) bao gồm các cột sau:
- Mức độ đánh giá được chia thành 3 phần chính: TNKQ (Nhiều lựa chọn), TNKQ (Đúng - Sai), và Trả lời ngắn / Tự luận.
- Mỗi phần chính lại được chia nhỏ theo mức độ nhận thức (Biết, Hiểu, Vận dụng, Vận dụng cao).
- Điền số câu hỏi (hoặc số thứ tự câu hỏi như C1, C2...) vào các ô tương ứng.

Yêu cầu trả về chính xác định dạng JSON (không markdown, không giải thích thêm), gồm 2 mảng:
ĐỐI VỚI "specification": 
1. BẮT BUỘC mỗi chủ đề phải được tách thành các object riêng biệt tương ứng với TỪNG MỨC ĐỘ NHẬN THỨC (Nhận biết, Thông hiểu, Vận dụng).
2. QUAN TRỌNG: "requirement" PHẢI TRÍCH XUẤT CHÍNH XÁC TỪNG CHỮ từ văn bản Chương trình Giáo dục Phổ thông 2018. Tuyệt đối không tự ý tóm tắt, tự diễn đạt lại hay bịa ra. Ví dụ: "– Nhận biết được các khái niệm về đơn thức, đa thức nhiều biến." (có dấu gạch ngang đầu dòng).

{
  "matrix": [
    {
      "chapter": "Tên chương",
      "topic": "Tên bài/chủ đề",
      "multipleChoice": {
        "knowledge": "Số lượng câu Nhận biết (Nhiều lựa chọn)",
        "comprehension": "Số lượng câu Thông hiểu (Nhiều lựa chọn)",
        "application": "Số lượng câu Vận dụng (Nhiều lựa chọn)"
      },
      "trueFalse": {
        "knowledge": "Số lượng câu Nhận biết (Đúng - Sai)",
        "comprehension": "Số lượng câu Thông hiểu (Đúng - Sai)",
        "application": "Số lượng câu Vận dụng (Đúng - Sai)"
      },
      "shortAnswer": {
        "knowledge": "Số lượng câu Nhận biết (Trả lời ngắn)",
        "comprehension": "Số lượng câu Thông hiểu (Trả lời ngắn)",
        "application": "Số lượng câu Vận dụng (Trả lời ngắn)"
      },
      "essay": {
        "knowledge": "Số lượng câu Nhận biết (Tự luận)",
        "comprehension": "Số lượng câu Thông hiểu (Tự luận)",
        "application": "Số lượng câu Vận dụng (Tự luận)"
      },
      "totalKnowledge": "Tổng số câu Nhận biết",
      "totalComprehension": "Tổng số câu Thông hiểu",
      "totalApplication": "Tổng số câu Vận dụng (bao gồm cả Vận dụng cao)",
      "totalPercentage": "Tỉ lệ % điểm (vd: '50%')"
    }
  ],
  "specification": [
    {
      "topic": "Tên bài/chủ đề",
      "level": "Nhận biết",
      "requirement": "– Yêu cầu thứ nhất trích chính xác từ văn bản\\n– Yêu cầu thứ hai",
      "questionCount": "Số lượng câu hỏi"
    },
    {
      "topic": "Tên bài/chủ đề",
      "level": "Thông hiểu",
      "requirement": "– Yêu cầu thứ ba trích chính xác từ văn bản",
      "questionCount": "Số lượng câu hỏi"
    },
    {
      "topic": "Tên bài/chủ đề",
      "level": "Vận dụng",
      "requirement": "– Yêu cầu thứ tư trích chính xác từ văn bản",
      "questionCount": "Số lượng câu hỏi"
    }
  ],
  "totals": {
    "totalQuestions": {
      "multipleChoice": { "knowledge": 6, "comprehension": 4, "application": 2 },
      "trueFalse": { "knowledge": 7, "comprehension": 5, "application": 4 },
      "shortAnswer": { "knowledge": 1, "comprehension": 2, "application": 3 },
      "essay": { "knowledge": 0, "comprehension": 0, "application": 1 },
      "totalKnowledge": 14,
      "totalComprehension": 11,
      "totalApplication": 10
    },
    "totalPoints": {
      "multipleChoice": "3,0",
      "trueFalse": "4,0",
      "shortAnswer": "3,0",
      "essay": "0,0",
      "totalKnowledge": "4,0",
      "totalComprehension": "3,0",
      "totalApplication": "3,0"
    },
    "totalPercentage": {
      "multipleChoice": 30,
      "trueFalse": 40,
      "shortAnswer": 30,
      "essay": 0,
      "totalKnowledge": 40,
      "totalComprehension": 30,
      "totalApplication": 30
    }
  }
}
Chỉ trả về JSON thuần túy, phân bổ logic số câu hỏi cho từng chủ đề dựa trên tổng tỉ lệ được yêu cầu.`;

      const response: any = await generateContentWithRetry(ai, {
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text;
      const result = safeParseLLMJson(responseText);
      res.json(result);
    } catch (error: any) {
      console.error("API Error:", error);
      res.status(500).json({ error: error.message || "An unexpected error occurred." });
    }
  });

  // API Route for Exam Generation
  app.post("/api/generate-exam", async (req, res) => {
    try {
      const { matrix, specification } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Bạn là một giáo viên Toán xuất sắc. Dựa vào Khung ma trận và Bản đặc tả đề kiểm tra sau:

Khung Ma Trận:
${JSON.stringify(matrix, null, 2)}

Bản Đặc Tả:
${JSON.stringify(specification, null, 2)}

Hãy sinh ra Đề Kiểm Tra tương ứng. Đề kiểm tra phải tuân thủ CHÍNH XÁC Khung ma trận (số lượng câu hỏi cho từng loại: trắc nghiệm, đúng/sai, tự luận... ở từng mức độ Biết, Hiểu, Vận dụng) và bám sát nội dung Yêu cầu cần đạt trong Bản đặc tả.
Các loại câu hỏi gồm:
- Trắc nghiệm nhiều lựa chọn (multipleChoice)
- Trắc nghiệm Đúng/Sai (trueFalse)
- Trả lời ngắn (shortAnswer)
- Tự luận (essay)

QUY ĐỊNH BẮT BUỘC VỀ CÔNG THỨC TOÁN HỌC (LATEX):
- TẤT CẢ các công thức toán học, biểu thức, phương trình, số mũ, căn bậc hai, phân số, ký hiệu góc, hệ thức, tập hợp... BẮT BUỘC phải được viết dưới dạng cú pháp LaTeX chuẩn và kẹp trong dấu đô la:
  + Công thức nội dòng kẹp trong cặp dấu $...$ (ví dụ: $x^2 - 4x + 3 = 0$, $\\frac{a}{b}$, $\\sqrt{x}$, $\\widehat{ABC} = 90^\\circ$, $x \\in \\mathbb{Z}$).
  + Công thức dòng riêng kẹp trong cặp dấu $$...$$.
  + Trong các phương án trắc nghiệm A, B, C, D hoặc a), b), c), d), các biểu thức toán cũng BẮT BUỘC dùng dấu $...$.
- Tuyệt đối KHÔNG viết công thức cẩu thả (như x^2 hay căn x), luôn luôn dùng chuẩn LaTeX $...$.

QUY ĐỊNH BẮT BUỘC ĐỐI VỚI CÂU TRẢ LỜI NGẮN (shortAnswer):
- Theo đúng cấu trúc đề thi chuẩn mới của Bộ GD&ĐT: Kết quả (answer) của mỗi câu hỏi phần Trắc nghiệm Trả lời ngắn BẮT BUỘC PHẢI LÀ MỘT SỐ có độ dài TỐI ĐA 4 KÝ TỰ (tính cả dấu trừ '-' nếu là số âm, hoặc dấu chấm/phẩy thập phân).
- Ví dụ hợp lệ: "12", "-5", "3.5", "0.25", "100", "-1.5", "2024" (tối đa 4 ký tự).
- TUYỆT ĐỐI KHÔNG để đáp án chứa chữ cái (như "x = 5"), phân số có dấu '/', căn thức, hay đơn vị đo (như "cm", "m", "km/h", "độ").
- Phải thiết kế số liệu bài toán sao cho kết quả cuối cùng tính ra là một con số nguyên hoặc số thập phân gọn gàng tối đa 4 ký tự để học sinh tô được vào phiếu trả lời trắc nghiệm.

Trả về định dạng JSON thuần túy (không markdown) với cấu trúc sau:
{
  "questions": [
    {
      "id": "Câu 1",
      "type": "multipleChoice", 
      "level": "Nhận biết",
      "topic": "Tên chủ đề",
      "content": "Nội dung câu hỏi (sử dụng công thức LaTeX như $x^2 + 1 = 0$)...",
      "options": ["A. $...$", "B. $...$", "C. $...$", "D. $...$"],
      "answer": "Đáp án đúng (vd: A)",
      "explanation": "Giải thích chi tiết cách giải (kèm công thức LaTeX)..."
    }
  ]
}

Lưu ý: 
- Trường "type" chỉ được mang các giá trị: "multipleChoice", "trueFalse", "shortAnswer", "essay".
- Với trueFalse, mảng options nên chứa 4 ý a,b,c,d để học sinh chọn Đúng/Sai, và answer là mảng chứa Đ/S tương ứng (vd: "a. Đ, b. S, c. Đ, d. S").
- Phải đảm bảo nội dung câu hỏi sát với chương trình Toán THCS theo form mới.
- LƯU Ý KỸ VỀ CHUỖI JSON: Vì kết quả là định dạng JSON, mọi dấu gạch chéo ngược trong lệnh LaTeX cần được viết là \\\\ (ví dụ: \\\\frac{a}{b}, \\\\sqrt{x}, \\\\alpha, \\\\widehat{...}) để chuỗi JSON hợp lệ.`;

      const response: any = await generateContentWithRetry(ai, {
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text;
      const result = safeParseLLMJson(responseText);
      res.json(result);
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
