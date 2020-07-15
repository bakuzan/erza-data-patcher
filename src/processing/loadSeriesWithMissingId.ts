import { pathFix, readIn, writeFileAsync } from 'medea';

import { SeriesType } from '@/enums/SeriesType';
import { SeriesStub } from '@/interfaces/SeriesStub';
import { log, reportError } from '@/utils/log';
import { initDbInstance } from '@/utils/db';
import { parseOfflineDataJson } from '@/utils/jsonParse';

const sqlQuery = new Map([
  [SeriesType.anime, `SELECT id, title, malId FROM animes WHERE malId IS NULL`],
  [SeriesType.manga, `SELECT id, title, malId FROM mangas WHERE malId IS NULL`]
]);

export default async function loadSeriesWithMissingId(type: SeriesType) {
  if (type === SeriesType.manga) {
    log(
      'No offline database exists for manga.',
      'Will need to figure out a way to source the mal ids.'
    );

    process.exit(0);
  }

  const queryString = sqlQuery.get(type);
  if (!queryString) {
    log(`No query defined for SeriesType: ${type}`);
    process.exit(0);
  }

  const dbFilename = pathFix(__dirname, '../cache/offline-database.json');
  const result = await readIn(dbFilename);

  if (!result.success) {
    reportError(result.error);
    process.exit(1);
  }

  const db = await initDbInstance();
  const rows = await db.all<SeriesStub[]>(queryString);

  log(`Found ${rows.length} series without malId.`);

  const { data: offItems } = parseOfflineDataJson(result.data);

  for (const row of rows) {
    const source = offItems
      .find((x) => x.title === row.title || x.synonyms.includes(row.title))
      ?.sources.find((s) => s.includes('myanimelist'));

    if (!source) {
      continue;
    }

    row.malId = Number(source.split('/').pop());
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
