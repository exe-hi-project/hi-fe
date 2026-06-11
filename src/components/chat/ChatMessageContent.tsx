import { Fragment } from 'react';

function renderLinks(text: string, keyPrefix: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={`${keyPrefix}-link-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          className="break-all font-bold text-pink-600 underline decoration-pink-200 underline-offset-4 transition hover:text-pink-700"
        >
          Mở sản phẩm
        </a>
      );
    }
    return <Fragment key={`${keyPrefix}-text-${index}`}>{part}</Fragment>;
  });
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={index}>{renderLinks(part, `inline-${index}`)}</Fragment>;
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
