import { ImgurClient } from 'imgur';

import { ImgurErrorResponse } from '@/interfaces/ImgurErrorResponse';

import { log, reportError } from '@/utils/log';
import formatDate from '@/utils/formatDate';

const imgur = new ImgurClient({
  clientId: process.env.IMGUR_CLIENT_SECRET
});

// imgur.setCredentials(process.env.IMGUR_USERNAME, process.env.IMGUR_PASSWORD);

if (!process.env.IMGUR_CLIENT_SECRET) {
  log('No imgur client secret set.');
}

async function uploadImage(image: string, onExit: () => Promise<void>) {
  try {
    log(`Uploading ${image}`);
    const response = await imgur.upload({
      album: process.env.IMGUR_ALBUM,
      type: 'url',
      image
    });

    return {
      success: true,
      url: response.data.link
    };
  } catch (error: unknown) {
    const e = error as ImgurErrorResponse;

    if (e.message.code === 429) {
      reportError(`Imgur rate limit hit!!`, e.message.message);

      const d = new Date();
      d.setHours(d.getHours() + 1);
      log(`Next upload @ ${formatDate(d)}`);

      await onExit();
      process.exit(0);
    }

    return { success: false, error: e.message };
  }
}

export default async function processImage(
  image: string | undefined | null,
  onExit: () => Promise<void>
) {
  if (!image || image.includes('imgur')) {
    return image ?? '';
  }

  const response = await uploadImage(image, onExit);

  if (response.success) {
    return response.url;
  } else {
    reportError(`Bad imgur upload of: ${image}`, response.error);
    process.exit(0);
  }
}
