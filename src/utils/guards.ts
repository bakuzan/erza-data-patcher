import { SeriesStub } from '@/interfaces/SeriesStub';

export function isSeriesStub(o: any): o is SeriesStub {
  return 'id' in o && 'title' in o;
}
