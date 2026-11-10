import { Text } from "react-native";

// One Dark Pro syntax colors (upstream bukitoka/one-dark-pro-max token colors).
export const SYNTAX = {
  keyword: "#C678DD",
  string: "#98C379",
  number: "#D19A66",
  function: "#61AFEF",
  type: "#E5C07B",
  operator: "#56B6C2",
  variable: "#E06C75",
  comment: "#7F848E",
};

export type Token = { text: string; color?: string };

const KEYWORDS = new Set(
  (
    "as async await break case catch class const continue def default delete do elif else " +
    "enum export extends false finally fn for from func go if impl import in " +
    "instanceof interface let match new nil none null package pub return self static struct " +
    "super switch this throw true try typeof undefined var void while with yield"
  ).split(" "),
);

// SHORTCUT: regex tokenizer, language-agnostic; swap for a real grammar if accuracy matters
const CODE_TOKEN =
  /(\/\/.*$|\/\*.*?(?:\*\/|$)|#\s.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$]*)|(=>|[=!<>]=?=?|&&|\|\||[+\-*/%?:])/g;

export function highlightCode(line: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of line.matchAll(CODE_TOKEN)) {
    const [text, comment, string, number, word, operator] = match;
    const index = match.index ?? 0;
    if (index > last) tokens.push({ text: line.slice(last, index) });
    let color: string | undefined;
    if (comment) color = SYNTAX.comment;
    else if (string) color = SYNTAX.string;
    else if (number) color = SYNTAX.number;
    else if (operator) color = SYNTAX.operator;
    else if (word) {
      if (KEYWORDS.has(word)) color = SYNTAX.keyword;
      else if (line[index + word.length] === "(") color = SYNTAX.function;
      else if (/^[A-Z]/.test(word)) color = SYNTAX.type;
    }
    tokens.push({ text, color });
    last = index + text.length;
  }
  if (last < line.length) tokens.push({ text: line.slice(last) });
  return tokens;
}

export function tint(hex: string, alpha = "26"): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${alpha}` : "transparent";
}

export function Tokens({ tokens, fallback }: { tokens: Token[]; fallback: string }) {
  return tokens.map((token, index) => (
    <Text key={index} style={{ color: token.color ?? fallback }}>
      {token.text}
    </Text>
  ));
}
