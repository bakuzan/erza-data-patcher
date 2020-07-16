import { pathFix, writeFileAsync } from 'medea';

import { SeriesType } from '@/enums/SeriesType';
import { log } from '@/utils/log';
import { initDbInstance } from '@/utils/db';
import getOfflineDb from '@/utils/getOfflineDb';
import { SeriesWithMissingData } from '@/interfaces/SeriesWithMissingData';

// TODO
// WHERE part of query
const sqlQuery = new Map([
  [
    SeriesType.anime,
    `SELECT id, title, malId, image, series_type FROM animes WHERE `
  ],
  [
    SeriesType.manga,
    `SELECT id, title, malId, image, series_type FROM mangas WHERE `
  ]
]);

// async function uploadImage() {
//   // TODO
//   // imgur upload...if not an imgur image...
// }

async function findAnimeMissingData(rows: SeriesWithMissingData[]) {
  const offItems = await getOfflineDb();
  const withNewData: SeriesWithMissingData[] = [];

  log(`Found ${rows.length} series with missing data.`);

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

    withNewData.push({
      ...row,
      series_type: entry.type,
      image: entry.picture
    });
  }

  return withNewData;
}

async function findMangaMissingData(rows: SeriesWithMissingData[]) {
  return []; // TODO, scrape!
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
