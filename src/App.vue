<template>
  <div id="app">
    <!-- Top Navigation Bar -->
    <header class="top-nav">
      <nav>
        <RouterLink to="/" class="logo">KICKBACK CATAMARAN</RouterLink>
        <div class="nav-links">
          <RouterLink to="/">HOME</RouterLink>
          <RouterLink to="/request">FUN</RouterLink>
          <RouterLink to="/about">ABOUT US</RouterLink>
          <RouterLink to="/contact">CONTACT</RouterLink>
        </div>
      </nav>
    </header>

    <!-- Main page content -->
    <main>
      <RouterView />
    </main>
  </div>
</template>

<script lang="ts" setup></script>

<style scoped>
.top-nav {
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  padding: 12px 20px;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.top-nav nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 900px;
  margin: 0 auto;
}

.logo {
  font-weight: bold;
  font-size: 16px;
  color: #E07A5F; /* clay accent */
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 16px;
}

.nav-links a {
  color: #3D405B; /* slate text */
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.nav-links a:hover {
  color: #E07A5F; /* clay hover */
}

main {
  padding: 20px;
}
</style>