<template>
    <div class="login-container">
        <n-card class="login-box" title="用户登录" :bordered="false">
            <n-form ref="formRef" :model="loginForm" :rules="rules" label-placement="left" :label-width="80">
                <!-- 账号密码登录 -->
                <template v-if="loginType === 'account'">
                    <n-form-item path="username" label="用户名">
                        <n-input v-model:value="loginForm.username" placeholder="请输入用户名">
                            <template #prefix>
                                <n-icon><person-outline /></n-icon>
                            </template>
                        </n-input>
                    </n-form-item>
                    <n-form-item path="password" label="密码">
                        <div class="password-input-wrapper">
                            <n-input v-model:value="loginForm.password" type="password" show-password-on="click"
                                placeholder="请输入密码" @focus="showPasswordTips = true" @blur="showPasswordTips = false">
                                <template #prefix>
                                    <n-icon><lock-closed-outline /></n-icon>
                                </template>
                            </n-input>
                            <div class="password-tips" v-if="showPasswordTips">
                                <div class="password-strength" v-if="loginForm.password">
                                    密码强度：
                                    <span :class="[
                                        'strength-indicator',
                                        getPasswordStrength(loginForm.password).toLowerCase()
                                    ]">
                                        {{ getPasswordStrength(loginForm.password) }}
                                    </span>
                                </div>
                                <div class="password-requirements">
                                    <div class="requirement" :class="{ met: hasUpperCase(loginForm.password) }">
                                        <n-icon size="14">
                                            <checkmark-circle v-if="hasUpperCase(loginForm.password)" />
                                            <close-circle v-else />
                                        </n-icon>
                                        包���大写字母
                                    </div>
                                    <div class="requirement" :class="{ met: hasLowerCase(loginForm.password) }">
                                        <n-icon size="14">
                                            <checkmark-circle v-if="hasLowerCase(loginForm.password)" />
                                            <close-circle v-else />
                                        </n-icon>
                                        包含小写字母
                                    </div>
                                    <div class="requirement" :class="{ met: hasNumber(loginForm.password) }">
                                        <n-icon size="14">
                                            <checkmark-circle v-if="hasNumber(loginForm.password)" />
                                            <close-circle v-else />
                                        </n-icon>
                                        包含数字
                                    </div>
                                    <div class="requirement" :class="{ met: hasSpecial(loginForm.password) }">
                                        <n-icon size="14">
                                            <checkmark-circle v-if="hasSpecial(loginForm.password)" />
                                            <close-circle v-else />
                                        </n-icon>
                                        包含特殊符号
                                    </div>
                                    <div class="requirement" :class="{ met: isLengthValid(loginForm.password) }">
                                        <n-icon size="14">
                                            <checkmark-circle v-if="isLengthValid(loginForm.password)" />
                                            <close-circle v-else />
                                        </n-icon>
                                        长度至少8位
                                    </div>
                                </div>
                            </div>
                        </div>
                    </n-form-item>
                </template>
                <!-- 手机验证码登录 -->
                <template v-else>
                    <n-form-item path="phone" label="手机号">
                        <n-input v-model:value="loginForm.phone" placeholder="请输入手机号">
                            <template #prefix>
                                <n-icon><phone-portrait-outline /></n-icon>
                            </template>
                        </n-input>
                    </n-form-item>
                    <n-form-item path="code" label="验证码">
                        <div class="verification-code">
                            <n-input v-model:value="loginForm.code" placeholder="请输入验证码">
                                <template #prefix>
                                    <n-icon><key-outline /></n-icon>
                                </template>
                            </n-input>
                            <n-button :disabled="cooldown > 0" @click="getVerificationCode" size="small"
                                :loading="loading">
                                {{ cooldown > 0 ? `${cooldown}s后重试` : '获取验证码' }}
                            </n-button>
                        </div>
                    </n-form-item>
                </template>
                <n-form-item>
                    <n-checkbox v-model:checked="rememberMe">记住我</n-checkbox>
                </n-form-item>
                <div class="login-actions">
                    <n-button type="primary" block @click="handleLogin" :loading="loading">
                        登录
                    </n-button>
                    <div class="login-type-switch">
                        <a href="javascript:;" @click="loginType = loginType === 'account' ? 'phone' : 'account'">
                            使用{{ loginType === 'account' ? '手机验证码' : '账号密码' }}登录
                        </a>
                    </div>
                </div>
            </n-form>
        </n-card>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import { PersonOutline, LockClosedOutline, CheckmarkCircle, CloseCircle, PhonePortraitOutline, KeyOutline } from '@vicons/ionicons5'
