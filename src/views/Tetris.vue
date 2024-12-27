<template>
    <div class="tetris-container">
        <div class="game-tips">
            <p>方向键：移动方块</p>
            <p>空格键：快速下落</p>
            <p>回车键：开始/暂停</p>
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
                            <span>等级:</span>
                            <span class="value">{{ level }}</span>
                        </div>
                        <div class="info-item">
                            <span>下一个:</span>
                            <next-piece-canvas :matrix="nextPieceMatrix" />
                        </div>
                        <div class="button-group">
                            <n-button type="primary" @click="toggleGame" class="control-button">
                                {{ isPlaying ? '暂停' : '开始' }}
                            </n-button>
                            <n-button @click="resetGame" :disabled="isPlaying" class="control-button">
                                重新开始
                            </n-button>
                        </div>
                    </n-space>
                </n-card>
            </div>

            <!-- 游戏主画布 -->
            <div class="game-board" ref="boardRef" tabindex="0" @keydown="handleKeyDown">
                <div v-for="(row, y) in gameMatrix" :key="y" class="row">
                    <div v-for="(cell, x) in row" :key="x" class="cell"
                        :class="{ filled: cell === 1, active: isActivePiece(x, y) }"></div>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { NCard, NButton, NSpace, createDiscreteApi } from 'naive-ui'
import { useRouter } from 'vue-router'
import NextPieceCanvas from '../components/NextPieceCanvas.vue'

const { dialog } = createDiscreteApi(['dialog'])
const router = useRouter()

// 游戏配置
const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const INITIAL_SPEED = 1000

// 分数配置
const SCORE_CONFIG = {
    LINES: {        // 消除行数得分
        1: 100,
        2: 300,
        3: 500,
        4: 800
    }
}

// 方块形状定义
const TETROMINOES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
}

// 对方框状态
const showExitDialog = ref(false)
const wasPlaying = ref(false)

// 游戏状态
const score = ref(0)
const level = ref(1)
const isPlaying = ref(false)
const gameOver = ref(false)
const gameMatrix = ref(Array(BOARD_HEIGHT).fill(0).map(() => Array(BOARD_WIDTH).fill(0)))
const nextPieceMatrix = ref([[]])
const currentPiece = ref({ shape: [[]], x: 0, y: 0 })
const nextPiece = ref({ shape: [[]] })
const gameInterval = ref<number | null>(null)
const boardRef = ref<HTMLElement | null>(null)

// 生成新方块
const generatePiece = () => {
    const shapes = Object.values(TETROMINOES)
    const shape = shapes[Math.floor(Math.random() * shapes.length)]
    return {
        shape,
        x: Math.floor((BOARD_WIDTH - shape[0].length) / 2),
        y: 0
    }
}

// 检查碰撞
const checkCollision = (piece: typeof currentPiece.value, matrix: number[][]) => {
    return piece.shape.some((row, dy) =>
        row.some((cell, dx) => {
            if (cell === 0) return false
            const newX = piece.x + dx
            const newY = piece.y + dy
            return (
                newX < 0 ||
                newX >= BOARD_WIDTH ||
                newY >= BOARD_HEIGHT ||
                (newY >= 0 && matrix[newY][newX] === 1)
            )
        })
    )
}

// 合并方块到游戏面板
const mergePiece = () => {
    currentPiece.value.shape.forEach((row, dy) => {
        row.forEach((cell, dx) => {
            if (cell === 1) {
                const newY = currentPiece.value.y + dy
                const newX = currentPiece.value.x + dx
                if (newY >= 0) {
                    gameMatrix.value[newY][newX] = 1
                }
            }
        })
    })
}

// 清除完整的行
const clearLines = () => {
    let clearedRows = 0
    let completedLines = []

    // 先找出所有完整的行
    gameMatrix.value.forEach((row, index) => {
        if (row.every(cell => cell === 1)) {
            clearedRows++
            completedLines.push(index)
        }
    })

    // 如果有完整的行，更新分数并清除这些行
    if (clearedRows > 0) {
        // 从下往上删除行，避免索引变化的问题
        completedLines.reverse().forEach(lineIndex => {
            gameMatrix.value.splice(lineIndex, 1)
        })

        // 在顶部添加新的空行
        for (let i = 0; i < clearedRows; i++) {
            gameMatrix.value.unshift(Array(BOARD_WIDTH).fill(0))
        }

        // 根据消除行数计算得分
        const baseScore = SCORE_CONFIG.LINES[clearedRows as keyof typeof SCORE_CONFIG.LINES] || 0

        // 加上等级加成
        score.value += baseScore * level.value

        // 每1000分升一级，最高15级
        level.value = Math.min(15, Math.floor(score.value / 1000) + 1)

        // 更新游戏速度
        if (isPlaying.value && gameInterval.value) {
            clearInterval(gameInterval.value)
            gameInterval.value = window.setInterval(gameLoop, INITIAL_SPEED / level.value)
        }
    }
}

// 移动方块
const movePiece = (dx: number, dy: number) => {
    const newPiece = {
        ...currentPiece.value,
        x: currentPiece.value.x + dx,
        y: currentPiece.value.y + dy
    }
    if (!checkCollision(newPiece, gameMatrix.value)) {
        currentPiece.value = newPiece
        return true
    }
    return false
}

// 旋转方块
const rotatePiece = () => {
    const shape = currentPiece.value.shape
    const newShape = shape[0].map((_, i) =>
        shape.map(row => row[i]).reverse()
    )
    const newPiece = {
        ...currentPiece.value,
        shape: newShape
    }
    if (!checkCollision(newPiece, gameMatrix.value)) {
        currentPiece.value = newPiece
    }
}

