<template>
  <div class="page">
    <h1>Contact Us</h1>

    <!-- Instagram link -->
    <p>
      <a
        href="https://instagram.com/kickbackcatamaran"
        target="_blank"
        rel="noopener"
        class="insta-link"
      >
        <i class="fab fa-instagram"></i>
        @kickbackcatamaran
      </a>
    </p>
  </div>
</template>

<script lang="ts" setup></script>


<style scoped>
.insta-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  text-decoration: none;
  color: #e1306c; /* Instagram pink */
}
.insta-link:hover {
  color: #c72a61;
}
.insta-link i {
  font-size: 20px;
}
</style>