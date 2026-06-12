export function catchError() {
  process.on('unhandledRejection', (reason, p) => {
    const message = reason instanceof Error ? reason.message : 'unknown rejection'
    console.error(`Unhandled promise rejection: ${message}`)
  })
}
