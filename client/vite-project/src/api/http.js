import axios from 'axios'
import { dispatchError } from '../utils/errorBus'

/**
 * Axios singleton with base URL:
 * - Dev: proxied via Vite to http://localhost:4000
 * - Prod: honor VITE_API_BASE_URL if set
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 90_000,
  withCredentials: true
})
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status
    const message = 'Server error (400)'
    const error = new Error(message)
    error.status = status
    dispatchError(message)
    return Promise.reject(error)
  }
)
