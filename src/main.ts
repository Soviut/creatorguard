import { createApp } from 'vue'
import App from './App.vue'
import VueGtag from 'vue-gtag-next'
import '@/assets/index.css'

const app = createApp(App)

app.use(VueGtag, {
  isEnabled: process.env.NODE_ENV !== 'development',
  property: {
    // id: 'G-01GZH4SWQZ', // local
    id: 'G-G6STRX97S7', // prod
    params: {
      send_page_view: true,
    },
  },
})

app.mount('#app')
