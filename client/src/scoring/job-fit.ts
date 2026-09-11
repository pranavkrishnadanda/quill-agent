import type { Resume } from '../resume/schema.js'
import type { JobFitScore } from '../anthropic/types.js'
import type { AnthropicClient } from '../anthropic/client.js'

/** Convenience wrapper that returns just a numeric decision. */
export async function isGoodFit(client: AnthropicClient, resume: Resume, jd: string, threshold = 6): Promise<{ fit: boolean; score: JobFitScore }> {
  const score = await client.scoreJobFit(resume, jd)
  return { fit: score.score >= threshold, score }
}
