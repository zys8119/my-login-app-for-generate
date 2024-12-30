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
                        <n-color-picker v-model:value="annotationColor" :show-alpha="false" :show-preview="true"
                            :show-input="false" :actions="[]" class="color-picker-button" />
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
                <div class="pdf-container" ref="containerRef" @wheel="handleWheel">
                    <canvas ref="canvasRef" class="pdf-canvas"></canvas>
                    <canvas ref="annotationCanvasRef" class="annotation-canvas" @mousedown="startAnnotation"
                        @mousemove="draw" @mouseup="stopAnnotation" @mouseleave="stopAnnotation"
                        @dblclick="handleCanvasDoubleClick"></canvas>
                    <div v-if="showTextInput" class="text-input-container" :style="textInputStyle">
                        <n-input ref="textInputRef" v-model:value="textContent" type="textarea"
                            :autosize="{ minRows: 1 }" @blur="confirmTextAnnotation"
                            @keydown.enter.prevent="confirmTextAnnotation" />
                    </div>
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
import { ref, computed, onMounted, watch, shallowRef, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { NEmpty, NText, NButton, NSpace, NInputNumber, NSelect, NButtonGroup, NDivider, NColorPicker, NIcon, NInput } from 'naive-ui'
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
const scale = ref<number | 'auto'>('auto')
const loading = ref(false)

const scaleOptions = [
    { label: '自动适应', value: 'auto' },
    { label: '50%', value: 0.5 },
    { label: '75%', value: 0.75 },
    { label: '100%', value: 1.0 },
    { label: '150%', value: 1.5 },
    { label: '200%', value: 2.0 },
] as const

// 从URL参数中获取PDF文件地址
const pdfUrl = computed(() => route.query.file as string)

// 添加窗口尺寸响应
const containerRef = ref<HTMLDivElement | null>(null)
const containerHeight = ref(0)
const containerWidth = ref(0)

const annotationCanvasRef = ref<HTMLCanvasElement | null>(null)
const annotationMode = ref<'draw' | 'text' | null>(null)
const annotationColor = ref('#FF0000')
const isDrawing = ref(false)
const lastX = ref(0)
const lastY = ref(0)

// 定义文字批注的类型
interface TextAnnotation {
    x: number
    y: number
    text: string
    color: string
}

// 修改批注存储结构
interface PageAnnotations {
    imageData: ImageData
    texts: TextAnnotation[]
}

// 修改存储结构
const annotations = ref<Map<number, PageAnnotations>>(new Map())

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

// 修改停止批注函数
const stopAnnotation = (e: MouseEvent) => {
    if (annotationMode.value === 'draw') {
        stopDrawing()
    }
}

// 修改停止绘制函数
const stopDrawing = () => {
    if (isDrawing.value && annotationCanvasRef.value) {
        isDrawing.value = false

        // 获取当前页的批注
        let pageAnnotations = annotations.value.get(currentPage.value)
        if (!pageAnnotations) {
            pageAnnotations = {
                imageData: new ImageData(1, 1), // 临时数据
                texts: []
            }
        }

        // 保存当前画布状态
        const imageData = annotationCanvasRef.value
            .getContext('2d')
            ?.getImageData(
                0,
                0,
                annotationCanvasRef.value.width,
                annotationCanvasRef.value.height
            )

        if (imageData) {
            pageAnnotations.imageData = imageData
            annotations.value.set(currentPage.value, pageAnnotations)
        }
    }
}

// 清除当前页批注
const clearAnnotations = () => {
    if (!annotationCanvasRef.value) return
    const ctx = annotationCanvasRef.value.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, annotationCanvasRef.value.width, annotationCanvasRef.value.height)
    annotations.value.delete(currentPage.value)
    showTextInput.value = false // 确保文字输入框被关闭
}

// 计算最佳缩放比例
const calculateScale = (pageWidth: number, pageHeight: number) => {
    if (!containerRef.value) return 1.0

    const rect = containerRef.value.getBoundingClientRect()
    const padding = 40
    const maxWidth = rect.width - padding
    const maxHeight = rect.height - padding

    const widthScale = maxWidth / pageWidth
    const heightScale = maxHeight / pageHeight

    return Math.min(widthScale, heightScale)
}

// 获取实际使用的缩放值
const getEffectiveScale = (pageWidth: number, pageHeight: number) => {
    if (scale.value === 'auto') {
        return calculateScale(pageWidth, pageHeight)
    }
    return scale.value
}

// 添加当前渲染任务的引用
let currentRenderTask: any = null

