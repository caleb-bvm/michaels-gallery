export interface GPhoto {
  id: string;
  name: string;
  chapterId: string | null;
  w: number;
  h: number;
  size: number;
  sm: string;
  lg: string;
}

export interface GalleryData {
  name: string;
  eventType: string;
  eventDate: string | null;
  place: string;
  expiresAt: string;
  role: 'client' | 'guest';
  allowZip: boolean;
  chapters: { id: string; name: string }[];
  photos: GPhoto[];
  favourites: string[];
}
