import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', component: () => import('../pages/IndexPage.vue') },
  { path: '/eglises', component: () => import('../pages/EglisesPage.vue') },
  { path: '/matricules', component: () => import('../pages/MatriculeStylesPage.vue') },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
