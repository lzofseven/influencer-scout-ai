export interface Influencer {
  name: string;
  handle: string;
  platform: string;
  followerCount: string;
  engagementRate: string;
  bioUrl: string;
  summary: string;
  topics: string[];
  location?: string;
  sourceUrl?: string; // Specific source found for this profile
  profilePicUrl?: string;
  views_count?: number;
  likes_count?: number;
  posts_count?: number;
  comments_count?: number;
  lastPostImageUrl?: string;
}

export interface SearchState {
  isLoading: boolean;
  results: Influencer[];
  error: string | null;
  groundingUrls: string[];
}

export enum SearchStatus {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}