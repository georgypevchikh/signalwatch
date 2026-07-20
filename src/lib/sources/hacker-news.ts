export interface HNItem {
  id: number;
  type?: string;
  title?: string;
  url?: string;
  text?: string;
  by?: string;
  time?: number;
  score?: number;
  descendants?: number;
  dead?: boolean;
  deleted?: boolean;
}

export interface NormalizedEvent {
  source: "hacker_news";
  externalId: string;
  title: string;
  url: string | null;
  author: string | null;
  publishedAt: Date | null;
  rawPayload: HNItem;
}

const HN_API = "https://hacker-news.firebaseio.com/v0";
const ITEM_TIMEOUT_MS = 5_000;
const CONCURRENCY = 5;

export async function fetchNewStoryIds(
  maxItems: number
): Promise<number[]> {
  const res = await fetch(`${HN_API}/newstories.json`);
  if (!res.ok) throw new Error(`HN API error: ${res.status}`);
  const ids: number[] = await res.json();
  return ids.slice(0, maxItems);
}

export async function fetchItem(id: number): Promise<HNItem | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ITEM_TIMEOUT_MS);
  try {
    const res = await fetch(`${HN_API}/item/${id}.json`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchItems(ids: number[]): Promise<HNItem[]> {
  const results: HNItem[] = [];
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const items = await Promise.all(batch.map(fetchItem));
    for (const item of items) {
      if (item && !item.dead && !item.deleted && item.type === "story") {
        results.push(item);
      }
    }
  }
  return results;
}

export function normalizeItem(item: HNItem): NormalizedEvent {
  const hnUrl = `https://news.ycombinator.com/item?id=${item.id}`;
  return {
    source: "hacker_news",
    externalId: String(item.id),
    title: item.title ?? "(untitled)",
    url: item.url ?? hnUrl,
    author: item.by ?? null,
    publishedAt: item.time ? new Date(item.time * 1000) : null,
    rawPayload: item,
  };
}
