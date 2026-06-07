import { Fragment } from 'react';

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function ChatMessageContent({ content }: { content: string }) {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const bullet = line.match(/^[-•]\s+(.+)/);
        const numbered = line.match(/^\d+[.)]\s+(.+)/);
        if (bullet || numbered) {
          return (
            <div key={index} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-45" />
              <p>{renderInline((bullet?.[1] ?? numbered?.[1] ?? line).trim())}</p>
            </div>
          );
        }
        return <p key={index}>{renderInline(line)}</p>;
      })}
    </div>
  );
}
