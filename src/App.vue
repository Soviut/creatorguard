<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const canvas = ref<HTMLCanvasElement | null>(null)

const xStep = ref(500)
const yStep = ref(250)
const opacity = ref(0.3)
const message = ref('example.com')

const img = new Image()
img.addEventListener('load', redraw, false)

function redraw() {
  if (canvas.value) {
    canvas.value.width = img.width
    canvas.value.height = img.height

    const ctx = canvas.value.getContext('2d')!

    ctx.drawImage(img, 0, 0)

    ctx.fillStyle = 'white'
    ctx.lineWidth = 6
    ctx.globalAlpha = opacity.value

    ctx.textBaseline = 'hanging'
    ctx.font = '32px sans-serif'

    // make watermark twice as wide and twice as tall
    const xCount = Math.ceil((img.width * 2) / xStep.value)
    const yCount = Math.ceil((img.height * 2) / yStep.value)

    // then rotate and translate up by height to center it on an angle
    ctx.rotate(0.5)
    ctx.translate(0, -img.height)

    for (let y = 0; y < yCount; y++) {
      for (let x = 0; x < xCount; x++) {
        // zig zag horizontally
        const xOffset = y % 2 ? xStep.value / 2 : 0
        ctx.strokeText(message.value, x * xStep.value + xOffset, y * yStep.value)
        ctx.fillText(message.value, x * xStep.value + xOffset, y * yStep.value)
      }
    }
  }
}

onMounted(() => {
  img.src = '/test.jpg'
})

watch(
  [xStep, yStep, message, opacity],
  redraw
)

const reader = new FileReader()
reader.addEventListener('load', (e: Event) => {
  img.src = (e.target as FileReader).result as string
}, false)

const fileChange = (e: Event) => {
  const target = e.target as HTMLInputElement

  // TODO: allow multiple files
  // target.files?[0]

  if (target.files?.length) {
    reader.readAsDataURL(target.files[0])
  }
}
</script>

<template>
  <input type="range" min="100" max="1000" step="50" v-model="xStep" />
  <input type="range" min="50" max="500" step="10" v-model="yStep" />
  <input type="range" min="0.1" max="1" step="0.1" v-model="opacity" />
  <input type="text" v-model="message" />
  <input type="file" @change="fileChange" />

  <canvas ref="canvas" class="w-1/2"></canvas>
</template>
