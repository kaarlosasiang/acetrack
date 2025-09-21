// News-related types for DOrSU news scraping functionality

export interface DorsuNewsItem {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  date: string;
  author: string;
  readMoreUrl: string;
  scrapedAt: string;
}

export interface DorsuNewsResponse {
  success: boolean;
  data: DorsuNewsItem[];
  error?: string;
  lastUpdated: string;
  cached?: boolean;
  stale?: boolean;
  cacheAge?: number;
  fetchError?: string;
  apiError?: string;
  message?: string;
}

export interface NewsDisplayProps {
  newsItems: DorsuNewsItem[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
}

export interface NewsCardProps {
  newsItem: DorsuNewsItem;
  onReadMore?: (item: DorsuNewsItem) => void;
}