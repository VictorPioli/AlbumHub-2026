import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import ProfilePage from '../pages/ProfilePage.vue'
import ComparePage from '../pages/ComparePage.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/compare/:user1/:user2', component: ComparePage },
    { path: '/:nickname', component: ProfilePage },
  ],
})