// 修改渲染页面函数
const renderPage = async (pageNum: number) => {
    if (!pdfDoc.value || !canvasRef.value || !annotationCanvasRef.value) return

    try {
        // 取消之前的渲染任务，但不等待它完成
        if (currentRenderTask) {
            currentRenderTask.cancel()
            currentRenderTask = null
        }

        const pageProxy = await pdfDoc.value.getPage(pageNum)
        const canvas = canvasRef.value
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // 获取原始页面尺寸
        const originalViewport = pageProxy.getViewport({ scale: 1.0 })

        // 获取实际缩放值
        const effectiveScale = scale.value === 'auto'
            ? calculateScale(originalViewport.width, originalViewport.height)
            : scale.value

        const viewport = pageProxy.getViewport({ scale: effectiveScale })

        // 设置画布尺寸
        canvas.width = viewport.width
        canvas.height = viewport.height
        annotationCanvasRef.value.width = viewport.width
        annotationCanvasRef.value.height = viewport.height

        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const annotationCtx = annotationCanvasRef.value.getContext('2d')
        annotationCtx?.clearRect(0, 0, canvas.width, canvas.height)

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
            enableWebGL: true,
            renderInteractiveForms: true
        }

        try {
            // 开始新的渲染任务
            const renderTask = pageProxy.render(renderContext)
            currentRenderTask = renderTask

            // 等待渲染完成
            await renderTask.promise

            // 只有当当前任务没有被取消时才恢复批注
            if (currentRenderTask === renderTask) {
                const pageAnnotations = annotations.value.get(pageNum)
                if (pageAnnotations) {
                    const annotationCtx = annotationCanvasRef.value.getContext('2d')
                    if (annotationCtx) {
                        // 恢复图像数据
                        annotationCtx.putImageData(pageAnnotations.imageData, 0, 0)

                        // 重新渲染文字批注
                        pageAnnotations.texts.forEach(text => {
                            annotationCtx.font = '16px Arial'
                            annotationCtx.fillStyle = text.color
                            annotationCtx.textBaseline = 'top'
                            annotationCtx.fillText(text.text, text.x, text.y)
                        })
                    }
                }
            }
        } catch (error) {
            // 忽略取消渲染的错误
            if (error instanceof Error &&
                error.message !== 'Rendering cancelled' &&
                !error.message.includes('RenderingCancelledException')) {
                console.error('Render error:', error)
            }
        }
    } catch (error) {
        console.error('Error getting page:', error)
    }
}

// 添加防抖函数
const debounce = (fn: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any[]) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(...args), delay)
    }
}

// 使用防抖处理窗口大小变化
const debouncedUpdateContainerSize = debounce(() => {
    if (!containerRef.value || scale.value !== 'auto') return
    renderPage(currentPage.value)
}, 200)

// 修改监听函数
watch([currentPage, scale], async ([newPage]) => {
    await renderPage(newPage)
}, { flush: 'post' })

// 修改窗口大小变化监听
onMounted(() => {
    if (pdfUrl.value) {
        loadPDF()
    }
    window.addEventListener('resize', debouncedUpdateContainerSize)
})

onUnmounted(() => {
    if (currentRenderTask) {
        currentRenderTask.cancel()
    }
    window.removeEventListener('resize', debouncedUpdateContainerSize)
})

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

// 修改页面切换函数
const prevPage = async () => {
    if (currentPage.value > 1) {
        currentPage.value--
        await renderPage(currentPage.value)
    }
}

const nextPage = async () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++
        await renderPage(currentPage.value)
    }
}

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

// 添加文字批注相关的状态
const showTextInput = ref(false)
const textContent = ref('')
const textPosition = ref({ x: 0, y: 0 })
const textInputRef = ref<any>(null)
const editingTextIndex = ref<number>(-1)

// 修改开始批注函数
const startAnnotation = (e: MouseEvent) => {
    if (!annotationMode.value || !annotationCanvasRef.value) return

    const canvas = annotationCanvasRef.value
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    if (annotationMode.value === 'draw') {
        startDrawing(e)
    } else if (annotationMode.value === 'text') {
        textPosition.value = { x, y }
        showTextInput.value = true
        editingTextIndex.value = -1 // 新建文字批注
        textContent.value = '' // 清空内容
        nextTick(() => {
            textInputRef.value?.focus()
        })
    }
}

