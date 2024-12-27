<template>
    <div class="game-2048-container">
        <div class="game-tips">
            <p>方向键：移动方块</p>
            <p>回车键：开始/重新开始</p>
            <p>ESC键：退出游戏</p>
        </div>
        <div class="game-area">
            <!-- 游戏信息 -->
            <div class="game-info">
                <n-card title="游戏信息" :bordered="false">
                    <n-space vertical>
                        <div class="info-item">
                            <span>分数:</span>
                            <span class="value">{{ score }}</span>
                        </div>
                        <div class="info-item">
                            <span>最高分:</span>
                            <span class="value">{{ bestScore }}</span>
                        </div>
                        <div class="button-group">
                            <n-button type="primary" @click="resetGame" class="control-button">
                                重新开始
                            </n-button>
                        </div>
                    </n-space>
                </n-card>
            </div>

            <!-- 游戏主画布 -->
            <div class="game-board" ref="boardRef" tabindex="0" @keydown="handleKeyDown">
                <div class="grid-container">
                    <!-- 背景网格 -->
                    <div class="grid-background">
                        <div v-for="i in 16" :key="'bg-' + i" class="grid-cell"></div>
                    </div>
                    <!-- 方块层 -->
                    <div class="tiles-container">
                        <div class="grid-row">
                            <template v-for="y in 4" :key="y">
                                <template v-for="x in 4" :key="x">
                                    <div v-if="board[y-1][x-1]"
                                        class="tile"
                                        :class="[
                                            `tile-${board[y-1][x-1]}`,
                                            { 'tile-new': isNewCell(x-1, y-1) }
                                        ]"
                                        :style="{
                                            gridColumn: x,
                                            gridRow: y
                                        }">
                                        {{ board[y-1][x-1] }}
                                    </div>
                                </template>
                            </template>
                        </div>
                    </div>
                </div>
                <!-- 游戏结束遮罩 -->
                <div v-if="gameOver" class="game-over">
                    <div class="game-over-content">
                        <h2>游戏结束</h2>
                        <p>最终得分: {{ score }}</p>
                        <p class="tip">按回车键重新开始</p>
                        <n-button type="primary" @click="resetGame">
                            重新开始
                        </n-button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NCard, NButton, NSpace, createDiscreteApi } from 'naive-ui'
import { useRouter } from 'vue-router'

const { dialog } = createDiscreteApi(['dialog'])
const router = useRouter()

// 游戏状态
const score = ref(0)
const bestScore = ref(0)
const gameOver = ref(false)
const board = ref<number[][]>(Array(4).fill(0).map(() => Array(4).fill(0)))
const newCells = ref<Set<string>>(new Set())
const boardRef = ref<HTMLElement | null>(null)

interface Position {
    x: number
    y: number
}

// 记录方块的上一个位置
const prevPositions = ref<Map<string, Position>>(new Map())

// 初始化游戏
const initGame = () => {
    board.value = Array(4).fill(0).map(() => Array(4).fill(0))
    prevPositions.value.clear()
    addNewTile()
    addNewTile()
}

// 添加新方块
const addNewTile = () => {
    const emptyCells = []
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (board.value[i][j] === 0) {
                emptyCells.push({ x: j, y: i })
            }
        }
    }
    if (emptyCells.length > 0) {
        const { x, y } = emptyCells[Math.floor(Math.random() * emptyCells.length)]
        board.value[y][x] = Math.random() < 0.9 ? 2 : 4
        newCells.value.add(`${x},${y}`)
        setTimeout(() => {
            newCells.value.delete(`${x},${y}`)
        }, 300)
    }
}

// 检查是否为新方块
const isNewCell = (x: number, y: number) => {
    return newCells.value.has(`${x},${y}`)
}

