import { NextRequest, NextResponse } from 'next/server';
import { DorsuNewsService } from '@/lib/services/DorsuNewsService';
import { DorsuNewsDatabaseService } from '@/lib/services/DorsuNewsDatabaseService';

/**
 * API endpoint to fetch DOrSU news
 * GET /api/dorsu-news
 * 
 * This endpoint provides cached news data from database with fallback to scraping
 * It includes error handling and automatic database sync
 */

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    console.log('📡 DOrSU News API called', { forceRefresh });

    // Check if we should use cached data from database
    if (!forceRefresh) {
      const lastScraped = await DorsuNewsDatabaseService.getLastScrapedTime();
      
      if (lastScraped && (Date.now() - lastScraped.getTime()) < CACHE_DURATION) {
        console.log('📦 Returning cached data from database');
        
        const cachedResult = await DorsuNewsDatabaseService.getCachedNews(10);
        
        if (cachedResult.success && cachedResult.data.length > 0) {
          return NextResponse.json({
            success: true,
            data: cachedResult.data,
            cached: true,
            lastUpdated: lastScraped.toISOString(),
            cacheAge: Math.round((Date.now() - lastScraped.getTime()) / 1000),
          });
        }
      }
    }

    console.log('🔄 Fetching fresh news data from DOrSU...');

    // Fetch fresh data from DOrSU
    const newsResult = await DorsuNewsService.scrapeNews();

    if (newsResult.success && newsResult.data.length > 0) {
      // Save to database for future caching
      console.log('💾 Saving news to database...');
      const saveResult = await DorsuNewsDatabaseService.saveNewsItems(newsResult.data);
      
      if (saveResult.success) {
        console.log(`📊 Database updated: ${saveResult.inserted} new, ${saveResult.updated} updated`);
      }

      console.log(`✅ Successfully fetched ${newsResult.data.length} news items`);

      return NextResponse.json({
        ...newsResult,
        cached: false,
        databaseSync: saveResult.success,
      });
    } else {
      console.error('❌ Failed to fetch fresh news:', newsResult.error);

      // Fallback to any cached data we have, even if stale
      const cachedResult = await DorsuNewsDatabaseService.getCachedNews(10);
      
      if (cachedResult.success && cachedResult.data.length > 0) {
        console.log('📦 Returning stale cached data due to fetch failure');
        const lastScraped = await DorsuNewsDatabaseService.getLastScrapedTime();
        
        return NextResponse.json({
          success: true,
          data: cachedResult.data,
          cached: true,
          stale: true,
          lastUpdated: lastScraped?.toISOString() || new Date().toISOString(),
          cacheAge: lastScraped ? Math.round((Date.now() - lastScraped.getTime()) / 1000) : 0,
          fetchError: newsResult.error,
        });
      }

      // No cached data available, return error
      return NextResponse.json(
        {
          success: false,
          data: [],
          error: newsResult.error || 'Failed to fetch news and no cache available',
          lastUpdated: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ API Error:', error);

    // Try to return cached data as fallback
    try {
      const cachedResult = await DorsuNewsDatabaseService.getCachedNews(10);
      
      if (cachedResult.success && cachedResult.data.length > 0) {
        console.log('📦 Returning cached data due to API error');
        const lastScraped = await DorsuNewsDatabaseService.getLastScrapedTime();
        
        return NextResponse.json({
          success: true,
          data: cachedResult.data,
          cached: true,
          stale: true,
          lastUpdated: lastScraped?.toISOString() || new Date().toISOString(),
          cacheAge: lastScraped ? Math.round((Date.now() - lastScraped.getTime()) / 1000) : 0,
          apiError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (dbError) {
      console.error('❌ Database fallback also failed:', dbError);
    }

    return NextResponse.json(
      {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Internal server error',
        lastUpdated: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manually refreshing news (for admin use)
 */
export async function POST() {
  try {
    console.log('🔄 Manual news refresh requested');

    // Fetch fresh data from DOrSU
    const newsResult = await DorsuNewsService.scrapeNews();

    if (newsResult.success && newsResult.data.length > 0) {
      // Save to database
      console.log('💾 Saving refreshed news to database...');
      const saveResult = await DorsuNewsDatabaseService.saveNewsItems(newsResult.data);
      
      return NextResponse.json({
        ...newsResult,
        message: 'News data refreshed successfully',
        cached: false,
        databaseSync: saveResult.success,
        inserted: saveResult.inserted,
        updated: saveResult.updated,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          data: [],
          error: newsResult.error || 'Failed to refresh news',
          lastUpdated: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Manual refresh error:', error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Internal server error',
        lastUpdated: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}