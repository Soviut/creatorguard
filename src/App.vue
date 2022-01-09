<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import UnloadAlert from '@/components/UnloadAlert.vue'
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
import Loading from './components/Loading.vue'
import Explainer from './components/Explainer.vue'

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

const downloading = ref(false)

const downloadAll = async () => {
  downloading.value = true

  // HACK: force a redraw to show loading spinner early, nextTick() did not work
  await new Promise((resolve) => setTimeout(resolve, 100))

  // remember what image we had selected
  const originalIndex = imageIndex.value

  const zip = new JSZip()
  zip.file('thanks.txt', 'Watermarked produced by https://creatorguard.com\n')

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

  // reset selected image to original selection
  imageIndex.value = originalIndex

  const content = await zip.generateAsync({ type: 'blob' })

  downloading.value = false

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
  <div class="flex flex-col lg:flex-row h-screen">
    <div
      class="w-full lg:h-screen lg:w-[400px] xl:w-[600px] flex-shrink-0 flex flex-col bg-gray-900 overflow-auto"
      :class="images.length > 0 ? 'h-[50vh]' : 'h-screen'"
    >
      <header
        class="px-5 pt-5"
        :class="{ 'hidden lg:block': images.length > 0 }"
      >
        <a href="/" class="flex items-center hover:no-underline">
          <img src="@/assets/logo.svg" class="w-12 mr-4" />

          <span class="pb-3 font-extralight text-2xl text-white"
            >CreatorGuard</span
          >
        </a>
      </header>

      <nav
        class="sticky px-5 top-0 grid grid-cols-2 text-gray-400 border-b border-gray-700 bg-gray-900"
        v-show="images.length > 0"
      >
        <button
          @click="setTab('images')"
          class="p-3 border-b-4 hover:text-white"
          :class="
            currentTab === 'images'
              ? 'border-primary-500 text-white'
              : 'border-transparent'
          "
        >
          Images

          <span
            v-if="images.length"
            class="ml-2 px-3 py-1 rounded-full bg-primary-500 text-xs text-white"
            >{{ images.length }}</span
          >
        </button>
        <button
          @click="setTab('watermark')"
          class="p-3 border-b-4 hover:text-white"
          :class="
            currentTab === 'watermark'
              ? 'border-primary-500 text-white'
              : 'border-transparent'
          "
        >
          Watermark
        </button>
      </nav>

      <!-- INTRO -->
      <section v-if="images.length === 0" class="p-5">
        <label
          for="image-files"
          class="relative block mb-8 px-5 py-24 border-2 border-dashed border-gray-600 rounded-lg text-white text-center text-lg cursor-pointer hover:bg-gray-800 transition-all"
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

        <Explainer class="text-gray-400 text-sm" />
      </section>

      <template v-else>
        <section
          v-show="currentTab === 'images'"
          class="flex-grow flex flex-col"
        >
          <div class="flex-grow p-5">
            <ul
              class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3 gap-5"
            >
              <li v-for="(imageFile, i) in images" :key="i">
                <button
                  @click="selectImage(i)"
                  class="w-full h-full p-3 rounded items-center border aspect-square object-scale-down"
                  :class="
                    i === imageIndex
                      ? 'border-teal-500'
                      : 'border-gray-700 hover:border-gray-600'
                  "
                >
                  <img
                    :src="imageFile.image.src"
                    class="max-w-full max-h-full mx-auto"
                  />
                </button>
              </li>
            </ul>
          </div>

          <div
            v-if="images.length > 0"
            class="sticky bottom-0 p-3 lg:p-5 bg-gray-900"
          >
            <button
              class="block w-full px-5 py-3 rounded-md bg-primary-600 hover:bg-primary-500 disabled:bg-secondary-500 text-white disabled:text-secondary-300 transition-colors"
              :disabled="downloading"
              @click="downloadAll"
            >
              <span v-if="downloading">
                <Loading />
                Generating Zip File
              </span>
              <span v-else>Download All</span>
            </button>
          </div>
        </section>

        <section v-show="currentTab === 'watermark'" class="p-5">
          <form @submit.prevent class="space-y-3">
            <div>
              <label for="message" class="text-white">Message</label>
              <input id="message" type="text" v-model="message" />
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
              <div class="flex justify-between">
                <label for="hoffset" class="text-white"
                  >Horizontal Offset</label
                >
                <div class="text-gray-300 font-semibold">{{ offsetX }}px</div>
              </div>
              <input
                id="hoffset"
                type="range"
                min="-200"
                max="200"
                v-model="offsetX"
              />
            </div>

            <div>
              <div class="flex justify-between">
                <label for="voffset" class="text-white">Vertical Offset</label>
                <div class="text-gray-300 font-semibold">{{ offsetY }}px</div>
              </div>

              <input
                id="voffset"
                type="range"
                min="-200"
                max="200"
                v-model="offsetY"
              />
            </div>

            <div>
              <div class="flex justify-between">
                <label for="opacity" class="text-white">Opacity</label>
                <div class="text-gray-300 font-semibold">
                  {{ opacity * 100 }}%
                </div>
              </div>

              <input
                id="opacity"
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                v-model="opacity"
              />
            </div>
          </form>
        </section>
      </template>
    </div>

    <div
      class="flex flex-grow relative flex-col p-5 justify-center overflow-auto"
    >
      <img
        v-if="images.length === 0"
        src="@/assets/logo.svg"
        class="max-w-[50%] max-h-full mx-auto grayscale brightness-150"
      />

      <canvas
        v-show="images.length > 0"
        ref="canvas"
        class="max-w-full max-h-full mx-auto"
      ></canvas>
      <button
        v-if="images.length > 0"
        class="absolute bottom-5 right-5 px-5 py-3 rounded-md bg-gray-500 hover:bg-primary-500 text-white opacity-40 hover:opacity-100 focus:opacity-100 transition-colors"
        @click="download"
      >
        Download
      </button>
    </div>
  </div>

  <!-- warn before leaving the page if images are loaded -->
  <UnloadAlert :enabled="images.length > 0" />
</template>
