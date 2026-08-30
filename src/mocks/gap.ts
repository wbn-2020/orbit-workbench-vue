/*
 功能缺口补全（P6 扩展页）演示数据（移植自原型 gapSeed）。
 覆盖：简历、报告中心、错题本、JD 匹配、通知中心、设置偏好、技能图谱期段。
*/

export interface GapResumeBasic {
  name: string
  target: string
  phone: string
  email: string
  city: string
  summary: string
}

export interface GapResume {
  created: boolean
  basic: GapResumeBasic
  educations: { id: number; school: string; major: string; time: string; honor: string }[]
  works: { id: number; company: string; role: string; time: string; desc: string }[]
  projects: { id: number; name: string; role: string; time: string; tech: string; desc: string; highlights: string }[]
  skills: { id: number; name: string; level: number }[]
}

export interface GapReport {
  id: number
  company: string
  role: string
  type: '面试' | '笔试'
  score: number
  date: string
  tags: string[]
  dims: Record<string, number>
}

export interface GapWrongItem {
  id: number
  dim: string
  source: string
  q: string
  mine: string
  ref: string
  analysis: string
  opt: string[]
  answer: number
  mastered: boolean
}

export interface GapJd {
  id: number
  title: string
  company: string
  city: string
  salary: string
  tags: string[]
  match: number
  desc: string
  bd: { skill: number; exp: number; project: number }
}

export interface GapNotification {
  id: number
  icon: string
  title: string
  text: string
  time: string
  read: boolean
}

export interface SkillPeriod {
  name: string
  dims: Record<string, number>
}

function plusDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

let uidSeed = 1
function uid(): number {
  uidSeed += 1
  return uidSeed
}

export const gapResume: GapResume = {
  created: true,
  basic: {
    name: '阿岛', target: 'Java 后端工程师（Java + AI 方向）', phone: '138****6688', email: 'island@job.com',
    city: '北京 / 远程', summary: '3 年后端经验，主导过高并发秒杀与营销系统，正在补齐 AI 工程能力。',
  },
  educations: [
    { id: uid(), school: '某 211 高校', major: '计算机科学与技术 · 本科', time: '2019 - 2023', honor: '国家奖学金' },
    { id: uid(), school: '某在线学院', major: 'AI 工程微硕士（在读）', time: '2024 - 至今', honor: '' },
  ],
  works: [
    { id: uid(), company: '某电商中台', role: '后端工程师', time: '2023.01 - 至今', desc: '主导营销与秒杀核心链路，QPS 10k 下零超卖；负责库存与订单服务拆分。' },
    { id: uid(), company: '某创业公司', role: 'Java 开发', time: '2021.07 - 2022.12', desc: '从 0 搭建订单与支付清结算模块，支撑日百万级交易。' },
  ],
  projects: [
    { id: uid(), name: '秒杀系统', role: '主项目', time: '2023', tech: 'Spring Boot + Redis + Kafka + MySQL', desc: '高并发限时抢购，峰值 10k QPS。', highlights: '库存扣减与幂等设计、热点 Key 防护' },
    { id: uid(), name: 'AI 问答助手', role: '个人项目', time: '2024', tech: 'Spring AI + RAG + Vector DB', desc: '基于检索增强的面试问答助手。', highlights: 'Tool Calling 编排、上下文压缩' },
  ],
  skills: [
    { id: uid(), name: 'Java / JVM', level: 4 },
    { id: uid(), name: 'Spring Cloud', level: 4 },
    { id: uid(), name: 'Redis / 高并发', level: 3 },
    { id: uid(), name: 'MySQL 调优', level: 3 },
    { id: uid(), name: 'AI 工程（RAG/Agent）', level: 2 },
  ],
}

