import axios from 'axios'

/**
 * Axios singleton with base URL:
 * - Dev: proxied via Vite to http://localhost:4000
 * - Prod: honor VITE_API_BASE_URL if set
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 90_000
})
console.log('API base URL:', http.defaults.baseURL)
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err?.response?.data?.error || err.message || 'Network error'
    return Promise.reject(new Error(msg))
  }
)
