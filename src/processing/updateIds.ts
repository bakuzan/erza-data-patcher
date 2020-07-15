import { pathFix, readIn, typedKeys, prop } from 'medea';

import { SeriesType } from '@/enums/SeriesType';
import { reportError, log } from '@/utils/log';
import { initDbInstance } from '@/utils/db';
import { parseSeriesStubJson } from '@/utils/jsonParse';

const sqlQuery = new Map([
  [
    SeriesType.anime,
    `UPDATE animes SET malId = $malId WHERE malId IS NULL AND id = $id`
  ],
  [
    SeriesType.manga,
    `UPDATE mangas SET malId = $malId WHERE malId IS NULL AND id = $id`
  ]
]);

export default async function updateIds(type: SeriesType, isRealRun: boolean) {
  const updateQueryString = sqlQuery.get(type);
  if (!updateQueryString) {
    log(`No query defined for SeriesType: ${type}`);
    process.exit(0);
  }

  const dbFilename = pathFix(__dirname, '../output', `missingIds_${type}.json`);
  const result = await readIn(dbFilename);

  if (!result.success) {
    reportError(result.error);
    process.exit(1);
  }

  const data = (result.data ?? '[]') as string;
  const items = parseSeriesStubJson(data);
  const db = await initDbInstance();

  for (const item of items) {
    const replacements = {
      $malId: item.malId,
      $id: item.id
    };

    if (isRealRun) {
      await db.run(updateQueryString, replacements);
    } else {
      const dryRunMessage = typedKeys(replacements).reduce(
        (p, k) => p.replace(k, `${prop(replacements, k)}`),
        updateQueryString
      );

      log('Potential Update: ', dryRunMessage);
    }
  }

  log(
    `${items.length} updates processed.`,
    isRealRun
      ? ''
      : '\r\nTo Persist changes to the database pass --save when running the command.'
  );

  await db.close();
}
