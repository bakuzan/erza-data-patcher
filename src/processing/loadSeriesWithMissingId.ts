import path from 'path';
import { writeFileAsync } from 'medea';

import { SeriesType } from '@/enums/SeriesType';
import { SeriesStub } from '@/interfaces/SeriesStub';
import { log } from '@/utils/log';
import { initDbInstance } from '@/utils/db';

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

  const db = await initDbInstance();
  const rows = await db.all<SeriesStub[]>(queryString);

  // TODO
  // search offline db to get ids
  // do dry ! will do proper run else where

  await writeFileAsync(
    path.resolve(__dirname, '../output', `missingIds_${type}.json`),
    JSON.stringify(rows)
  );
}
