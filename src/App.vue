<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import {
  Application,
  Sprite,
  TilingSprite,
  Texture,
  Text,
  Container,
  BaseRenderTexture,
  RenderTexture,
  Transform,
} from 'pixi.js'

interface ImageFile {
  image: HTMLImageElement
  file: File
}

const canvas = ref<HTMLCanvasElement | null>(null)

const spacing = ref({ width: 384, height: 192 })
const offsetX = ref(0)
const offsetY = ref(0)
const opacity = ref(0.2)
const message = ref('example.com')

const images = ref<ImageFile[]>([])
const imageIndex = ref(-1)

const currentImage = computed(() => images.value[imageIndex.value])

let app: Application | null = null

const preview = new Sprite()

const textContainer = new Container()

const text = new Text(message.value, {
  fill: 0xffffff,
  strokeThickness: 8,
  miterLimit: 3,
})
textContainer.addChild(text)

let brt = new BaseRenderTexture({
  width: spacing.value.width,
  height: spacing.value.height,
})
let rt = new RenderTexture(brt)

const tileTransform = new Transform()
tileTransform.position.set(offsetX.value, offsetY.value)
tileTransform.rotation = 45 * 0.0174533 // degrees to radians

const watermark = new TilingSprite(rt, 256, 256)
watermark.tileTransform = tileTransform

onMounted(() => {
  app = new Application({
    view: canvas.value!,
    backgroundAlpha: 0,
  })

  app.stage.addChild(preview)
  app.stage.addChild(textContainer)
  app.stage.addChild(watermark)

  app.renderer.render(textContainer, { renderTexture: rt })

  // hide text when not being rendered
  text.visible = false
})

watch(
  () => message.value,
  (value) => {
    text.visible = true
    text.text = value
    app?.renderer.render(textContainer, { renderTexture: rt })
    text.visible = false
  }
)

watch([offsetX, offsetY], ([x, y]) => tileTransform.position.set(x, y))

watch(
  () => opacity.value,
  (value) => (watermark.alpha = value),
  { immediate: true }
)

watch(
  () => spacing.value,
  (value) => {
    console.log(value)
    brt.destroy()
    rt.destroy()
    brt = new BaseRenderTexture({ width: value.width, height: value.height })
    rt = new RenderTexture(brt)
    text.visible = true
    app?.renderer.render(textContainer, { renderTexture: rt })
    text.visible = false
    watermark.texture = rt
  }
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

    updatePreview()
  }
}

watch(
  () => currentImage.value,
  () => updatePreview()
)

const updatePreview = () => {
  app?.renderer.resize(
    currentImage.value.image.width,
    currentImage.value.image.height
  )
  watermark.width = currentImage.value.image.width
  watermark.height = currentImage.value.image.height
  preview.texture = Texture.from(currentImage.value.image)
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
  // for (let i = 0; i < images.value.length; i++) {
  //   const imageFile = images.value[i]
  //   const dataUrl = await draw(imageFile.image)
  //   zip.file(imageFile.file.name, stripDataUrl(dataUrl), { base64: true })
  // }

  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, 'download.zip')
}
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
        <fieldset>
          <legend class="text-white">Warmark Density</legend>

          <div class="grid grid-cols-3">
            <div>
              <input
                id="low"
                type="radio"
                name="spacing"
                :value="{ width: 512, height: 256 }"
                v-model="spacing"
              />
              <label for="low" class="text-white ml-2">Low</label>
            </div>

            <div>
              <input
                id="medium"
                type="radio"
                name="spacing"
                :value="{ width: 384, height: 192 }"
                v-model="spacing"
              />
              <label for="medium" class="text-white ml-2">Medium</label>
            </div>

            <div>
              <input
                id="high"
                type="radio"
                name="spacing"
                :value="{ width: 256, height: 128 }"
                v-model="spacing"
              />
              <label for="high" class="text-white ml-2">High</label>
            </div>
          </div>
        </fieldset>

        <div>
          <label class="text-white">Horizontal Offset</label>
          <input type="range" min="-200" max="200" v-model="offsetX" />
        </div>

        <div>
          <label class="text-white">Vertical Offset</label>
          <input type="range" min="-200" max="200" v-model="offsetY" />
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

      <section class="sticky bottom-0">
        <button
          class="block w-full px-5 py-3 rounded-md bg-primary-500 text-white"
          @click="downloadAll"
        >
          Download All
        </button>
      </section>
    </div>

    <div class="col-span-2 flex flex-col p-5 justify-center overflow-auto">
      <canvas ref="canvas" class="max-w-full max-h-full mx-auto"></canvas>
    </div>
  </div>
</template>
