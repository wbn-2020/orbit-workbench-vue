<template>
  <div class="page">
    <PageHeader
      title="求职档案"
      description="用于确定训练难度、评分基准和后续面试配置。"
    />

    <ErrorState v-if="loadError" :message="loadError" :retry="load" />

    <section v-else class="profile-layout">
      <div v-if="loading" class="surface surface-body">
        <el-skeleton :rows="10" animated />
      </div>

      <el-form
        v-else
        ref="formRef"
        class="surface profile-form"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="save"
      >
        <div class="surface-header">
          <div>
            <h2 class="surface-title">目标与背景</h2>
            <span class="surface-subtitle">后续保存会覆盖当前档案，不影响已开始的面试快照。</span>
          </div>
          <el-button
            type="primary"
            native-type="submit"
            :icon="Save"
            :loading="saving"
          >
            保存档案
          </el-button>
        </div>

        <div class="surface-body form-body">
          <el-form-item label="目标岗位" prop="targetRole">
            <el-input v-model="form.targetRole" maxlength="128" show-word-limit />
          </el-form-item>

          <div class="form-grid">
            <el-form-item label="当前求职阶段" prop="careerStage">
              <el-select v-model="form.careerStage">
                <el-option
                  v-for="option in careerStageOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="目标面试年限" prop="targetExperienceBand">
              <el-select v-model="form.targetExperienceBand">
                <el-option
                  v-for="option in experienceOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="目标级别">
              <el-select v-model="form.targetLevel" clearable placeholder="暂不限定">
                <el-option label="初级" value="JUNIOR" />
                <el-option label="中级" value="MIDDLE" />
                <el-option label="高级" value="SENIOR" />
              </el-select>
            </el-form-item>

            <el-form-item label="目标公司或方向">
              <el-input
                v-model="form.targetCompany"
                maxlength="128"
                placeholder="例如：Java + AI 应用开发岗位"
              />
            </el-form-item>
          </div>

          <div class="skill-section">
            <div class="section-heading">
              <h3>当前自评</h3>
              <p>用于生成初始训练建议，后续会由训练与面试记录修正。</p>
              <p class="skill-summary">{{ skillSummary }}</p>
            </div>
            <div class="form-grid">
              <el-form-item label="Java 技术栈" prop="javaSkillLevel">
                <el-radio-group v-model="form.javaSkillLevel" class="level-group">
                  <el-radio-button
                    v-for="option in skillOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </el-radio-button>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="AI 应用开发" prop="aiSkillLevel">
                <el-radio-group v-model="form.aiSkillLevel" class="level-group">
                  <el-radio-button
                    v-for="option in skillOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </el-radio-button>
                </el-radio-group>
              </el-form-item>
            </div>
          </div>

          <div class="date-row">
            <el-form-item label="预计面试日期">
              <el-date-picker
                v-model="form.targetInterviewDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="可稍后补充"
              />
            </el-form-item>
            <p class="form-note">
              该日期用于后续复习节奏，不会创建外部日历或自动发送通知。
            </p>
          </div>
        </div>
      </el-form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Save } from 'lucide-vue-next'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import { getJobProfile, saveJobProfile } from '@/api/jobProfile'
import { problemMessage } from '@/api/http'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import type { JobProfilePayload } from '@/types/api'

const formRef = ref<FormInstance>()
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')

const form = reactive<JobProfilePayload>({
  targetRole: 'Java + AI 应用开发',
  targetExperienceBand: 'THREE_TO_FIVE_YEARS',
  careerStage: 'CAREER_TRANSITION',
  targetLevel: '',
  targetCompany: '',
  javaSkillLevel: 'WORKING_KNOWLEDGE',
  aiSkillLevel: 'BEGINNER',
  targetInterviewDate: null,
})

const careerStageOptions = [
  { label: '应届求职', value: 'GRADUATE' },
  { label: '转行求职', value: 'CAREER_TRANSITION' },
  { label: '在职跳槽', value: 'JOB_CHANGE' },
]

const experienceOptions = [
  { label: '应届生', value: 'GRADUATE' },
  { label: '1 - 3 年', value: 'ONE_TO_THREE_YEARS' },
  { label: '3 - 5 年', value: 'THREE_TO_FIVE_YEARS' },
  { label: '5 年以上', value: 'FIVE_PLUS_YEARS' },
  { label: '自定义', value: 'CUSTOM' },
]

const skillOptions = [
  { label: '入门', value: 'BEGINNER' },
  { label: '了解', value: 'WORKING_KNOWLEDGE' },
  { label: '实践过', value: 'PRACTICAL' },
  { label: '熟练', value: 'ADVANCED' },
]

const skillSummary = computed(() => {
  const labelOf = (value: string) => skillOptions.find((option) => option.value === value)?.label ?? value
  return `目前自评：Java ${labelOf(form.javaSkillLevel)} · AI ${labelOf(form.aiSkillLevel)}`
})

const rules: FormRules<JobProfilePayload> = {
  targetRole: [{ required: true, message: '请填写目标岗位', trigger: 'blur' }],
  targetExperienceBand: [{ required: true, message: '请选择目标面试年限', trigger: 'change' }],
  careerStage: [{ required: true, message: '请选择当前求职阶段', trigger: 'change' }],
  javaSkillLevel: [{ required: true, message: '请选择 Java 自评', trigger: 'change' }],
  aiSkillLevel: [{ required: true, message: '请选择 AI 应用开发自评', trigger: 'change' }],
}

function applyProfile(profile: JobProfilePayload): void {
  Object.assign(form, {
    ...profile,
    targetLevel: profile.targetLevel || '',
    targetCompany: profile.targetCompany || '',
    targetInterviewDate: profile.targetInterviewDate || null,
  })
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const state = await getJobProfile()
    if (state.profile) applyProfile(state.profile)
  } catch (error) {
    loadError.value = problemMessage(error)
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const profile = await saveJobProfile({
      ...form,
      targetRole: form.targetRole.trim(),
      targetLevel: form.targetLevel?.trim() || null,
      targetCompany: form.targetCompany?.trim() || null,
    })
    applyProfile(profile)
    ElMessage.success('求职档案已保存')
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.profile-layout {
  max-width: 920px;
}

.profile-form {
  overflow: hidden;
}

.form-body {
  display: grid;
  gap: 10px;
  padding: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 18px;
}

.skill-section {
  margin-top: 6px;
  padding-top: 18px;
  border-top: 1px solid var(--ow-line-soft);
}

.section-heading {
  margin-bottom: 14px;
}

.section-heading h3 {
  margin: 0;
  font-size: 14px;
}

.section-heading p,
.form-note {
  margin: 4px 0 0;
  color: var(--ow-muted);
  font-size: 12px;
}

.skill-summary {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--ow-ink-secondary);
}

.level-group {
  display: flex;
  flex-wrap: wrap;
}

.date-row {
  display: flex;
  align-items: flex-end;
  gap: 18px;
}

.date-row .el-form-item {
  margin-bottom: 0;
}

.form-note {
  max-width: 42ch;
  padding-bottom: 8px;
}

@media (max-width: 620px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .date-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
}
</style>
