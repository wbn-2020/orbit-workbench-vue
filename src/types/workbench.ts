export type WorkbenchTaskState = 'todo' | 'done' | 'overdue'

export interface WorkbenchMetric {
  label: string
  value: string
  detail: string
  tone: 'primary' | 'accent' | 'success'
}

export interface TodayTask {
  id: number
  title: string
  source: string
  state: WorkbenchTaskState
  dueLabel: string
}

export interface InterviewOverview {
  id: number
  company: string
  role: string
  mode: '技术面' | '模拟面试' | '项目深挖'
  interviewer: string
  scheduledLabel: string
  status: '待开始' | '进行中' | '已完成'
  score?: number
}

export interface WeakTopic {
  id: number
  dimension: string
  topic: string
  source: string
  urgency: 'high' | 'medium'
}

export interface ReportOverview {
  id: number
  title: string
  score: number
  dateLabel: string
  status: '需巩固' | '表现良好' | '优秀'
}

export interface StudyTask {
  id: number
  title: string
  source: string
  dueLabel: string
  progress: number
  done: boolean
}

export interface WorkbenchSnapshot {
  metrics: WorkbenchMetric[]
  todayTasks: TodayTask[]
  interviews: InterviewOverview[]
  weakTopics: WeakTopic[]
  reports: ReportOverview[]
  studyTasks: StudyTask[]
}