export const gapReports: GapReport[] = [
  { id: uid(), company: '美团', role: '后端开发工程师', type: '面试', score: 78, date: plusDays(-3), tags: ['技术面', '已过'], dims: { 业务理解: 80, 技术深度: 70, 项目实践: 78, 问题分析: 76, 架构取舍: 72, 表达沟通: 84, 边界意识: 77 } },
  { id: uid(), company: '阿里云', role: 'Java 开发', type: '面试', score: 91, date: plusDays(-12), tags: ['模拟面', '优秀'], dims: { 业务理解: 90, 技术深度: 90, 项目实践: 91, 问题分析: 89, 架构取舍: 87, 表达沟通: 93, 边界意识: 90 } },
  { id: uid(), company: '某大厂', role: 'Java + AI', type: '笔试', score: 85, date: plusDays(-1), tags: ['笔试', '算法'], dims: { 业务理解: 82, 技术深度: 88, 项目实践: 80, 问题分析: 86, 架构取舍: 79, 表达沟通: 83, 边界意识: 84 } },
  { id: uid(), company: '字节跳动', role: '后端研发', type: '面试', score: 73, date: plusDays(-20), tags: ['技术面', '待提升'], dims: { 业务理解: 70, 技术深度: 65, 项目实践: 72, 问题分析: 68, 架构取舍: 60, 表达沟通: 80, 边界意识: 71 } },
]

export const gapWrong: GapWrongItem[] = [
  { id: uid(), dim: '技术深度', source: '美团面试', q: 'Redis 与数据库双写时如何保证一致性？', mine: '直接先写数据库再删缓存。', ref: '采用「先更新数据库，再删除缓存」的 Cache-Aside，并对缓存删除失败做重试 / Binlog 订阅补偿，避免脏读。', analysis: '要点是删除而非更新缓存、失败补偿、以及应对并发读写时的短暂不一致窗口。', opt: ['先更新数据库再删除缓存（配合补偿）', '同时更新数据库和缓存保证强一致', '只写数据库不碰缓存', '用定时任务全量刷新'], answer: 0, mastered: false },
  { id: uid(), dim: '架构取舍', source: '字节面试', q: '秒杀库存扣减如何防超卖？', mine: '用数据库乐观锁版本号。', ref: 'Redis 预扣减 + Lua 原子扣减 + 异步落库，数据库做最终兜底校验，配合限流与降级。', analysis: '高并发下应把扣减前置到 Redis 原子操作，数据库仅做最终一致校验。', opt: ['Redis Lua 原子扣减 + 异步落库', '纯数据库乐观锁', '前端限制点击频率', '增加服务器数量'], answer: 0, mastered: false },
  { id: uid(), dim: '问题分析', source: '某大厂笔试', q: 'Kafka 消费重复消息如何保证幂等？', mine: '在业务里判断一下。', ref: '利用消息 key 做去重表 / 唯一约束，或消费端记录已处理 offset 幂等键，确保重复消息不重复生效。', analysis: '幂等的核心是「同一消息多次消费结果一致」，常用唯一键 + 去重表。', opt: ['唯一键 + 去重表', '消费前 sleep 随机时间', '扩大消费者并发', '忽略重复日志'], answer: 0, mastered: true },
  { id: uid(), dim: '技术深度', source: '阿里云模拟面', q: '什么是 RAG？它如何缓解大模型幻觉？', mine: '就是把知识喂给模型。', ref: '检索增强生成：先检索可信知识片段注入上下文，再让模型基于证据回答，显著降低无依据幻觉。', analysis: '强调「检索 + 上下文注入 + 引用溯源」三步，以及切分与向量召回质量的影响。', opt: ['检索外部知识注入上下文再生成', '微调一个大模型替代检索', '关闭采样温度到 0', '让模型多生成几遍取最长'], answer: 0, mastered: false },
  { id: uid(), dim: '边界意识', source: '美团面试', q: '缓存击穿与缓存雪崩的区别与应对？', mine: '都加锁就行。', ref: '击穿是单 Key 失效高并发打 DB，用互斥锁 / 逻辑过期；雪崩是大量 Key 同时失效，用错峰过期 + 多级缓存。', analysis: '需区分单点击穿与大面积失效，对应互斥重建与过期错峰两套策略。', opt: ['击穿用互斥锁、雪崩用错峰过期', '两者都用同一把全局锁', '都不处理靠数据库扛', '只增加缓存容量'], answer: 0, mastered: false },
  { id: uid(), dim: '表达沟通', source: '字节面试', q: '请用 30 秒介绍你最得意的项目。', mine: '我做了秒杀系统，很复杂。', ref: '结构化：背景（高并发抢购）→ 角色（主导库存链路）→ 动作（Redis 原子扣减 + 限流）→ 结果（10k QPS 零超卖）。', analysis: 'STAR 结构（情境-任务-行动-结果）让表达有层次、可量化。', opt: ['STAR 结构 + 量化结果', '想到哪说到哪', '只说技术栈罗列', '强调自己最辛苦'], answer: 0, mastered: true },
]