import { createDiscreteApi, NCard, NButton, NForm, NFormItem, NInput, NIcon, NCheckbox } from 'naive-ui'
import { useRouter } from 'vue-router'

interface LoginForm {
    username: string
    password: string
    phone: string
    code: string
}

const { message } = createDiscreteApi(['message'])
const formRef = ref(null)
const loading = ref(false)
const rememberMe = ref(false)
const showPasswordTips = ref(false)
const loginType = ref<'account' | 'phone'>('account')
const cooldown = ref(0)

const loginForm = reactive<LoginForm>({
    username: '',
    password: '',
    phone: '',
    code: ''
})

const hasUpperCase = (value: string): boolean => /[A-Z]/.test(value || '')
const hasLowerCase = (value: string): boolean => /[a-z]/.test(value || '')
const hasNumber = (value: string): boolean => /[0-9]/.test(value || '')
const hasSpecial = (value: string): boolean => /[!@#$%^&*(),.?":{}|<>]/.test(value || '')
const isLengthValid = (value: string): boolean => (value || '').length >= 8

const rules = computed(() => ({
    username: [
        { required: loginType.value === 'account', message: '请输入用户名', trigger: 'blur' }
    ],
    password: [
        { required: loginType.value === 'account', message: '请输入密码', trigger: 'blur' },
        {
            validator: (rule: any, value: string) => {
                if (loginType.value !== 'account' || !value) return true

                const errors: string[] = []

                if (!isLengthValid(value)) errors.push('密码长度至少8位')
                if (!hasUpperCase(value)) errors.push('需包含大写字母')
                if (!hasLowerCase(value)) errors.push('需包含小写字母')
                if (!hasNumber(value)) errors.push('需包含数字')
                if (!hasSpecial(value)) errors.push('需包含特殊符号')

                if (errors.length) {
                    return new Error(errors.join('、'))
                }
                return true
            },
            trigger: ['blur', 'input']
        }
    ],
    phone: [
        { required: loginType.value === 'phone', message: '请输入手机号', trigger: 'blur' },
        {
            validator: (rule: any, value: string) => {
                if (loginType.value !== 'phone' || !value) return true
                if (!/^1[3-9]\d{9}$/.test(value)) {
                    return new Error('请输入正确的手机号')
                }
                return true
            },
            trigger: ['blur', 'input']
        }
    ],
    code: [
        { required: loginType.value === 'phone', message: '请输入验证码', trigger: 'blur' },
        {
            validator: (rule: any, value: string) => {
                if (loginType.value !== 'phone' || !value) return true
                if (!/^\d{6}$/.test(value)) {
                    return new Error('验证码为6位数字')
                }
                return true
            },
            trigger: ['blur', 'input']
        }
    ]
}))

const getVerificationCode = async (): Promise<void> => {
    try {
        if (!loginForm.phone) {
            message.error('请输入手机号')
            return
        }
        if (!/^1[3-9]\d{9}$/.test(loginForm.phone)) {
            message.error('请输入正确的手机号')
            return
        }
        loading.value = true

        await new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.8) {
                    reject(new Error('发送失败，请重试'))
                    return
                }
                resolve(true)
            }, 1000)
        })

        message.success('验证码已发送')
        cooldown.value = 60
        const timer = ref<number | null>(null)
        timer.value = window.setInterval(() => {
            cooldown.value--
            if (cooldown.value <= 0) {
                if (timer.value) {
                    clearInterval(timer.value)
                    timer.value = null
                }
            }
        }, 1000)

        onBeforeUnmount(() => {
            if (timer.value) {
                clearInterval(timer.value)
                timer.value = null
            }
        })
    } catch (err: any) {
        if (err.message) {
            message.error(err.message)
        }
    } finally {
        loading.value = false
    }
}

