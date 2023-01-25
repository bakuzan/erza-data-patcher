export interface SeriesStub {
  id: number;
  title: string;
  malId: number | null;
}

export interface SeriesRelation {
  type: 'anime' | 'manga';
  rowId: number;
  otherType: 'anime' | 'manga';
  otherId: number;
}

export interface SeriesWithRelationsStub extends SeriesStub {
  malId: number;
  relations?: SeriesRelation[];
}
