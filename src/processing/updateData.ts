import { pathFix, readIn, typedKeys, prop, writeFileAsync } from 'medea';

import processImage from './processImage';

import { SeriesType } from '@/enums/SeriesType';
import { reportError, log } from '@/utils/log';
import { initDbInstance } from '@/utils/db';
import { parseSeriesWithMissingDataJson } from '@/utils/jsonParse';

const sqlQuery = new Map([
  [
    SeriesType.anime,
    `UPDATE animes SET image = $image, series_type = $series_type WHERE id = $id`
  ],
  [
    SeriesType.manga,
    `UPDATE mangas SET image = $image, series_type = $series_type WHERE id = $id`
  ]
]);

export default async function updateData(type: SeriesType, isRealRun: boolean) {
  const updateQueryString = sqlQuery.get(type);
  if (!updateQueryString) {
    log(`No query defined for SeriesType: ${type}`);
    process.exit(0);
  }

  const dbFilename = pathFix(__dirname, `../output/missingData_${type}.json`);
  const result = await readIn(dbFilename);

  if (!result.success) {
    reportError(result.error);
    process.exit(1);
  }

  const data = (result.data ?? '[]') as string;
  const items = parseSeriesWithMissingDataJson(data);
  const db = await initDbInstance();

  for (const item of items) {
    const replacements = {
      $id: item.id,
      $series_type: item.series_type,
      $image: item.image
    };

    if (isRealRun) {
      const $image = await processImage(
        item.image,
        async () => await db.close()
      );

      await db.run(updateQueryString, { ...replacements, $image });

      // Update the source file as process will stop when imgur rate limit hit (~50 items)
      const index = items.findIndex((x) => x.id === item.id);
      await writeFileAsync(dbFilename, JSON.stringify(items.slice(index + 1)));
      log(
        `Updated ${item.title} (Id: ${item.id}) (series_type: ${item.series_type}) (image: ${$image})`
      );
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
