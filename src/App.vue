<template>
    <n-message-provider>
        <n-dialog-provider>
            <n-loading-bar-provider>
                <router-view></router-view>
            </n-loading-bar-provider>
        </n-dialog-provider>
    </n-message-provider>
</template>

<script setup lang="ts">
import { NMessageProvider, NDialogProvider, NLoadingBarProvider } from 'naive-ui'
</script>

<style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
        Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}
</style>