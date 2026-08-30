<template>
  <div class="dreamy-bg" aria-hidden="true">
    <span
      v-for="orb in orbs"
      :key="`orb-${orb.id}`"
      class="orb"
      :class="`o${orb.variant}`"
      :style="{
        width: `${orb.size}px`,
        height: `${orb.size}px`,
        left: orb.left,
        top: orb.top,
        right: orb.right,
        bottom: orb.bottom,
        animationDuration: `${orb.duration}s`,
        animationDelay: `${orb.delay}s`,
      }"
    />
    <span
      v-for="spark in sparks"
      :key="`spark-${spark.id}`"
      class="spark"
      :style="{ left: spark.left, top: spark.top, animationDelay: `${spark.delay}s` }"
    />
  </div>
</template>

<script setup lang="ts">
interface OrbSpec {
  id: number
  variant: number
  size: number
  left?: string
  right?: string
  top?: string
  bottom?: string
  duration: number
  delay: number
}

interface SparkSpec {
  id: number
  left: string
  top: string
  delay: number
}

const orbs: OrbSpec[] = [
  { id: 1, variant: 1, size: 260, left: '5%', top: '10%', duration: 12, delay: 0 },
  { id: 2, variant: 2, size: 180, right: '9%', top: '16%', duration: 14, delay: 1.5 },
  { id: 3, variant: 3, size: 340, left: '36%', bottom: '-12%', duration: 17, delay: 0.8 },
  { id: 4, variant: 4, size: 140, right: '20%', bottom: '14%', duration: 11, delay: 2 },
]

const sparks: SparkSpec[] = [
  { id: 1, left: '16%', top: '28%', delay: 0 },
  { id: 2, left: '30%', top: '62%', delay: 1.2 },
  { id: 3, left: '48%', top: '20%', delay: 2.1 },
  { id: 4, left: '62%', top: '48%', delay: 0.6 },
  { id: 5, left: '74%', top: '30%', delay: 1.8 },
  { id: 6, left: '86%', top: '60%', delay: 2.6 },
  { id: 7, left: '24%', top: '80%', delay: 1 },
  { id: 8, left: '54%', top: '74%', delay: 3 },
  { id: 9, left: '70%', top: '82%', delay: 0.4 },
  { id: 10, left: '40%', top: '40%', delay: 2.2 },
]
</script>
