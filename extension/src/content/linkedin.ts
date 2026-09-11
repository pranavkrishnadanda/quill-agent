import { installContentBridge, adaptSpecializedDetector, detectFieldsFromDom } from './base.js'
import { detectLinkedInFields } from './detectors/linkedin-detectors.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('content:linkedin')
const linkedInDetector = adaptSpecializedDetector((doc) => detectLinkedInFields(doc))

installContentBridge('linkedin', {
  detector: (doc) => {
    const specialized = linkedInDetector(doc)
    if (specialized.length > 0) return specialized
    return detectFieldsFromDom(doc)
  },
})
log.info('linkedin content bridge installed (specialized detector)')
