<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { Application, BitmapText, Loader, Sprite, Texture, Text, Container } from 'pixi.js'

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

const currentImage = computed(() => images.value[imageIndex.value])

let app: Application | null = null

const loader = new Loader()

const preview = new Sprite()

const container = new Container()
container.alpha = 0.5

const text = new Text('This is a test', {
  fill: 0xffffff,
  strokeThickness: 8,
})
// move off screen, we can't hide it without related sprites also hiding
text.position.set(-5000, -5000)

onMounted(() => {
  app = new Application({
    view: canvas.value!,
    backgroundColor: 0x2c3e50,
  })

  app.stage.addChild(preview)
  app.stage.addChild(text)
  app.stage.addChild(container)

  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const sprite = Sprite.from(text.texture)
      sprite.position.set(x * 200, y * 200)
      container.addChild(sprite)
    }
  }
})

watch(
  () => message.value,
  (value) => text.text = value
)

watch(
  () => opacity.value,
  (value) => container.alpha = value
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

    preview.texture = Texture.from(currentImage.value.image)

    // await draw(images.value[imageIndex.value].image)
  }
}

watch(
  () => currentImage.value,
  (value) => preview.texture = Texture.from(value.image)
)

const selectImage = (i: number) => {
  imageIndex.value = i
}

const stripDataUrl = (url: string) => url.replace(/^data:.*?,/, '')

// const downloadAll = async () => {
//   const zip = new JSZip()

//   // TODO: include "watermark produced by URL"
//   zip.file('hello.txt', 'ding!\n')
//   // TODO: handle jpeg

//   // process each image through the canvas sequentially
//   // parallel won't work without multiple canvases
//   for (let i = 0; i < images.value.length; i++) {
//     const imageFile = images.value[i]
//     const dataUrl = await draw(imageFile.image)
//     zip.file(imageFile.file.name, stripDataUrl(dataUrl), { base64: true })
//   }

//   const content = await zip.generateAsync({ type: 'blob' })
//   saveAs(content, 'download.zip')
// }
</script>

<template>
  <div class="grid grid-cols-3 h-screen">
    <div class="p-5 bg-gray-900 overflow-auto">
      <section v-if="images.length === 0">
        <div>
          <label class="text-white">File</label>
          <input type="file" accept="image/*" multiple @change="fileChange" />
        </div>
      </section>

      <section v-if="images.length" class="mb-8 space-y-3">
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
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            v-model="opacity"
          />
        </div>

        <div>
          <label class="text-white">Message</label>
          <input type="text" v-model="message" />
        </div>

        <div>
          <!-- <button class="text-white" @click="downloadAll">Download All</button> -->
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
      <canvas ref="canvas" class="max-w-full max-h-full mx-auto"></canvas>
    </div>
  </div>
</template>
