import { Fragment, useState } from 'react';
import { cleanProductTitle } from '../../utils/affiliateDisplay';

interface ChatProductCard {
  name: string;
  platform?: string;
  shop?: string;
  category?: string;
  tags?: string;
  price?: string;
  image?: string;
  url?: string;
}

function formatPrice(value?: string) {
  if (!value) return '';
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return `${Math.round(numeric).toLocaleString('vi-VN')}đ`;
  }
  return cleanProductTitle(value, 28);
}

function safeDecode(value?: string) {
  if (!value) return '';
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value.replace(/\+/g, ' ');
  }
}

function imageFromUrl(url?: string) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const ogInfo = parsed.searchParams.get('og_info');
    if (!ogInfo) return '';
    const decoded = JSON.parse(safeDecode(ogInfo)) as { image?: string };
    return decoded.image ?? '';
  } catch {
    return '';
  }
}

function parseProductMarker(line: string): ChatProductCard | null {
  if (!line.startsWith('HI_PRODUCT|')) return null;
  const fields = new Map<string, string>();
  line.split('|').slice(1).forEach((part) => {
    const separator = part.indexOf('=');
    if (separator <= 0) return;
    fields.set(part.slice(0, separator), safeDecode(part.slice(separator + 1)));
  });
  const name = cleanProductTitle(fields.get('name'), 72);
  if (!name) return null;
  return {
    name,
    platform: cleanProductTitle(fields.get('platform'), 24),
    shop: cleanProductTitle(fields.get('shop'), 32),
    category: cleanProductTitle(fields.get('category'), 36),
    tags: cleanProductTitle(fields.get('tags'), 48),
    price: fields.get('price'),
    image: fields.get('image'),
    url: fields.get('url'),
  };
}

function parseLegacyProductLine(line: string): ChatProductCard | null {
  if (!line.includes('nền tảng:') && !line.includes('link:')) return null;
  const url = line.match(/\[[^\]]+\]\((https?:\/\/.+)\)/)?.[1]
    ?? line.match(/https?:\/\/\S+/)?.[0]?.replace(/[)\]]+$/, '');
  const name = cleanProductTitle(line.replace(/^[-•]\s*/, '').split('|')[0], 72);
  if (!name || !url) return null;
  return {
    name,
    platform: cleanProductTitle(line.match(/nền tảng:\s*([^|]+)/i)?.[1], 24),
    category: cleanProductTitle(line.match(/nhóm:\s*([^|]+)/i)?.[1], 36),
    tags: cleanProductTitle(line.match(/tags:\s*([^|]+)/i)?.[1], 48),
    image: imageFromUrl(url),
    url,
  };
}

function isLegacyDisclosure(line: string) {
  const normalized = line.toLocaleLowerCase('vi');
  return normalized.includes('đây là link affiliate')
    || normalized.includes('hi có thể nhận hoa hồng');
}

function ChatProductCardView({ product }: { product: ChatProductCard }) {
  const [imageFailed, setImageFailed] = useState(false);
  const meta = [product.platform, product.shop || product.category].filter(Boolean).join(' · ');
  const price = formatPrice(product.price);

  return (
    <article className="my-2 overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm shadow-pink-100/40">
      <div className="flex gap-3 p-3">
        {product.image && !imageFailed ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="h-20 w-20 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-pink-400">
            <span className="material-symbols-outlined text-3xl">local_mall</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          {meta && <p className="line-clamp-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{meta}</p>}
          <h3 className="mt-1 line-clamp-2 text-sm font-black leading-snug text-slate-900">{product.name}</h3>
          {product.tags && <p className="mt-1 line-clamp-1 text-xs font-bold text-pink-500">{product.tags}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
              {price || 'Chưa có giá'}
            </span>
            {product.url && (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="rounded-full bg-pink-500 px-3 py-1 text-xs font-black text-white transition hover:bg-pink-600"
              >
                Mở sản phẩm
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

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
        if (isLegacyDisclosure(line)) return null;
        const product = parseProductMarker(line) ?? parseLegacyProductLine(line);
        if (product) {
          return <ChatProductCardView key={index} product={product} />;
        }
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
