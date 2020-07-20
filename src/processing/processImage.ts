import imgur from 'imgur';

import { reportError } from '@/utils/log';

imgur.setCredentials(process.env.IMGUR_USERNAME, process.env.IMGUR_PASSWORD);

async function uploadImage(image: string) {
  try {
    const response = await imgur.uploadUrl(image, process.env.IMGUR_ALBUM);

    return {
      success: true,
      url: response.data.link
    };
  } catch (e) {
    if (e.message.code === 429) {
      reportError(`Imgur rate limit hit!!`, e.message.message);
      process.exit(0);
    }

    return { success: false, error: e.message };
  }
}

export default async function processImage(image: string | undefined | null) {
  if (!image || image.includes('imgur')) {
    return image ?? '';
  }

  const response = await uploadImage(image);

  if (response.success) {
    return response.url;
  } else {
    reportError(`Bad imgur upload of: ${image}`, response.error);
    return '';
  }
}
