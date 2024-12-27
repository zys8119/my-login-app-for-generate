<template>
    <div class="home-container">
        <n-card>
            <n-data-table :columns="columns" :data="tableData" :pagination="pagination" :loading="loading" />
        </n-card>
        <!-- 编辑弹窗 -->
        <n-modal v-model:show="showEditModal" preset="dialog" title="编辑用户">
            <n-form ref="formRef" :model="editForm" :rules="rules" label-placement="left" :label-width="80"
                require-mark-placement="right-hanging">
                <n-form-item label="姓名" path="name">
                    <n-input v-model:value="editForm.name" placeholder="请输入姓名" />
                </n-form-item>
                <n-form-item label="年龄" path="age">
                    <n-input-number v-model:value="editForm.age" :min="1" :max="120" placeholder="请输入年龄" />
                </n-form-item>
            </n-form>
            <template #action>
                <n-space>
                    <n-button @click="handleCancel">取消</n-button>
                    <n-button type="primary" :loading="saving" @click="handleSave">保存</n-button>
                </n-space>
            </template>
        </n-modal>
    </div>
</template>

<script setup lang="ts">
import { h, ref, onMounted } from 'vue'
import { NButton, NSpace, NDataTable, NCard, NModal, NForm, NFormItem, NInput, NInputNumber, useDialog } from 'naive-ui'
import type { DataTableColumns, FormInst } from 'naive-ui'
import { createDiscreteApi } from 'naive-ui'

const { message } = createDiscreteApi(['message'])

interface UserData {
    id: number
    name: string
    age: number
    createTime: string
}

interface EditFormData {
    id: number | null
    name: string
    age: number
}

const dialog = useDialog()
const loading = ref(false)
const saving = ref(false)
const showEditModal = ref(false)
const formRef = ref<FormInst | null>(null)

// 编辑表单数据
const editForm = ref<EditFormData>({
    id: null,
    name: '',
    age: 0
})

// 表单验证规则
const rules = {
    name: [
        { required: true, message: '请输入姓名', trigger: 'blur' },
        { min: 2, max: 20, message: '姓名长度在2-20个字符之间', trigger: 'blur' }
    ],
    age: [
        {
            required: true,
            message: '请输入年龄',
            trigger: ['blur', 'change'],
            type: 'number'
        },
        {
            validator: (rule: any, value: number) => {
                if (value < 1 || value > 120) {
                    return new Error('年龄必须在1-120之间')
                }
                return true
            },
            trigger: ['blur', 'change']
        }
    ]
}

const pagination = ref({
    page: 1,
    pageSize: 10,
    showSizePicker: true,
    pageSizes: [10, 20, 30, 40],
    onChange: (page: number) => {
        pagination.value.page = page
    },
    onUpdatePageSize: (pageSize: number) => {
        pagination.value.pageSize = pageSize
        pagination.value.page = 1
    }
})

const columns: DataTableColumns<UserData> = [
    {
        title: '姓名',
        key: 'name',
        width: 200
    },
    {
        title: '年龄',
        key: 'age',
        width: 100
    },
    {
        title: '创建时间',
        key: 'createTime',
        width: 200
    },
    {
        title: '操作',
        key: 'actions',
        width: 200,
        render(row) {
            return h(NSpace, null, {
                default: () => [
                    h(
                        NButton,
                        {
                            size: 'small',
                            type: 'primary',
                            onClick: () => handleEdit(row)
                        },
                        { default: () => '编辑' }
                    ),
                    h(
                        NButton,
                        {
                            size: 'small',
                            type: 'error',
                            onClick: () => handleDelete(row)
                        },
                        { default: () => '删除' }
                    )
                ]
            })
        }
    }
]

// 模拟数据
const tableData = ref<UserData[]>([])

// 模拟获取数据
const fetchData = () => {
    loading.value = true
    setTimeout(() => {
        tableData.value = Array.from({ length: 10 }).map((_, index) => ({
            id: index + 1,
            name: `用户${index + 1}`,
            age: Math.floor(Math.random() * 30) + 20,
            createTime: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleString()
        }))
        loading.value = false
    }, 1000)
}

// 编辑操作
const handleEdit = (row: UserData) => {
    editForm.value = {
        id: row.id,
        name: row.name,
        age: row.age
    }
    showEditModal.value = true
}

// 删除操作
const handleDelete = (row: UserData) => {
    dialog.warning({
        title: '确认删除',
        content: `确定要删除用户"${row.name}"吗？`,
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: async () => {
            loading.value = true
            try {
                // 模拟删除操作
                await new Promise(resolve => setTimeout(resolve, 1000))

                // 从表格数据中移除
                const index = tableData.value.findIndex(item => item.id === row.id)
                if (index !== -1) {
                    tableData.value.splice(index, 1)
                }

                message.success('删除成功')
            } catch (error) {
                message.error('删除失败')
            } finally {
                loading.value = false
            }
        }
    })
}

// 保存编辑
const handleSave = () => {
    if (!formRef.value) return

    formRef.value.validate().then(async () => {
        saving.value = true
        try {
            // 模拟保存操作
            await new Promise(resolve => setTimeout(resolve, 1000))

            // 更新表格数据
            const index = tableData.value.findIndex(item => item.id === editForm.value.id)
            if (index !== -1) {
                tableData.value[index] = {
                    ...tableData.value[index],
                    name: editForm.value.name,
                    age: editForm.value.age
                }
            }

            showEditModal.value = false
            message.success('保存成功')
        } catch (error) {
            message.error('保存失败')
        } finally {
            saving.value = false
        }
    }).catch(() => {
        message.error('请填写完整信息')
    })
}

// 取消编辑
const handleCancel = () => {
    formRef.value?.restoreValidation()
    showEditModal.value = false
}

onMounted(() => {
    fetchData()
})
</script>

<style scoped>
.home-container {
    padding: 20px;
    background-color: #f5f5f5;
    min-height: 100vh;
}
</style>