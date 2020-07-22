import { pathFix, writeFileAsync } from 'medea';

import { SeriesType } from '@/enums/SeriesType';
import { SeriesStub } from '@/interfaces/SeriesStub';
import { log } from '@/utils/log';
import getOfflineDb from '@/utils/getOfflineDb';
import { initDbInstance } from '@/utils/db';
import { searchManga } from '@/utils/malApi';

const sqlQuery = new Map([
  [SeriesType.anime, `SELECT id, title, malId FROM animes WHERE malId IS NULL`],
  [SeriesType.manga, `SELECT id, title, malId FROM mangas WHERE malId IS NULL`]
]);

async function findAnimeMalIds(rows: SeriesStub[]) {
  const offItems = await getOfflineDb();

  for (const row of rows) {
    const source = offItems
      .find((x) => x.title === row.title || x.synonyms.includes(row.title))
      ?.sources.find((s) => s.includes('myanimelist'));

    if (!source) {
      continue;
    }

    row.malId = Number(source.split('/').pop());
    log(`${row.title} (Id: ${row.id}), found malId: ${row.malId}`);
  }
}

async function findMangaMalIds(rows: SeriesStub[]) {
  for (const row of rows) {
    try {
      const response = await searchManga(row.title.trim());
      const source = response.find(
        (x) =>
          x.title === row.title ||
          x.alternative_titles.synonyms.includes(row.title) ||
          x.alternative_titles.en === row.title
      );

      if (!source) {
        continue;
      }

      row.malId = Number(source.id);
      log(`${row.title} (Id: ${row.id}), found malId: ${row.malId}`);
    } catch (e) {
      log(`Bad response from ${row.title}, will be ignored.`, e.message);
    }
  }
}

export default async function loadSeriesWithMissingId(type: SeriesType) {
  const queryString = sqlQuery.get(type);
  if (!queryString) {
    log(`No query defined for SeriesType: ${type}`);
    process.exit(0);
  }

  const db = await initDbInstance();
  const rows = await db.all<SeriesStub[]>(queryString);

  log(`Found ${rows.length} series without malId.`);

  if (type === SeriesType.anime) {
    await findAnimeMalIds(rows);
  } else if (type === SeriesType.manga) {
    await findMangaMalIds(rows);
  }

  // Only write out items that have found ids
  const withFoundIds = rows.filter((r) => r.malId !== null);

  log(`${withFoundIds.length} series malIds have been found.`);

  await writeFileAsync(
    pathFix(__dirname, '../output', `missingIds_${type}.json`),
    JSON.stringify(withFoundIds)
  );

  await db.close();
}
