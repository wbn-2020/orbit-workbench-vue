/*
 求职成长岛 · 原型演示数据（移植自 原型_今日工作台_增强版.html 的 seed 数据）
 全部为前端演示数据，仅用于 UI 复刻验收，不代表后端能力。
*/

export interface IslandTask {
  id: number
  title: string
  due: string
  done: boolean
  type: string
}

export interface IslandInterview {
  id: number
  company: string
  boss: string
  mode: string
  count: string
  date: string
  status: '待开始' | '进行中' | '已完成'
  round: string
}

export interface IslandWeakness {
  id: number
  name: string
  hp: number
}

export type ReportDims = Record<string, number>

export interface IslandReport {
  id: number
  company: string
  mode: string
  date: string
  elapsed?: number
  score: number
  grade: '强烈通过' | '通过' | '待定' | '不通过'
  advice: string
  dims: ReportDims
  good: string[]
  issues: string[]
  pweak: string[]
  tweaky: string[]
  plan: string[]
}

export interface IslandPipelineItem {
  id: number
  company: string
  role: string
  jd: string
  stage: number
  apply: string
  ivDate: string
  result: string
  note: string
}

export interface IslandWork {
  company: string
  role: string
  time: string
  desc: string
}

export interface IslandArchive {
  name: string
  target: string
  years: string
  status: string
  transfer: string
  packYears: string
  city: string
  salary: string
  skills: string[]
  works: IslandWork[]
  edu: { school: string; major: string; time: string; honor: string }
  projPri: { name: string; role: string }[]
}

export interface IslandProjectVersion {
  id: number
  vno: number
  state: string
  date: string
  files: number
  parsed: number
  excluded: number
  failed: number
  tech: string
  qps: string
  highlight: string
  analyzed: Record<string, unknown> | null
  confirmed: Record<string, unknown> | null
}

export interface IslandProject {
  id: number
  name: string
  type: string
  status: string
  files: number
  versions: IslandProjectVersion[]
}

export interface IslandInterviewer {
  id: number
  name: string
  style: string
  diff: string
  count: string
  builtin: boolean
}

export interface IslandBuiltin {
  id: number
  name: string
  use: string
  need: string
}

export interface IslandKbHistoryItem {
  q: string
  ans: string
  src: string
  t: string
}

export interface IslandStudyTask {
  id: number
  title: string
  from: string
  due: string
  done: boolean
  status: 'todo' | 'done'
  progress: number
}

export interface IslandAiAccount {
  id: number
  name: string
  provider: string
  url: string
  proto: string
  key: string
  enabled: boolean
  timeout: number
  retry: number
  models: string[]
  lastTest: { status: string; latency: number; model: string; prompt: string; date: string }
}

export interface IslandAiScene {
  name: string
  primary: number
  pm: string
  backup: number
  bm: string
  think: string
  autoSwitch: boolean
  net: string
}

export interface IslandAiHistory {
  date: string
  account: string
  model: string
  proto: string
  prompt: string
  result: string
  latency: number
  status: string
  error: string
}