// 获取方块样式，包括位置过渡
const getCellStyle = (x: number, y: number) => {
    const value = board.value[y][x]
    if (!value) return {}

    const key = `${value}-${x}-${y}`
    const prev = prevPositions.value.get(key)
    
    if (prev) {
        setTimeout(() => {
            prevPositions.value.delete(key)
        }, 150)

        return {
            left: `${x * 95}px`,
            top: `${y * 95}px`,
            transform: `translate(${(x - prev.x) * 100}%, ${(y - prev.y) * 100}%) scale(1)`,
            transition: 'transform 150ms ease-in-out, background-color 150ms ease-in-out'
        }
    }

    return {
        left: `${x * 95}px`,
        top: `${y * 95}px`,
        transform: 'scale(1)'
    }
}

// 移动和合并方块
const moveTiles = async (direction: 'left' | 'right' | 'up' | 'down') => {
    // 记录移动前的位置
    const oldBoard = board.value.map(row => [...row])
    let moved = false
    let points = 0

    // 获取要处理的行或列
    const getLines = () => {
        if (direction === 'left' || direction === 'right') {
            return board.value.map((row, i) => ({ line: [...row], index: i }))
        } else {
            return Array(4).fill(0).map((_, i) => ({
                line: board.value.map(row => row[i]),
                index: i
            }))
        }
    }

    // 处理单行或单列
    const processLine = async (line: number[]) => {
        // 根据方向决定是否反转
        const shouldReverse = direction === 'right' || direction === 'down'
        if (shouldReverse) line.reverse()

        // 移除0并合并相同数字
        let numbers = line.filter(n => n !== 0)
        let merged = false
        for (let i = 0; i < numbers.length - 1; i++) {
            if (numbers[i] === numbers[i + 1]) {
                numbers[i] *= 2
                points += numbers[i]
                numbers.splice(i + 1, 1)
                merged = true
                // 添加短暂延迟让动画更流畅
                await new Promise(resolve => setTimeout(resolve, 50))
            }
        }

        // 补充0
        while (numbers.length < 4) numbers.push(0)
        if (shouldReverse) numbers.reverse()

        return { numbers, merged }
    }

    // 处理所有行或列
    const lines = getLines()
    for (const { line, index } of lines) {
        const { numbers, merged } = await processLine(line)
        const hasChanged = merged || JSON.stringify(line) !== JSON.stringify(numbers)
        if (hasChanged) moved = true

        // 更新board
        if (direction === 'left' || direction === 'right') {
            board.value[index] = numbers
        } else {
            numbers.forEach((num, i) => {
                board.value[i][index] = num
            })
        }
    }

    // 如果发生了移动，保存位置信息用于动画
    if (moved) {
        prevPositions.value.clear()
        oldBoard.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    prevPositions.value.set(`${value}-${x}-${y}`, { x, y })
                }
            })
        })

        score.value += points
        if (score.value > bestScore.value) {
            bestScore.value = score.value
            localStorage.setItem('2048-best-score', bestScore.value.toString())
        }
        addNewTile()
        checkGameOver()
    }
}

// 检查游戏是否结束
const checkGameOver = () => {
    // 检查是否有空格
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (board.value[i][j] === 0) return
        }
    }

    // 检查是否可以合并
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
            if (board.value[i][j] === board.value[i][j + 1]) return
        }
    }
    for (let j = 0; j < 4; j++) {
        for (let i = 0; i < 3; i++) {
            if (board.value[i][j] === board.value[i + 1][j]) return
        }
    }

    gameOver.value = true
}

// 重置游戏
const resetGame = () => {
    score.value = 0
    gameOver.value = false
    initGame()
    boardRef.value?.focus()
}

// 退出游戏确认
const confirmExit = () => {
    dialog.warning({
        title: '确认退出',
        content: '确定要退出游戏吗？当前游戏进度将丢失。',
        positiveText: '确定',
        negativeText: '取消',
        closeOnEsc: false,
        autoFocus: true,
        onKeydown: (e) => {
            if (e.key === 'Enter') {
                resetGame()
                router.back()
            }
        },
        onPositiveClick: () => {
            resetGame()
            router.back()
        }
    })
}

