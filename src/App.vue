<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const canvas = ref<HTMLCanvasElement | null>(null)

const xStep = ref(500)
const yStep = ref(250)
const opacity = ref(0.3)
const message = ref('example.com')

const images = ref<string[]>([])
const imageIndex = ref(0)

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

const fileToDataURL = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e: Event) => {
      resolve((e.target as FileReader).result as string)
    }
    reader.onerror = (e: Event) => {
      reject(reader.error)
    }

    reader.readAsDataURL(file)
  })
}

const fileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement

  if (target.files) {
    const files = Array.from(target.files)
    images.value = await Promise.all(files.map(fileToDataURL))
    imageIndex.value = 0
    img.src = images.value[imageIndex.value]
  }
}

const selectImage = (i: number) => {
  imageIndex.value = i
  img.src = images.value[imageIndex.value]
}
</script>

<template>
  <div class="grid grid-cols-3 h-screen">
    <div class="p-5 bg-gray-900 overflow-auto">
      <input type="range" min="100" max="1000" step="50" v-model="xStep" />
      <input type="range" min="50" max="500" step="10" v-model="yStep" />
      <input type="range" min="0.1" max="1" step="0.1" v-model="opacity" />
      <input type="text" v-model="message" />
      <input type="file" multiple @change="fileChange" />

      <section>
        <ul class="grid grid-cols-3 gap-5 items-center">
          <li v-for="(image, i) in images" :key="i">
            <button @click="selectImage(i)">
              <img :src="image" class="max-w-full" />
            </button>
          </li>
        </ul>
      </section>
    </div>

    <div class="col-span-2 flex p-5 items-center justify-center overflow-auto">
      <canvas ref="canvas" class="max-w-full"></canvas>
    </div>
  </div>
</template>
