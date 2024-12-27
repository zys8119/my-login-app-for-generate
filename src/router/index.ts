import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import Canvas from '../views/Canvas.vue'
import Tetris from '../views/Tetris.vue'
import Game2048 from '../views/Game2048.vue'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    meta: {
      title: '登录'
    },
    component: Login
  },
  {
    path: '/home',
    name: 'Home',
    meta: {
      title: '首页'
    },
    component: Home
  },
  {
    path: '/canvas',
    name: 'Canvas',
    meta: {
      title: '画布编辑器'
    },
    component: Canvas
  },
  {
    path: '/tetris',
    name: 'Tetris',
    meta: {
      title: '俄罗斯方块'
    },
    component: Tetris
  },
  {
    path: '/2048',
    name: 'Game2048',
    meta: {
      title: '2048'
    },
    component: Game2048
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const title = to.meta.title ? `${to.meta.title} - AI自动生成` : 'AI自动生成'
  document.title = title
  next()
})

export default router 