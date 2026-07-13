const codeTemplates = {
  python: {
    lang: "python",
    file: "solution.py",
    content:
      "def solve(data):\n    \"\"\"Process the input and return a result.\"\"\"\n    result = [x for x in data if x]\n    return result\n\n\nif __name__ == \"__main__\":\n    print(solve([1, 0, 2, None, 3]))",
  },
  javascript: {
    lang: "javascript",
    file: "solution.js",
    content:
      "function solve(data) {\n  // Filter out falsy values and return the rest\n  return data.filter(Boolean);\n}\n\nconsole.log(solve([1, 0, 2, null, 3]));",
  },
  html: {
    lang: "html",
    file: "index.html",
    content:
      "<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <title>Demo</title>\n  </head>\n  <body>\n    <h1>Hello, world!</h1>\n  </body>\n</html>",
  },
  sql: {
    lang: "sql",
    file: "query.sql",
    content:
      "SELECT customer_id, SUM(amount) AS total_spent\nFROM orders\nWHERE created_at >= NOW() - INTERVAL '30 days'\nGROUP BY customer_id\nORDER BY total_spent DESC\nLIMIT 10;",
  },
  react: {
    lang: "jsx",
    file: "Component.jsx",
    content:
      "export default function Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <button onClick={() => setCount((c) => c + 1)}>\n      Count: {count}\n    </button>\n  );\n}",
  },
};

const codeKeywords = [
  [/python|django|flask/, "python"],
  [/react|jsx|component/, "react"],
  [/sql|database|query/, "sql"],
  [/html|webpage|landing page/, "html"],
  [/javascript|js\b|node|typescript/, "javascript"],
  [/kod|dastur|function|funksiya|script|bug|debug|algorithm/, "javascript"],
];

const greetingPattern = /^(salom|hi|hello|hey|assalomu alaykum|привет|здравствуй)\b/i;

function hashText(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function buildCodyReply(text, t) {
  const trimmed = (text || "").trim();
  const lower = trimmed.toLowerCase();

  if (greetingPattern.test(lower) && lower.length < 20) {
    return { text: t("console.chat.greetingReply"), code: null };
  }

  const looksLikeCode = codeKeywords.some(([re]) => re.test(lower));

  if (looksLikeCode) {
    const match = codeKeywords.find(([re]) => re.test(lower));
    const template = codeTemplates[match[1]] || codeTemplates.javascript;
    return { text: t("console.chat.codeAck"), code: template };
  }

  const acks = t("console.chat.genericAcks");
  const steps = t("console.chat.genericSteps");
  const h = hashText(lower || "x");
  const ack = acks[h % acks.length];
  // Har safar 3 tadan qadam ko'rsatib, tartibini biroz aralashtiramiz — bir xil javob ko'rinishining oldini olish uchun
  const rotated = [...steps.slice(h % steps.length), ...steps.slice(0, h % steps.length)].slice(0, 3);

  return {
    text: `${ack}\n${rotated.map((s) => `• ${s}`).join("\n")}`,
    code: null,
  };
}
