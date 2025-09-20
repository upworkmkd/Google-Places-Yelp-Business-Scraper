import { BusinessData, DeduplicationMatch } from './types';
import Fuse from 'fuse.js';

export class ResultMerger {
  private businesses: BusinessData[] = [];
  private matches: DeduplicationMatch[] = [];

  constructor(businesses: BusinessData[]) {
    this.businesses = businesses;
  }

  async merge(): Promise<BusinessData[]> {
    console.log(`Starting deduplication process with ${this.businesses.length} businesses`);
    
    // Group businesses by source for easier processing
    const businessesBySource = this.groupBySource(this.businesses);
    
    // Find matches between different sources
    const matches = await this.findMatches(businessesBySource);
    
    // Merge matched businesses
    const mergedBusinesses = await this.mergeMatches(matches);
    
    // Add unmatched businesses
    const unmatchedBusinesses = this.getUnmatchedBusinesses(matches);
    
    const finalResults = [...mergedBusinesses, ...unmatchedBusinesses];
    
    console.log(`Deduplication complete: ${this.businesses.length} → ${finalResults.length} businesses`);
    
    return finalResults;
  }

  private groupBySource(businesses: BusinessData[]): { [key: string]: BusinessData[] } {
    return businesses.reduce((groups, business) => {
      const source = business.source;
      if (!groups[source]) {
        groups[source] = [];
      }
      groups[source].push(business);
      return groups;
    }, {} as { [key: string]: BusinessData[] });
  }

