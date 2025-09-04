<template>
  <div class="page request">
    <h1>Request a Song for $1 🎶</h1>
    <p class="subtitle">
      Choose your favorite tracks, drop just <strong>$1 each</strong>, and we’ll add them
      to the live playlist at Gas Works Park. Your songs, your vibe — set against
      Seattle’s iconic skyline.
    </p>

    <!-- Queue toggle -->
    <button class="btn btn-switch" @click="toggleQueue">
      {{ queueOpen ? "⬆️ Hide Queue" : "🎶 Show Queue" }}
    </button>

    <!-- Queue section -->
    <div v-show="queueOpen" class="queue-section">
      <div v-if="nowPlaying" class="now-playing">
        <p>▶️ Now Playing:</p>
        <div class="queue-item">
          <img
            :src="nowPlaying.album.images[2]?.url"
            alt="cover"
            class="queue-cover"
          />
          <div class="queue-info">
            <div class="queue-title">{{ nowPlaying.name }}</div>
            <div class="queue-artist">
              {{ nowPlaying.artists.map((a:any) => a.name).join(", ") }}
            </div>
          </div>
        </div>
      </div>

      <h3 v-if="queue.length">Up Next:</h3>
      <div
        v-for="track in queue"
        :key="track.uri"
        class="queue-item"
        :class="{ highlight: lastAddedUris.includes(track.uri) }"
      >
        <img
          :src="track.album.images[2]?.url"
          alt="cover"
          class="queue-cover"
        />
        <div class="queue-info">
          <div class="queue-title">{{ track.name }}</div>
          <div class="queue-artist">
            {{ track.artists.map((a:any) => a.name).join(", ") }}
          </div>
        </div>
        <span v-if="lastAddedUris.includes(track.uri)" class="your-song">Your Song</span>
      </div>

      <p v-if="!nowPlaying && !queue.length">No songs in queue.</p>
    </div>

    <!-- Song search -->
    <input
      v-if="searchVisible"
      id="songSearch"
      type="text"
      v-model="query"
      placeholder="Type a song..."
      autocomplete="off"
      @input="searchSongs"
    />
    <ul id="results">
      <li
        v-for="song in results"
        :key="song.uri"
        @click="selectSong(song)"
      >
        <img :src="song.image" alt="album art" />
        <div>
          <div><strong>{{ song.name }}</strong></div>
          <div class="artist">{{ song.artist }}</div>
        </div>
      </li>
    </ul>

    <!-- Confirmation -->
    <div v-if="selectedSongs.length" id="message">
      <p>🎵 You selected:</p>
      <div
        v-for="(song, index) in selectedSongs"
        :key="song.uri"
        class="queue-item"
      >
        <img
          :src="song.image"
          alt="cover"
          class="queue-cover"
        />
        <div class="queue-info">
          <div class="queue-title">{{ song.title }}</div>
          <div class="queue-artist">{{ song.artist }}</div>
        </div>
        <button class="btn btn-remove" @click="removeSong(index)">❌</button>
      </div>

      <div class="action-buttons">
        <button class="btn btn-switch" @click="addAnotherSong">➕ Add Another Song</button>
        <button class="btn btn-confirm" @click="showPaypal">
          ✅ Confirm (${{ selectedSongs.length }})
        </button>
      </div>
    </div>

    <!-- PayPal button -->
    <div id="paypal-button-container"></div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { db, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

// Cloud functions
const searchSpotify = httpsCallable(functions, "searchSpotify");
const getSpotifyQueue = httpsCallable(functions, "getSpotifyQueue");

// State
const query = ref("");
const results = ref<any[]>([]);
const selectedSongs = ref<any[]>([]);
const queueOpen = ref(false);
const nowPlaying = ref<any | null>(null);
const queue = ref<any[]>([]);
const lastAddedUris = ref<string[]>([]);
const searchVisible = ref(true);

// ✅ Search Spotify
async function searchSongs() {
  if (!query.value.trim()) {
    results.value = [];
    return;
  }
  try {
    const res: any = await searchSpotify({ query: query.value });
    results.value = res.data;
  } catch (err) {
    console.error("Search error:", err);
  }
}

// ✅ Select song
function selectSong(song: any) {
  selectedSongs.value.push({
    uri: song.uri,
    title: song.name,
    artist: song.artist,
    image: song.image,
  });
  results.value = [];
  query.value = "";
  searchVisible.value = false; // hide search until "add another song"
}

// ✅ Remove song
function removeSong(index: number) {
  selectedSongs.value.splice(index, 1);
  if (!selectedSongs.value.length) {
    searchVisible.value = true; // reopen search if no songs left
  }
}

// ✅ Add another song
function addAnotherSong() {
  searchVisible.value = true;
  query.value = "";
  results.value = [];
}

// ✅ Show PayPal
function showPaypal() {
  const paypalContainer = document.getElementById("paypal-button-container");
  if (!paypalContainer) return;
  (paypalContainer as HTMLElement).style.display = "block";

  if (!paypalContainer.hasChildNodes()) {
    (window as any).paypal
      .Buttons({
        createOrder: (data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [
              { amount: { value: (selectedSongs.value.length * 1).toFixed(2) } },
            ],
          });
        },
        onApprove: async (data: any, actions: any) => {
          await actions.order.capture();
          await submitSongs();
        },
      })
      .render("#paypal-button-container");
  }
}

