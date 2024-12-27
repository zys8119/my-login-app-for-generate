<template>
    <div class="properties-panel" @mousedown.stop="" @click.stop>
        <n-card title="属性设置" :bordered="false">
            <n-collapse :default-expanded-names="defaultExpandedNames">
                <!-- 全局属性设置 -->
                <n-collapse-item title="全局属性设置" name="1">
                    <n-form label-placement="left" label-width="auto">
                        <n-form-item label="画布拖拽">
                            <n-switch v-model:value="canvasSettings.enableDrag">
                                <template #checked>已开启</template>
                                <template #unchecked>已关闭</template>
                            </n-switch>
                        </n-form-item>
                        <n-form-item label="画布缩放">
                            <n-switch v-model:value="canvasSettings.enableZoom">
                                <template #checked>已开启</template>
                                <template #unchecked>已关闭</template>
                            </n-switch>
                        </n-form-item>
                    </n-form>
                </n-collapse-item>

                <!-- 元素属性设置 -->
                <template v-if="currentElement !== null">
                    <n-collapse-item title="元素属性设置" name="2">
                        <n-form label-placement="left" label-width="auto" require-mark-placement="right-hanging">
                            <!-- 位置设置 -->
                            <n-form-item label="位置">
                                <n-space>
                                    <n-input-number v-model:value="selectedElement.left" size="small" placeholder="X"
                                        :min="0" :step="1" @update:value="handlePropertyChange" />
                                    <n-input-number v-model:value="selectedElement.top" size="small" placeholder="Y"
                                        :min="0" :step="1" @update:value="handlePropertyChange" />
                                </n-space>
                            </n-form-item>
                            <!-- 大小设置 -->
                            <n-form-item label="大小">
                                <n-space>
                                    <n-input-number v-model:value="selectedElement.width" size="small" placeholder="宽"
                                        :min="10" :step="1" @update:value="handlePropertyChange" />
                                    <n-input-number v-model:value="selectedElement.height" size="small" placeholder="高"
                                        :min="10" :step="1" @update:value="handlePropertyChange" />
                                </n-space>
                            </n-form-item>
                            <!-- 旋转设置 -->
                            <n-form-item label="旋转">
                                <n-input-number v-model:value="selectedElement.angle" size="small" :min="0" :max="360"
                                    :step="1" @update:value="handlePropertyChange" />
                            </n-form-item>
                            <!-- 颜色设置 -->
                            <n-form-item label="颜色">
                                <n-color-picker v-model:value="selectedElement.color" :show-alpha="false"
                                    @update:value="handlePropertyChange" />
                            </n-form-item>
                        </n-form>
                    </n-collapse-item>
                </template>
                <template v-else>
                    <div class="no-selection">
                        <n-empty description="请选择一个元素" />
                    </div>
                </template>
            </n-collapse>
        </n-card>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NCard, NCollapse, NCollapseItem, NForm, NFormItem, NInputNumber, NSpace, NColorPicker, NEmpty, NSwitch } from 'naive-ui'

const props = defineProps<{
    currentElement: number | null
    elements: any[]
    canvasSettings: {
        enableDrag: boolean
        enableZoom: boolean
    }
}>()

const emit = defineEmits<{
    (e: 'update:element'): void
}>()

const defaultExpandedNames = ref(['1', '2'])

const selectedElement = computed(() => {
    return props.elements.find(el => el.id === props.currentElement)
})

const handlePropertyChange = () => {
    emit('update:element')
}
</script>

<style scoped>
.properties-panel {
    width: 300px;
    flex-shrink: 0;
}

.no-selection {
    padding: 20px;
    text-align: center;
    color: #909399;
}
</style>