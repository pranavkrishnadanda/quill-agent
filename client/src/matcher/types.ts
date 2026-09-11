import type { FormFieldDescriptor } from '../anthropic/types.js'
export interface FieldExtractionInput { html: string; url?: string }
export interface FieldExtractionResult { fields: FormFieldDescriptor[] }
export type { FormFieldDescriptor }