export const gapJds: GapJd[] = [
  { id: uid(), title: 'Java 后端工程师（高并发方向）', company: '美团', city: '北京', salary: '30k-50k · 16薪', tags: ['高并发', '分布式', 'Redis'], match: 88, desc: '负责核心交易链路，要求熟悉高并发、分布式事务与缓存架构，有秒杀 / 营销经验优先。', bd: { skill: 90, exp: 85, project: 88 } },
  { id: uid(), title: 'Java + AI 应用工程师', company: '字节跳动', city: '上海', salary: '35k-55k · 15薪', tags: ['AI 工程', 'RAG', 'Agent'], match: 62, desc: '建设大模型应用平台，要求熟悉 RAG、Tool Calling、Agent 编排，Java 工程能力扎实。', bd: { skill: 55, exp: 60, project: 65 } },
  { id: uid(), title: '后端开发工程师（校招）', company: '某独角兽', city: '杭州', salary: '20k-30k · 14薪', tags: ['校招', '基础', '算法'], match: 74, desc: '面向应届生，考察计算机基础、数据结构与算法、以及基本工程素养。', bd: { skill: 70, exp: 60, project: 80 } },
  { id: uid(), title: '资深 Java 工程师', company: '阿里云', city: '北京', salary: '40k-60k · 16薪', tags: ['资深', '架构', '稳定性'], match: 81, desc: '负责云原生中间件，要求系统设计能力与线上稳定性治理经验。', bd: { skill: 82, exp: 88, project: 78 } },
  { id: uid(), title: 'AI 平台后端研发', company: '某 AI 创业公司', city: '远程', salary: '面议', tags: ['远程', 'LLM', '向量库'], match: 58, desc: '搭建 LLM 应用后端，熟悉向量数据库、流式接口与 Prompt 工程。', bd: { skill: 50, exp: 55, project: 62 } },
]

export const gapNotifications: GapNotification[] = [
  { id: uid(), icon: '📊', title: '新的面试报告已生成', text: '「美团 · 后端开发」技术面报告得分 78，建议补齐缓存一致性。', time: new Date(Date.now() - 3600 * 1000 * 2).toISOString(), read: false },
  { id: uid(), icon: '🎯', title: '模拟面试邀约', text: '系统已为你匹配「Java + AI 技术面试官」，可随时开始一场模拟面试。', time: new Date(Date.now() - 3600 * 1000 * 20).toISOString(), read: false },
  { id: uid(), icon: '📚', title: '专项训练提醒', text: '你的「技术深度」维度掌握度偏低，建议重练 2 道错题。', time: new Date(Date.now() - 3600 * 1000 * 26).toISOString(), read: false },
  { id: uid(), icon: '🚀', title: '岗位匹配更新', text: '「字节跳动 · Java + AI」与你的技能图谱匹配度为 62%，可查看匹配拆解。', time: new Date(Date.now() - 3600 * 1000 * 50).toISOString(), read: true },
  { id: uid(), icon: '✨', title: '欢迎使用求职成长岛', text: '本演示包含简历、报告对比、错题训练等扩展页面，均为前端演示数据。', time: new Date(Date.now() - 3600 * 1000 * 72).toISOString(), read: true },
  { id: uid(), icon: '📝', title: '笔试报告已出', text: '「某大厂 · Java + AI」笔试得分 85，算法维度表现突出。', time: new Date(Date.now() - 3600 * 1000 * 96).toISOString(), read: false },
]

export const gapSettings = {
  notifyReport: true,
  notifyInterview: true,
  notifyTraining: true,
}

export const skillPeriods: SkillPeriod[] = [
  { name: '入职初', dims: { 业务理解: 55, 技术深度: 50, 项目实践: 58, 问题分析: 52, 架构取舍: 48, 表达沟通: 60, 边界意识: 55 } },
  { name: '3 个月后', dims: { 业务理解: 70, 技术深度: 66, 项目实践: 72, 问题分析: 68, 架构取舍: 64, 表达沟通: 74, 边界意识: 70 } },
  { name: '当前', dims: { 业务理解: 84, 技术深度: 80, 项目实践: 82, 问题分析: 78, 架构取舍: 76, 表达沟通: 88, 边界意识: 81 } },
]

