import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import './assets/styles.css'
import './styles/tokens.css'
import './styles/typography.css'
import './styles/layout.css'

const app = createApp(App)
app.use(vuetify)
app.mount('#app')
