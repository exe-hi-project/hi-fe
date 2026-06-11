interface AffiliateDisplayProduct {
  name?: string;
  sourceName?: string;
  category?: string;
  symptomCategory?: string;
  platform?: string;
}

function decodeText(value: string) {
  const plusDecoded = value.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(plusDecoded);
  } catch {
    return plusDecoded;
  }
}

function isEdgePunctuation(char: string) {
  return char === '-' || char === ':' || char === '.' || char === ',' || char.trim() === '';
}

function trimEdgePunctuation(value: string) {
  let start = 0;
  let end = value.length;
  while (start < end && isEdgePunctuation(value[start])) start += 1;
  while (end > start && isEdgePunctuation(value[end - 1])) end -= 1;
  return value.slice(start, end);
}

export function isNoisyAffiliateTitle(value?: string) {
  if (!value) return false;
  const text = value.trim();
  const plusCount = (text.match(/\+/g) ?? []).length;
  const bracketCount = (text.match(/\[[^\]]+\]/g) ?? []).length;
  return plusCount >= 3 || bracketCount >= 2 || /^\s*\[(deal|mua|sale|voucher|flash)/i.test(text);
}

export function cleanProductTitle(value?: string, maxLength = 88) {
  if (!value) return '';
  let text = decodeText(value)
    .replace(/^https?:\/\/\S+$/i, '')
    .replace(/\[[^\]]{1,90}\]/g, ' ')
    .replace(/\b(deal|sale|voucher|flash sale|mua)\b\s*[:|-]?/gi, ' ')
    .replace(/[|•]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  text = trimEdgePunctuation(text);
  if (!text || text.length < 3) return '';
  if (text.length > maxLength) return `${text.slice(0, maxLength - 1).trim()}…`;
  return text;
}

export function bestProductName(product: AffiliateDisplayProduct, fallback = 'Sản phẩm chăm sóc') {
  const cleanedName = cleanProductTitle(product.name);
  if (cleanedName && !/^https?:\/\//i.test(cleanedName)) return cleanedName;

  const cleanedSource = cleanProductTitle(product.sourceName);
  if (cleanedSource) return cleanedSource;

  const cleanedCategory = cleanProductTitle(product.category || product.symptomCategory);
  if (cleanedCategory) return cleanedCategory;

  return product.platform ? `${fallback} từ ${product.platform}` : fallback;
}
