<template>
    <div class="components-panel">
        <n-card title="基础元件" :bordered="false">
            <div class="component-list">
                <div class="component-item" draggable="true" @dragstart="$emit('drag-start', $event)">
                    <n-icon size="32" class="component-icon">
                        <border-outlined />
                    </n-icon>
                    <span class="component-name">矩形</span>
                </div>
            </div>
        </n-card>
    </div>
</template>

<script setup lang="ts">
import { NCard, NIcon } from 'naive-ui'
import { BorderOutlined } from '@vicons/antd'

defineEmits<{
    (e: 'drag-start', event: DragEvent): void
}>()
</script>

<style scoped>
.components-panel {
    width: 240px;
    flex-shrink: 0;
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
</style>