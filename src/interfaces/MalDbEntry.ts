export interface MalDbEntry {
  id: number;
  title: string;
  main_picture: { medium: string; large: string };
  alternative_titles: { synonyms: string[]; en: string };
  media_type: string;
}
