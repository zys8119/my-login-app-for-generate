<template>
    <div class="pdf-preview" :class="{ 'dark-theme': isDarkTheme }">
        <div class="pdf-controls">
            <div class="controls-container">
                <div class="left-controls">
                    <n-space align="center">
                        <n-button @click="prevPage" :disabled="currentPage <= 1">上一页</n-button>
                        <n-input-number v-model:value="currentPage" :min="1" :max="totalPages" />
                        <span>/ {{ totalPages }}</span>
                        <n-button @click="nextPage" :disabled="currentPage >= totalPages">下一页</n-button>
                        <n-select v-model:value="scale" :options="scaleOptions" style="width: 120px" />
                        <n-divider vertical />
                        <n-button-group>
                            <n-button :type="annotationMode === 'draw' ? 'primary' : 'default'"
                                @click="setAnnotationMode('draw')">
                                <template #icon>
                                    <n-icon>
                                        <pencil />
                                    </n-icon>
                                </template>
                                绘制
                            </n-button>
                            <n-button :type="annotationMode === 'text' ? 'primary' : 'default'"
                                @click="setAnnotationMode('text')">
                                <template #icon>
                                    <n-icon><text-outline /></n-icon>
                                </template>
                                文字
                            </n-button>
                            <n-button @click="clearAnnotations">
                                <template #icon>
                                    <n-icon><trash-outline /></n-icon>
                                </template>
                                清除
                            </n-button>
                        </n-button-group>
                        <n-color-picker v-model:value="annotationColor" :show-alpha="false" style="width: 40px" />
                    </n-space>
                </div>
                <div class="right-controls">
                    <n-button circle @click="toggleTheme">
                        <template #icon>
                            <n-icon>
                                <moon-outline v-if="!isDarkTheme" />
                                <sunny-outline v-else />
                            </n-icon>
                        </template>
                    </n-button>
                </div>
            </div>
        </div>
        <div class="preview-container">
            <template v-if="pdfUrl">
                <div class="pdf-container" ref="containerRef">
                    <canvas ref="canvasRef" class="pdf-canvas"></canvas>
                    <canvas ref="annotationCanvasRef" class="annotation-canvas" @mousedown="startDrawing"
                        @mousemove="draw" @mouseup="stopDrawing" @mouseleave="stopDrawing"></canvas>
                </div>
            </template>
            <template v-else>
                <n-empty description="未找到PDF文件">
                    <template #extra>
                        <n-text>请在URL中添加file参数指定PDF文件地址</n-text>
                    </template>
                </n-empty>
            </template>
        </div>
        <div class="background-layer"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import { NEmpty, NText, NButton, NSpace, NInputNumber, NSelect, NButtonGroup, NDivider, NColorPicker, NIcon } from 'naive-ui'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.js?url'
import { Pencil, TextOutline, TrashOutline, MoonOutline, SunnyOutline } from '@vicons/ionicons5'

// 使用本地的 worker 文件
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

const route = useRoute()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const pdfDoc = shallowRef<any>(null)
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.5)
const loading = ref(false)

const scaleOptions = [
    { label: '50%', value: 0.5 },
    { label: '75%', value: 0.75 },
    { label: '100%', value: 1.0 },
    { label: '150%', value: 1.5 },
    { label: '200%', value: 2.0 },
]

// 从URL参数中获取PDF文件地址
const pdfUrl = computed(() => route.query.file as string)

const containerRef = ref<HTMLDivElement | null>(null)
const annotationCanvasRef = ref<HTMLCanvasElement | null>(null)
const annotationMode = ref<'draw' | 'text' | null>(null)
const annotationColor = ref('#FF0000')
const isDrawing = ref(false)
const lastX = ref(0)
const lastY = ref(0)

// 存储每页的批注
const annotations = ref<Map<number, ImageData>>(new Map())

// 设置批注模式
const setAnnotationMode = (mode: 'draw' | 'text') => {
    annotationMode.value = annotationMode.value === mode ? null : mode
}

// 开始绘制
const startDrawing = (e: MouseEvent) => {
    if (annotationMode.value !== 'draw') return

    isDrawing.value = true
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    lastX.value = e.clientX - rect.left
    lastY.value = e.clientY - rect.top
}

// 绘制
const draw = (e: MouseEvent) => {
    if (!isDrawing.value || annotationMode.value !== 'draw' || !annotationCanvasRef.value) return

    const rect = annotationCanvasRef.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = annotationCanvasRef.value.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.strokeStyle = annotationColor.value
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.moveTo(lastX.value, lastY.value)
    ctx.lineTo(x, y)
    ctx.stroke()

    lastX.value = x
    lastY.value = y
}

// 停止绘制
const stopDrawing = () => {
    if (isDrawing.value && annotationCanvasRef.value) {
        // 保存当前页的批注
        const imageData = annotationCanvasRef.value
            .getContext('2d')
            ?.getImageData(0, 0, annotationCanvasRef.value.width, annotationCanvasRef.value.height)

        if (imageData) {
            annotations.value.set(currentPage.value, imageData)
        }
    }
    isDrawing.value = false
}

// 清除当前页批注
const clearAnnotations = () => {
    if (!annotationCanvasRef.value) return
    const ctx = annotationCanvasRef.value.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, annotationCanvasRef.value.width, annotationCanvasRef.value.height)
    annotations.value.delete(currentPage.value)
}

