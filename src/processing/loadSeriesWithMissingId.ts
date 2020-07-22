import { search as malScraper } from 'mal-scraper';
import { pathFix, writeFileAsync } from 'medea';

import { SeriesType } from '@/enums/SeriesType';
import { SeriesStub } from '@/interfaces/SeriesStub';
import { log } from '@/utils/log';
import { initDbInstance } from '@/utils/db';
import getOfflineDb from '@/utils/getOfflineDb';

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
      const response = await malScraper.search('manga', {
        maxResults: 1,
        term: row.title.trim()
      });

      const source = response.pop();

      if (!source || source.title !== row.title) {
        continue;
      }

      row.malId = Number(source.url.split('/').pop());
      log(`${row.title} (Id: ${row.id}), found malId: ${row.malId}`);
    } catch (e) {
      log(`Bad response from ${row.title}, will be ignored.`);
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
    await findMangaMalIds(rows); // TODO find out why this doesnt find any malIds
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
