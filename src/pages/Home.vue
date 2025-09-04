<script setup lang="ts">
import logoUrl from '@/assets/logo.svg?url';
</script>

<template>
  <div class="page home">
    <header class="home-header">
  <img :src="logoUrl" alt="Kickback Catamaran Logo" class="logo" />
      <h1>Kickback Catamaran</h1>
      <p>Seattle’s #1 Boat Vibes</p>
      <p>Sunset Cruises, Catamaran & Paddleboard Rentals</p>
    </header>
  </div>
</template>

<style scoped>
.home-header {
  text-align: center;
  margin-top: 20px;
}
.logo {
  width: 120px;
  height: auto;
  margin-bottom: 15px;
}
</style>