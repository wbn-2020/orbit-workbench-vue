<template>
  <div class="page resume-page">
    <header class="ow-page-top">
      <div>
        <div class="ow-crumb">功能缺口 / 简历工作台</div>
        <h1><FileText aria-hidden="true" /> 简历工作台</h1>
        <div class="sub">分模块编辑，导出 PDF 为演示占位（数据为演示样例）</div>
      </div>
      <div class="acts">
        <button class="ow-btn" type="button" @click="exportPdf">导出 PDF</button>
        <button class="ow-btn gold" type="button" @click="notifyAdd">＋ 新增经历</button>
      </div>
    </header>

    <div class="resume-grid">
      <div class="col8">
        <div class="ow-card" style="margin-bottom: 18px;">
          <div class="ow-card-h">
            <div class="ic b1"><CircleCheckBig aria-hidden="true" /></div>
            简历完整度
            <div class="right">{{ completeness }}%</div>
          </div>
          <div class="ow-card-b">
            <div class="ow-prog"><i :style="{ width: `${completeness}%` }" /></div>
            <div class="ow-hint">
              {{ completeness < 100 ? `还差 ${5 - filledModules} 个模块即可达到完整度 100%。` : '简历已非常完整，可直接导出 PDF（导出为演示）。' }}
            </div>
          </div>
        </div>

        <div v-for="block in blocks" :key="block.key" class="ow-card block-card">
          <div class="ow-card-h">
            <div class="ic" :class="block.iconClass">{{ block.icon }}</div>
            {{ block.title }}
            <div class="right">
              <button class="ow-btn xs ghost" type="button" @click="editBlock(block.title)">编辑</button>
            </div>
          </div>
          <div class="ow-card-b">
            <template v-if="block.key === 'basic'">
              <div class="ow-kv">
                <div class="r"><span class="k">姓名</span><span class="v">{{ resume.basic.name }}</span></div>
                <div class="r"><span class="k">目标岗位</span><span class="v">{{ resume.basic.target }}</span></div>
                <div class="r"><span class="k">联系方式</span><span class="v">{{ resume.basic.phone }} · {{ resume.basic.email }}</span></div>
                <div class="r"><span class="k">城市</span><span class="v">{{ resume.basic.city }}</span></div>
                <div class="r"><span class="k">个人优势</span><span class="v">{{ resume.basic.summary }}</span></div>
              </div>
            </template>
            <template v-else-if="block.key === 'educations'">
              <div v-for="edu in resume.educations" :key="edu.id" class="ow-tlitem">
                <div class="date">{{ edu.time }}</div>
                <div class="title">{{ edu.school }} · {{ edu.major }}</div>
                <div class="desc">{{ edu.honor || '—' }}</div>
              </div>
            </template>
            <template v-else-if="block.key === 'works'">
              <div v-for="work in resume.works" :key="work.id" class="ow-tlitem">
                <div class="date">{{ work.time }}</div>
                <div class="title">{{ work.company }} · {{ work.role }}</div>
                <div class="desc">{{ work.desc }}</div>
              </div>
            </template>
            <template v-else-if="block.key === 'projects'">
              <div v-for="project in resume.projects" :key="project.id" class="ow-tlitem">
                <div class="date">{{ project.time }} · {{ project.role }}</div>
                <div class="title">{{ project.name }}</div>
                <div class="desc">{{ project.tech }}<br>{{ project.desc }} 亮点：{{ project.highlights }}</div>
              </div>
            </template>
            <template v-else>
              <div class="skill-tags">
                <span v-for="skill in resume.skills" :key="skill.id" class="ow-chip">
                  {{ skill.name }} · {{ '★'.repeat(skill.level) }}{{ '☆'.repeat(5 - skill.level) }}
                </span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div class="col4">
        <div class="ow-card">
          <div class="ow-card-h">
            <div class="ic b6"><Eye aria-hidden="true" /></div>
            简历预览
          </div>
          <div class="ow-card-b preview">
            <div class="resume-name">{{ resume.basic.name }}</div>
            <p class="muted">{{ resume.basic.target }}</p>
            <div class="divider" />
            <h4>个人优势</h4>
            <p>{{ resume.basic.summary }}</p>
            <h4>工作经历</h4>
            <div v-for="work in resume.works" :key="work.id" class="preview-block">
              <b>{{ work.company }} · {{ work.role }}</b>
              <p>{{ work.time }}<br>{{ work.desc }}</p>
            </div>
            <h4>项目经历</h4>
            <div v-for="project in resume.projects" :key="project.id" class="preview-block">
              <b>{{ project.name }}</b>
              <p>{{ project.tech }} · {{ project.highlights }}</p>
            </div>
            <h4>核心技能</h4>
            <div class="skill-tags">
              <span v-for="skill in resume.skills" :key="skill.id" class="ow-tag blue">{{ skill.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleCheckBig, Eye, FileText } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed } from 'vue'

import { gapResume as resume } from '@/mocks/gap'

const blocks = [
  { key: 'basic', title: '基本信息', icon: '👤', iconClass: 'b1' },
  { key: 'educations', title: '教育经历', icon: '🎓', iconClass: 'b2' },
  { key: 'works', title: '工作经历', icon: '💼', iconClass: 'b3' },
  { key: 'projects', title: '项目经历', icon: '🚀', iconClass: 'b5' },
  { key: 'skills', title: '技能标签', icon: '🛠', iconClass: 'b6' },
] as const

const filledModules = computed(() => {
  let done = 0
  if (resume.basic.name && resume.basic.target) done += 1
  if (resume.educations.length) done += 1
  if (resume.works.length) done += 1
  if (resume.projects.length) done += 1
  if (resume.skills.length) done += 1
  return done
})

const completeness = computed(() => Math.round((filledModules.value / 5) * 100))

function editBlock(title: string): void {
  ElMessage.info(`「${title}」编辑将随简历版本能力接入（演示提示）`)
}

function notifyAdd(): void {
  ElMessage.info('新增经历将随简历版本能力接入（演示提示）')
}

function exportPdf(): void {
  ElMessage.info('PDF 导出为演示占位，真实生成能力在后续版本接入。')
}
</script>

<style scoped>
.resume-page {
  display: grid;
  gap: 18px;
}

.resume-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.resume-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
}

.col4 { grid-column: span 4; }
.col8 { grid-column: span 8; }

.block-card {
  margin-bottom: 18px;
}

.block-card .ic {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 10px;
  font-size: 15px;
}

.skill-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preview {
  color: var(--ink-2);
  font-size: 13px;
  line-height: 1.7;
}

.resume-name {
  color: var(--ink);
  font-size: 20px;
  font-weight: 900;
}

.preview .muted {
  margin: 2px 0 0;
  color: var(--muted);
}

.preview .divider {
  height: 1px;
  margin: 12px 0;
  background: var(--line);
}

.preview h4 {
  margin: 12px 0 4px;
  color: var(--ink);
  font-size: 13px;
}

.preview h4:first-of-type {
  margin-top: 0;
}

.preview p {
  margin: 0;
}

.preview-block {
  margin-bottom: 8px;
}

.preview-block b {
  color: var(--ink);
}

.preview-block p {
  margin: 2px 0 0;
}

@media (max-width: 1100px) {
  .col4,
  .col8 {
    grid-column: span 12;
  }
}
</style>
