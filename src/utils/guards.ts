import { SeriesStub } from '@/interfaces/SeriesStub';
import { SeriesWithMissingData } from '@/interfaces/SeriesWithMissingData';

export function isSeriesStub(o: any): o is SeriesStub {
  return 'id' in o && 'title' in o;
}

export function isSeriesWithMissingData(o: any): o is SeriesWithMissingData {
  return 'id' in o && 'malId' in o && 'series_type' in o && 'image' in o;
}
