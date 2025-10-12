import { useMutation } from '@tanstack/react-query'
import { uploadEmissions } from '../api/emissions'

export function useUploadEmissions() {
  return useMutation({
    mutationFn: (payload) => uploadEmissions(payload)
  })
}
