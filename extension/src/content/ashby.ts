import { installContentBridge } from './base.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('content:ashby')
installContentBridge('ashby')
log.info('ashby content bridge installed')
