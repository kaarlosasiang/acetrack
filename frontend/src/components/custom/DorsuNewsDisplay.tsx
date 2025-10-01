"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  ExternalLink,
  Clock,
  User,
  AlertCircle,
} from "lucide-react";
import { DorsuNewsItem, DorsuNewsResponse } from "@/lib/types/news";

interface DorsuNewsDisplayProps {
  limit?: number;
  showRefreshButton?: boolean;
  className?: string;
  compact?: boolean;
}

export default function DorsuNewsDisplay({
  limit = 6,
  showRefreshButton = true,
  className = "",
  compact = false,
}: DorsuNewsDisplayProps) {
  const [newsData, setNewsData] = useState<DorsuNewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const url = forceRefresh
        ? "/api/dorsu-news?refresh=true"
        : "/api/dorsu-news";

      const response = await fetch(url);
      const data: DorsuNewsResponse = await response.json();

      if (response.ok) {
        setNewsData(data);
      } else {
        setError(data.error || "Failed to fetch news");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleRefresh = () => {
    fetchNews(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Recent";
    }
  };

  const displayedNews = newsData?.data.slice(0, limit) || [];

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">DOrSU News & Updates</h2>
          <Skeleton className="h-10 w-20" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardHeader>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className={
              compact
                ? "text-lg font-semibold text-foreground"
                : "text-2xl font-bold text-foreground"
            }
          >
            {compact ? "Latest News" : "DOrSU News & Updates"}
          </h2>
          {!compact && (
            <p className="text-muted-foreground">
              Latest announcements from Davao Oriental State University
            </p>
          )}
        </div>
        {showRefreshButton && (
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        )}
      </div>

      {/* Cache status */}
      {newsData && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Last updated: {formatDate(newsData.lastUpdated)}</span>
          {newsData.success && (
            <Badge variant="secondary" className="ml-2">
              {newsData.data.length} items
            </Badge>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Unable to fetch news
              </p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button
              onClick={() => fetchNews()}
              size="sm"
              variant="outline"
              className="ml-auto"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* News grid */}
      {displayedNews.length > 0 ? (
        <div
          className={
            compact ? "space-y-3" : "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          }
        >
          {displayedNews.map((newsItem) => (
            <NewsCard key={newsItem.id} newsItem={newsItem} compact={compact} />
          ))}
        </div>
      ) : (
        !loading &&
        !error && (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No news available</p>
                <p className="text-muted-foreground">
                  Check back later for updates
                </p>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Footer */}
      {newsData && newsData.data.length > limit && (
        <div className="text-center pt-4">
          <Button variant="outline" asChild>
            <a
              href="https://dorsu.edu.ph"
              target="_blank"
              rel="noopener noreferrer"
            >
              View More on DOrSU Website
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

interface NewsCardProps {
  newsItem: DorsuNewsItem;
  compact?: boolean;
}

function NewsCard({ newsItem, compact = false }: NewsCardProps) {
  console.log(newsItem);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Recent";
    }
  };

  const handleImageError = () => {
    // For Next.js Image component, we'll handle errors differently
    console.warn("Failed to load image:", newsItem.imageUrl);
  };

  if (compact) {
    // Compact layout for dashboard sidebar
    return (
      <a href={newsItem.readMoreUrl} target="_blank" rel="noopener noreferrer">
        <Card className="group hover:shadow-md transition-all duration-300 border-border/50 hover:border-border py-0">
          <div className="p-3">
            <div className="flex gap-3">
              {/* Small image thumbnail */}
              {newsItem.imageUrl && (
                <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-md bg-muted relative">
                  <Image
                    src={newsItem.imageUrl}
                    alt={newsItem.title}
                    fill
                    className="object-cover"
                    onError={handleImageError}
                    sizes="64px"
                  />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(newsItem.date)}</span>
                </div>

                <h3 className="text-sm font-medium line-clamp-2 leading-tight mb-2">
                  {newsItem.title}
                </h3>
              </div>
            </div>
          </div>
        </Card>
      </a>
    );
  }

  // Regular layout for main news page
  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 hover:border-border">
      {/* Image */}
      {newsItem.imageUrl && (
        <div className="aspect-video overflow-hidden bg-muted relative">
          <Image
            src={newsItem.imageUrl}
            alt={newsItem.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={handleImageError}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <User className="h-3 w-3" />
          <span>{newsItem.author}</span>
          <span>•</span>
          <Clock className="h-3 w-3" />
          <span>{formatDate(newsItem.date)}</span>
        </div>

        <CardTitle className="line-clamp-2 text-lg leading-tight">
          {newsItem.title}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
