import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';

import { pathFix, writeFileAsync } from 'medea';

import { SeriesType } from '@/enums/SeriesType';
import {
  SeriesWithRelationsStub,
  SeriesRelation,
  SeriesStub
} from '@/interfaces/SeriesStub';
import { log } from '@/utils/log';

import { initDbInstance } from '@/utils/db';
import { findAnimeById, findMangaById } from '@/utils/malApi';

const sqlQuery = new Map([
  [SeriesType.anime, `SELECT id, title, malId FROM animes`],
  [SeriesType.manga, `SELECT id, title, malId FROM mangas`]
]);

async function findAnimeMalRelations(
  db: Database<sqlite3.Database, sqlite3.Statement>,
  rows: SeriesWithRelationsStub[]
) {
  for (const row of rows) {
    try {
      const source = await findAnimeById(row.malId);

      if (!source) {
        continue;
      }

      const missingRelations: SeriesRelation[] = [];
      const seriesRelations = [
        ...source.related_anime.map((x) => ({
          type: 'anime',
          malId: x.node.id
        })),
        ...source.related_manga.map((x) => ({
          type: 'manga',
          malId: x.node.id
        }))
      ];

      const animeRelations = await db.all(
        `SELECT * 
         FROM AnimeAnimeRelation 
        WHERE animeId1 = ${row.id}`
      );
      const mangaRelations = await db.all(
        `SELECT * 
         FROM AnimeMangaRelation 
        WHERE animeId = ${row.id}`
      );

      for (const rel of seriesRelations) {
        let relInstance: SeriesStub | undefined;

        if (rel.type === SeriesType.anime) {
          relInstance = await db.get(
            `SELECT * FROM animes WHERE malId = ${rel.malId}`
          );

          if (!relInstance) {
            continue;
          }

          for (const ar of animeRelations) {
            if (ar.animeId1 === row.id && ar.animeId2 === relInstance.id) {
              continue;
            }
          }
        } else {
          relInstance = await db.get(
            `SELECT * FROM mangas WHERE malId = ${rel.malId}`
          );

          if (!relInstance) {
            continue;
          }

          for (const ar of mangaRelations) {
            if (ar.animeId === row.id && ar.mangaId === relInstance.id) {
              continue;
            }
          }
        }

        missingRelations.push({
          type: 'anime',
          rowId: row.id,
          otherType:
            rel.type === SeriesType.anime ? SeriesType.anime : SeriesType.manga,
          otherId: relInstance.id
        });
      }

      row.relations = missingRelations;
    } catch (e) {
      log(
        `Bad response from ${row.title}, will be ignored.`,
        (e as Error).message
      );
    }
  }
}

async function findMangaMalRelations(
  db: Database<sqlite3.Database, sqlite3.Statement>,
  rows: SeriesWithRelationsStub[]
) {
  for (const row of rows) {
    try {
      const source = await findMangaById(row.malId);

      if (!source) {
        continue;
      }

      const missingRelations: SeriesRelation[] = [];
      const seriesRelations = [
        ...source.related_anime.map((x) => ({
          type: 'anime',
          malId: x.node.id
        })),
        ...source.related_manga.map((x) => ({
          type: 'manga',
          malId: x.node.id
        }))
      ];

      const mangaRelations = await db.all(
        `SELECT * 
             FROM MangaMangaRelation 
            WHERE mangaId1 = ${row.id}`
      );
      const animeRelations = await db.all(
        `SELECT * 
             FROM AnimeMangaRelation 
            WHERE mangaId = ${row.id}`
      );

      for (const rel of seriesRelations) {
        let relInstance: SeriesStub | undefined;

        if (rel.type === SeriesType.anime) {
          relInstance = await db.get(
            `SELECT * FROM animes WHERE malId = ${rel.malId}`
          );

          if (!relInstance) {
            continue;
          }

          for (const ar of animeRelations) {
            if (ar.mangaId === row.id && ar.animeId === relInstance.id) {
              continue;
            }
          }
        } else {
          relInstance = await db.get(
            `SELECT * FROM mangas WHERE malId = ${rel.malId}`
          );

          if (!relInstance) {
            continue;
          }

          for (const ar of mangaRelations) {
            if (ar.mangaId1 === row.id && ar.mangaId2 === relInstance.id) {
              continue;
            }
          }
        }

        missingRelations.push({
          type: 'manga',
          rowId: row.id,
          otherType:
            rel.type === SeriesType.anime ? SeriesType.anime : SeriesType.manga,
          otherId: relInstance.id
        });
      }

      row.relations = missingRelations;
    } catch (e) {
      log(
        `Bad response from ${row.title}, will be ignored.`,
        (e as Error).message
      );
    }
  }
}

export default async function loadSeriesWithMissingRelations(type: SeriesType) {
  const queryString = sqlQuery.get(type);
  if (!queryString) {
    log(`No query defined for SeriesType: ${type}`);
    process.exit(0);
  }

  const db = await initDbInstance();
  const rows = await db.all<SeriesWithRelationsStub[]>(queryString);

  log(`Found ${rows.length} series.`);

  if (type === SeriesType.anime) {
    await findAnimeMalRelations(db, rows);
  } else if (type === SeriesType.manga) {
    await findMangaMalRelations(db, rows);
  }

  // Only write out items that have found relations
  const withFoundRelations = rows.filter(
    (r) => r.relations && r.relations.length > 0
  );

  log(
    `${withFoundRelations.length} series with missing relations have been found.`
  );

  await writeFileAsync(
    pathFix(__dirname, '../output', `missingRelations_${type}.json`),
    JSON.stringify(withFoundRelations)
  );

  await db.close();
}