// 修改渲染页面函数
const renderPage = async (pageNum: number) => {
    if (!pdfDoc.value || !canvasRef.value || !annotationCanvasRef.value) return

    try {
        const pageProxy = await pdfDoc.value.getPage(pageNum)
        const canvas = canvasRef.value
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const viewport = pageProxy.getViewport({ scale: scale.value })

        // 设置PDF画布尺寸
        canvas.width = viewport.width
        canvas.height = viewport.height

        // 设置批注画布尺寸
        annotationCanvasRef.value.width = viewport.width
        annotationCanvasRef.value.height = viewport.height

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
            enableWebGL: true,
            renderInteractiveForms: true
        }

        try {
            await pageProxy.render(renderContext).promise

            // 恢复该页的批注
            const savedAnnotation = annotations.value.get(pageNum)
            if (savedAnnotation) {
                const annotationCtx = annotationCanvasRef.value.getContext('2d')
                annotationCtx?.putImageData(savedAnnotation, 0, 0)
            }
        } catch (renderError) {
            console.error('Render error:', renderError)
        }
    } catch (error) {
        console.error('Error getting page:', error)
    }
}

// 加载PDF文档
const loadPDF = async () => {
    if (!pdfUrl.value || loading.value) return

    try {
        loading.value = true

        // 创建加载任务
        const loadingTask = pdfjsLib.getDocument({
            url: pdfUrl.value,
            enableXfa: true,
            isEvalSupported: true,
            useSystemFonts: true
        })

        try {
            // 等待文档加载完成
            const pdfDocument = await loadingTask.promise

            pdfDoc.value = pdfDocument
            totalPages.value = pdfDocument.numPages
            currentPage.value = 1

            // 渲染第一页
            await renderPage(1)
        } catch (loadError) {
            console.error('Document load error:', loadError)
        }
    } catch (error) {
        console.error('Task creation error:', error)
    } finally {
        loading.value = false
    }
}

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
    }
}

const nextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++
    }
}

// 监听页面变化
watch(currentPage, () => {
    renderPage(currentPage.value)
})

// 监听缩放变化
watch(scale, () => {
    renderPage(currentPage.value)
})

// 监听URL变化
watch(pdfUrl, () => {
    loadPDF()
})

// 添加深色主题状态
const isDarkTheme = ref(false)

// 切换主题
const toggleTheme = () => {
    isDarkTheme.value = !isDarkTheme.value
}

onMounted(() => {
    if (pdfUrl.value) {
        loadPDF()
    }
})
</script>

<style scoped>
.pdf-preview {
    min-height: 100vh;
    padding-top: 60px;
    position: relative;
    /* 移除背景色，由background-layer提供 */
}

.background-layer {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #f5f5f5;
    z-index: -1;
}

.preview-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    min-height: calc(100vh - 80px);
    background-color: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    position: relative;
    z-index: 1;
}

.pdf-controls {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding: 10px 20px;
    background-color: #fff;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 深色主题样式 */
.dark-theme .background-layer {
    background-color: #18181c;
}

.dark-theme .preview-container {
    background-color: #242424;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

.dark-theme .pdf-controls {
    background-color: #242424;
    border-bottom-color: #333;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.dark-theme .n-button:not(.n-button--primary) {
    background-color: #333;
    border-color: #444;
    color: #fff;
}

.dark-theme .n-input-number {
    background-color: #333;
    border-color: #444;
    color: #fff;
}

.dark-theme .n-select {
    background-color: #333;
    border-color: #444;
    color: #fff;
}

.dark-theme canvas {
    filter: brightness(0.9) contrast(1.1);
    /* 调整PDF在深色主题下的显示效果 */
}

/* 添加平滑过渡效果 */
.pdf-preview,
.preview-container,
.pdf-controls,
.background-layer,
canvas {
    transition: all 0.3s ease;
}

.pdf-container {
    position: relative;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    /* 水平居中 */
}

.pdf-canvas,
.annotation-canvas {
    position: absolute;
    top: 0;
    left: 50%;
    /* 配合transform实现居中 */
    transform: translateX(-50%);
}

.annotation-canvas {
    z-index: 1;
}

.controls-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    gap: 16px;
}

.left-controls {
    flex: 1;
    min-width: 0;
}

.right-controls {
    flex-shrink: 0;
}

:deep(.n-color-picker) {
    flex-shrink: 0;
    min-width: 40px;
}

:deep(.n-button) {
    white-space: nowrap;
}

/* 修改深色主题下的组件样式 */
.dark-theme :deep(.n-base-selection) {
    background-color: #fff !important;
    border-color: #eee !important;
}

.dark-theme :deep(.n-input-number-base) {
    background-color: #fff !important;
    border-color: #eee !important;
}

.dark-theme :deep(.n-input__input-el) {
    color: #000 !important;
}

.dark-theme :deep(.n-base-selection-label) {
    color: #000 !important;
}

.dark-theme :deep(.n-base-selection-tags) {
    color: #000 !important;
}

/* 保持下拉菜单选项的深色主题 */
.dark-theme :deep(.n-base-selection-menu) {
    background-color: #242424 !important;
    border-color: #333 !important;
}

.dark-theme :deep(.n-base-selection-option) {
    color: #fff !important;
}

.dark-theme :deep(.n-base-selection-option--selected) {
    background-color: #333 !important;
}

/* 调整分页数字的颜色 */
.dark-theme span {
    color: #fff;
}
</style>