// ✅ Submit all songs to Firestore
async function submitSongs() {
  if (!selectedSongs.value.length) {
    alert("Please select at least one song.");
    return;
  }

  // collect all uris being added
  const uris: string[] = [];

  for (const song of selectedSongs.value) {
    await addDoc(collection(db, "songRequests"), {
      ...song,
      createdAt: serverTimestamp(),
      status: "pending",
    });
    uris.push(song.uri);
  }

  // track them for highlight
  lastAddedUris.value = uris;

  alert(`✅ Payment successful. Your ${selectedSongs.value.length} song(s) have been added!`);

  selectedSongs.value = [];
  searchVisible.value = true;

  // Always show queue after submitting
  queueOpen.value = true;
  await refreshQueue();

  const paypalContainer = document.getElementById("paypal-button-container");
  if (paypalContainer) {
    paypalContainer.innerHTML = "";
    (paypalContainer as HTMLElement).style.display = "none";
  }
}

// ✅ Fetch queue
async function refreshQueue() {
  try {
    const res: any = await getSpotifyQueue();
    nowPlaying.value = res.data.currentlyPlaying || null;
    queue.value = res.data.queue || [];
  } catch (err) {
    console.error("Queue error:", err);
    nowPlaying.value = null;
    queue.value = [];
  }
}

// ✅ Toggle queue
async function toggleQueue() {
  queueOpen.value = !queueOpen.value;
  if (queueOpen.value) {
    await refreshQueue();
  }
}

// ✅ Check PayPal SDK
onMounted(() => {
  if (!(window as any).paypal) {
    console.error("⚠️ PayPal SDK not loaded. Did you add it to index.html?");
  }
});
</script>

<style scoped>
.subtitle {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
}
#songSearch {
  width: 100%;
  padding: 14px;
  font-size: 18px;
  box-sizing: border-box;
}
#results {
  list-style: none;
  margin: 10px 0 0 0;
  padding: 0;
  border: 1px solid #ccc;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}
#results li {
  display: flex;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
  font-size: 16px;
}
#results li:hover {
  background: #f0f0f0;
}
#results img {
  margin-right: 10px;
  border-radius: 4px;
  width: 48px;
  height: 48px;
}
#message {
  margin-top: 15px;
  font-size: 15px;
  background: #fafafa;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 10px;
}
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 12px;
}
.btn {
  padding: 10px 14px;
  font-size: 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-switch {
  background: #eee;
  margin-bottom: 12px;
}
.btn-confirm {
  background: #28a745;
  color: white;
}
.btn-remove {
  background: transparent;
  border: none;
  font-size: 16px;
  margin-left: auto;
  cursor: pointer;
  color: #d9534f;
}
#paypal-button-container {
  margin-top: 15px;
  width: 100%;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
  display: none;
}
#paypal-button-container iframe {
  max-width: 100% !important;
}
.queue-section {
  text-align: left;
  margin-bottom: 20px;
}
.artist {
  font-size: 13px;
  color: #666;
}

/* Queue styles */
.queue-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding: 6px 0;
  border-bottom: 1px solid #eee;
}

.queue-cover {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  margin-right: 12px;
  flex-shrink: 0;
}

.queue-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: left;
}

.queue-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
}

.queue-artist {
  font-size: 12px;
  color: #666;
}

/* Highlight for new song */
.highlight {
  background: #fff8e1;
  border-left: 3px solid #fbc02d;
  padding-left: 8px;
  transition: background 0.5s ease;
}

.your-song {
  font-size: 12px;
  color: #f57c00;
  margin-left: auto;
  font-weight: 600;
}
</style>