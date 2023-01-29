import { pathFix, readIn, typedKeys, prop } from 'medea';

import { SeriesType } from '@/enums/SeriesType';
import { reportError, log } from '@/utils/log';
import { initDbInstance } from '@/utils/db';
import { parseSeriesWithRelationsStubJson } from '@/utils/jsonParse';
import { SeriesRelation } from '@/interfaces/SeriesStub';

const oppositeInsertQueryString = `INSERT INTO AnimeMangaRelation (createdAt, updatedAt, animeId, mangaId)
VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $animeId, $mangaId)`;

const sqlQuery = new Map([
  [
    SeriesType.anime,
    `INSERT INTO AnimeAnimeRelation (createdAt, updatedAt, animeId1, animeId2)
    VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $animeId1, $animeId2)`
  ],
  [
    SeriesType.manga,
    `INSERT INTO MangaMangaRelation (createdAt, updatedAt, mangaId1, mangaId2)
    VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $mangaId1, $mangaId2)`
  ]
]);

export default async function updateRelations(
  type: SeriesType,
  isRealRun: boolean
) {
  const insertQueryString = sqlQuery.get(type);
  if (!insertQueryString) {
    log(`No query defined for SeriesType: ${type}`);
    process.exit(0);
  }

  const dbFilename = pathFix(
    __dirname,
    `../output/missingRelations_${type}.json`
  );
  const result = await readIn(dbFilename);

  if (!result.success) {
    reportError(result.error);
    process.exit(1);
  }

  const db = await initDbInstance();
  const data = (result.data ?? '[]') as string;
  const items = parseSeriesWithRelationsStubJson(data);
  const relations = items
    .reduce((p, c) => [...p, ...(c.relations ?? [])], [] as SeriesRelation[])
    .filter(
      (x, i, a) =>
        a.findIndex(
          (y) =>
            x.type === y.type &&
            x.rowId === y.rowId &&
            x.otherType === y.otherType &&
            x.otherId === y.otherId
        ) === i
    );

  for (const item of relations) {
    const isMatchingType = item.type === item.otherType;
    const query = isMatchingType
      ? insertQueryString
      : oppositeInsertQueryString;

    const replacements =
      item.type === SeriesType.anime && isMatchingType
        ? { $animeId1: item.rowId, $animeId2: item.otherId }
        : item.type === SeriesType.manga && isMatchingType
        ? { $mangaId1: item.rowId, $mangaId2: item.otherId }
        : item.type === SeriesType.anime && !isMatchingType
        ? { $animeId: item.rowId, $mangaId: item.otherId }
        : { $mangaId: item.rowId, $animeId: item.otherId };

    if (isRealRun) {
      await db.run(query, replacements);

      log(
        `Inserted new relation`,
        `\r\n${item.type}(Id: ${item.rowId}) to ${item.otherType}(Id: ${item.otherId})`,
        `\r\n`
      );
    } else {
      const dryRunMessage = typedKeys(replacements).reduce(
        (p, k) => p.replace(k, `${prop(replacements, k)}`),
        query
      );

      log(`\r\nPotential Insert ${item.rowId}`, `\r\n${dryRunMessage}`);
    }
  }

  log(
    `${items.length} relations processed.`,
    isRealRun
      ? ''
      : '\r\nTo Persist changes to the database pass --save when running the command.'
  );

  await db.close();
}
