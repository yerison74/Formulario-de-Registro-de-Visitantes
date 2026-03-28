import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Carga todas las variables de entorno (incluyendo las que no empiezan con VITE_)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      // Permite usar REACT_APP_QR_SALT en ambos proyectos con el mismo nombre.
      // Si existe VITE_QR_SALT lo usa, si no cae a REACT_APP_QR_SALT.
      'import.meta.env.VITE_QR_SALT': JSON.stringify(
        env.VITE_QR_SALT ?? env.REACT_APP_QR_SALT ?? 'sepri_default_salt_change_me'
      ),
    },
  }
})