export interface IslandNotification {
  id: number
  icon: string
  title: string
  content: string
  time: string
  read: boolean
  kind: string
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function plusDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function fmtDate(s: string | undefined, short = false): string {
  if (!s) return '—'
  const d = new Date(s)
  const m = d.getMonth() + 1
  const day = d.getDate()
  return short ? `${m}月${day}日` : `${d.getFullYear()}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const islandTasks: IslandTask[] = [
  { id: 1, title: '复习 Redis 缓存击穿解决方案', due: plusDays(-1), done: false, type: '复习' },
  { id: 2, title: '整理 JVM 垃圾回收与调优笔记', due: todayStr(), done: false, type: '学习' },
  { id: 3, title: '刷 2 道 LeetCode 动态规划', due: todayStr(), done: false, type: '刷题' },
  { id: 4, title: '打磨「秒杀系统」自我介绍（30s）', due: plusDays(1), done: true, type: '准备' },
]

export const islandInterviews: IslandInterview[] = [
  { id: 1, company: '字节跳动', boss: '后端技术面试官', mode: '技术面', count: '10题', date: plusDays(1), status: '待开始', round: '一面' },
  { id: 2, company: '某创业公司', boss: 'CTO', mode: '模拟面试', count: '5题', date: todayStr(), status: '待开始', round: '一面' },
]

export const islandWeaknesses: IslandWeakness[] = [
  { id: 1, name: 'Redis 缓存一致性', hp: 35 },
  { id: 2, name: 'MySQL 索引最左匹配', hp: 55 },
  { id: 3, name: '分布式事务（Seata/TCC）', hp: 20 },
  { id: 4, name: 'Kafka 消费幂等与顺序', hp: 42 },
]

export const islandReports: IslandReport[] = [
  {
    id: 1, company: '美团', mode: '技术面', date: plusDays(-1), score: 78, grade: '待定',
    advice: '基础扎实，项目深度需加强',
    dims: { 业务理解: 80, 技术正确性: 82, 原理理解: 75, 实现深度: 70, 项目实践能力: 78, 问题分析: 76, 方案完整性: 79, 架构取舍: 72, 排障与异常恢复: 74, 表达结构: 84, 边界意识: 77 },
    good: ['自我介绍结构清晰，技术栈罗列有条理', 'JVM 内存模型回答准确'],
    issues: ['被连续追问「Redis 宕机降级方案」时缺少明确兜底', '对 MQ 消息丢失场景的处理描述模糊'],
    pweak: ['秒杀库存扣减在极端并发下的边界'],
    tweaky: ['分布式事务的落地经验', '缓存与数据库双写一致性'],
    plan: ['精读《Redis 设计与实现》缓存章节', '手写一次 TCC try/confirm/cancel 伪代码', '复盘一次线上超时排查'],
  },
  {
    id: 2, company: '阿里云', mode: '模拟面试', date: plusDays(-3), score: 91, grade: '通过',
    advice: '系统设计表现优秀',
    dims: { 业务理解: 90, 技术正确性: 92, 原理理解: 88, 实现深度: 90, 项目实践能力: 91, 问题分析: 89, 方案完整性: 92, 架构取舍: 87, 排障与异常恢复: 88, 表达结构: 93, 边界意识: 90 },
    good: ['限流/熔断设计完整，给出具体阈值', '能说出压测数据支撑结论'],
    issues: ['对跨机房容灾只给了概念，缺演练细节'],
    pweak: ['容灾演练流程'],
    tweaky: ['多活架构细节'],
    plan: ['阅读多活架构案例 1 篇', '整理一次容灾演练 checklist'],
  },
]

export const islandPipeline: IslandPipelineItem[] = [
  { id: 1, company: '腾讯', role: 'Java 后端', jd: '社招，要求高并发与分布式经验', stage: 2, apply: plusDays(-9), ivDate: plusDays(-2), result: '面试中', note: '二面偏架构，准备秒杀项目' },
  { id: 2, company: '字节跳动', role: 'Java + AI', jd: '大模型应用方向', stage: 4, apply: plusDays(-12), ivDate: plusDays(1), result: '待二面', note: '一面已过，准备 AI 工程题' },
  { id: 3, company: '美团', role: '后端开发', jd: '基础扎实，有项目即可', stage: 1, apply: todayStr(), ivDate: '', result: '待安排', note: '内推刚投' },
]

export const islandArchive: IslandArchive = {
  name: '阿岛', target: 'Java 后端工程师', years: '3-5 年', status: '在职看机会', transfer: '否（科班/本岗）', packYears: '',
  city: '北京/上海', salary: '25k-35k · 14薪',
  skills: ['Java', 'Spring Boot', 'Redis', 'MySQL', 'Kafka', 'RocketMQ', '分布式事务'],
  works: [{ company: '某电商中台', role: '后端工程师', time: '2023.01 - 至今', desc: '主导营销与秒杀核心链路，QPS 10k 下零超卖；负责库存与订单服务拆分。' }],
  edu: { school: '某 211 高校', major: '计算机科学与技术 · 本科', time: '2019 - 2023', honor: '国家奖学金' },
  projPri: [{ name: '秒杀系统', role: '主项目' }, { name: '营销平台', role: '辅助项目' }, { name: '数据同步平台', role: '背景项目' }],
}

export const islandProjects: IslandProject[] = [
  {
    id: 1, name: '秒杀系统', type: 'ZIP', status: '已发布', files: 128,
    versions: [
      {
        id: 101, vno: 1, state: 'PUBLISHED', date: plusDays(-14), files: 128, parsed: 121, excluded: 5, failed: 2,
        tech: 'Spring Boot 3 + Redis + Kafka + MySQL', qps: '10k', highlight: '库存扣减与幂等设计',
        analyzed: { 业务背景: '高并发限时抢购，峰值 10k QPS', 结构: 'gateway→order→inventory→pay 微服务', 风险点: ['Redis 与 DB 库存不一致', '热点 Key 集中', '库存扣减超卖'], 可追问: ['如何保证不超卖', '缓存击穿怎么防', 'Redis 宕机降级'] },
        confirmed: null,
      },
      {
        id: 102, vno: 2, state: 'REVIEW_REQUIRED', date: plusDays(-2), files: 131, parsed: 124, excluded: 5, failed: 2,
        tech: 'Spring Boot 3 + Redis Cluster + Kafka + MySQL + Sentinel', qps: '15k', highlight: '引入 Sentinel 限流与 Redis Cluster',
        analyzed: { 业务背景: '同上，扩展为 Redis Cluster', 结构: '新增限流与降级层', 风险点: ['Cluster 数据倾斜', '限流阈值评估'], 可追问: ['Cluster 扩容迁移', '限流阈值怎么定'] },
        confirmed: { 业务背景: '高并发限时抢购，峰值 15k QPS，团队 6 人', 结构: 'gateway→order→inventory→pay，库存独立服务', 风险点: ['热点 Key 集中', '库存扣减超卖'], 可追问: ['如何保证不超卖'] },
      },
    ],
  },
  {
    id: 2, name: '营销平台', type: '本地目录', status: '解析中', files: 0,
    versions: [{ id: 201, vno: 1, state: 'SCANNING', date: todayStr(), files: 0, parsed: 0, excluded: 0, failed: 0, tech: '', qps: '', highlight: '', analyzed: null, confirmed: null }],
  },
]

export const islandInterviewers: IslandInterviewer[] = [
  { id: 1, name: '后端基础面试官', style: '八股型', diff: '中级', count: '10题', builtin: false },
  { id: 2, name: '系统设计面试官', style: '实战派', diff: '高级', count: '5题', builtin: false },
]

export const islandBuiltins: IslandBuiltin[] = [
  { id: 11, name: 'Java 基础训练官', use: 'Java/JVM/并发/集合/Spring 基础', need: '可无资料' },
  { id: 12, name: 'Java + AI 技术面试官', use: 'RAG/Agent/模型接入/Tool Calling/AI 工程', need: '可无资料' },
  { id: 13, name: '项目深挖面试官', use: '针对项目连续追问与架构复盘', need: '建议绑定项目' },
  { id: 14, name: '企业流程面试官', use: '八股/项目/场景/线上问题/综合素养', need: '可绑定项目' },
  { id: 15, name: '代码审查面试官', use: '从代码片段中识别真实工程问题', need: '可无项目' },
  { id: 16, name: 'AI 转行入门教练', use: '教学式解释/分步训练/转行补课', need: '可无资料' },
]

export const islandKbHistory: IslandKbHistoryItem[] = [
  { q: 'Redis 缓存击穿怎么解决？', ans: '使用互斥锁（如 SETNX）重建缓存，并对热点 Key 做逻辑过期/预加载，避免大量请求同时穿透到数据库。', src: '系统通用知识 · 缓存章节', t: todayStr() },
]

export const islandStudyPlan: IslandStudyTask[] = [
  { id: 1, title: '复习 Redis 缓存一致性', from: '报告·美团', due: todayStr(), done: false, status: 'todo', progress: 0 },
  { id: 2, title: '练习 TCC 分布式事务伪代码', from: '报告·美团', due: plusDays(2), done: false, status: 'todo', progress: 0 },
  { id: 3, title: '整理秒杀限流阈值推导', from: '报告·阿里云', due: plusDays(3), done: false, status: 'todo', progress: 0 },
  { id: 4, title: '复盘一次线上超时排查', from: '报告·美团', due: plusDays(5), done: true, status: 'done', progress: 100 },
]

export const islandAiAccounts: IslandAiAccount[] = [
  {
    id: 1, name: '我的主账户', provider: 'OpenAI 兼容网关', url: 'https://api.example-gw.com/v1/chat/completions', proto: 'Chat Completions',
    key: 'sk-************************', enabled: true, timeout: 60, retry: 2,
    models: ['gpt-4o', 'gpt-4o-mini', 'deepseek-chat'],
    lastTest: { status: '成功', latency: 220, model: 'gpt-4o', prompt: '你好，请介绍你自己', date: plusDays(-1) },
  },
  {
    id: 2, name: '备用账户', provider: '自建 Model Gateway', url: 'https://my-gw.internal/v1/responses', proto: 'Responses',
    key: 'sk-************************', enabled: true, timeout: 90, retry: 3,
    models: ['claude-3.5-sonnet', 'qwen-max'],
    lastTest: { status: '成功', latency: 310, model: 'claude-3.5-sonnet', prompt: '你好', date: plusDays(-3) },
  },
]

export const islandAiScenes: IslandAiScene[] = [
  { name: '项目画像生成', primary: 1, pm: 'gpt-4o', backup: 2, bm: 'claude-3.5-sonnet', think: '中', autoSwitch: true, net: 'DISABLED' },
  { name: '知识库问答', primary: 1, pm: 'gpt-4o-mini', backup: 2, bm: 'qwen-max', think: '低', autoSwitch: true, net: 'ON_DEMAND' },
  { name: '项目资料分析', primary: 1, pm: 'gpt-4o', backup: 2, bm: 'claude-3.5-sonnet', think: '中', autoSwitch: true, net: 'DISABLED' },
  { name: '面试官提问和追问', primary: 1, pm: 'gpt-4o', backup: 2, bm: 'claude-3.5-sonnet', think: '高', autoSwitch: true, net: 'DISABLED' },
  { name: '面试评分报告', primary: 1, pm: 'gpt-4o', backup: 2, bm: 'claude-3.5-sonnet', think: '高', autoSwitch: false, net: 'DISABLED' },
  { name: '复习计划生成', primary: 1, pm: 'gpt-4o-mini', backup: 2, bm: 'qwen-max', think: '低', autoSwitch: true, net: 'DISABLED' },
  { name: '联网检索后的总结', primary: 1, pm: 'gpt-4o', backup: 2, bm: 'qwen-max', think: '中', autoSwitch: true, net: 'AUTO' },
]

export const islandAiHistory: IslandAiHistory[] = [
  { date: plusDays(-1), account: '我的主账户', model: 'gpt-4o', proto: 'Chat Completions', prompt: '你好，请介绍你自己', result: '成功', latency: 220, status: 'SUCCEEDED', error: '' },
  { date: plusDays(-3), account: '备用账户', model: 'claude-3.5-sonnet', proto: 'Responses', prompt: '你好', result: '成功', latency: 310, status: 'SUCCEEDED', error: '' },
  { date: plusDays(-6), account: '我的主账户', model: 'gpt-4o', proto: 'Chat Completions', prompt: '测试超时场景', result: '失败', latency: 0, status: 'TIMEOUT', error: '请求超过 60s 未响应（当前版本不做自动切换，失败即返回业务层）' },
]

export const islandNotifications: IslandNotification[] = [
  { id: 1, icon: 'alarm', title: '复习任务到期', content: '「复习 Redis 缓存击穿解决方案」已逾期 1 天，建议今天完成。', time: '今天 09:00', read: false, kind: 'task' },
  { id: 2, icon: 'interview', title: '面试安排提醒', content: '明天 14:00 字节跳动 · 技术面（一面），记得提前热身。', time: '昨天 18:00', read: false, kind: 'interview' },
  { id: 3, icon: 'report', title: '报告生成完成', content: '「美团 · 技术面」评分报告已生成，总分 78。', time: '3 天前', read: false, kind: 'report' },
  { id: 4, icon: 'import', title: '项目导入完成', content: '「秒杀系统」V2 解析完成：124 成功 / 5 排除 / 2 失败，等待确认画像。', time: '昨天 21:00', read: false, kind: 'project' },
  { id: 5, icon: 'system', title: '系统提醒', content: '原型演示通知：正式通知将随后端 Notification 能力接入。', time: '3 天前', read: true, kind: 'system' },
]

export const PIPELINE_STAGES = ['关注', '投递', '笔试', '面试', 'HR', 'offer', '结束'] as const

export const SKILL_RADAR_LABELS = ['Java 基础与并发', 'Redis 与高并发', 'MySQL 与事务', '系统设计与取舍', 'AI 应用开发', '表达与沟通'] as const

export const SKILL_RADAR_VALUES = [76, 58, 66, 64, 45, 82] as const
