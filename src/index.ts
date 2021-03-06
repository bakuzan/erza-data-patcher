import './config';

import { createClient, validate } from 'medea';
import { Mode } from '@/enums/Mode';
import { SeriesType } from '@/enums/SeriesType';
import { log } from '@/utils/log';

import loadSeriesWithMissingId from './processing/loadSeriesWithMissingId';
import loadSeriesWithMissingData from './processing/loadSeriesWithMissingData';
import updateIds from './processing/updateIds';
import updateData from './processing/updateData';

const modeOptions = Object.keys(Mode).reduce((p, k, i, a) => {
  const sep = i + 1 === a.length ? ' or ' : ' ';
  return `${p},${sep}${k}`;
});

async function start() {
  const windowColumns = process.stdout.columns || 80;

  const cli = createClient('Data Patcher', { windowColumns })
    .addOption({
      option: 'mode',
      shortcut: 'm',
      description: `Process to run, required. Options: ${modeOptions}`,
      validate: (_: any, value: string) => value in Mode,
      required: true
    })
    .addOption({
      option: 'type',
      shortcut: 't',
      description: `Series type to use. Options: 'anime' or 'manga'`,
      validate: (_: any, value: string) => value in SeriesType,
      required: true
    })
    .addOption({
      option: 'save',
      description: `Persist changes to database. (Without this flag actions are dry-run.)`
    })
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

  await validate(
    async () => cli.validate('mode'),
    () => log(`Invalid mode supplied. Expected one of: ${modeOptions}`)
  );

  await validate(
    async () => cli.validate('type'),
    () => log(`Invalid type supplied. Expected: 'anime' or 'manga'.`)
  );

  switch (cli.get('mode')) {
    case Mode.missingId: {
      await loadSeriesWithMissingId(cli.get('type'));
      await updateIds(cli.get('type'), cli.has('save'));
      break;
    }

    case Mode.missingData: {
      await loadSeriesWithMissingData(cli.get('type'));
      await updateData(cli.get('type'), cli.has('save'));
      break;
    }

    default:
      log(`Mode case '${cli.get('mode')}' is not handled.`);
      break;
  }

  process.exit(0);
}

void start();
