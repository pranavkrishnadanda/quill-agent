import { installContentBridge, adaptSpecializedDetector, detectFieldsFromDom } from './base.js'
import { detectWorkdayFields } from './detectors/workday-detectors.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('content:workday')
const workdayDetector = adaptSpecializedDetector((doc) => detectWorkdayFields(doc))

installContentBridge('workday', {
  detector: (doc) => {
    // Prefer Workday-specific detection; fall back to the generic detector for any
    // fields Workday's data-automation-id scheme doesn't cover (rare, but possible).
    const specialized = workdayDetector(doc)
    if (specialized.length > 0) return specialized
    return detectFieldsFromDom(doc)
  },
})
log.info('workday content bridge installed (specialized detector)')
