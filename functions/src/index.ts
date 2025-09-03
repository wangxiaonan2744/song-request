import * as functions from "firebase-functions";
import fetch, {Response} from "node-fetch";

/**
 * Get a fresh Spotify access token using the stored refresh token.
 * @return {Promise<string>} a valid Spotify access token
 */
async function getAccessToken(): Promise<string> {
  const clientId: string = functions.config().spotify.client_id;
  const clientSecret: string = functions.config().spotify.client_secret;
  const refreshToken: string = functions.config().spotify.refresh_token;

  const auth: string =
    Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response: Response =
  await fetch("https://accounts.spotify.com/api/token", {
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

  const data: any = await response.json();
  if (!data.access_token) {
    throw new Error("Failed to get Spotify access token: "
      + JSON.stringify(data));
  }
  return data.access_token as string;
}

/**
 * Firestore trigger: when a new song request is added, search Spotify and add
 * it to a playlist.
 * @param snap Firestore snapshot of the new document
 * @returns {Promise<void>} resolves when complete
 */
export const addSongToSpotify = functions.firestore
  .document("songRequests/{docId}")
  .onCreate(async (snap): Promise<void> => {
    const {title, artist} =
      snap.data() as {title: string; artist?: string | null};
    const query: string = artist ? `${title} ${artist}` : title;

    console.log("🔎 Searching Spotify for:", query);

    try {
      const token: string = await getAccessToken();

      // Search for the track
      const searchRes: Response = await fetch(
        "https://api.spotify.com/v1/search?" +
          new URLSearchParams({q: query, type: "track", limit: "1"}),
        {headers: {Authorization: `Bearer ${token}`} }
      );

      const searchData: any = await searchRes.json();
      if (!searchData.tracks.items.length) {
        console.error("❌ Song not found:", query);
        return;
      }

      const trackUri: string = searchData.tracks.items[0].uri;
      console.log("✅ Found track:", trackUri);

      // Add to playlist
      await fetch(
        `https://api.spotify.com/v1/playlists/`
          +`${functions.config().spotify.playlist_id}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({uris: [trackUri]}),
        }
      );

      console.log("🎶 Added to playlist:", trackUri);
    } catch (err) {
      console.error("🔥 Error adding song:", err);
    }
  });