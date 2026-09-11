import type { FormFieldDescriptor } from '../anthropic/types.js'
import type { Resume } from '../resume/schema.js'
import type { FormFillPlan } from '../anthropic/types.js'

/** Deterministically fill fields whose labels map to obvious resume fields (name, email, phone, linkedin, github).
 *  Returns a partial FormFillPlan; unknown fields are left for the LLM. */
export function deterministicFill(resume: Resume, fields: FormFieldDescriptor[]): FormFillPlan {
  const values: Record<string, string> = {}
  for (const f of fields) {
    const l = f.label.toLowerCase()
    if (/full\s*name|^name$/.test(l)) values[f.selector] = resume.fullName
    else if (/email/.test(l) && f.kind === 'email') values[f.selector] = resume.email
    else if (/phone|mobile|tel/.test(l)) values[f.selector] = resume.phone
    else if (/linkedin/.test(l) && resume.linkedin) values[f.selector] = resume.linkedin
    else if (/github/.test(l) && resume.github) values[f.selector] = resume.github
    else if (/portfolio|website|url/.test(l) && resume.portfolio) values[f.selector] = resume.portfolio
    else if (/location|city/.test(l) && resume.location) values[f.selector] = resume.location
  }
  return { values }
}

/** Merge two plans; the second one wins on conflict. */
export function mergeFillPlans(base: FormFillPlan, override: FormFillPlan): FormFillPlan {
  return { values: { ...base.values, ...override.values } }
}
