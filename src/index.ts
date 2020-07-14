import dotenv from 'dotenv';

import { createClient } from 'medea';

dotenv.config();

function start() {
  const windowColumns = process.stdout.columns || 80;

  const cli = createClient('Data Patcher', { windowColumns })
    .parse(process.argv)
    .welcome();

  const missing = cli.missingRequiredOptions();

  if (!cli.any() || missing.length) {
    cli.helpText();

    if (missing.length) {
      console.log('* Missing required arguments:\r\n');
      missing.forEach((o) => cli.log(o.option));
    }

    process.exit(0);
  }

  // LOGIC HERE

  process.exit(0);
}

start();
