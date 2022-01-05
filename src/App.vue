<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
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
const message = ref('creatorguard.com')

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
  zip.file('thanks.txt', 'Watermarked produced by https://creatorguard.com\n')

  const originalIndex = imageIndex.value

  // process each image through the canvas sequentially
  for (let i = 0; i < images.value.length; i++) {
    const imageFile = images.value[i]
    imageIndex.value = i
    // wait for vue values to update
    await nextTick()
    // force canvas to render then extract
    app?.renderer.render(app.stage)
    // always use full image quality 1
    const dataUrl = app?.renderer.view.toDataURL(imageFile.file.type, 1)!
    zip.file(imageFile.file.name, stripDataUrl(dataUrl), { base64: true })
  }

  // reset index
  imageIndex.value = originalIndex

  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, 'download.zip')
}

const download = () => {
  app?.renderer.render(app.stage)
  // always use full image quality 1
  const dataUrl = app?.renderer.view.toDataURL(currentImage.value.file.type, 1)!
  saveAs(dataUrl, currentImage.value.file.name)
}

const currentTab = ref<'images' | 'watermark'>('images')

const setTab = (tab: 'images' | 'watermark') => {
  currentTab.value = tab
}
</script>

<template>
  <div class="flex h-screen">
    <div class="w-[400px] xl:w-[600px] flex-shrink-0 flex flex-col bg-gray-900 overflow-auto">
      <header class="px-5 pt-5">
        <a href="/" class="flex items-center hover:no-underline">
          <img src="@/assets/logo.svg" class="w-12 mr-4" />

          <span class="pb-3 font-extralight text-2xl text-white">CreatorGuard</span>
        </a>
      </header>

      <nav
        class="sticky px-5 top-0 grid grid-cols-2 text-gray-400 border-b border-gray-700 bg-gray-900"
      >
        <button
          @click="setTab('images')"
          class="p-3 border-b-4"
          :class="
            currentTab === 'images'
              ? 'border-primary-500 text-white'
              : 'border-transparent'
          "
        >
          Images

          <span
            v-if="images.length"
            class="ml-2 px-2 py-1 rounded-full bg-primary-500 text-xs text-white"
            >{{ images.length }}</span
          >
        </button>
        <button
          @click="setTab('watermark')"
          class="p-3 border-b-4"
          :class="
            currentTab === 'watermark'
              ? 'border-primary-500 text-white'
              : 'border-transparent'
          "
        >
          Watermark
        </button>
      </nav>

      <section v-show="currentTab === 'images'" class="flex-grow flex flex-col">
        <div v-if="images.length === 0" class="p-5">
          <label
            for="image-files"
            class="relative block px-5 py-24 border-2 border-dashed border-gray-600 rounded-lg text-white text-center text-lg cursor-pointer hover:bg-gray-800 transition"
            tabindex="0"
          >
            Click or drop image files here

            <input
              id="image-files"
              type="file"
              accept="image/*"
              multiple
              class="absolute inset-0 opacity-0 cursor-pointer"
              @change="fileChange"
            />
          </label>
        </div>

        <div class="flex-grow p-5">
          <ul class="grid grid-cols-3 gap-5">
            <li v-for="(imageFile, i) in images" :key="i">
              <button
                @click="selectImage(i)"
                class="w-full h-full p-3 rounded items-center border aspect-square"
                :class="
                  i === imageIndex ? 'border-teal-500' : 'border-gray-700'
                "
              >
                <img :src="imageFile.image.src" class="max-w-full" />
              </button>
            </li>
          </ul>
        </div>

        <div class="sticky bottom-0 p-5 bg-gray-900">
          <button
            v-if="images.length > 0"
            class="block w-full px-5 py-3 rounded-md bg-primary-500 text-white"
            @click="downloadAll"
          >
            Download All
          </button>
        </div>
      </section>

      <section v-show="currentTab === 'watermark'" class="p-5">
        <form @submit.prevent class="space-y-3">
          <div>
            <label class="text-white">Message</label>
            <input type="text" v-model="message" />
          </div>

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
        </form>
      </section>
    </div>

    <div
      class="flex-grow relative flex flex-col p-5 justify-center overflow-auto"
    >
      <canvas
        v-show="images.length > 0"
        ref="canvas"
        class="max-w-full max-h-full mx-auto"
      ></canvas>
      <button
        v-if="images.length > 0"
        class="absolute bottom-8 right-8 px-5 py-3 rounded-md bg-gray-500 text-white opacity-40 hover:opacity-100 focus:opacity-100 transition-opacity"
        @click="download"
      >
        Download
      </button>
    </div>
  </div>
</template>
