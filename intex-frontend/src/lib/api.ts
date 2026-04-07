import axios from 'axios'

// Prefer VITE_API_BASE_URL when set. In dev, omit it so requests use the Vite proxy to localhost:5007 (see vite.config.ts).
const baseURL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  (import.meta.env.DEV ? '' : 'http://localhost:5007')

export const api = axios.create({
  baseURL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('np_token')
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

