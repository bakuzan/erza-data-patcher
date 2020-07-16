import { pathFix, readIn } from 'medea';

import { reportError } from '@/utils/log';
import { parseOfflineDataJson } from '@/utils/jsonParse';

export default async function getOfflineDb() {
  const dbFilename = pathFix(__dirname, '../cache/offline-database.json');
  const result = await readIn(dbFilename);

  if (!result.success) {
    reportError(result.error);
    process.exit(1);
  }

  const { data: offItems } = parseOfflineDataJson(result.data);

  return offItems;
}
