import { pathFix, writeFileAsync, readCachedFile } from 'medea';

import { SeriesType } from '@/enums/SeriesType';
import { SeriesWithMissingData } from '@/interfaces/SeriesWithMissingData';
import { log } from '@/utils/log';
import { initDbInstance } from '@/utils/db';
import getOfflineDb from '@/utils/getOfflineDb';

const sqlQuery = new Map([
  [
    SeriesType.anime,
    `SELECT id, title, malId, image, series_type FROM animes 
     WHERE series_type = 'Unknown' OR image = '' OR image NOT LIKE '%imgur%'`
  ],
  [
    SeriesType.manga,
    `SELECT id, title, malId, image, series_type FROM mangas 
     WHERE series_type = 'Unknown' OR image = '' OR image NOT LIKE '%imgur%'`
  ]
]);

async function findAnimeMissingData(rows: SeriesWithMissingData[]) {
  const offItems = await getOfflineDb();
  const withNewData: SeriesWithMissingData[] = [];

  for (const row of rows) {
    const entry = offItems.find((x) =>
      x.sources.some(
        (s) =>
          s.includes('myanimelist') && Number(s.split('/').pop()) === row.malId
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
  const withNewData: SeriesWithMissingData[] = [];

  for (const row of rows) {
    if (row.malId === null) {
      log(`${row.title} is missing malId. Cannot check for missing data.`);
      continue;
    }

    const $page = await readCachedFile(
      `manga_${row.malId}`,
      `https://myanimelist.net/manga/${row.malId}/`,
      {
        cacheDirectory: pathFix(__dirname, '../cache'),
        cacheStaleTime: null
      }
    );

    const image = $page('#content img.lazyloaded[itemprop]')?.attr('href');

    const typeTag = Array.from($page('span.dark_text')).find(
      (x) => $page(x).text() === 'Type:'
    )?.nextSibling;

    const seriesType = typeTag
      ? $page(typeTag)?.text().trim() ?? 'Unknown'
      : 'Unknown';

    const isDifferentType = seriesType !== row.series_type;
    const isNotImgurImage = !row.image || !row.image.includes('imgur');
    const needsUpdating = isDifferentType || isNotImgurImage;

    if (needsUpdating) {
      const resolvedImage = isNotImgurImage ? image ?? '' : row.image;

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
