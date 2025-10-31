import 'vuetify/styles'
import { createVuetify } from 'vuetify'

// Define the custom theme using the tokens provided
const myTheme = {
  dark: false,
  colors: {
    primary: '#658986',
    accent: '#CE6A6B',
    success: '#2E906D',
    error: '#942332',
    background: '#E3E1DB',
  },
}

export default createVuetify({
  theme: {
    defaultTheme: 'myTheme',
    themes: {
      myTheme,
    },
  },
  // Global defaults: rounded, elevation, density
  defaults: {
    global: {
      rounded: 'lg',
      elevation: 1,
      density: 'comfortable',
    },
  },
})
