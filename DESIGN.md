# Orbit Workbench Design System

## Direction

使用场景是个人开发者在傍晚或夜间长时间查看任务、日志和模型连接状态。界面采用接近纯黑的低眩光背景，深苔绿色只用于主操作和选中状态，琥珀色、蓝色和红色承担不同语义，整体保持克制的工程工具气质。

## Color Strategy

采用 Restrained 策略。中性表面占主要面积，品牌色使用不超过约 10%，语义色只用于状态、警告和反馈。

```css
:root {
  --ow-bg: oklch(0.115 0 0);
  --ow-surface: oklch(0.165 0.008 140);
  --ow-surface-raised: oklch(0.205 0.011 140);
  --ow-ink: oklch(0.945 0.008 150);
  --ow-muted: oklch(0.685 0.018 150);
  --ow-primary: oklch(0.66 0.14 140);
  --ow-primary-strong: oklch(0.72 0.15 140);
  --ow-accent: oklch(0.78 0.13 78);
  --ow-info: oklch(0.72 0.12 235);
  --ow-danger: oklch(0.68 0.16 25);
}
```

## Typography

使用系统无衬线字体栈。产品界面采用固定字号比例，不使用随视口缩放的标题。页面标题 24px，区块标题 16px，正文 14px，辅助信息 12px。数字、状态和模型标识允许使用等宽字体。

## Layout

- 桌面端使用 232px 侧边栏、顶部上下文栏和最大 1440px 主内容区。
- 低于 900px 时侧边栏切换为抽屉，主内容占满宽度。
- 页面区块使用分隔线和留白组织，不把每个区块包装成浮动卡片。
- 数据列表优先使用表格；窄屏切换为紧凑列表或允许横向滚动。

## Components

- 圆角：面板和卡片 8px，输入控件 6px，标签可使用胶囊形。
- 主按钮使用绿色实底和近黑文字；危险操作保持文字或浅色状态，确认后才使用实底。
- 所有控件必须有 hover、focus-visible、active、disabled 和 loading 状态。
- 加载使用骨架屏或局部占位；空状态说明下一步操作；错误状态展示可重试入口。
- 图标统一使用 Lucide，图标按钮提供 tooltip 和 aria-label。

## Motion

状态转换使用 160-220ms ease-out，不制作页面入场编排。运行中的脉冲仅用于连接状态指示；减少动态效果模式下关闭位移和循环动画。
