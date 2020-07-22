/* eslint-disable */

declare module 'imgur' {
  interface ImgurResponse {
    data: { link: string };
  }

  class Imgur {
    setCredentials(username?: string, password?: string): void;
    uploadUrl(imageUrl: string, albumId?: string): Promise<ImgurResponse>;
  }

  const img: Imgur;

  export = img;
}

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

  interface MangaApi {
    new (token: string): MangaApi;
    mangas(
      term: string,
      offset?: number,
      limit?: number,
      fields?: string[]
    ): Promise<{ data: MalNode[] }>;
    manga(malId: number, fields?: string[]): Promise<MalDbEntry>;
  }

  interface MalApi {
    OAUTH: AuthApi;
    API_MANGA: MangaApi;
  }

  const API: MalApi;

  export = API;
}
