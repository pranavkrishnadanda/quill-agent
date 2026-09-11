import { installContentBridge, adaptSpecializedDetector, detectFieldsFromDom } from './base.js'
import { detectICIMSFields } from './detectors/icims-detectors.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('content:icims')
const icimsDetector = adaptSpecializedDetector((doc) => detectICIMSFields(doc))

installContentBridge('icims', {
  detector: (doc) => {
    const specialized = icimsDetector(doc)
    if (specialized.length > 0) return specialized
    return detectFieldsFromDom(doc)
  },
})
log.info('icims content bridge installed (specialized detector)')
