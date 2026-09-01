/*
 功能缺口补全（P6 扩展页）演示数据（移植自原型 gapSeed）。
 覆盖：JD 匹配、通知中心、设置偏好、技能图谱期段、帮助内容。
 报告中心已改接真实 /api/v1/reports，错题本已改接真实 /api/v1/practice-items，
 本文件不再保留报告或错题演示数据——错题的假公司来源、假参考答案与假选择题随 C-03c 一并删除。
*/

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

let uidSeed = 1
function uid(): number {
  uidSeed += 1
  return uidSeed
}

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
