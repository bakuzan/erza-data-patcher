import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

import { log } from './log';

sqlite3.verbose();

export function initDbInstance() {
  const filename = process.env.DATABASE_PATH;

  if (!filename) {
    log('DATABASE_PATH not defined.');
    process.exit(0);
  }

  return open({
    filename,
    driver: sqlite3.Database
  });
}
