<template>
  <div class="page request">
    <h1>Request a Song for $1 🎶</h1>
    <p class="subtitle">
      Choose your favorite track, drop just <strong>$1</strong>, and we’ll add it
      to the live playlist at Gas Works Park. Your song, your vibe — set against
      Seattle’s iconic skyline.
    </p>

    <!-- Queue toggle -->
    <button class="btn btn-switch" @click="toggleQueue">
      {{ queueOpen ? "⬆️ Hide Queue" : "🎶 Show Queue" }}
    </button>

    <div v-show="queueOpen" class="queue-section">
      <div v-html="queueHtml"></div>
    </div>

    <!-- Song search -->
    <input
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
    <div v-if="selectedSong" id="message">
      <p>
        🎵 You selected:<br />
        <strong>{{ selectedSong.title }}</strong><br />
        <span class="artist">{{ selectedSong.artist }}</span>
      </p>
      <div class="action-buttons">
        <button class="btn btn-switch" @click="switchSong">🔄 Switch</button>
        <button class="btn btn-confirm" @click="showPaypal">✅ Confirm ($1)</button>
      </div>
    </div>

    <!-- PayPal button -->
    <div id="paypal-button-container"></div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { db, functions } from "../firebase"; // centralized firebase.ts
import { httpsCallable } from "firebase/functions";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

// Cloud functions
const searchSpotify = httpsCallable(functions, "searchSpotify");
const getSpotifyQueue = httpsCallable(functions, "getSpotifyQueue");

// State
const query = ref("");
const results = ref<any[]>([]);
const selectedSong = ref<any | null>(null);
const queueOpen = ref(false);
const queueHtml = ref("");

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
  selectedSong.value = {
    uri: song.uri,
    title: song.name,
    artist: song.artist,
  };
  results.value = [];
}

// ✅ Switch song
function switchSong() {
  selectedSong.value = null;
  query.value = "";
  results.value = [];
  const paypalContainer = document.getElementById("paypal-button-container");
  if (paypalContainer) {
    paypalContainer.innerHTML = "";
    (paypalContainer as HTMLElement).style.display = "none";
  }
}

// ✅ Show PayPal
function showPaypal() {
  const paypalContainer = document.getElementById("paypal-button-container");
  if (!paypalContainer) return;
  (paypalContainer as HTMLElement).style.display = "block";

  // Render PayPal once
  if (!paypalContainer.hasChildNodes()) {
    (window as any).paypal
      .Buttons({
        createOrder: (data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [{ amount: { value: "1.00" } }],
          });
        },
        onApprove: async (data: any, actions: any) => {
          await actions.order.capture();
          await submitSong();
        },
      })
      .render("#paypal-button-container");
  }
}

// ✅ Submit song to Firestore
async function submitSong() {
  if (!selectedSong.value) {
    alert("Please select a song first.");
    return;
  }
  await addDoc(collection(db, "songRequests"), {
    ...selectedSong.value,
    createdAt: serverTimestamp(),
    status: "pending",
  });
  alert(`✅ Payment successful. Your song "${selectedSong.value.title}" is added!`);
  switchSong();
}

// ✅ Queue toggle
async function toggleQueue() {
  queueOpen.value = !queueOpen.value;
  if (queueOpen.value) {
    try {
      const res: any = await getSpotifyQueue();
      const { currentlyPlaying, queue } = res.data;

      let html = "";
      if (currentlyPlaying) {
        html += `<p>▶️ Now Playing:<br><strong>${currentlyPlaying.name}</strong><br><span style="font-size:13px;color:#555">${currentlyPlaying.artists
          .map((a: any) => a.name)
          .join(", ")}</span></p>`;
      }
      if (queue && queue.length) {
        html += "<h3>Up Next:</h3><ul>";
        queue.forEach((track: any) => {
          html += `<li>${track.name} — ${track.artists
            .map((a: any) => a.name)
            .join(", ")}</li>`;
        });
        html += "</ul>";
      } else {
        html += "<p>No songs in queue.</p>";
      }
      queueHtml.value = html;
    } catch (err) {
      console.error("Queue error:", err);
      queueHtml.value = "<p>⚠️ Could not load queue.</p>";
    }
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
  margin-top: 8px;
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
}
.btn-confirm {
  background: #28a745;
  color: white;
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
</style>