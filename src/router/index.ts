import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import Canvas from '../views/Canvas.vue'
import Tetris from '../views/Tetris.vue'

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
  },
  {
    path: '/tetris',
    name: 'Tetris',
    component: Tetris
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router 