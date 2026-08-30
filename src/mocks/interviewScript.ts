/*
 面试副本剧本（移植自原型的 SCRIPT.seckill，固定剧本演示）。
 节点推进逻辑：主问题 -> 根据回答关键词命中分支 -> 追问 -> 下一主问题 -> … -> end。
 原型中所有题目、追问、评分均来自固定演示剧本，页面必须保留「模拟」标记。
*/

export interface ScriptNode {
  who: 'iv'
  type: 'main' | 'follow'
  q: string
  next?: string
  suggest?: string[]
  branches?: { match: string[]; next: string }[]
}

export interface InterviewScript {
  interviewer: string
  role: string
  start: string
  nodes: Record<string, ScriptNode>
  report: {
    company: string
    mode: string
    score: number
    grade: '强烈通过' | '通过' | '待定' | '不通过'
    advice: string
    dims: Record<string, number>
    good: string[]
    issues: string[]
    pweak: string[]
    tweaky: string[]
    plan: string[]
  }
}

export const SECKILL_SCRIPT: InterviewScript = {
  interviewer: '项目深挖面试官',
  role: '项目深挖 · 秒杀系统',
  start: 'q1',
  nodes: {
    q1: {
      who: 'iv', type: 'main', q: '先整体介绍一下你的秒杀系统架构，以及你负责的部分。', next: 'q2',
      suggest: ['采用 Redis 预扣 + 异步落库，网关限流，我负责库存与下单链路', '分库分表 + 本地缓存，热点 Key 打散，我负责交易核心'],
    },
    q2: {
      who: 'iv', type: 'main', q: '高并发下库存扣减如何保证不超卖？讲讲你的方案。',
      branches: [
        { match: ['redis', '预扣', 'lua', '原子', 'incr', '扣减'], next: 'q2a' },
        { match: ['数据库', '乐观锁', 'version', '唯一索引', '事务', '约束'], next: 'q2b' },
        { match: [], next: 'q2c' },
      ],
    },
    q2a: {
      who: 'iv', type: 'follow', q: '你用 Redis 预扣库存，那 Redis 和数据库库存不一致时怎么处理？', next: 'q3',
      suggest: ['通过 binlog/定时对账把 DB 校准到 Redis，不一致期间以 DB 为准', '异步消息补偿，落库成功后回写 Redis，失败重试'],
    },
    q2b: {
      who: 'iv', type: 'follow', q: '你倾向用数据库约束兜底，那高并发下数据库会成为瓶颈吗？怎么缓解？', next: 'q3',
      suggest: ['用唯一索引防超卖，但前面加 Redis 预扣挡住绝大多数流量', '单条 UPDATE 带 WHERE 库存>0 原子扣减，配合连接池限流'],
    },
    q2c: { who: 'iv', type: 'follow', q: '能具体说下你方案中“不超卖”的保证点吗？是哪一层的限制？', next: 'q3' },
    q3: {
      who: 'iv', type: 'main', q: '缓存击穿、穿透、雪崩你分别怎么应对？',
      branches: [
        { match: ['布隆', 'bloom', '空值', 'null', '缓存'], next: 'q3a' },
        { match: ['互斥', '锁', 'mutex', '逻辑过期', 'singleflight'], next: 'q3b' },
        { match: [], next: 'q3c' },
      ],
    },
    q3a: {
      who: 'iv', type: 'follow', q: '你提到布隆过滤器/空值缓存，误判率一般怎么控制？', next: 'q4',
      suggest: ['布隆过滤器误判率按数据量+可接受误判推算位数组与哈希次数', '空值缓存设短 TTL 并打标记，防穿透同时避免污染'],
    },
    q3b: {
      who: 'iv', type: 'follow', q: '缓存击穿你用互斥锁还是逻辑过期？各有什么取舍？', next: 'q4',
      suggest: ['互斥锁重建，保证单线程，但持锁挂了要加看门狗', '逻辑过期不阻塞读，一致性稍弱但可用性更高'],
    },
    q3c: { who: 'iv', type: 'follow', q: '如果热点 Key 在重建时被打满，你会怎么防护？', next: 'q4' },
    q4: {
      who: 'iv', type: 'main', q: '最后，如果让你给这套系统加一个“防超卖”的兜底校验，你会加在哪一层？',
      branches: [
        { match: ['对账', '异步', '定时', 'binlog', '校对', '补偿'], next: 'q4a' },
        { match: [], next: 'q4b' },
      ],
    },
    q4a: {
      who: 'iv', type: 'follow', q: '你提到对账，对账发现的超卖怎么回滚或补偿？', next: 'end',
      suggest: ['实时拦截+离线对账，超卖订单走退款/排队补偿', '以最终一致为目标，告警+人工介入极端案例'],
    },
    q4b: {
      who: 'iv', type: 'follow', q: '如果只能加一处校验，你加在网关、服务还是数据库？为什么？', next: 'end',
      suggest: ['加在数据库，唯一约束是不可绕过的最终防线', '加在网关做统一拦截止损，服务内再兜底'],
    },
    end: { who: 'iv', type: 'main', q: '_END_' },
  },
  report: {
    company: '秒杀系统（模拟）', mode: '项目深挖', score: 84, grade: '通过', advice: '架构清晰，落地细节到位',
    dims: { 业务理解: 85, 技术正确性: 88, 原理理解: 82, 实现深度: 84, 项目实践能力: 86, 问题分析: 82, 方案完整性: 83, 架构取舍: 80, 排障与异常恢复: 78, 表达结构: 88, 边界意识: 81 },
    good: ['架构分层清晰，能讲出各服务职责边界', '超卖防护方案具体：预扣+异步落库+唯一约束'],
    issues: ['Redis 宕机降级时，对「数据库承压上限」缺乏量化评估', '布隆过滤器误判率与内存成本的权衡略浅'],
    pweak: ['极端并发下的边界与降级演练'],
    tweaky: ['Redis Cluster 数据倾斜', '限流阈值推导'],
    plan: ['补充一次降级压测数据', '整理布隆过滤器参数推导笔记'],
  },
}

export interface ScriptTurn {
  sp: 'iv' | 'me'
  type: 'main' | 'follow'
  q: string
  answer?: string
}

export function isEndNode(node: ScriptNode): boolean {
  return node.q === '_END_'
}

export function mainNodes(script: InterviewScript): [string, ScriptNode][] {
  return Object.entries(script.nodes).filter(
    ([, node]) => node.who === 'iv' && node.type === 'main' && node.q !== '_END_',
  )
}

export function nodeOf(script: InterviewScript, key: string): ScriptNode {
  const node = script.nodes[key]
  if (!node) throw new Error(`unknown script node: ${key}`)
  return node
}

export function resolveNext(node: ScriptNode, answer: string): string {
  if (node.branches && node.branches.length) {
    const lower = answer.toLowerCase()
    const hit = node.branches.find(
      (branch) => branch.match.length && branch.match.some((keyword) => lower.includes(keyword.toLowerCase())),
    )
    const fallback = node.branches[node.branches.length - 1]
    const target = hit ?? fallback
    return target?.next ?? node.next ?? ''
  }
  return node.next ?? ''
}
