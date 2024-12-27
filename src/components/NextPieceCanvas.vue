<template>
    <canvas ref="canvasRef" :width="80" :height="50"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = defineProps<{
    matrix: number[][]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const CELL_SIZE = 12 // 每个格子的大小
const GRID_COLOR = '#eee' // 网格线颜色
const BLOCK_COLOR = '#67c23a' // 方块颜色

// 绘制网格
const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = GRID_COLOR
    ctx.lineWidth = 1

    // 绘制垂直线
    for (let x = 0; x <= width; x += CELL_SIZE) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
    }

    // 绘制水平线
    for (let y = 0; y <= height; y += CELL_SIZE) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
    }
}

// 绘制方块
const drawPiece = (ctx: CanvasRenderingContext2D) => {
    if (!props.matrix.length) return

    const offsetX = (80 - props.matrix[0].length * CELL_SIZE) / 2
    const offsetY = (50 - props.matrix.length * CELL_SIZE) / 2

    ctx.fillStyle = BLOCK_COLOR
    props.matrix.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell === 1) {
                ctx.fillRect(
                    offsetX + x * CELL_SIZE,
                    offsetY + y * CELL_SIZE,
                    CELL_SIZE - 1,
                    CELL_SIZE - 1
                )
            }
        })
    })
}

// 更新画布
const updateCanvas = () => {
    const canvas = canvasRef.value
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 绘制背景
    ctx.fillStyle = '#f5f7fa'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 绘制网格和方块
    drawGrid(ctx, canvas.width, canvas.height)
    drawPiece(ctx)
}

// 监听矩阵变化
watch(() => props.matrix, updateCanvas, { deep: true })

onMounted(() => {
    updateCanvas()
})
</script>

<style scoped>
canvas {
    border: 1px solid #ddd;
    border-radius: 4px;
}
</style>