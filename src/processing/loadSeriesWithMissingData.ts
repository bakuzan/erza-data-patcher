import { pathFix, writeFileAsync, readIn, confirmation } from 'medea';

import { SeriesType } from '@/enums/SeriesType';
import { SeriesWithMissingData } from '@/interfaces/SeriesWithMissingData';
import { log } from '@/utils/log';
import { initDbInstance } from '@/utils/db';
import getOfflineDb from '@/utils/getOfflineDb';
import { findMangaById } from '@/utils/malApi';
import { capitalise } from '@/utils/captialise';
import { parseSeriesWithMissingDataJson } from '@/utils/jsonParse';

const sqlQuery = new Map([
  [
    SeriesType.anime,
    `SELECT id, title, malId, image, series_type FROM animes 
     WHERE malId IS NOT NULL AND (series_type = 'Unknown' OR image = '' OR image NOT LIKE '%imgur%')`
  ],
  [
    SeriesType.manga,
    `SELECT id, title, malId, image, series_type FROM mangas 
     WHERE malId IS NOT NULL AND (series_type = 'Unknown' OR image = '' OR image NOT LIKE '%imgur%')`
  ]
]);

async function findAnimeMissingData(rows: SeriesWithMissingData[]) {
  const offItems = await getOfflineDb();
  const withNewData: SeriesWithMissingData[] = [];

  for (const row of rows) {
    const entry = offItems.find((x) =>
      x.sources.some(
        (s) =>
          s.includes('myanimelist') &&
          row.malId !== null &&
          Number(s.split('/').pop()) === row.malId
      )
    );

    if (!entry) {
      continue;
    }

    const isDifferentType = entry.type !== row.series_type;
    const isNotImgurImage = !row.image || !row.image.includes('imgur');
    const needsUpdating = isDifferentType || isNotImgurImage;

    if (needsUpdating) {
      withNewData.push({
        ...row,
        series_type: entry.type,
        image: isNotImgurImage ? entry.picture : row.image
      });
    }
  }

  return withNewData;
}

async function findMangaMissingData(rows: SeriesWithMissingData[]) {
  let withNewData: SeriesWithMissingData[] = [];

  const filename = pathFix(__dirname, '../output', `missingData_manga.json`);
  const result = await readIn(filename);

  if (result.success) {
    const shouldUseExisting = await confirmation(
      'Found existing missing data file. Should this be reused?'
    );

    if (shouldUseExisting) {
      const data = (result.data ?? '[]') as string;
      withNewData = parseSeriesWithMissingDataJson(data);
      return withNewData;
    } else {
      log(`Sourcing new data, overwriting existing file...`);
    }
  } else {
    log(`No existing missing data file, sourcing new data...`);
  }

  for (const row of rows) {
    if (row.malId === null) {
      log(`${row.title} is missing malId. Cannot check for missing data.`);
      continue;
    }

    const entry = await findMangaById(row.malId);
    if (entry === null) {
      continue;
    }

    const seriesType =
      entry.media_type.length <= 3
        ? entry.media_type.toUpperCase()
        : capitalise(entry.media_type.replace(/-|_/g, ''));

    const isDifferentType = seriesType !== row.series_type;
    const isNotImgurImage = !row.image || !row.image.includes('imgur');
    const needsUpdating = isDifferentType || isNotImgurImage;

    if (needsUpdating) {
      const resolvedImage = isNotImgurImage
        ? entry.main_picture.medium ?? ''
        : row.image;

      withNewData.push({
        ...row,
        series_type: seriesType,
        image: resolvedImage
      });
    }
  }

  return withNewData;
}

export default async function loadSeriesWithMissingData(type: SeriesType) {
  const queryString = sqlQuery.get(type);
  if (!queryString) {
    log(`No query defined for SeriesType: ${type}`);
    process.exit(0);
  }

  const db = await initDbInstance();
  const rows = await db.all<SeriesWithMissingData[]>(queryString);
  let withNewData: SeriesWithMissingData[] = [];

  log(`Found ${rows.length} series with missing data.`);

  if (type === SeriesType.anime) {
    withNewData = await findAnimeMissingData(rows);
  } else if (type === SeriesType.manga) {
    withNewData = await findMangaMissingData(rows);
  }

  log(`${withNewData.length} series with new data have been found.`);

  await writeFileAsync(
    pathFix(__dirname, '../output', `missingData_${type}.json`),
    JSON.stringify(withNewData)
  );

  await db.close();
}
