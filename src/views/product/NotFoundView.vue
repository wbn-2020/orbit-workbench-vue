<template>
  <div class="page not-found">
    <!-- 404 是错误态，面包屑没有可归属的区块，关闭以免与标题重复 -->
    <PageHeader :crumb="false" title="页面不存在" description="这个地址没有对应页面——可能是链接过期、或者手输时打错了。" />
    <section class="ow-card">
      <div class="ow-card-b">
        <EmptyState
          :icon="Compass"
          title="走错路了"
          :description="`当前路径 ${attemptedPath} 不在产品里。左侧导航是全部可用入口。`"
        >
          <div class="ow-row nf-actions">
            <el-button type="primary" @click="goHome">回到今日工作台</el-button>
            <el-button @click="goBack">返回上一页</el-button>
          </div>
        </EmptyState>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Compass } from 'lucide-vue-next'

import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'

const route = useRoute()
const router = useRouter()

// 展示用户实际敲的路径而不是通配符本身，否则提示没有信息量
const attemptedPath = computed(() => route.fullPath)

function goHome(): void {
  void router.push('/workbench')
}

function goBack(): void {
  // 直接打开这个地址时没有历史可退，回落到工作台而不是卡住
  if (window.history.length > 1) {
    router.back()
    return
  }
  void router.push('/workbench')
}
</script>

<style scoped>
.not-found {
  display: grid;
  gap: 18px;
}
</style>