// 键盘控制
const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        confirmExit()
        return
    }

    if (e.key === 'Enter') {
        resetGame()
        return
    }

    if (gameOver.value) return

    switch (e.key) {
        case 'ArrowLeft':
            moveTiles('left')
            break
        case 'ArrowRight':
            moveTiles('right')
            break
        case 'ArrowUp':
            moveTiles('up')
            break
        case 'ArrowDown':
            moveTiles('down')
            break
    }
}

onMounted(() => {
    bestScore.value = parseInt(localStorage.getItem('2048-best-score') || '0')
    initGame()
    boardRef.value?.focus()
})
</script>

<style scoped>
.game-2048-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: #f5f5f5;
    position: relative;
    min-height: 100vh;
    padding: 40px 0;
}

.game-area {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    margin-top: 60px;
}

.game-board {
    width: 380px;
    height: 380px;
    background-color: #bbada0;
    border-radius: 6px;
    padding: 12px;
    outline: none;
    position: relative;
}

.grid-container {
    width: 100%;
    height: 100%;
    position: relative;
    padding: 3px;
}

.grid-background {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 12px;
    z-index: 1;
}

.tiles-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
}

.grid-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 12px;
    width: 100%;
    height: 100%;
}

.grid-cell,
.tile {
    background-color: rgba(238, 228, 218, 0.35);
    border-radius: 3px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 35px;
    font-weight: bold;
    color: #776e65;
    width: 100%;
    height: 100%;
    min-width: 0;
}

.tile {
    will-change: transform;
    transition: transform 150ms ease-in-out, background-color 150ms ease-in-out;
}

.tile-new {
    animation: appear 0.15s ease-in-out;
}

@keyframes merge {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.2);
    }
    100% {
        transform: scale(1);
    }
}

.tile[class*="tile-"] {
    animation: merge 150ms ease-in-out;
}

@keyframes appear {
    0% {
        opacity: 0;
        transform: scale(0);
    }
    100% {
        opacity: 1;
        transform: scale(1);
    }
}

.tile-2 { background-color: #eee4da; }
.tile-4 { background-color: #ede0c8; }
.tile-8 { background-color: #f2b179; color: #f9f6f2; }
.tile-16 { background-color: #f59563; color: #f9f6f2; }
.tile-32 { background-color: #f67c5f; color: #f9f6f2; }
.tile-64 { background-color: #f65e3b; color: #f9f6f2; }
.tile-128 { 
    background-color: #edcf72; 
    color: #f9f6f2;
    font-size: 30px;
}
.tile-256 { 
    background-color: #edcc61; 
    color: #f9f6f2;
    font-size: 30px;
}
.tile-512 { 
    background-color: #edc850; 
    color: #f9f6f2;
    font-size: 30px;
}
.tile-1024 { 
    background-color: #edc53f; 
    color: #f9f6f2;
    font-size: 25px;
}
.tile-2048 { 
    background-color: #edc22e; 
    color: #f9f6f2;
    font-size: 25px;
}

.game-info {
    width: 200px;
    height: fit-content;
}

.info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.value {
    font-weight: bold;
    color: #409eff;
}

.game-over {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(238, 228, 218, 0.73);
    display: flex;
    justify-content: center;
    align-items: center;
}

.game-over-content {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
}

.game-over h2 {
    margin: 0 0 10px;
    color: #776e65;
}

.game-over p {
    margin: 0 0 10px;
    font-size: 18px;
    color: #776e65;
}

.tip {
    font-size: 14px;
    color: #909399;
    margin: -10px 0 15px;
}

.button-group {
    display: flex;
    gap: 10px;
    width: 100%;
}

.control-button {
    flex: 1;
}

.game-tips {
    position: absolute;
    top: 20px;
    left: 20px;
    background-color: rgba(255, 255, 255, 0.9);
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    z-index: 10;
}

.game-tips p {
    margin: 5px 0;
    color: #606266;
    font-size: 14px;
}
</style>
