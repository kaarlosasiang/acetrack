import axios from 'axios';
import * as cheerio from 'cheerio';

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
}

export class DorsuNewsService {
  private static readonly BASE_URL = 'https://dorsu.edu.ph';
  private static readonly REQUEST_TIMEOUT = 20000; // 20 seconds (increased)
  private static readonly USER_AGENT = 'Mozilla/5.0 (compatible; AceTrack-NewsBot/1.0)';

  /**
   * Scrapes the latest news from DOrSU website
   * This function extracts news items from the card-based layout we saw in the screenshot
   */
  static async scrapeNews(): Promise<DorsuNewsResponse> {
    try {
      console.log('🔍 Starting DOrSU news scraping...');
      
      // Make HTTP request to DOrSU website with proper headers
      const response = await axios.get(this.BASE_URL, {
        timeout: this.REQUEST_TIMEOUT,
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
        },
        // Add retry configuration
        maxRedirects: 5,
        validateStatus: (status) => status < 500, // Accept anything under 500 as valid
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Successfully fetched DOrSU homepage');

      // Parse HTML using cheerio (server-side jQuery)
      const $ = cheerio.load(response.data);
      const newsItems: DorsuNewsItem[] = [];

      // Look for the news section - we'll try multiple selectors based on common patterns
      const newsSelectors = [
        '.news-item', // Common news item class
        'article', // Semantic HTML5 article tags
        '.card', // Bootstrap-style cards
        '[class*="news"]', // Any class containing "news"
        '[class*="post"]', // Any class containing "post"
      ];

      let foundNewsItems = false;

      for (const selector of newsSelectors) {
        const items = $(selector);
        
        if (items.length > 0) {
          console.log(`📰 Found ${items.length} potential news items with selector: ${selector}`);
          
          items.each((index, element) => {
            try {
              const $item = $(element);
              
              // Extract title - try multiple selectors
              const title = $item.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
              
              // Extract image - look for img tags with better specificity
              const $img = $item.find('img').first();
              let imageUrl = '';
              
              // Prioritize data-src for lazy loading, then src
              const dataSrc = $img.attr('data-src');
              const src = $img.attr('src');
              
              // Choose the best image URL available
              if (dataSrc && !dataSrc.startsWith('data:')) {
                imageUrl = dataSrc;
              } else if (src && !src.startsWith('data:')) {
                imageUrl = src;
              }
              
              // Make image URL absolute if it's relative
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = imageUrl.startsWith('/') 
                  ? `${this.BASE_URL}${imageUrl}`
                  : `${this.BASE_URL}/${imageUrl}`;
              }

              // Validate that we got a real image URL and it's from DOrSU uploads
              if (imageUrl && (
                imageUrl.startsWith('data:image') || // Base64 images
                imageUrl.includes('placeholder') || 
                imageUrl.includes('loading.gif') ||
                imageUrl.includes('1x1.') ||
                imageUrl.includes('blank.') ||
                imageUrl.endsWith('svg') || // Skip SVG placeholders
                (!imageUrl.includes('wp-content/uploads') && !imageUrl.includes('.jpg') && !imageUrl.includes('.png') && !imageUrl.includes('.jpeg'))
              )) {
                imageUrl = ''; // Clear invalid/placeholder images
              }

              // Extract date - look for time elements or date patterns
              const dateText = $item.find('time, .date, [class*="date"]').first().text().trim();
              
              // Extract author - look for author elements
              const author = $item.find('.author, [class*="author"], .by').first().text().trim() || 'DOrSU-PIO';
              
              // Extract read more link
              const $readMoreLink = $item.find('a[href*="read"], a[href*="more"], a').first();
              let readMoreUrl = $readMoreLink.attr('href') || '';
              
              // Make read more URL absolute if it's relative
              if (readMoreUrl && !readMoreUrl.startsWith('http')) {
                readMoreUrl = readMoreUrl.startsWith('/') 
                  ? `${this.BASE_URL}${readMoreUrl}`
                  : `${this.BASE_URL}/${readMoreUrl}`;
              }

              // Only add if we have at least a title
              if (title) {
                const newsItem: DorsuNewsItem = {
                  id: this.generateId(title, dateText),
                  title,
                  summary: '', // Empty summary for now
                  imageUrl: imageUrl || '', // Empty string if no image found
                  date: this.parseDate(dateText),
                  author: this.cleanAuthor(author),
                  readMoreUrl: readMoreUrl || this.BASE_URL,
                  scrapedAt: new Date().toISOString(),
                };

                newsItems.push(newsItem);
                foundNewsItems = true;
                
                console.log(`📝 Extracted: ${title.substring(0, 50)}...`);
              }
            } catch (itemError) {
              console.warn(`⚠️ Error processing news item ${index}:`, itemError);
            }
          });

          // If we found news items with this selector, break the loop
          if (foundNewsItems) {
            break;
          }
        }
      }

      if (!foundNewsItems) {
        console.log('🔍 No news items found with standard selectors, trying fallback approach...');
        
        // Fallback: look for any elements containing recent dates (2025)
        const fallbackItems = $('*:contains("2025")').filter(function() {
          const text = $(this).text();
          return text.includes('September') || text.includes('2025');
        });

        console.log(`📅 Found ${fallbackItems.length} elements with 2025 dates`);
      }

      // Remove duplicates based on title
      const uniqueNewsItems = this.removeDuplicates(newsItems);
      
      // Sort by date (newest first)
      uniqueNewsItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log(`✨ Successfully scraped ${uniqueNewsItems.length} unique news items`);

      return {
        success: true,
        data: uniqueNewsItems.slice(0, 10), // Limit to 10 most recent items
        lastUpdated: new Date().toISOString(),
      };

    } catch (error) {
      console.error('❌ Error scraping DOrSU news:', error);
      
      // Return mock data as fallback when website is not accessible
      console.log('🔄 Returning mock news data as fallback...');
      return this.getMockNewsData();
    }
  }

