<template>
  <div>
    <h2>Request a Song</h2>

    <input
      type="text"
      v-model="query"
      placeholder="Type a song..."
      @input="searchSongs"
    />
    <ul v-if="songs.length">
      <li v-for="song in songs" :key="song.uri" @click="selectSong(song)">
        <img :src="song.image" width="40" height="40" />
        <div>
          <strong>{{ song.name }}</strong><br />
          <small>{{ song.artist }}</small>
        </div>
      </li>
    </ul>

    <div v-if="selectedSong" class="confirmation-box">
      <p>
        🎵 Selected: <strong>{{ selectedSong.title }}</strong> —
        {{ selectedSong.artist }}
      </p>
      <button @click="confirmSong">✅ Confirm Song</button>
      <button @click="switchSong">🔄 Switch Song</button>
    </div>

    <div id="paypal-button-container"></div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { initializeApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, addDoc, collection, serverTimestamp } from "firebase/firestore";

// 🔧 Firebase config
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
const db = getFirestore(app);

const searchSpotify = httpsCallable(functions, "searchSpotify");

const query = ref("");
const songs = ref<any[]>([]);
const selectedSong = ref<any | null>(null);

async function searchSongs() {
  if (!query.value.trim()) {
    songs.value = [];
    return;
  }
  try {
    const res = await searchSpotify({ query: query.value });
    songs.value = res.data;
  } catch (err) {
    console.error("Search error:", err);
  }
}

function selectSong(song: any) {
  selectedSong.value = {
    uri: song.uri,
    title: song.name,
    artist: song.artist,
  };
  songs.value = [];
}

function switchSong() {
  selectedSong.value = null;
}

async function confirmSong() {
  if (!selectedSong.value) return;
  await addDoc(collection(db, "songRequests"), {
    ...selectedSong.value,
    createdAt: serverTimestamp(),
    status: "pending",
  });
  alert(`✅ Song "${selectedSong.value.title}" added!`);
  selectedSong.value = null;
}

onMounted(() => {
  // Load PayPal buttons dynamically
  if (window.paypal) {
    window.paypal.Buttons({
      createOrder: (data: any, actions: any) =>
        actions.order.create({
          purchase_units: [{ amount: { value: "1.00" } }],
        }),
      onApprove: async (data: any, actions: any) => {
        await actions.order.capture();
        await confirmSong();
      },
    }).render("#paypal-button-container");
  }
});
</script>

<style scoped>
.confirmation-box {
  margin-top: 15px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fafafa;
}
</style>