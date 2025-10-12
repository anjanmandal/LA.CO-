import { useMutation } from '@tanstack/react-query'
import { aiMapColumns } from '../api/emissions'

export function useAIMapColumns() {
  return useMutation({
    mutationFn: (headers) => aiMapColumns(headers)
  })
}
