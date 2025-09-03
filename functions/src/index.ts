import * as functions from "firebase-functions";
import fetch from "node-fetch";

/**
 * test
 * @return test
 */
async function getAccessToken(): Promise<string> {
  const clientId = functions.config().spotify.client_id;
  const clientSecret = functions.config().spotify.client_secret;
  const refreshToken = functions.config().spotify.refresh_token;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = (await response.json()) as any;
  if (!data.access_token) {
    throw new Error("Failed to get Spotify access token: " + JSON.stringify(data));
  }
  return data.access_token;
}

// Trigger: run whenever a new song request is created in Firestore
export const addSongToSpotify = functions.firestore
  .document("songRequests/{docId}")
  .onCreate(async (snap) => {
    const { title, artist } = snap.data() as { title: string; artist?: string | null };
    const query = artist ? `${title} ${artist}` : title;

    console.log("🔎 Searching Spotify for:", query);

    try {
      const token = await getAccessToken();

      // Search for the track
      const searchRes = await fetch(
        "https://api.spotify.com/v1/search?" +
          new URLSearchParams({ q: query, type: "track", limit: "1" }),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const searchData = (await searchRes.json()) as any;
      if (!searchData.tracks.items.length) {
        console.error("❌ Song not found:", query);
        return;
      }
    
      const trackUri = searchData.tracks.items[0].uri;
      console.log("✅ Found track:", trackUri);

      // Add to playlist
      await fetch(
        `https://api.spotify.com/v1/playlists/${functions.config().spotify.playlist_id}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uris: [trackUri] }),
        }
      );

      console.log("🎶 Added to playlist:", trackUri);
    } catch (err) {
      console.error("🔥 Error adding song:", err);
    }
  });