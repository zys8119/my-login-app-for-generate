<template>
    <div class="home-container">
        <div class="card-list">
            <n-card v-for="route in routes" :key="route.path" class="route-card" hoverable
                @click="navigateTo(route.path)">
                <template #cover>
                    <div class="card-icon">
                        <n-icon size="40" :component="route.icon" />
                    </div>
                </template>
                <div class="card-content">
                    <h3>{{ route.title }}</h3>
                    <p>{{ route.description }}</p>
                </div>
            </n-card>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { NCard, NIcon } from 'naive-ui'
import { GameController, Brush, GridOutline, Document } from '@vicons/ionicons5'

const router = useRouter()

const routes = [
    {
        path: '/tetris',
        title: '俄罗斯方块',
        description: '经典的俄罗斯方块游戏，使用键盘控制方块移动和旋转。',
        icon: GameController
    },
    {
        path: '/2048',
        title: '2048',
        description: '经典的2048数字游戏，使用方向键合并相同数字。',
        icon: GridOutline
    },
    {
        path: '/canvas',
        title: '画布编辑器',
        description: '可视化画布编辑工具，支持拖拽、缩放和编辑元素。',
        icon: Brush
    },
    {
        path: '/pdf-preview',
        title: 'PDF在线预览',
        description: '支持在线预览和浏览PDF文件内容。',
        icon: Document
    }
]

const navigateTo = (path: string) => {
    router.push(path)
}
</script>

<style scoped>
.home-container {
    padding: 20px;
    background-color: #f5f5f5;
    min-height: 100vh;
}

.card-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    max-width: 1200px;
    margin: 0 auto;
}

.route-card {
    cursor: pointer;
    transition: transform 0.3s;
}

.route-card:hover {
    transform: translateY(-5px);
}

.card-icon {
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f5f7fa;
    color: #409eff;
}

.card-content {
    padding: 16px 0 0;
}

.card-content h3 {
    margin: 0 0 8px;
    font-size: 18px;
    color: #303133;
}

.card-content p {
    margin: 0;
    font-size: 14px;
    color: #606266;
    line-height: 1.5;
}

.feature-list {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    margin-top: 20px;
}

.feature-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 16px;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: calc(50% - 10px);
    box-sizing: border-box;
}

.feature-icon {
    font-size: 24px;
    margin-bottom: 8px;
}

.feature-title {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 8px;
}

.feature-desc {
    font-size: 14px;
    color: #606266;
}
</style>