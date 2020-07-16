import { SeriesStub } from './SeriesStub';

export interface SeriesWithMissingData extends SeriesStub {
  image?: string;
  series_type?: string;
}
