import dotenv from 'dotenv';
import { log } from './utils/log';

const result = dotenv.config();

if (result.error) {
  log(`Failed to load config: `, result.error);
  process.exit(0);
}

log(`Environment Config:\r\n`, result.parsed);
