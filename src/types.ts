export interface BusinessData {
  id: string;
  name: string;
  category: string;
  address: string;
  phone?: string;
  website?: string;
  email?: string;
  openingHours?: OpeningHours;
  googleMaps?: {
    rating?: number;
    reviewsCount?: number;
    placeId?: string;
  };
  yelp?: {
    rating?: number;
    reviewsCount?: number;
    yelpId?: string;
  };
  facebook?: {
    pageUrl?: string;
    pageId?: string;
    verified?: boolean;
  };
  socialProfiles?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  businessStatus: 'open' | 'closed' | 'temporarily_closed';
  source: 'google' | 'yelp' | 'facebook' | 'merged';
  lastUpdated: string;
  confidence: number; // 0-1 score for data quality
}

export interface OpeningHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

export interface ScraperInput {
  keywords: string[];
  locations: string[];
  maxResultsPerSource: number;
  includeFacebook: boolean;
  includeYelp: boolean;
  includeGoogleMaps: boolean;
}

export interface ScraperResult {
  businesses: BusinessData[];
  totalFound: number;
  source: string;
  errors: string[];
}

export interface DeduplicationMatch {
  business1: BusinessData;
  business2: BusinessData;
  confidence: number;
  matchType: 'name_address' | 'name_phone' | 'website' | 'fuzzy';
}

export interface ActorInterface {
  getInput<T>(): Promise<T>;
  setValue(key: string, value: any): Promise<void>;
  pushData(data: any[]): Promise<void>;
  log: {
    info: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
  };
  sleep(ms: number): Promise<void>;
  launchPuppeteer(): Promise<any>;
}
