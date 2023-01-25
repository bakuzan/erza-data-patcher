import { OfflineData } from '@/interfaces/OfflineData';
import { SeriesStub, SeriesWithRelationsStub } from '@/interfaces/SeriesStub';

import {
  isSeriesStub,
  isSeriesWithMissingData,
  isSeriesWithRelationsStub
} from './guards';
import { SeriesWithMissingData } from '@/interfaces/SeriesWithMissingData';
import { Tokens } from '@/interfaces/Tokens';

const safeJsonParse =
  <T>(guard: (o: any) => o is T) =>
  (text: string): T => {
    const parsed = JSON.parse(text);

    if (guard(parsed)) {
      return parsed;
    }

    throw new Error(`Unexpected json parsed`);
  };

export const parseSeriesStubJson = safeJsonParse<SeriesStub[]>(
  (j): j is SeriesStub[] => j instanceof Array && j.every(isSeriesStub)
);

export const parseSeriesWithMissingDataJson = safeJsonParse<
  SeriesWithMissingData[]
>(
  (j): j is SeriesWithMissingData[] =>
    j instanceof Array && j.every(isSeriesWithMissingData)
);

export const parseSeriesWithRelationsStubJson = safeJsonParse<
  SeriesWithRelationsStub[]
>(
  (j): j is SeriesWithRelationsStub[] =>
    j instanceof Array && j.every(isSeriesWithRelationsStub)
);

type OfflineDataJson = { data: OfflineData[] };

export const parseOfflineDataJson = safeJsonParse<OfflineDataJson>(
  (j): j is OfflineDataJson => {
    const key = 'data';
    return key in j && j[key] instanceof Array;
  }
);

export const parseTokens = safeJsonParse<Tokens>(
  (j): j is Tokens => 'access_token' in j
);
