import { createClient } from '@supabase/supabase-js';
import { Database, DorsuNews, DorsuNewsInsert } from '@/lib/types/Database';
import { DorsuNewsItem } from '@/lib/types/news';

/**
 * Service for managing DOrSU news in the database
 * Provides caching, deduplication, and efficient retrieval
 */
export class DorsuNewsDatabaseService {
  private static supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Save scraped news items to the database
   * Handles deduplication and updates existing items
   */
  static async saveNewsItems(newsItems: DorsuNewsItem[]): Promise<{
    success: boolean;
    inserted: number;
    updated: number;
    error?: string;
  }> {
    try {
      let inserted = 0;
      let updated = 0;

      for (const item of newsItems) {
        const newsData: DorsuNewsInsert = {
          news_id: item.id,
          title: item.title,
          summary: item.summary,
          image_url: item.imageUrl || null,
          date: item.date,
          author: item.author,
          read_more_url: item.readMoreUrl,
          scraped_at: item.scrapedAt,
          is_active: true,
        };

        // Check if news item already exists
        const { data: existing } = await this.supabase
          .from('dorsu_news')
          .select('id, title, summary')
          .eq('news_id', item.id)
          .single();

        if (existing) {
          // Update existing item
          const { error } = await this.supabase
            .from('dorsu_news')
            .update({
              title: newsData.title,
              summary: newsData.summary,
              image_url: newsData.image_url,
              author: newsData.author,
              read_more_url: newsData.read_more_url,
              scraped_at: newsData.scraped_at,
              is_active: true,
            })
            .eq('news_id', item.id);

          if (error) {
            console.error('Error updating news item:', error);
          } else {
            updated++;
          }
        } else {
          // Insert new item
          const { error } = await this.supabase
            .from('dorsu_news')
            .insert(newsData);

          if (error) {
            console.error('Error inserting news item:', error);
          } else {
            inserted++;
          }
        }
      }

      console.log(`📊 Database sync complete: ${inserted} inserted, ${updated} updated`);

      return {
        success: true,
        inserted,
        updated,
      };
    } catch (error) {
      console.error('❌ Error saving news to database:', error);
      return {
        success: false,
        inserted: 0,
        updated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Retrieve cached news from database
   * Much faster than scraping every time
   */
  static async getCachedNews(limit = 10): Promise<{
    success: boolean;
    data: DorsuNewsItem[];
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('dorsu_news')
        .select('*')
        .eq('is_active', true)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      // Convert database format to DorsuNewsItem format
      const newsItems: DorsuNewsItem[] = (data || []).map(item => ({
        id: item.news_id,
        title: item.title,
        summary: item.summary,
        imageUrl: item.image_url || '',
        date: item.date,
        author: item.author,
        readMoreUrl: item.read_more_url,
        scrapedAt: item.scraped_at,
      }));

      return {
        success: true,
        data: newsItems,
      };
    } catch (error) {
      console.error('❌ Error retrieving cached news:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the last time news was successfully scraped
   */
  static async getLastScrapedTime(): Promise<Date | null> {
    try {
      const { data, error } = await this.supabase
        .from('dorsu_news')
        .select('scraped_at')
        .order('scraped_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return new Date(data.scraped_at);
    } catch {
      return null;
    }
  }

  /**
   * Clean up old news items (older than specified days)
   */
  static async cleanupOldNews(daysToKeep = 30): Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data, error } = await this.supabase
        .from('dorsu_news')
        .delete()
        .lt('date', cutoffDate.toISOString())
        .select('id');

      if (error) {
        throw error;
      }

      const deletedCount = data?.length || 0;
      
      console.log(`🧹 Cleanup complete: Removed ${deletedCount} old news items`);

      return {
        success: true,
        deletedCount,
      };
    } catch (error) {
      console.error('❌ Error cleaning up old news:', error);
      return {
        success: false,
        deletedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get news statistics for monitoring
   */
  static async getNewsStats(): Promise<{
    total: number;
    active: number;
    lastScraped: string | null;
    oldestNews: string | null;
    newestNews: string | null;
  }> {
    try {
      const [totalResult, activeResult, lastScrapedResult, oldestResult, newestResult] = await Promise.all([
        this.supabase.from('dorsu_news').select('id', { count: 'exact', head: true }),
        this.supabase.from('dorsu_news').select('id', { count: 'exact', head: true }).eq('is_active', true),
        this.supabase.from('dorsu_news').select('scraped_at').order('scraped_at', { ascending: false }).limit(1).single(),
        this.supabase.from('dorsu_news').select('date').order('date', { ascending: true }).limit(1).single(),
        this.supabase.from('dorsu_news').select('date').order('date', { ascending: false }).limit(1).single(),
      ]);

      return {
        total: totalResult.count || 0,
        active: activeResult.count || 0,
        lastScraped: lastScrapedResult.data?.scraped_at || null,
        oldestNews: oldestResult.data?.date || null,
        newestNews: newestResult.data?.date || null,
      };
    } catch (error) {
      console.error('❌ Error getting news stats:', error);
      return {
        total: 0,
        active: 0,
        lastScraped: null,
        oldestNews: null,
        newestNews: null,
      };
    }
  }
}