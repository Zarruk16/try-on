// Centralized asset path configuration
export const ASSET_PATHS = {
  VTO: '/assets/VTO/',
  BARE_FOOT_VTO: '/assets/bareFootVTO/',
  VIDEO: '/assets/video/'
}

export const getAssetPath = (type, filename) => {
  const basePath = ASSET_PATHS[type]
  if (!basePath) {
    console.warn(`Unknown asset type: ${type}`)
    return filename
  }
  return `${basePath}${filename}`
}

// Helper functions for specific asset types
export const getVTOAsset = (filename) => getAssetPath('VTO', filename)
export const getBareFootVTOAsset = (filename) => getAssetPath('BARE_FOOT_VTO', filename)
export const getVideoAsset = (filename) => getAssetPath('VIDEO', filename)