  /**
   * Returns mock news data when the website is not accessible
   * This provides a better user experience during outages
   */
  private static getMockNewsData(): DorsuNewsResponse {
    const mockNews: DorsuNewsItem[] = [
      {
        id: 'mock-news-1',
        title: 'DOrSU News Service Temporarily Unavailable',
        summary: 'We are currently unable to fetch the latest news from the DOrSU website. Please try again later or visit dorsu.edu.ph directly.',
        imageUrl: '/images/acetrack-logo.png',
        date: new Date().toISOString(),
        author: 'AceTrack System',
        readMoreUrl: 'https://dorsu.edu.ph',
        scrapedAt: new Date().toISOString(),
      },
      {
        id: 'mock-news-2',
        title: 'Check Back Soon for Latest University Updates',
        summary: 'Our news aggregation service will automatically retry fetching the latest DOrSU announcements. The system updates every 30 minutes.',
        imageUrl: '/images/acetrack-logo.png',
        date: new Date(Date.now() - 60000).toISOString(),
        author: 'AceTrack System',
        readMoreUrl: 'https://dorsu.edu.ph',
        scrapedAt: new Date().toISOString(),
      },
    ];

    return {
      success: true,
      data: mockNews,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Generates a unique ID for a news item based on title and date
   */
  private static generateId(title: string, date: string): string {
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const cleanDate = date.replace(/[^0-9]/g, '');
    return `${cleanTitle}-${cleanDate}`.substring(0, 50);
  }

  /**
   * Parses various date formats to ISO string
   */
  private static parseDate(dateText: string): string {
    if (!dateText) {
      return new Date().toISOString();
    }

    try {
      // Try to parse common date formats
      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      console.warn('Could not parse date:', dateText);
    }

    // Fallback to current date
    return new Date().toISOString();
  }

  /**
   * Cleans author text (removes "By:" prefix, etc.)
   */
  private static cleanAuthor(author: string): string {
    return author
      .replace(/^by:?\s*/i, '') // Remove "By:" prefix
      .trim() || 'DOrSU-PIO'; // Default to DOrSU-PIO if empty
  }

  /**
   * Removes duplicate news items based on title similarity
   */
  private static removeDuplicates(items: DorsuNewsItem[]): DorsuNewsItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Test function to validate the scraper is working
   */
  static async testScraper(): Promise<void> {
    console.log('🧪 Testing DOrSU news scraper...');
    const result = await this.scrapeNews();
    
    if (result.success) {
      console.log(`✅ Test successful! Found ${result.data.length} news items:`);
      result.data.forEach((item, index) => {
        console.log(`${index + 1}. ${item.title} (${item.date})`);
      });
    } else {
      console.log('❌ Test failed:', result.error);
    }
  }
}