// 游戏主循环
const gameLoop = () => {
    if (!movePiece(0, 1)) {
        mergePiece()
        clearLines()
        currentPiece.value = {
            shape: nextPiece.value.shape,
            x: Math.floor((BOARD_WIDTH - nextPiece.value.shape[0].length) / 2),
            y: 0
        }
        nextPiece.value = generatePiece()
        nextPieceMatrix.value = nextPiece.value.shape
        if (checkCollision(currentPiece.value, gameMatrix.value)) {
            gameOver.value = true
            isPlaying.value = false
            if (gameInterval.value) {
                clearInterval(gameInterval.value)
                gameInterval.value = null
            }
        }
    }
}

// 开始/暂停游戏
const toggleGame = () => {
    if (gameOver.value) return
    isPlaying.value = !isPlaying.value
    if (isPlaying.value) {
        gameInterval.value = window.setInterval(gameLoop, INITIAL_SPEED / level.value)
        boardRef.value?.focus()
    } else if (gameInterval.value) {
        clearInterval(gameInterval.value)
        gameInterval.value = null
    }
}

// 重置游戏
const resetGame = () => {
    if (gameInterval.value) {
        clearInterval(gameInterval.value)
        gameInterval.value = null
    }
    gameMatrix.value = Array(BOARD_HEIGHT).fill(0).map(() => Array(BOARD_WIDTH).fill(0))
    score.value = 0
    level.value = 1
    gameOver.value = false
    isPlaying.value = false
    nextPiece.value = generatePiece()
    currentPiece.value = generatePiece()
    nextPieceMatrix.value = nextPiece.value.shape
    boardRef.value?.focus()
}

// 退出游戏确认
const confirmExit = () => {
    const exitGame = () => {
        showExitDialog.value = false
        if (gameInterval.value) {
            clearInterval(gameInterval.value)
            gameInterval.value = null
        }
        resetGame()
    }

    // 如果已经显示对话框，则关闭它
    if (showExitDialog.value) {
        showExitDialog.value = false
        // 如果游戏之前是进行状态，则恢复游戏
        if (wasPlaying.value) {
            toggleGame()
            wasPlaying.value = false
        }
        return
    }

    // 记录当前游戏状态
    wasPlaying.value = isPlaying.value

    if (isPlaying.value) {
        // 暂停游戏
        toggleGame()
    }

    showExitDialog.value = true
    dialog.warning({
        title: '确认退出',
        content: '确定要退出游戏吗？前游戏进度将丢失。',
        positiveText: '确定',
        negativeText: '取消',
        closeOnEsc: false,
        autoFocus: true,
        onKeydown: (e) => {
            if (e.key === 'Enter') {
                exitGame()
            }
        },
        onPositiveClick: () => {
            exitGame()
        },
        onNegativeClick: () => {
            // 如果之前在游戏中，恢复游戏
            if (wasPlaying.value) {
                toggleGame()
                wasPlaying.value = false
            }
            showExitDialog.value = false
        },
        onClose: () => {
            showExitDialog.value = false
            // 如果游戏之前是进行状态，则恢复游戏
            if (wasPlaying.value) {
                toggleGame()
                wasPlaying.value = false
            }
        }
    })
}

// 键盘控制
const handleKeyDown = (e: KeyboardEvent) => {
    // 处理 Esc 键
    if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        confirmExit()
        return
    }

    // 处理回车键
    if (e.key === 'Enter') {
        // 如果对话框正在显示，阻止游戏的回车键处理
        if (showExitDialog.value) {
            return
        }

        if (gameOver.value) {
            resetGame()
        } else {
            toggleGame()
        }
        return
    }

    // 如果游戏未开始或已暂停，不处理其他按键
    if (!isPlaying.value) return

    switch (e.key) {
        case 'ArrowLeft':
            movePiece(-1, 0)
            break
        case 'ArrowRight':
            movePiece(1, 0)
            break
        case 'ArrowDown':
            movePiece(0, 1)
            break
        case 'ArrowUp':
            rotatePiece()
            break
        case ' ':
            // 硬降
            while (movePiece(0, 1)) {
            }
            break
    }
}

// 判断是否为活动方块
const isActivePiece = (x: number, y: number) => {
    const pieceY = y - currentPiece.value.y
    const pieceX = x - currentPiece.value.x
    return (
        pieceY >= 0 &&
        pieceY < currentPiece.value.shape.length &&
        pieceX >= 0 &&
        pieceX < currentPiece.value.shape[0].length &&
        currentPiece.value.shape[pieceY][pieceX] === 1
    )
}

// 生命周期钩子
onMounted(() => {
    resetGame()
    boardRef.value?.focus()
})

onUnmounted(() => {
    if (gameInterval.value) {
        clearInterval(gameInterval.value)
    }
})
</script>

<style scoped>
.tetris-container {
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f5f5f5;
    position: relative;
}

.game-area {
    display: flex;
    gap: 20px;
}

.game-board {
    width: 300px;
    height: 600px;
    background-color: #fff;
    border: 2px solid #ddd;
    display: flex;
    flex-direction: column;
    outline: none;
    position: relative;
}

.row {
    display: flex;
    flex: 1;
}

.cell {
    flex: 1;
    border: 1px solid #eee;
    transition: background-color 0.1s;
}

.cell.filled {
    background-color: #409eff;
}

.cell.active {
    background-color: #67c23a;
}

.game-info {
    width: 200px;
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
    background-color: rgba(0, 0, 0, 0.5);
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
    color: #f56c6c;
}

.game-over p {
    margin: 0 0 10px;
    font-size: 18px;
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
}

.game-tips p {
    margin: 5px 0;
    color: #606266;
    font-size: 14px;
}
</style>