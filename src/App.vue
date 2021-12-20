<script setup lang="ts">
import { onMounted, ref } from 'vue'

const canvas = ref<HTMLCanvasElement | null>(null)

const xStep = 250
const yStep = 250
const message = ref('Hello World')

onMounted(() => {
  const img = new Image()

  img.addEventListener('load', () => {
    if (canvas.value) {
      canvas.value.width = img.width
      canvas.value.height = img.height

      const ctx = canvas.value.getContext('2d')!

      ctx.drawImage(img, 0, 0)

      // this needs a better calculation
      ctx.rotate(0.5)
      ctx.translate(0, -600)

      ctx.fillStyle = 'white'
      ctx.lineWidth = 6
      ctx.globalAlpha = 0.1

      ctx.textBaseline = 'hanging'
      ctx.font = '32px sans-serif'

      const xCount = Math.floor(img.width / xStep)
      const yCount = Math.floor(img.width / yStep)

      for (let y = 0; y < yCount; y++) {
        for (let x = 0; x < xCount; x++) {
          console.log('ding')
          ctx.strokeText(message.value, x * xStep, y * yStep)
          ctx.fillText(message.value, x * xStep, y * yStep)
        }
      }
    }
  }, false)

  img.src = '/test.jpg'
})
</script>

<template>
  <canvas ref="canvas"></canvas>
</template>
