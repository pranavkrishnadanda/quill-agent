import { installContentBridge } from './base.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('content:lever')
installContentBridge('lever')
log.info('lever content bridge installed')
