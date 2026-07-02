import type { Chapter, PageData } from '../types';

const pageCache = new Map<number, PageData>();
let chaptersCache: Chapter[] | null = null;

export async function loadPage(page: number): Promise<PageData> {
  const cached = pageCache.get(page);
  if (cached) return cached;
  const res = await fetch(`${import.meta.env.BASE_URL}data/pages/page-${page}.json`);
  if (!res.ok) throw new Error(`Impossible de charger la page ${page}`);
  const data = (await res.json()) as PageData;
  pageCache.set(page, data);
  return data;
}

export async function loadChapters(): Promise<Chapter[]> {
  if (chaptersCache) return chaptersCache;
  const res = await fetch(`${import.meta.env.BASE_URL}data/chapters.json`);
  if (!res.ok) throw new Error('Impossible de charger les sourates');
  chaptersCache = (await res.json()) as Chapter[];
  return chaptersCache;
}
