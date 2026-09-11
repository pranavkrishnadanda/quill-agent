import Anthropic from '@anthropic-ai/sdk'
import type { AnthropicClientConfig, FormFieldDescriptor, FormFillPlan, JobFitScore } from './types.js'
import type { Resume } from '../resume/schema.js'
import { buildFormFillPrompt, buildJobFitPrompt } from './prompts.js'

export class AnthropicClient {
  private client: Anthropic
  private model: string
  private maxTokens: number
  constructor(cfg: AnthropicClientConfig) {
    this.client = new Anthropic({ apiKey: cfg.apiKey })
    this.model = cfg.model ?? 'claude-haiku-4-5-20251001'
    this.maxTokens = cfg.maxTokens ?? 2048
  }

  async fillForm(resume: Resume, fields: FormFieldDescriptor[], jd?: string): Promise<FormFillPlan> {
    const prompt = buildFormFillPrompt(resume, fields, jd)
    const resp = await this.client.messages.create({
      model: this.model, max_tokens: this.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = resp.content.map(b => (b.type === 'text' ? b.text : '')).join('')
    // Expect JSON in a code block or raw
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return { values: {} }
    return { values: JSON.parse(m[0]) as Record<string, string> }
  }

  async scoreJobFit(resume: Resume, jobDescription: string): Promise<JobFitScore> {
    const prompt = buildJobFitPrompt(resume, jobDescription)
    const resp = await this.client.messages.create({
      model: this.model, max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = resp.content.map(b => (b.type === 'text' ? b.text : '')).join('')
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return { score: 0, reasons: ['no structured response'] }
    return JSON.parse(m[0]) as JobFitScore
  }
}
