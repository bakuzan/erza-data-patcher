import imgur from 'imgur';

import { log, reportError } from '@/utils/log';

imgur.setCredentials(process.env.IMGUR_USERNAME, process.env.IMGUR_PASSWORD);

async function uploadImage(image: string, onExit: () => Promise<void>) {
  try {
    log(`Uploading ${image}`);
    const response = await imgur.uploadUrl(image, process.env.IMGUR_ALBUM);

    return {
      success: true,
      url: response.data.link
    };
  } catch (e) {
    if (e.message.code === 429) {
      reportError(`Imgur rate limit hit!!`, e.message.message);

      const d = new Date();
      d.setHours(d.getHours() + 1);
      log(`Next upload @ ${d.toISOString()}`);

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
    return '';
  }
}