// 添加双击编辑功能
const handleCanvasDoubleClick = (e: MouseEvent) => {
    if (!annotationCanvasRef.value) return

    const canvas = annotationCanvasRef.value
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const pageAnnotations = annotations.value.get(currentPage.value)
    if (!pageAnnotations?.texts) return

    // 查找点击的文字批注
    const clickedTextIndex = pageAnnotations.texts.findIndex(text => {
        const textWidth = canvas.getContext('2d')?.measureText(text.text).width || 0
        return (
            x >= text.x - 5 &&
            x <= text.x + textWidth + 5 &&
            y >= text.y - 20 &&
            y <= text.y + 5
        )
    })

    if (clickedTextIndex !== -1) {
        const text = pageAnnotations.texts[clickedTextIndex]
        textPosition.value = { x: text.x, y: text.y }
        textContent.value = text.text
        editingTextIndex.value = clickedTextIndex
        showTextInput.value = true
        nextTick(() => {
            textInputRef.value?.focus()
        })
    }
}

// 修改确认文字批注函数
const confirmTextAnnotation = () => {
    if (!textContent.value.trim() || !annotationCanvasRef.value) return

    const canvas = annotationCanvasRef.value
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 获取当前页的批注
    let pageAnnotations = annotations.value.get(currentPage.value)
    if (!pageAnnotations) {
        pageAnnotations = {
            imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
            texts: []
        }
    }

    // 创建或更新文字批注
    const textAnnotation: TextAnnotation = {
        x: textPosition.value.x,
        y: textPosition.value.y,
        text: textContent.value,
        color: annotationColor.value
    }

    if (editingTextIndex.value === -1) {
        // 新建文字批注
        pageAnnotations.texts.push(textAnnotation)
    } else {
        // 更新现有文字批注
        pageAnnotations.texts[editingTextIndex.value] = textAnnotation
    }

    // 重新渲染所有批注
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    pageAnnotations.texts.forEach(text => {
        ctx.font = '16px Arial'
        ctx.fillStyle = text.color
        ctx.textBaseline = 'top'
        ctx.fillText(text.text, text.x, text.y)
    })

    // 更新批注数据
    pageAnnotations.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    annotations.value.set(currentPage.value, pageAnnotations)

    // 重置状态
    showTextInput.value = false
    textContent.value = ''
    editingTextIndex.value = -1
}

// 修改文字输入容器的样式计算
const textInputStyle = computed(() => {
    if (!annotationCanvasRef.value) return {}

    const canvas = annotationCanvasRef.value
    const rect = canvas.getBoundingClientRect()

    // 计算缩放比例
    const scaleX = rect.width / canvas.width
    const scaleY = rect.height / canvas.height

    // 将画布坐标转换为屏幕坐标
    const screenX = textPosition.value.x * scaleX
    const screenY = textPosition.value.y * scaleY

    return {
        left: `${screenX}px`,
        top: `${screenY}px`,
        transform: `scale(${scaleX})`,
        transformOrigin: 'left top'
    }
})

// 添加防抖的页面切换函数
const debouncedChangePage = debounce(async (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages.value) {
        currentPage.value = newPage
        await renderPage(newPage)
    }
}, 100)

// 处理滚轮事件
const handleWheel = (e: WheelEvent) => {
    // 防止事件冒泡和默认行为
    e.preventDefault()

    // 判断滚动方向
    const delta = Math.sign(e.deltaY)

    // 计算新的页码
    const newPage = currentPage.value + delta

    // 使用防抖函数切换页面
    debouncedChangePage(newPage)
}
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
    height: calc(100vh - 80px);
    background-color: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    position: relative;
    z-index: 1;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
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
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    /* 防止滚动条出现 */
}

.pdf-canvas,
.annotation-canvas {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 100%;
    max-height: 100%;
}

.annotation-canvas {
    z-index: 1;
    pointer-events: auto;
    /* 确保可以接收鼠标事件 */
}

/* 确保画布容器不会被压缩 */
canvas {
    display: block;
    max-width: none;
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
}

:deep(.n-color-picker .n-color-picker-trigger) {
    width: 34px !important;
    height: 34px !important;
    border-radius: 3px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

:deep(.n-color-picker-trigger__fill) {
    width: 24px !important;
    height: 24px !important;
    margin: 0 !important;
    border-radius: 2px;
}

:deep(.n-color-picker-trigger__value) {
    display: none !important;
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

.text-input-container {
    position: absolute;
    z-index: 2;
    min-width: 200px;
    max-width: 400px;
    pointer-events: auto;
}

:deep(.n-input) {
    background-color: transparent;
    transform-origin: left top;
}

:deep(.n-input__textarea-el) {
    background-color: rgba(255, 255, 255, 0.9);
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 16px;
    line-height: 1.5;
    resize: both;
}

.dark-theme :deep(.n-input__textarea-el) {
    background-color: rgba(36, 36, 36, 0.9);
    border-color: #444;
    color: #fff;
}
</style>