import { http } from './http'

/**
 * @typedef {{ mapping: Record<string, ( 'facility_name'|'year'|'month'|'co2e_tonnes'|'scope'|'source'|'method'|'dataset_version'|null )>, notes?: string }} MapColumnsResponse
 */

/** @param {string[]} headers */
export async function aiMapColumns(headers) {
  const { data } = await http.post('/ai/map-columns', { headers })
  return /** @type {MapColumnsResponse} */ (data)
}

/**
 * Upload CSV with metadata and optional headerMap
 * @param {{ file: File, datasetName: string, source: 'operator'|'climate_trace'|'regulator', versionTag?: string, headerMap?: Record<string,string|null> }} payload
 */
export async function uploadEmissions(payload) {
  const fd = new FormData()
  fd.append('file', payload.file)
  fd.append('datasetName', payload.datasetName)
  fd.append('source', payload.source)
  if (payload.versionTag) fd.append('versionTag', payload.versionTag)
  if (payload.headerMap) fd.append('headerMap', JSON.stringify(payload.headerMap))
  const { data } = await http.post('/emissions/upload-full', fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
}
