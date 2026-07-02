// Génère le dataset local du Coran (604 pages, layout mushaf Madinah, script QPC Hafs)
// Source : API publique quran.com v4 (mushaf=5 → QPC Hafs Unicode)
// Usage : node scripts/fetch-quran-data.mjs [--from N] [--to M]

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API = 'https://api.quran.com/api/v4';
const MUSHAF = 5; // QPC Hafs (Unicode), 604 pages / 15 lignes
const OUT_DIR = path.resolve('public/data');
const PAGES_DIR = path.join(OUT_DIR, 'pages');
const TOTAL_PAGES = 604;

const args = process.argv.slice(2);
const argVal = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const FROM = argVal('--from', 1);
const TO = argVal('--to', TOTAL_PAGES);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, retries = 5) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt >= retries) throw err;
      console.warn(`  retry ${attempt} (${err.message})`);
      await sleep(1000 * attempt);
    }
  }
}

async function fetchChapters() {
  const json = await fetchJson(`${API}/chapters?language=fr`);
  return json.chapters.map((c) => ({
    id: c.id,
    nameArabic: c.name_arabic,
    nameSimple: c.name_simple,
    translatedName: c.translated_name?.name ?? c.name_simple,
    versesCount: c.verses_count,
    pages: c.pages, // [firstPage, lastPage]
    bismillahPre: c.bismillah_pre,
  }));
}

async function fetchPageVerses(page) {
  const verses = [];
  let apiPage = 1;
  for (;;) {
    const url =
      `${API}/verses/by_page/${page}?words=true&per_page=50&page=${apiPage}` +
      `&word_fields=text_qpc_hafs,line_number,char_type_name&mushaf=${MUSHAF}`;
    const json = await fetchJson(url);
    verses.push(...json.verses);
    const { total_pages: totalPages } = json.pagination;
    if (apiPage >= totalPages) break;
    apiPage++;
  }
  return verses;
}

function buildPage(pageNumber, verses, chapters) {
  // Regroupe les mots par ligne
  const lineWords = new Map(); // lineNumber -> words[]
  for (const verse of verses) {
    const [surahStr] = verse.verse_key.split(':');
    const surah = Number(surahStr);
    for (const w of verse.words) {
      // Certains mots peuvent appartenir à une autre page (sécurité)
      if (w.page_number !== pageNumber) continue;
      const entry = {
        t: w.text_qpc_hafs ?? w.text,
        k: verse.verse_key,
        s: surah,
        // 'end' = médaillon de fin de verset (numéro), non tapé
        e: w.char_type_name === 'end' ? 1 : 0,
      };
      if (!lineWords.has(w.line_number)) lineWords.set(w.line_number, []);
      lineWords.get(w.line_number).push(entry);
    }
  }

  const lines = [];
  for (const [n, words] of [...lineWords.entries()].sort((a, b) => a[0] - b[0])) {
    lines.push({ n, type: 'ayah', words });
  }

  // Insère les lignes d'en-tête de sourate et de basmala :
  // pour chaque sourate qui commence sur cette page (premier mot du verset 1),
  // les lignes précédentes non occupées sont : [en-tête] puis [basmala] (sauf s.1 et s.9)
  const headerLines = [];
  for (const verse of verses) {
    if (verse.verse_number !== 1) continue;
    const [surahStr] = verse.verse_key.split(':');
    const surah = Number(surahStr);
    const firstWord = verse.words.find((w) => w.page_number === pageNumber);
    if (!firstWord) continue;
    const firstLine = firstWord.line_number;
    const chapter = chapters.find((c) => c.id === surah);
    const hasBasmala = chapter?.bismillahPre ?? (surah !== 1 && surah !== 9);
    if (hasBasmala) {
      headerLines.push({ n: firstLine - 2, type: 'surah', surah });
      headerLines.push({ n: firstLine - 1, type: 'basmala', surah });
    } else {
      headerLines.push({ n: firstLine - 1, type: 'surah', surah });
    }
  }
  lines.push(...headerLines.filter((l) => l.n >= 1));
  lines.sort((a, b) => a.n - b.n);

  // Heuristique de centrage : dernière ligne d'une sourate → centrée
  // (+ pages 1 et 2 entièrement centrées, comme dans le mushaf)
  for (const line of lines) {
    if (line.type !== 'ayah') continue;
    if (pageNumber <= 2) {
      line.c = 1;
      continue;
    }
    const last = line.words[line.words.length - 1];
    if (last?.e) {
      const [s, v] = last.k.split(':').map(Number);
      const chapter = chapters.find((c) => c.id === s);
      if (chapter && v === chapter.versesCount) line.c = 1;
    }
  }

  return { page: pageNumber, lines };
}

async function main() {
  await mkdir(PAGES_DIR, { recursive: true });

  console.log('Téléchargement des métadonnées des sourates...');
  const chapters = await fetchChapters();
  await writeFile(
    path.join(OUT_DIR, 'chapters.json'),
    JSON.stringify(chapters),
    'utf8'
  );
  console.log(`  ${chapters.length} sourates OK`);

  for (let page = FROM; page <= TO; page++) {
    const verses = await fetchPageVerses(page);
    const data = buildPage(page, verses, chapters);
    await writeFile(
      path.join(PAGES_DIR, `page-${page}.json`),
      JSON.stringify(data),
      'utf8'
    );
    if (page % 20 === 0 || page === TO) console.log(`  page ${page}/${TO}`);
    await sleep(120); // courtoisie envers l'API
  }
  console.log('Terminé.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
