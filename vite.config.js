import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// O `base` precisa bater EXATAMENTE com o nome do repositório no GitHub
// (inclusive maiúsculas/minúsculas) para o GitHub Pages servir os arquivos:
// https://comprasxfinanceirovxcase.github.io/financeiro/
export default defineConfig({
  plugins: [react()],
  base: '/financeiro/',
})
