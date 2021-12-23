const colors = require('tailwindcss/colors')

module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: colors.teal,
        secondary: colors.gray,
        success: colors.green,
        warning: colors.amber,
        danger: colors.red,
        info: colors.sky,

        disabled: colors.gray,
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
