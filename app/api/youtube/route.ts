import { NextRequest, NextResponse } from "next/server";

const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const YT_BASE = "https://www.googleapis.com/youtube/v3";

interface YTVideoItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    description: string;
  };
}

interface YTPlaylistItem {
  id: { playlistId: string };
  snippet: {
    title: string;
    channelTitle: string;
  };
}

interface YTSearchResponse {
  items: (YTVideoItem | YTPlaylistItem)[];
}

async function searchYouTube(
  query: string,
  type: "video" | "playlist",
  maxResults = 1
): Promise<YTSearchResponse> {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type,
    maxResults: String(maxResults),
    relevanceLanguage: "en",
    safeSearch: "moderate",
    key: YT_API_KEY!,
  });

  const res = await fetch(`${YT_BASE}/search?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `YouTube API error: ${res.status}`);
  }
  return res.json();
}

export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get("topic");
  const level = req.nextUrl.searchParams.get("level") ?? "beginner";

  if (!topic) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  if (!YT_API_KEY) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Build a search query that targets educational content for the right level
  const levelHint: Record<string, string> = {
    child:        "explained for kids simple",
    beginner:     "explained for beginners",
    intermediate: "explained",
    expert:       "deep dive advanced",
  };
  const hint = levelHint[level] ?? "explained";
  const videoQuery    = `${topic} ${hint}`;
  const playlistQuery = `${topic} full course tutorial playlist`;

  try {
    const [videoRes, playlistRes] = await Promise.allSettled([
      searchYouTube(videoQuery, "video", 1),
      searchYouTube(playlistQuery, "playlist", 1),
    ]);

    let video = null;
    if (videoRes.status === "fulfilled" && videoRes.value.items?.length) {
      const item = videoRes.value.items[0] as YTVideoItem;
      video = {
        title:   item.snippet.title,
        channel: item.snippet.channelTitle,
        reason:  item.snippet.description?.slice(0, 120) || "Top result for this topic",
        url:     `https://www.youtube.com/watch?v=${item.id.videoId}`,
      };
    }

    let playlist = null;
    if (playlistRes.status === "fulfilled" && playlistRes.value.items?.length) {
      const item = playlistRes.value.items[0] as YTPlaylistItem;
      playlist = {
        title:   item.snippet.title,
        channel: item.snippet.channelTitle,
        url:     `https://www.youtube.com/playlist?list=${item.id.playlistId}`,
      };
    }

    return NextResponse.json({ video, playlist });
  } catch (err) {
    const message = err instanceof Error ? err.message : "YouTube search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