  private async findMatches(businessesBySource: { [key: string]: BusinessData[] }): Promise<DeduplicationMatch[]> {
    const matches: DeduplicationMatch[] = [];
    const sources = Object.keys(businessesBySource);
    
    // Compare each source with every other source
    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const source1 = sources[i];
        const source2 = sources[j];
        const businesses1 = businessesBySource[source1];
        const businesses2 = businessesBySource[source2];
        
        const sourceMatches = await this.findMatchesBetweenSources(businesses1, businesses2);
        matches.push(...sourceMatches);
      }
    }
    
    return matches;
  }

  private async findMatchesBetweenSources(businesses1: BusinessData[], businesses2: BusinessData[]): Promise<DeduplicationMatch[]> {
    const matches: DeduplicationMatch[] = [];
    
    for (const business1 of businesses1) {
      for (const business2 of businesses2) {
        const match = await this.calculateMatch(business1, business2);
        if (match && match.confidence > 0.7) {
          matches.push(match);
        }
      }
    }
    
    return matches;
  }

  private async calculateMatch(business1: BusinessData, business2: BusinessData): Promise<DeduplicationMatch | null> {
    let confidence = 0;
    let matchType: 'name_address' | 'name_phone' | 'website' | 'fuzzy' = 'fuzzy';
    
    // Exact name match
    if (this.normalizeText(business1.name) === this.normalizeText(business2.name)) {
      confidence += 0.4;
      matchType = 'name_address';
    }
    
    // Fuzzy name match
    if (confidence === 0) {
      const nameSimilarity = this.calculateTextSimilarity(business1.name, business2.name);
      if (nameSimilarity > 0.8) {
        confidence += nameSimilarity * 0.3;
        matchType = 'fuzzy';
      }
    }
    
    // Address match
    if (business1.address && business2.address) {
      const addressSimilarity = this.calculateTextSimilarity(business1.address, business2.address);
      if (addressSimilarity > 0.7) {
        confidence += addressSimilarity * 0.3;
        if (matchType === 'fuzzy') matchType = 'name_address';
      }
    }
    
    // Phone match
    if (business1.phone && business2.phone) {
      const phone1 = this.normalizePhone(business1.phone);
      const phone2 = this.normalizePhone(business2.phone);
      if (phone1 === phone2) {
        confidence += 0.3;
        matchType = 'name_phone';
      }
    }
    
    // Website match
    if (business1.website && business2.website) {
      const website1 = this.normalizeUrl(business1.website);
      const website2 = this.normalizeUrl(business2.website);
      if (website1 === website2) {
        confidence += 0.4;
        matchType = 'website';
      }
    }
    
    if (confidence > 0.7) {
      return {
        business1,
        business2,
        confidence,
        matchType
      };
    }
    
    return null;
  }

  private async mergeMatches(matches: DeduplicationMatch[]): Promise<BusinessData[]> {
    const mergedBusinesses: BusinessData[] = [];
    const processedBusinesses = new Set<string>();
    
    // Sort matches by confidence (highest first)
    matches.sort((a, b) => b.confidence - a.confidence);
    
    for (const match of matches) {
      // Skip if either business has already been processed
      if (processedBusinesses.has(match.business1.id) || processedBusinesses.has(match.business2.id)) {
        continue;
      }
      
      // Merge the two businesses
      const mergedBusiness = this.mergeTwoBusinesses(match.business1, match.business2);
      mergedBusinesses.push(mergedBusiness);
      
      // Mark both businesses as processed
      processedBusinesses.add(match.business1.id);
      processedBusinesses.add(match.business2.id);
    }
    
    return mergedBusinesses;
  }

  private mergeTwoBusinesses(business1: BusinessData, business2: BusinessData): BusinessData {
    // Use the business with higher confidence as the base
    const baseBusiness = business1.confidence >= business2.confidence ? business1 : business2;
    const otherBusiness = business1.confidence >= business2.confidence ? business2 : business1;
    
    // Merge data, preferring non-empty values
    const mergedBusiness: BusinessData = {
      ...baseBusiness,
      id: `merged_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: baseBusiness.name || otherBusiness.name,
      category: baseBusiness.category || otherBusiness.category,
      address: baseBusiness.address || otherBusiness.address,
      phone: baseBusiness.phone || otherBusiness.phone,
      website: baseBusiness.website || otherBusiness.website,
      email: baseBusiness.email || otherBusiness.email,
      openingHours: this.mergeOpeningHours(baseBusiness.openingHours, otherBusiness.openingHours),
      googleMaps: this.mergeGoogleMaps(baseBusiness.googleMaps, otherBusiness.googleMaps),
      yelp: this.mergeYelp(baseBusiness.yelp, otherBusiness.yelp),
      facebook: this.mergeFacebook(baseBusiness.facebook, otherBusiness.facebook),
      socialProfiles: this.mergeSocialProfiles(baseBusiness.socialProfiles, otherBusiness.socialProfiles),
      businessStatus: baseBusiness.businessStatus || otherBusiness.businessStatus,
      source: 'merged',
      lastUpdated: new Date().toISOString(),
      confidence: Math.max(baseBusiness.confidence, otherBusiness.confidence)
    };
    
    return mergedBusiness;
  }

  private getUnmatchedBusinesses(matches: DeduplicationMatch[]): BusinessData[] {
    const processedBusinesses = new Set<string>();
    
    // Collect all processed business IDs
    for (const match of matches) {
      processedBusinesses.add(match.business1.id);
      processedBusinesses.add(match.business2.id);
    }
    
    // Return businesses that weren't processed
    return this.businesses.filter(business => !processedBusinesses.has(business.id));
  }

  private mergeOpeningHours(hours1?: any, hours2?: any): any {
    if (!hours1 && !hours2) return undefined;
    if (!hours1) return hours2;
    if (!hours2) return hours1;
    
    const merged = { ...hours1 };
    Object.keys(hours2).forEach(day => {
      if (!merged[day] && hours2[day]) {
        merged[day] = hours2[day];
      }
    });
    
    return merged;
  }

  private mergeGoogleMaps(google1?: any, google2?: any): any {
    if (!google1 && !google2) return undefined;
    if (!google1) return google2;
    if (!google2) return google1;
    
    return {
      rating: google1.rating || google2.rating,
      reviewsCount: google1.reviewsCount || google2.reviewsCount,
      placeId: google1.placeId || google2.placeId
    };
  }

  private mergeYelp(yelp1?: any, yelp2?: any): any {
    if (!yelp1 && !yelp2) return undefined;
    if (!yelp1) return yelp2;
    if (!yelp2) return yelp1;
    
    return {
      rating: yelp1.rating || yelp2.rating,
      reviewsCount: yelp1.reviewsCount || yelp2.reviewsCount,
      yelpId: yelp1.yelpId || yelp2.yelpId
    };
  }

  private mergeFacebook(facebook1?: any, facebook2?: any): any {
    if (!facebook1 && !facebook2) return undefined;
    if (!facebook1) return facebook2;
    if (!facebook2) return facebook1;
    
    return {
      pageUrl: facebook1.pageUrl || facebook2.pageUrl,
      pageId: facebook1.pageId || facebook2.pageId,
      verified: facebook1.verified || facebook2.verified
    };
  }

  private mergeSocialProfiles(profiles1?: any, profiles2?: any): any {
    if (!profiles1 && !profiles2) return undefined;
    if (!profiles1) return profiles2;
    if (!profiles2) return profiles1;
    
    return {
      instagram: profiles1.instagram || profiles2.instagram,
      twitter: profiles1.twitter || profiles2.twitter,
      linkedin: profiles1.linkedin || profiles2.linkedin
    };
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const normalized1 = this.normalizeText(text1);
    const normalized2 = this.normalizeText(text2);
    
    if (normalized1 === normalized2) return 1;
    
    // Use Fuse.js for fuzzy matching
    const fuse = new Fuse([normalized1], {
      threshold: 0.3,
      includeScore: true
    });
    
    const result = fuse.search(normalized2);
    return result.length > 0 ? 1 - (result[0].score || 0) : 0;
  }
}
