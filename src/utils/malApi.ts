import API from '@chris-kode/myanimelist-api-v2';

import { readIn, pathFix, writeFileAsync } from 'medea';
import { reportError, log } from './log';
import { parseTokens } from './jsonParse';
import { Tokens } from '@/interfaces/Tokens';

const defaultFields = [
  'id',
  'title',
  'main_picture',
  'alternative_titles',
  'media_type',
  'source'
];

async function getTokens(): Promise<Tokens> {
  const tokens = await readIn(pathFix(__dirname, '../output/tokens.json'));

  if (!tokens.data || typeof tokens.data !== 'string') {
    reportError('Failed to read tokens.');
    process.exit(0);
  }

  return parseTokens(tokens.data);
}

async function refreshTokens(refreshToken: string) {
  const CLIENT_ID = process.env.MAL_CLIENT_ID;

  if (typeof CLIENT_ID !== 'string') {
    console.log('CLIENT_ID is not defined.');
    process.exit(0);
  }

  try {
    const oauth = new API.OAUTH(CLIENT_ID);
    const response = await oauth.refreshToken(refreshToken);

    await writeFileAsync(
      pathFix(__dirname, '../output/tokens.json'),
      JSON.stringify(response)
    );

    return await getTokens();
  } catch (e) {
    reportError(`Failed to refresh token`, e.message);
    process.exit(0);
  }
}

async function getMangaApi(
  tokens: Tokens,
  canRefresh = true
): Promise<typeof API.API_MANGA> {
  try {
    return new API.API_MANGA(tokens.access_token);
  } catch (e) {
    if (!canRefresh) {
      reportError(`Failed to getMangaApi.`, e.message);
      process.exit(0);
    }

    const data = await refreshTokens(tokens.refresh_token);
    return await getMangaApi(data, false);
  }
}

export async function searchManga(term: string) {
  const data = await getTokens();
  const manga = await getMangaApi(data);
  const items = await manga.mangas(term, 0, 10, defaultFields);
  return items.data.map((x) => x.node);
}

export async function findMangaById(malId: number) {
  const data = await getTokens();
  const manga = await getMangaApi(data);

  try {
    log(`Requesting MalId: ${malId}`);
    return await manga.manga(malId, defaultFields);
  } catch (e) {
    reportError(`Request failed for ${malId}`, e);
    return null;
  }
}
