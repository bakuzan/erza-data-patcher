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
