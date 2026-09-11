import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

// All API requests are intercepted, including unknown paths. No business service is contacted.
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseUrl = process.env.REVIEW_BASE_URL || 'http://127.0.0.1:5173'
const output = path.resolve('qa_artifacts/review-regression-20260910')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  let reviews = 0
  let completions = 0
  const card = { id: '1', title: 'Redis consistency', summary: 'Check the write path and recovery.',
    sourceLogId: '1', tags: ['Redis'], createdAt: '2026-09-10T00:00:00Z', nextReviewDate: null }
  const task = { id: 1, title: 'Review consistency', sourceType: 'MANUAL', priority: 'MEDIUM',
    status: 'POSTPONED', manual: true, dueDate: '2026-09-10' }
  await context.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const endpoint = url.pathname.replace('/api/v1', '')
    let data = {}
    const headers = {}
    if (endpoint === '/auth/csrf') {
      data = { headerName: 'X-XSRF-TOKEN' }
      headers['set-cookie'] = 'XSRF-TOKEN=review-test-token; Path=/; SameSite=Lax'
    } else if (endpoint === '/setup/status') data = { initialized: true }
    else if (endpoint === '/auth/me') data = { id: 1, username: 'review-fixture' }
    else if (endpoint === '/notifications/unread-count') data = { count: 0 }
    else if (endpoint === '/preferences') data = { timezoneId: 'Asia/Shanghai' }
    else if (endpoint === '/learning-goals' || endpoint === '/focus-stats'
      || endpoint === '/work-logs' || endpoint === '/projects') data = []
    else if (endpoint === '/knowledge-cards') data = [card]
    else if (endpoint === '/knowledge-cards/1/review') {
      reviews++
      Object.assign(card, { reviewStage: 1, nextReviewDate: '2026-09-11' })
      data = { id: '1', reviewStage: 1, nextReviewDate: card.nextReviewDate }
    } else if (endpoint === '/study-tasks') data = [task]
    else if (endpoint === '/study-tasks/1/complete') {
      completions++
      task.status = 'COMPLETED'
      data = task
    } else if (endpoint === '/practice-items') data = { items: [], total: 0 }
    else if (endpoint === '/practice-items/summary') {
      data = { total: 0, newCount: 0, learningCount: 0, masteredCount: 0, topicCounts: [] }
    } else if (endpoint === '/knowledge/ask/stream') {
      await route.fulfill({ status: 200, contentType: 'text/event-stream',
        body: 'event:delta\ndata:Answer [1]\n\nevent:done\ndata:'
          + JSON.stringify({ answer: 'Answer [1]', insufficient: false,
            sources: [{ relativePath: 'docs/design.md', chunkNo: 2, snippet: 'Verified source' }] }) + '\n\n' })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(data) })
  })
  await page.goto(`${baseUrl}/learning-update`)
  await page.getByRole('button', { name: '打开专注计时', exact: true }).click()
  await page.getByRole('button', { name: '开始', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.focus-clock')?.textContent?.trim() !== '25:00')
  const before = await page.locator('.focus-clock').textContent()
  await page.locator('a[href="/work-sedimentation"]').first().click()
  await page.getByRole('heading', { name: '工作记录与知识蒸馏' }).waitFor()
  assert.equal(await page.getByRole('button', { name: '暂停', exact: true }).count(), 1)
  assert.notEqual(await page.locator('.focus-clock').textContent(), '25:00')
  await page.getByRole('button', { name: '记一次回顾', exact: true }).click()
  await page.locator('.kc-review-badge').waitFor()
  assert.equal(reviews, 1)
  await page.screenshot({ path: path.join(output, 'desktop-card-focus.png'), fullPage: true })
  await page.locator('a[href="/study-plan"]').first().click()
  await page.getByRole('button', { name: '完成', exact: true }).click()
  await page.locator('.ow-titem.done').waitFor()
  assert.equal(completions, 1)
  await page.locator('a[href="/knowledge/ask"]').first().click()
  await page.locator('.composer input').fill('How does the write path work?')
  await page.getByRole('button', { name: '提问', exact: true }).click()
  await page.getByText('docs/design.md', { exact: false }).waitFor()
  await page.screenshot({ path: path.join(output, 'desktop-sources.png'), fullPage: true })
  await page.getByRole('button', { name: '暂停', exact: true }).click()
  await page.getByRole('button', { name: '收起', exact: true }).click()
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate((theme) => {
      document.documentElement.toggleAttribute('data-review-dark', theme === 'dark')
      if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark')
      else document.documentElement.removeAttribute('data-theme')
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }, theme)
    assert.equal(await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth), true)
    await page.screenshot({ path: path.join(output, `mobile-sources-${theme}.png`), fullPage: true })
  }
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ crossRouteTimer: true, before, firstReview: reviews,
    postponedCompletion: completions, sourcesVisible: true, mobileOverflow: false,
    pageErrors: errors, screenshots: output }, null, 2))
} finally {
  await browser.close()
}
