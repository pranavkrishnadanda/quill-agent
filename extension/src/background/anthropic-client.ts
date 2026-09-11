import Anthropic from '@anthropic-ai/sdk'
export interface FieldDescriptor { selector: string; label: string; kind: string; required?: boolean; options?: string[] }
export interface FillPlan { values: Record<string, string> }
export interface ResumeMinimal { fullName: string; email: string; phone: string; linkedin?: string; github?: string; summary?: string; experience: unknown[]; skills: string[] }

export class AnthropicClient {
  private c: Anthropic
  private model: string
  constructor(apiKey: string, model = 'claude-haiku-4-5-20251001') {
    this.c = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
    this.model = model
  }
  async fillForm(resume: ResumeMinimal, fields: FieldDescriptor[], jd?: string): Promise<FillPlan> {
    const prompt = `Fill this job application form for the candidate. Return JSON only (selector→value).\n\nCANDIDATE:\n${JSON.stringify(resume)}\n\n${jd?`JOB:\n${jd}\n\n`:''}FIELDS:\n${JSON.stringify(fields)}`
    const r = await this.c.messages.create({ model: this.model, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] })
    const text = r.content.map(b => (b.type === 'text' ? b.text : '')).join('')
    const m = text.match(/\{[\s\S]*\}/)
    return { values: m ? JSON.parse(m[0]) as Record<string,string> : {} }
  }
}
