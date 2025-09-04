import { createRouter, createWebHistory } from "vue-router";
import Home from "./pages/Home.vue";
import Request from "./pages/Request.vue";
import About from "./pages/About.vue";
import Contact from "./pages/Contact.vue";

const routes = [
  { path: "/", component: Home },
  { path: "/request", component: Request },
  { path: "/about", component: About },
  { path: "/contact", component: Contact },
];

export default createRouter({
  history: createWebHistory(),
  routes
});