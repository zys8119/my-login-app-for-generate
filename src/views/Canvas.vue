<template>
    <div class="canvas-container">
        <!-- 头部面板 -->
        <div class="header-panel">
            <div class="header-left">
                <h2>画布编辑器</h2>
            </div>
            <div class="header-right">
                <n-button type="primary" @click="exportCanvas">
                    <template #icon>
                        <n-icon>
                            <download-outlined />
                        </n-icon>
                    </template>
                    导出图片
                </n-button>
            </div>
        </div>

        <!-- 主要内容区域 -->
        <div class="main-content">
            <!-- 右键菜单 -->
            <n-dropdown :show="showContextMenu" :options="contextMenuOptions" :x="contextMenuX" :y="contextMenuY"
                placement="bottom-start" @clickoutside="showContextMenu = false" @select="handleContextMenuSelect"
                @click.stop>
            </n-dropdown>
            <!-- 左侧元件面板 -->
            <components-panel @drag-start="handleDragStart" />

            <!-- 画布区域 -->
            <n-card class="canvas-area">
                <!-- 网格背景 -->
                <div class="grid-background" :style="{
                    backgroundSize: `${20}px ${20}px`,
                    opacity: 0.1
                }"></div>
                <!-- 缩放控制器 -->
                <div class="zoom-controller">
                    <n-space align="center" :size="12">
                        <n-slider v-model:value="zoomPercentage" :min="10" :max="300" :step="1" :tooltip="false"
                            style="width: 100px" @update:value="handleZoomChange"
                            :disabled="!canvasSettings.enableZoom" />
                        <n-select v-model:value="zoomPercentage" :options="zoomOptions" size="small"
                            style="width: 100px" @update:value="handleZoomChange"
                            :disabled="!canvasSettings.enableZoom">
                            <template #default="{ option }">
                                {{ option.label }}
                            </template>
                        </n-select>
                    </n-space>
                </div>
                <!-- 画布容器 -->
                <div class="canvas-wrapper" @drop="handleDrop" @dragover="handleDragOver"
                    @mousedown="handleCanvasMouseDown" @mousemove="handleCanvasMouseMove" @mouseup="handleCanvasMouseUp"
                    @wheel="handleCanvasWheel" :style="{
                        transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`,
                        cursor: isSpacePressed ? 'grab' : 'default'
                    }">
                    <es-drager v-for="element in elements" :key="element.id" v-model:width="element.width"
                        v-model:height="element.height" v-model:left="element.left" v-model:top="element.top"
                        v-model:angle="element.angle" :resizable="true" :rotatable="true" :boundary="false"
                        :markline="true" :snap-to-grid="true" :grid-x="gridSize" :grid-y="gridSize" :snap="true"
                        :snap-threshold="10" :border="true" class="drager-item"
                        @change="(data) => handleElementChange(element.id, data)"
                        @focus="() => handleElementFocus(element.id)" @blur="() => handleElementBlur(element.id)"
                        @contextmenu.prevent.stop="(e) => handleContextMenu(e, element.id)">
                        <div class="drag-element" :style="{ backgroundColor: element.color }">
                            <!-- 图片 -->
                            <img v-if="element.type === 'image'" :src="element.imageUrl"
                                style="width: 100%; height: 100%; object-fit: contain;" />
                            <!-- PDF -->
                            <iframe v-else-if="element.type === 'pdf'" :src="element.fileUrl"
                                style="width: 100%; height: 100%; border: none;" />
                            <!-- 视频 -->
                            <video v-else-if="element.type === 'video'" :src="element.fileUrl"
                                style="width: 100%; height: 100%;" controls />
                            <!-- 音频 -->
                            <audio v-else-if="element.type === 'audio'" :src="element.fileUrl" style="width: 100%;"
                                controls />
                            <!-- Office 文件和文本 -->
                            <div v-else-if="['excel', 'word', 'ppt', 'text'].includes(element.type || '')"
                                class="file-preview">
                                <n-icon size="32" class="file-icon">
                                    <component :is="getFileIcon(element.type)" />
                                </n-icon>
                                <div class="file-name">{{ element.fileName }}</div>
                                <n-button size="small" @click="openFile(element)">打开文件</n-button>
                            </div>
                            <div class="element-info" v-if="element.selected">
                                <div>位置: ({{ Math.round(element.left) }}, {{ Math.round(element.top) }})</div>
                                <div>大小: {{ Math.round(element.width) }} x {{ Math.round(element.height) }}</div>
                                <div>角度: {{ Math.round(element.angle) }}°</div>
                            </div>
                        </div>
                    </es-drager>
                </div>
                <!-- 鸟瞰图 -->
                <div class="minimap">
                    <div class="minimap-content" :style="minimapStyle">
                        <!-- 可视区域指示器 -->
                        <div class="minimap-viewport" :style="viewportStyle"></div>
                        <!-- 元素缩略图 -->
                        <div v-for="element in elements" :key="element.id" class="minimap-element"
                            :style="getMinimapElementStyle(element)">
                        </div>
                    </div>
                </div>
            </n-card>

            <!-- 右侧属性面板 -->
            <properties-panel :current-element="currentElement" :elements="elements" :canvas-settings="canvasSettings"
                @update:element="handlePropertyChange" />
        </div>

        <!-- AI 助手面板 -->
        <div v-if="showAiPanel" class="ai-assistant-panel" :style="aiPanelPosition">
            <div class="panel-header">
                <span>{{ aiPanelType === 'qa' ? 'AI 问答' : 'AI 总结' }}</span>
                <n-button quaternary circle size="small" @click="closeAiPanel">
                    <template #icon>
                        <n-icon><close-outlined /></n-icon>
                    </template>
                </n-button>
            </div>
            <div class="panel-content">
                <template v-if="aiPanelType === 'qa'">
                    <n-input v-model:value="aiPrompt" type="textarea" placeholder="请输入您的需求..."
                        :autosize="{ minRows: 3, maxRows: 5 }" />
                    <n-button type="primary" block :loading="aiLoading" @click="handleAiSubmit">
                        生成
                    </n-button>
                </template>
                <template v-else-if="aiPanelType === 'summary'">
                    <div class="empty-panel">
                        <n-empty description="暂无内容" />
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watchEffect } from 'vue'
import { NCard, NIcon, NForm, NFormItem, NInputNumber, NSpace, NColorPicker, NEmpty, NSlider, NSelect, NDropdown, NButton, NSwitch, NCollapse, NCollapseItem, useMessage, NInput } from 'naive-ui'
import EsDrager from 'es-drager'
import type { DragData } from 'es-drager'
import { BorderOutlined, FileExcelOutlined, FileWordOutlined, FilePptOutlined, FileTextOutlined, DownloadOutlined, CloseOutlined } from '@vicons/antd'
import type { DropdownOption } from 'naive-ui'
import ComponentsPanel from '../components/ComponentsPanel.vue'
import PropertiesPanel from '../components/PropertiesPanel.vue'

interface Element extends ElementStyle {
    id: number
    type?: 'rectangle' | 'image' | 'pdf' | 'video' | 'excel' | 'word' | 'ppt' | 'text' | 'audio'
    imageUrl?: string
    fileUrl?: string
    fileName?: string
    fileType?: string
}

interface ElementStyle {
    width: number
    height: number
    left: number
    top: number
    angle: number
    color: string
    selected: boolean
}

// 画布上的所有元素
const elements = reactive<Element[]>([])

// 当前选中的元素
const currentElement = ref<number | null>(null)

// 画���全局设置
const canvasSettings = reactive({
    enableDrag: true,
    enableZoom: true
})

// 监听全局设置变化
watchEffect(() => {
    if (!canvasSettings.enableZoom) {
        // 禁用缩放时，重置缩放比例为 100%
        zoomPercentage.value = 100
    }
})

// 元素改变事件
const handleElementChange = (id: number, data: DragData) => {
    // 更新元素位置大小
    const element = elements.find(el => el.id === id)
    if (element) {
        element.width = data.width
        element.height = data.height
        element.left = data.left
        element.top = data.top
        element.angle = data.angle
    }
    console.log('元素改变:', id, data)
}

// 开始拖拽
const handleDragStart = (e: DragEvent) => {
    if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', 'rectangle')
        e.dataTransfer.effectAllowed = 'copy'
    }
}

// 处理系统图片拖拽
const handleImageDrop = (e: DragEvent, imageUrl: string) => {
    const rect = e.currentTarget?.getBoundingClientRect()
    if (rect) {
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // 创建图片元素以获实际尺寸
        const img = new Image()
        img.src = imageUrl
        img.onload = () => {
            // 计算合适的尺寸，保高比
            const maxSize = 200
            let width = img.width
            let height = img.height

            if (width > height) {
                if (width > maxSize) {
                    height = (height * maxSize) / width
                    width = maxSize
                }
            } else {
                if (height > maxSize) {
                    width = (width * maxSize) / height
                    height = maxSize
                }
            }

            elements.push({
                id: Date.now(),
                width,
                height,
                left: x - width / 2,
                top: y - height / 2,
                angle: 0,
                color: '#ffffff',
                selected: false,
                type: 'image',
                imageUrl
            })
        }
    }
}

// 选中事件
const handleElementFocus = (id: number) => {
    // 如果点击的是已选中的元素，不做任何处理
    if (currentElement.value === id) return

    // 先取消所有元素的选中状态
    elements.forEach(el => {
        el.selected = false
    })

    const element = elements.find(el => el.id === id)
    if (element) {
        element.selected = true
        currentElement.value = id
    }
}

// 取消选中事件
const handleElementBlur = (id: number) => {
    // 如果右键菜单显示或正在拖拽，不取消选中状态
    if (showContextMenu.value || isDragging.value) return

    // 如果点击的是其他元素，让 handleElementFocus 处理选中状态
    if (currentElement.value !== id) return

    // 点击空白处时取消选中状态
    const element = elements.find(el => el.id === id)
    if (element) {
        element.selected = false
        currentElement.value = null
    }
}

// 拖拽结束
const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    // 处理从组件面板拖拽的矩形
    const dragType = e.dataTransfer?.getData('text/plain')
    if (dragType === 'rectangle') {
        const rect = e.currentTarget?.getBoundingClientRect()
        if (rect) {
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            elements.push({
                id: Date.now(),
                width: 100,
                height: 100,
                left: x - 50,
                top: y - 50,
                angle: 0,
                color: '#409eff',
                selected: false,
                type: 'rectangle'
            })
        }
        return
    }

    // 处理文件拖拽
    if (e.dataTransfer?.files.length) {
        const file = e.dataTransfer.files[0]
        handleFileDrop(e, file)
    } else if (e.dataTransfer?.getData('text').match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        // 处理图片 URL 拖拽
        const imageUrl = e.dataTransfer.getData('text')
        handleImageDrop(e, imageUrl)
    }
}

// 允许放置
const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy'
    }
}

// 画布状态
const scale = ref(1)
const offset = reactive({ x: 0, y: 0 })
const isSpacePressed = ref(false)
const isDragging = ref(false)
const lastMousePosition = reactive({ x: 0, y: 0 })

// 计算网格大小
const gridSize = computed(() => Math.max(10, Math.round(20 * scale.value)))

// 键盘事件处理
const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !isSpacePressed.value) {
        isSpacePressed.value = true
        e.preventDefault()
    }
}

const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
        isSpacePressed.value = false
        isDragging.value = false
    }
}

// 画布拖拽
const handleCanvasMouseDown = (e: MouseEvent) => {
    // 点画布空白处时消所有选中状态
    if (e.target === e.currentTarget && !showContextMenu.value) {
        elements.forEach(el => {
            el.selected = false
        })
        currentElement.value = null
    }

    if (isSpacePressed.value && canvasSettings.enableDrag) {
        isDragging.value = true
        lastMousePosition.x = e.clientX
        lastMousePosition.y = e.clientY
    }
}

const handleCanvasMouseMove = (e: MouseEvent) => {
    if (isDragging.value && isSpacePressed.value && canvasSettings.enableDrag) {
        const deltaX = e.clientX - lastMousePosition.x
        const deltaY = e.clientY - lastMousePosition.y
        offset.x += deltaX / scale.value
        offset.y += deltaY / scale.value
        lastMousePosition.x = e.clientX
        lastMousePosition.y = e.clientY
    }
}

const handleCanvasMouseUp = () => {
    isDragging.value = false
}

// 画布缩放
const handleCanvasWheel = (e: WheelEvent) => {
    if (!canvasSettings.enableZoom) return

    e.preventDefault()
    const oldScale = scale.value
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = scale.value * delta

    // 限制缩放范围
    if (newScale >= 0.1 && newScale <= 3) {
        // 获取鼠标相对画布的位置
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const mouseX = (e.clientX - rect.left) / oldScale
        const mouseY = (e.clientY - rect.top) / oldScale

        // 计算新的偏移量，保持中心点不变
        offset.x = mouseX - (mouseX - offset.x) * (newScale / oldScale)
        offset.y = mouseY - (mouseY - offset.y) * (newScale / oldScale)

        scale.value = newScale

        // 更新缩放百分比显示
        zoomPercentage.value = Math.round(newScale * 100)
    }
}

// 生命周期子
onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
})

// 获取当前选中元素
const selectedElement = computed(() => {
    if (currentElement.value === null) return null
    return elements.find(el => el.id === currentElement.value)
})

// 处理属性变更
const handlePropertyChange = () => {
    // 属性面板的值改变时会自动更新到 elements 数组
    // 因为使用的是响应式引用
    console.log('属性已更新')
}

// 鸟瞰图相关
const MINIMAP_SIZE = 200 // 鸟瞰图的大小
const minimapScale = ref(1)

// 计算画布的实际范围
const canvasBounds = computed(() => {
    if (elements.length === 0) {
        return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 }
    }

    return elements.reduce((bounds, element) => {
        const left = element.left
        const top = element.top
        const right = left + element.width
        const bottom = top + element.height

        return {
            minX: Math.min(bounds.minX, left),
            minY: Math.min(bounds.minY, top),
            maxX: Math.max(bounds.maxX, right),
            maxY: Math.max(bounds.maxY, bottom)
        }
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity })
})

// 计算鸟瞰图的样式
const minimapStyle = computed(() => {
    const bounds = canvasBounds.value
    const width = bounds.maxX - bounds.minX
    const height = bounds.maxY - bounds.minY
    const ratio = width / height

    let minimapWidth = MINIMAP_SIZE
    let minimapHeight = MINIMAP_SIZE

    if (ratio > 1) {
        minimapHeight = MINIMAP_SIZE / ratio
    } else {
        minimapWidth = MINIMAP_SIZE * ratio
    }

    minimapScale.value = minimapWidth / width

    return {
        width: `${minimapWidth}px`,
        height: `${minimapHeight}px`
    }
})

// 计算可视区域指示器的样式
const viewportStyle = computed(() => {
    const bounds = canvasBounds.value
    const wrapper = document.querySelector('.canvas-wrapper')
    if (!wrapper) return {}

    const rect = wrapper.getBoundingClientRect()
    const viewportWidth = rect.width / scale.value
    const viewportHeight = rect.height / scale.value

    return {
        width: `${viewportWidth * minimapScale.value}px`,
        height: `${viewportHeight * minimapScale.value}px`,
        transform: `translate(${-offset.x * minimapScale.value}px, ${-offset.y * minimapScale.value}px)`
    }
})

// 计算每个元素在鸟瞰图中的样式
const getMinimapElementStyle = (element: Element) => {
    const bounds = canvasBounds.value
    const style = {
        left: `${(element.left - bounds.minX) * minimapScale.value}px`,
        top: `${(element.top - bounds.minY) * minimapScale.value}px`,
        width: `${element.width * minimapScale.value}px`,
        height: `${element.height * minimapScale.value}px`,
        transform: `rotate(${element.angle}deg)`
    }
    // 添加过渡效果
    style.transition = 'all 0.05s linear'
    return style
}

// 缩放选项
const zoomOptions = [
    { label: '50%', value: 50 },
    { label: '100%', value: 100 },
    { label: '150%', value: 150 },
    { label: '200%', value: 200 }
]

// 缩放百分比
const zoomPercentage = computed({
    get: () => Math.round(scale.value * 100),
    set: (value) => {
        const oldScale = scale.value
        const newScale = value / 100
        scale.value = newScale

        // 重新计算偏移量，使画布保持在中心
        const wrapper = document.querySelector('.canvas-wrapper')
        if (wrapper) {
            const rect = wrapper.getBoundingClientRect()
            // 计算画布中心点
            const centerX = rect.width / 2 / oldScale
            const centerY = rect.height / 2 / oldScale

            // 计算新的偏移量，保持中心点不变
            offset.x = centerX - (centerX - offset.x) * (newScale / oldScale)
            offset.y = centerY - (centerY - offset.y) * (newScale / oldScale)
        }
    }
})

// 处理缩放变化
const handleZoomChange = (value: number | string) => {
    zoomPercentage.value = value
}

// 右键菜单状态
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

// 右键菜单选项
const contextMenuOptions = [
    {
        label: 'AI 助手',
        key: 'ai',
        children: [
            {
                label: '问答',
                key: 'ai-qa'
            },
            {
                label: '总结',
                key: 'ai-summary'
            }
        ]
    },
    { type: 'divider', key: 'd0' },
    {
        label: '删除',
        key: 'delete'
    },
    {
        label: '复制',
        key: 'copy'
    },
    {
        type: 'divider',
        key: 'd1'
    },
    {
        label: '置顶',
        key: 'bringToFront'
    },
    {
        label: '置底',
        key: 'sendToBack'
    },
    {
        label: '上移一层',
        key: 'bringForward'
    },
    {
        label: '下移一层',
        key: 'sendBackward'
    }
]

// 处理右键菜单选择
const handleContextMenuSelect = (key: string) => {
    if (!currentElement.value) return

    switch (key) {
        case 'ai-qa':
            showAiPanel.value = true
            aiPanelType.value = 'qa'
            showContextMenu.value = false
            break
        case 'ai-summary':
            showAiPanel.value = true
            aiPanelType.value = 'summary'
            showContextMenu.value = false
            break
        case 'delete':
            const index = elements.findIndex(el => el.id === currentElement.value)
            if (index !== -1) {
                elements.splice(index, 1)
                currentElement.value = null
            }
            break
        case 'copy':
            const element = elements.find(el => el.id === currentElement.value)
            if (element) {
                const newElement = { ...element }
                newElement.id = Date.now()
                newElement.left += 10
                newElement.top += 10
                elements.push(newElement)
            }
            break
        case 'bringToFront':
            moveElement(currentElement.value, elements.length - 1)
            break
        case 'sendToBack':
            moveElement(currentElement.value, 0)
            break
        case 'bringForward':
            const currentIndex = elements.findIndex(el => el.id === currentElement.value)
            if (currentIndex < elements.length - 1) {
                moveElement(currentElement.value, currentIndex + 1)
            }
            break
        case 'sendBackward':
            const idx = elements.findIndex(el => el.id === currentElement.value)
            if (idx > 0) {
                moveElement(currentElement.value, idx - 1)
            }
            break
    }
    showContextMenu.value = false
}

// 移动元素到指定位置
const moveElement = (id: number, targetIndex: number) => {
    const sourceIndex = elements.findIndex(el => el.id === id)
    if (sourceIndex !== -1) {
        const [element] = elements.splice(sourceIndex, 1)
        elements.splice(targetIndex, 0, element)
    }
}

// 处理右键菜单
const handleContextMenu = (e: MouseEvent, id: number) => {
    e.stopPropagation()
    showContextMenu.value = true
    contextMenuX.value = e.clientX
    contextMenuY.value = e.clientY
    currentElement.value = id
}

// 处理拖拽文件
const handleFileDrop = (e: DragEvent, file: File) => {
    const rect = e.currentTarget?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const fileUrl = URL.createObjectURL(file)

    // 基本元素属性
    const baseElement = {
        id: Date.now(),
        width: 300,
        height: 200,
        left: x - 150,
        top: y - 100,
        angle: 0,
        color: '#ffffff',
        selected: false,
        fileName: file.name,
        fileUrl,
        fileType: file.type
    }

    // 根据文件类型创建不同的元素
    if (file.type.startsWith('image/')) {
        handleImageDrop(e, fileUrl)
        return
    }

    let type: Element['type']
    let width = 300
    let height = 200

    if (file.type === 'application/pdf') {
        type = 'pdf'
        height = 400
    } else if (file.type.startsWith('video/')) {
        type = 'video'
        height = 200
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel') {
        type = 'excel'
        height = 400
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword') {
        type = 'word'
        height = 400
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        file.type === 'application/vnd.ms-powerpoint') {
        type = 'ppt'
        height = 300
    } else if (file.type === 'text/plain') {
        type = 'text'
        height = 300
    } else if (file.type.startsWith('audio/')) {
        type = 'audio'
        width = 300
        height = 100
    } else {
        return // 不支持文件类型
    }

    elements.push({
        ...baseElement,
        type,
        width,
        height
    })
}

// 获取文件图标
const getFileIcon = (type?: string) => {
    switch (type) {
        case 'excel': return FileExcelOutlined
        case 'word': return FileWordOutlined
        case 'ppt': return FilePptOutlined
        case 'text': return FileTextOutlined
        default: return FileTextOutlined
    }
}

// 打开文件
const openFile = (element: Element) => {
    if (element.fileUrl) {
        window.open(element.fileUrl, '_blank')
    }
}

// 默认展开的面板
const defaultExpandedNames = ref(['1', '2'])

// 导出图片
const exportCanvas = async () => {
    try {
        // 创建一个新的 canvas
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('无法创建 canvas 上下文')

        // 获取画布容器
        const wrapper = document.querySelector('.canvas-wrapper')
        if (!wrapper) throw new Error('找不到画布容器')

        // 设置 canvas 大小
        const rect = wrapper.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = rect.height

        // 绘制背景
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // 绘制网格（可选）
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
        ctx.lineWidth = 1
        const gridSize = 20
        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, canvas.height)
            ctx.stroke()
        }
        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(canvas.width, y)
            ctx.stroke()
        }

        // 绘制所有元素
        for (const element of elements) {
            ctx.save()

            // 设置变换
            const centerX = element.left + element.width / 2
            const centerY = element.top + element.height / 2
            ctx.translate(centerX, centerY)
            ctx.rotate((element.angle * Math.PI) / 180)
            ctx.translate(-centerX, -centerY)

            // 绘制元素
            if (element.type === 'image' && element.imageUrl) {
                // 绘制图片
                const img = new Image()
                img.src = element.imageUrl
                await new Promise((resolve) => {
                    img.onload = resolve
                })
                ctx.drawImage(img, element.left, element.top, element.width, element.height)
            } else {
                // 绘制矩形
                ctx.fillStyle = element.color
                ctx.fillRect(element.left, element.top, element.width, element.height)
            }

            ctx.restore()
        }

        // 导出图片
        const dataUrl = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.download = '画布导出.png'
        link.href = dataUrl
        link.click()

        message.success('导出成功')
    } catch (error) {
        message.error('导出失败：' + (error as Error).message)
    }
}

// AI 面板类型
type AiPanelType = 'qa' | 'summary' | null

// AI 面板相关状态
const showAiPanel = ref(false)
const aiPrompt = ref('')
const aiLoading = ref(false)
const aiPanelType = ref<AiPanelType>(null)

// AI 面板位置计算
const aiPanelPosition = computed(() => {
    if (!currentElement.value) return {}
    const element = elements.find(el => el.id === currentElement.value)
    if (!element) return {}

    // 获取画布容器的位置
    const canvasWrapper = document.querySelector('.canvas-wrapper')
    if (!canvasWrapper) return {}
    const canvasRect = canvasWrapper.getBoundingClientRect()

    // 计算元素在视口中的实际位置
    const elementX = canvasRect.left + element.left * scale.value
    const elementY = canvasRect.top + element.top * scale.value

    return {
        position: 'fixed',
        top: `${elementY}px`,
        left: `${elementX + element.width * scale.value + 10}px`,
        zIndex: 1000
    }
})

// 关闭 AI 面板
const closeAiPanel = () => {
    showAiPanel.value = false
    aiPrompt.value = ''
    aiPanelType.value = null
}

// 处理 AI 提交
const handleAiSubmit = async () => {
    if (!aiPrompt.value.trim()) {
        message.warning('请输入您的需求')
        return
    }

    aiLoading.value = true
    try {
        // TODO: 这里添加 AI 接口调用
        await new Promise(resolve => setTimeout(resolve, 1000))
        message.success('AI 处理完成')
        closeAiPanel()
    } catch (error) {
        message.error('AI 处理失败')
    } finally {
        aiLoading.value = false
    }
}
</script>

<style scoped>
.canvas-container {
    padding: 20px;
    background-color: #f5f5f5;
    height: 100vh;
    box-sizing: border-box;
    position: relative;
}

.components-panel {
    width: 240px;
    flex-shrink: 0;
}

.properties-panel {
    width: 300px;
    flex-shrink: 0;
}

.canvas-area {
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
}

.component-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

.component-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-radius: 4px;
    cursor: move;
    transition: all 0.3s;
    width: 100%;
}

.component-item:hover {
    background-color: rgba(64, 158, 255, 0.1);
}

.component-icon {
    color: #409eff;
}

.component-name {
    font-size: 14px;
    color: #606266;
}

.canvas-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 4px;
    transform-origin: 0 0;
    transition: transform 0.05s linear;
    z-index: 1;
    background-color: transparent;
}

.drager-item {
    position: relative;
    width: 100%;
    height: 600px;
    border-radius: 4px;
}

.drag-element {
    width: 100%;
    height: 100%;
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: move;
    border-radius: 4px;
    user-select: none;
    transition: background-color 0.3s;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.element-content {
    font-size: 16px;
    margin-bottom: 10px;
}

.element-info {
    font-size: 12px;
    opacity: 0.8;
}

.element-info>div {
    margin: 2px 0;
}

/* 选中状态样式 */
.drag-element:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* 辅助线样式 */
:deep(.es-drager__line) {
    background-color: #409eff;
    opacity: 0.5;
}

/* 旋转手柄样式 */
:deep(.es-drager__rotate-handle) {
    background-color: #409eff;
    border-color: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 缩放手柄样式 */
:deep(.es-drager__resize-handle) {
    background-color: #fff;
    border: 2px solid #409eff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.grid-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    background-image:
        linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
        linear-gradient(180deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
    background-color: #fff;
    z-index: 0;
}

.no-selection {
    padding: 20px;
    text-align: center;
    color: #909399;
}

.minimap {
    position: absolute;
    right: 20px;
    bottom: 20px;
    border: 1px solid #dcdfe6;
    background-color: #fff;
    border-radius: 4px;
    padding: 10px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.minimap-content {
    position: relative;
    background-color: #f5f5f5;
    border-radius: 2px;
    overflow: hidden;
}

.minimap-viewport {
    position: absolute;
    border: 2px solid #409eff;
    background-color: rgba(64, 158, 255, 0.1);
    pointer-events: none;
}

.minimap-element {
    position: absolute;
    background-color: #909399;
    border-radius: 2px;
    will-change: transform, left, top, width, height;
}

.zoom-controller {
    position: absolute;
    left: 20px;
    bottom: 20px;
    background-color: #fff;
    border-radius: 4px;
    padding: 8px 12px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    z-index: 1;
    opacity: 1;
    transition: opacity 0.3s;
}

.zoom-controller:has(.n-slider--disabled) {
    opacity: 0.5;
    pointer-events: none;
}

.zoom-controller .n-space {
    margin-bottom: 10px;
}

.zoom-controller .n-slider {
    width: 100px;
}

.zoom-controller .n-select {
    width: 100px;
}

.file-preview {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 20px;
    background-color: #f5f7fa;
}

.file-icon {
    font-size: 48px;
    color: #409eff;
}

.file-name {
    font-size: 14px;
    color: #606266;
    text-align: center;
    word-break: break-word;
    max-width: 100%;
    margin-bottom: 8px;
}

.header-panel {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background-color: #fff;
    border-bottom: 1px solid #dcdfe6;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 2;
}

.header-left h2 {
    margin: 0;
    font-size: 18px;
    color: #303133;
}

.main-content {
    padding-top: 60px;
    height: 100%;
    display: flex;
    gap: 20px;
}

.export-button {
    background-color: #409eff;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
}

.export-button:hover {
    background-color: #66b1ff;
}

.ai-assistant-panel {
    width: 300px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    position: fixed;
}

.panel-header {
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #f8f9fa;
}

.panel-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.panel-header span {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
}

.empty-panel {
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>