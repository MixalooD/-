import { parseInlineFormatting } from '../utils/lectureSearch';

interface RichTextProps {
  text: string;
  highlightSupplements?: boolean;
}

export function RichText({
  text,
  highlightSupplements = false,
}: RichTextProps) {
  const tokens = parseInlineFormatting(text);

  return (
    <>
      {tokens.map((token, idx) => {
        if (token.type === 'bold') {
          return (
            <strong key={idx} className="font-semibold text-[#1C1917]">
              {token.value}
            </strong>
          );
        }
        if (token.type === 'italic') {
          return (
            <em key={idx} className="italic text-[#292524]">
              {token.value}
            </em>
          );
        }
        if (token.type === 'supplement') {
          return (
            <span
              key={idx}
              className={
                highlightSupplements
                  ? 'bg-[#1E3A8A]/10 text-[#1E3A8A] px-1 rounded-xs border-b border-[#1E3A8A]/40 transition-colors'
                  : 'text-[#78350F] italic'
              }
              title="Восстановленный контекст или филологическое уточнение"
            >
              {token.value}
            </span>
          );
        }
        return <span key={idx}>{token.value}</span>;
      })}
    </>
  );
}
