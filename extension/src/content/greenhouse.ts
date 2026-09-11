import { installContentBridge } from './base.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('content:greenhouse')
installContentBridge('greenhouse')
log.info('greenhouse content bridge installed')
