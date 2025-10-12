import Papa from 'papaparse'

export function parseCsvHeadersAndSample(file, sampleRows = 20) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      preview: sampleRows,
      skipEmptyLines: true,
      dynamicTyping: false,
      detectDelimiter: true,
      complete: (res) => {
        const headers = res.meta?.fields || []
        resolve({ headers, rows: res.data || [], delimiter: res.meta?.delimiter || ',' })
      },
      error: (err) => reject(err)
    })
  })
}
