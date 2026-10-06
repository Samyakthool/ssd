import { redirect } from 'next/navigation';

function extractSainikId(raw: string): string {
  if (!raw) return '';
  let str = decodeURIComponent(raw).trim();
  const ssdMatch = str.match(/\b(SSD-[A-Za-z0-9_-]{4,30})\b/i);
  if (ssdMatch && ssdMatch[1]) return ssdMatch[1].toUpperCase();
  const appMatch = str.match(/\b(APP-[A-Za-z0-9_-]{4,30})\b/i);
  if (appMatch && appMatch[1]) return appMatch[1].toUpperCase();
  if (str.includes('=')) {
    const qMatch = str.match(/[?&](?:id|sainikId|token)=([^&#]+)/i);
    if (qMatch && qMatch[1]) return decodeURIComponent(qMatch[1]).trim();
  }
  return str.replace(/[?#].*$/, '').replace(/\/+$/, '').trim();
}

export default async function VerifyPage(props: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const params = await Promise.resolve(props.params);
  const rawId = params?.id || '';
  const sainikId = extractSainikId(rawId) || rawId;
  redirect(`/verify?id=${encodeURIComponent(sainikId)}`);
}
