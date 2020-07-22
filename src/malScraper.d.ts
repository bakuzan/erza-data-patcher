declare module 'mal-scraper' {
  interface SearchOptions {
    maxResults?: number;
    term?: string;
  }

  interface SearchResponse {
    title: string;
    url: string;
  }

  class MalScraper {
    search(
      type: 'anime' | 'manga',
      options: SearchOptions
    ): Promise<SearchResponse[]>;
  }

  const scrape: { search: MalScraper };

  export = scrape;
}