export const skillTrend = {
  periods: ['入职初', '3 个月后', '当前'],
  series: [
    { name: '综合', values: [55, 69, 82] },
    { name: '技术深度', values: [50, 66, 80] },
    { name: '表达沟通', values: [60, 74, 88] },
  ],
}

export const SKILL_CATEGORY: Record<string, { cat: string; cls: string; tag: string }> = {
  技术深度: { cat: '技术硬实力', cls: 'tech', tag: 'blue' },
  项目实践: { cat: '技术硬实力', cls: 'tech', tag: 'blue' },
  业务理解: { cat: '思维判断', cls: 'think', tag: 'green' },
  问题分析: { cat: '思维判断', cls: 'think', tag: 'green' },
  架构取舍: { cat: '思维判断', cls: 'think', tag: 'green' },
  边界意识: { cat: '思维判断', cls: 'think', tag: 'green' },
  表达沟通: { cat: '沟通表达', cls: 'comm', tag: 'yel' },
}

export function skillCategoryOf(key: string): { cat: string; cls: string; tag: string } {
  return SKILL_CATEGORY[key] ?? { cat: '其他', cls: 'think', tag: 'gray' }
}

export function skillLevelOf(value: number): { text: string; cls: string } {
  if (value >= 80) return { text: '优秀', cls: 'excellent' }
  if (value >= 65) return { text: '良好', cls: 'good' }
  if (value >= 50) return { text: '平均', cls: 'avg' }
  return { text: '待提升', cls: 'basic' }
}

export interface HelpFaq {
  cat: string
  q: string
  a: string
}

export const HELP_FAQS: HelpFaq[] = [
  { cat: '简历', q: '简历完整度是怎么计算的？', a: '完整度按「基本信息 / 教育 / 工作 / 项目 / 技能」5 个模块是否填写来折算，全部填写即 100%。建议补齐薄弱模块后再导出 PDF（导出为演示占位）。' },
  { cat: '简历', q: '支持导出 PDF 吗？', a: '当前为演示阶段，「导出 PDF」会模拟导出流程并给出提示。真实导出能力将在后续版本接入打印 / 生成服务。' },
  { cat: '报告', q: '如何对比两份报告？', a: '在「我的报告中心」勾选任意 2 份报告，即可并排对比综合分与维度雷达，直观看到强弱项变化。' },
  { cat: '报告', q: '报告分数代表什么？', a: '综合分是各维度（业务理解、技术深度、项目实践、问题分析、架构取舍、表达沟通、边界意识等）的加权结果，各维度均 0-100。' },
  { cat: '错题', q: '重练训练如何计分？', a: '从「待巩固」错题中抽取最多 5 题逐题作答，结算时给出正确率，答对会自动标记为「已掌握」并刷新掌握进度。' },
  { cat: '岗位', q: '匹配度是怎么算的？', a: '匹配度由技能匹配、经验匹配、项目匹配三项加权得出，可在岗位详情中查看三项拆解标尺，帮助你定位差距。' },
  { cat: '技能', q: '能力雷达可以看历史趋势吗？', a: '可以。在「技能图谱」用右上角的期段切换（入职初 / 3 个月后 / 当前），雷达与折线均会随之更新。' },
  { cat: '设置', q: '暗色模式会保存吗？', a: '会。切换主题后立即全站生效，并持久化到本地，刷新后仍保持你选择的主题。' },
  { cat: '通用', q: '我的数据安全吗？', a: '当前页面均为前端演示：真实产品中档案、项目与面试数据按用户隔离存储在服务端，敏感信息不会进入日志或导出文件。' },
]

export const HELP_GUIDES = [
  { id: 'wizard', icon: '🧭', title: '初始化向导', desc: '逐步引导你完善档案、技能与首份报告。', body: '初始化向导会依次带你完成：① 基本信息与求职目标；② 技能栈自评；③ 导入首个项目；④ 生成第一份模拟报告。当前为原型占位。' },
  { id: 'tutorial', icon: '📘', title: '使用教程', desc: '图文讲解主要模块的核心玩法。', body: '使用教程涵盖：简历工作台的高完整度技巧、报告对比方法、错题重练节奏、JD 匹配拆解、技能图谱读图、通知与设置。原型阶段以引导文呈现。' },
]
