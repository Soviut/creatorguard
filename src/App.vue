<script setup lang="ts">
import { ref, watch } from 'vue'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

interface ImageFile {
  image: HTMLImageElement
  file: File
}

const canvas = ref<HTMLCanvasElement | null>(null)

const xStep = ref(500)
const yStep = ref(250)
const opacity = ref(0.3)
const message = ref('example.com')

const images = ref<ImageFile[]>([])
const imageIndex = ref(-1)

const previewImage = ref<string>('')

async function draw(img: HTMLImageElement): Promise<string> {
  if (canvas.value) {
    canvas.value.width = img.width
    canvas.value.height = img.height

    const ctx = canvas.value.getContext('2d')!

    ctx.fillStyle = 'white'
    ctx.lineWidth = 6

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
        ctx.strokeText(
          message.value,
          x * xStep.value + xOffset,
          y * yStep.value
        )
        ctx.fillText(message.value, x * xStep.value + xOffset, y * yStep.value)
      }
    }

    const watermark = await dataURLtoImage(canvas.value.toDataURL())

    // clear for compositing
    ctx.resetTransform()
    ctx.clearRect(0, 0, img.width, img.height)

    // compositing
    ctx.drawImage(img, 0, 0)
    ctx.globalAlpha = opacity.value
    ctx.drawImage(watermark, 0, 0)

    return canvas.value.toDataURL()
  } else {
    return ''
  }
}

watch(
  [xStep, yStep, message, opacity, imageIndex],
  async () =>
    (previewImage.value = await draw(images.value[imageIndex.value].image))
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

async function dataURLtoImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      resolve(image)
      image.onload = null
      image.onerror = null
    }

    image.onerror = (err) => {
      reject(err)
      image.onload = null
      image.onerror = null
    }

    image.src = url
  })
}
const fileToImage = async (file: File): Promise<HTMLImageElement> => {
  const dataUrl = await fileToDataURL(file)
  return dataURLtoImage(dataUrl)
}

const fileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement

  if (target.files) {
    const files = Array.from(target.files)
    const imgs = await Promise.all(files.map(fileToImage))
    images.value = files.map<ImageFile>((file, i) => ({
      file,
      image: imgs[i],
    }))
    imageIndex.value = 0
    previewImage.value = await draw(images.value[imageIndex.value].image)
  }
}

const selectImage = (i: number) => {
  imageIndex.value = i
}

const stripDataUrl = (url: string) => url.replace(/^data:.*?,/, '')

const downloadAll = async () => {
  const zip = new JSZip()

  // TODO: include "watermark produced by URL"
  zip.file('hello.txt', 'ding!\n')
  // TODO: handle jpeg

  // process each image through the canvas sequentially
  // parallel won't work without multiple canvases
  for (let i = 0; i < images.value.length; i++) {
    const imageFile = images.value[i]
    const dataUrl = await draw(imageFile.image)
    zip.file(imageFile.file.name, stripDataUrl(dataUrl), { base64: true })
  }

  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, 'download.zip')
}
</script>

<template>
  <div class="grid grid-cols-3 h-screen">
    <div class="p-5 bg-gray-900 overflow-auto">
      <section class="mb-8 space-y-3">
        <div>
          <label class="text-white">Horizontal Spacing</label>
          <input type="range" min="100" max="1000" step="50" v-model="xStep" />
        </div>

        <div>
          <label class="text-white">Vertical Spacing</label>
          <input type="range" min="50" max="500" step="10" v-model="yStep" />
        </div>

        <div>
          <label class="text-white">Opacity</label>
          <input type="range" min="0.1" max="1.0" step="0.1" v-model="opacity" />
        </div>

        <div>
          <label class="text-white">Message</label>
          <input type="text" v-model="message" />
        </div>

        <div>
          <label class="text-white">File</label>
          <input type="file" multiple @change="fileChange" />
        </div>

        <div>
          <button class="text-white" @click="downloadAll">Download All</button>
        </div>
      </section>

      <section>
        <ul class="grid grid-cols-3 gap-5">
          <li v-for="(imageFile, i) in images" :key="i">
            <button
              @click="selectImage(i)"
              class="w-full h-full p-3 rounded items-center border aspect-square"
              :class="i === imageIndex ? 'border-teal-500' : 'border-gray-700'"
            >
              <img :src="imageFile.image.src" class="max-w-full" />
            </button>
          </li>
        </ul>
      </section>
    </div>

    <div class="col-span-2 flex flex-col p-5 justify-center overflow-auto">
      <img :src="previewImage" class="max-w-full max-h-full mx-auto" />
    </div>
  </div>

  <canvas ref="canvas" class="hidden"></canvas>
</template>
