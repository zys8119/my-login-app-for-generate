import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import Canvas from '../views/Canvas.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/home',
    name: 'Home',
    component: Home
  },
  {
    path: '/canvas',
    name: 'Canvas',
    component: Canvas
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 