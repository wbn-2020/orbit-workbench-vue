<template>
  <article class="markdown-viewer" v-html="html" />
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'
import { computed } from 'vue'

const props = defineProps<{ content: string }>()
const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true })

const html = computed(() => DOMPurify.sanitize(markdown.render(props.content || '')))
</script>

<style scoped>
.markdown-viewer {
  min-width: 0;
  color: var(--ow-ink-secondary);
  overflow-wrap: anywhere;
}

.markdown-viewer :deep(h1),
.markdown-viewer :deep(h2),
.markdown-viewer :deep(h3) {
  margin: 1.35em 0 0.55em;
  color: var(--ow-ink);
  line-height: 1.3;
}

.markdown-viewer :deep(h1) {
  font-size: var(--fs-lg);
}

.markdown-viewer :deep(h2) {
  font-size: var(--fs-md);
}

.markdown-viewer :deep(h3) {
  font-size: var(--fs-md);
}

.markdown-viewer :deep(p),
.markdown-viewer :deep(ul),
.markdown-viewer :deep(ol),
.markdown-viewer :deep(blockquote) {
  margin: 0.8em 0;
}

.markdown-viewer :deep(ul),
.markdown-viewer :deep(ol) {
  padding-left: 1.4em;
}

.markdown-viewer :deep(blockquote) {
  padding: 8px 12px;
  color: var(--ow-muted);
  background: var(--ow-surface-raised);
  border: 1px solid var(--ow-line-soft);
  border-radius: var(--ow-radius-sm);
}

.markdown-viewer :deep(code) {
  padding: 1px 4px;
  color: var(--ow-accent);
  background: var(--ow-surface-raised);
  border-radius: 4px;
  font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
  font-size: 0.92em;
}

.markdown-viewer :deep(pre) {
  max-width: 100%;
  padding: 12px;
  overflow: auto;
  background: oklch(0.1 0 0);
  border: 1px solid var(--ow-line-soft);
  border-radius: var(--ow-radius-sm);
}

.markdown-viewer :deep(pre code) {
  padding: 0;
  color: var(--ow-ink-secondary);
  background: transparent;
}

.markdown-viewer :deep(a) {
  color: var(--ow-info);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.markdown-viewer :deep(hr) {
  margin: 1.4em 0;
  border: 0;
  border-top: 1px solid var(--ow-line-soft);
}
</style>
