/* eslint-disable */

declare module '@chris-kode/myanimelist-api-v2' {
  import { MalDbEntry } from '@/interfaces/MalDbEntry';

  interface MalNode {
    node: MalDbEntry;
  }

  interface AuthApi {
    new (clientId: string): AuthApi;
    urlAuthorize(challenge: string): string;
    accessToken(code: string, challenge: string): Promise<string>;
    refreshToken(refreshToken: string): Promise<string>;
  }
  interface AnimeApi {
    new (token: string): AnimeApi;

    /* By Id */
    anime(malId: number, fields?: string[]): Promise<MalDbEntry>;
  }

  interface MangaApi {
    new (token: string): MangaApi;
    /* Search */
    mangas(
      term: string,
      offset?: number,
      limit?: number,
      fields?: string[]
    ): Promise<{ data: MalNode[] }>;
    /* By Id */
    manga(malId: number, fields?: string[]): Promise<MalDbEntry>;
  }

  interface MalApi {
    OAUTH: AuthApi;
    API_MANGA: MangaApi;
    API_ANIME: AnimeApi;
  }

  const API: MalApi;

  export = API;
}