const router = useRouter()

const handleLogin = (): void => {
    formRef.value?.validate((errors: any) => {
        if (!errors) {
            loading.value = true
            setTimeout(() => {
                message.success(`${loginType.value === 'account' ? '账号密码' : '手机验证码'}登录成功`)
                loading.value = false
                router.push('/home')
            }, 1500)
        } else {
            message.error('请填写完整信息')
        }
    }).catch(() => {
        message.error('请填写完整信息')
    })
}

const getPasswordStrength = (password: string): string => {
    if (!password) return ''

    const checks = [
        /[A-Z]/.test(password),
        /[a-z]/.test(password),
        /[0-9]/.test(password),
        /[!@#$%^&*(),.?":{}|<>]/.test(password),
        password.length >= 8
    ]

    const strength = checks.filter(Boolean).length

    return {
        0: '',
        1: '弱',
        2: '弱',
        3: '中',
        4: '强',
        5: '很强'
    }[strength]
}
</script>

<style scoped>
.login-container {
    height: 100vh;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    background-image: url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    position: relative;
    padding-right: 200px;
}

.login-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.3);
}

.login-box {
    width: 400px;
    border-radius: 16px;
    overflow: hidden;
    position: relative;
    backdrop-filter: blur(10px);
    background-color: rgba(255, 255, 255, 0.9);
}

:deep(.n-card-header) {
    font-size: 24px;
    font-weight: bold;
    text-align: center;
    padding: 20px 0;
}

:deep(.n-form) {
    padding: 20px 0;
}

/* 响应式布局 */
@media screen and (max-width: 800px) {
    .login-container {
        justify-content: center;
        padding-right: 0;
    }

    .login-box {
        width: 90%;
        /* 在小屏幕上占据90%宽度 */
        max-width: 400px;
        /* 但不超过400px */
    }
}

.password-input-wrapper {
    position: relative;
}

.password-tips {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    padding: 12px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    margin-top: 8px;
    z-index: 10;
}

.password-strength {
    font-size: 12px;
    color: #606266;
}

.strength-indicator {
    font-weight: bold;
}

.strength-indicator.弱 {
    color: #f56c6c;
}

.strength-indicator.中 {
    color: #e6a23c;
}

.strength-indicator.强 {
    color: #67c23a;
}

.strength-indicator.很强 {
    color: #409eff;
}

.password-requirements {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
}

.requirement {
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 4px 0;
    opacity: 0.7;
    transition: all 0.3s;
}

.requirement.met {
    color: #67c23a;
    opacity: 1;
}

.requirement :deep(.n-icon) {
    display: flex;
    align-items: center;
}

.requirement.met :deep(.n-icon) {
    color: #67c23a;
}

.requirement:not(.met) :deep(.n-icon) {
    color: #909399;
}

.login-actions {
    position: relative;
}

.login-type-switch {
    position: absolute;
    right: 0;
    top: -30px;
    font-size: 14px;
}

.login-type-switch a {
    color: #409eff;
    text-decoration: none;
    transition: color 0.3s;
}

.login-type-switch a:hover {
    color: #66b1ff;
}

.verification-code {
    display: flex;
    gap: 12px;
}

.verification-code :deep(.n-input) {
    flex: 1;
}

.verification-code .n-button {
    width: 100px;
    white-space: nowrap;
}

/* 确保密码输入框与用户名输入框宽度一致 */
.password-input-wrapper :deep(.n-input) {
    width: 100%;
}
</style>