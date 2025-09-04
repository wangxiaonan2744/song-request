import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import fetch from "node-fetch";

// 🔒 Spotify secrets (set via Firebase CLI: firebase functions:secrets:set NAME)
const SPOTIFY_CLIENT_ID = defineSecret("SPOTIFY_CLIENT_ID");
const SPOTIFY_CLIENT_SECRET = defineSecret("SPOTIFY_CLIENT_SECRET");
const SPOTIFY_REFRESH_TOKEN = defineSecret("SPOTIFY_REFRESH_TOKEN");
//const SPOTIFY_PLAYLIST_ID = defineSecret("SPOTIFY_PLAYLIST_ID");

/**
 * Helper: get a fresh Spotify access token using the refresh token.
 */
async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${SPOTIFY_CLIENT_ID.value()}:${SPOTIFY_CLIENT_SECRET.value()}`
  ).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: SPOTIFY_REFRESH_TOKEN.value(),
    }),
  });

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Failed to get Spotify access token: " + JSON.stringify(data));
  }
  return data.access_token;
}

export const getSpotifyQueue = onCall(
  {
    secrets: [SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN],
  },
  async () => {
    const token = await getAccessToken();

    const res = await fetch("https://api.spotify.com/v1/me/player/queue", {
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Queue API failed: ${res.status} ${errText}`);
    }

    const data: any = await res.json();
    return {
      currentlyPlaying: data.currently_playing,
      queue: data.queue,
    };
  }
);

/**
 * Callable function: search Spotify tracks.
 * Frontend calls this with { query: "song name" } and gets back top 5 matches.
 */
export const searchSpotify = onCall(
  { secrets: [SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN] },
  async (request) => {
    const query = request.data.query as string;
    if (!query) return [];

    const token = await getAccessToken();

    const res = await fetch(
      "https://api.spotify.com/v1/search?" +
        new URLSearchParams({ q: query, type: "track", limit: "5" }),
      { headers: { "Authorization": `Bearer ${token}` } }
    );

    const data = await res.json() as any;

    return data.tracks.items.map((t: any) => ({
      name: t.name,
      artist: t.artists.map((a: any) => a.name).join(", "),
      album: t.album.name,
      uri: t.uri,
      image: t.album.images[2]?.url || "", // thumbnail
    }));
  }
);

/**
 * Firestore trigger: when a new song request is added, add it to Spotify playlist.
 * Expects either:
 *   - { uri: "spotify:track:..." } OR
 *   - { title: "Song", artist: "Artist" }
 */
export const addSongToSpotify = onDocumentCreated(
  {
    document: "songRequests/{docId}",
    secrets: [SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data() as { uri?: string; title?: string; artist?: string };
    let trackUri = data.uri;

    try {
      const token = await getAccessToken();

      // If no URI (old free-text requests), fallback to search
      if (!trackUri && data.title) {
        const query = data.artist ? `${data.title} ${data.artist}` : data.title;
        console.log("🔎 Searching Spotify for:", query);

        const searchRes = await fetch(
          "https://api.spotify.com/v1/search?" +
            new URLSearchParams({ q: query, type: "track", limit: "1" }),
          { headers: { "Authorization": `Bearer ${token}` } }
        );

        const searchData = await searchRes.json() as any;
        if (searchData.tracks.items.length) {
          trackUri = searchData.tracks.items[0].uri;
        }
      }

      if (!trackUri) {
        console.error("❌ No track URI found for:", data);
        return;
      }

      // ✅ Add to active playback queue
      const res = await fetch(
        `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(trackUri)}`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Queue API failed: ${res.status} ${errText}`);
      }

      console.log("🎶 Added to queue:", trackUri);
    } catch (err) {
      console.error("🔥 Error adding song:", err);
    }
  }
);