import { describe, it, expect } from 'vitest'
import { ResumeSchema } from '../../src/resume/schema.js'

describe('ResumeSchema', () => {
  it('parses a valid resume with all fields', () => {
    const resume = {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1-555-555-5555',
      location: 'San Francisco, CA',
      linkedin: 'https://linkedin.com/in/janedoe',
      github: 'https://github.com/janedoe',
      portfolio: 'https://janedoe.dev',
      summary: 'Experienced engineer.',
      experience: [
        {
          company: 'Acme',
          title: 'Senior Engineer',
          startDate: '2020-01',
          endDate: '2024-06',
          bullets: ['Shipped feature X', 'Led team of 4'],
        },
      ],
      education: [
        {
          institution: 'MIT',
          degree: 'BS',
          field: 'CS',
          startDate: '2012',
          endDate: '2016',
        },
      ],
      skills: ['TypeScript', 'Node.js'],
    }
    expect(() => ResumeSchema.parse(resume)).not.toThrow()
    const parsed = ResumeSchema.parse(resume)
    expect(parsed.fullName).toBe('Jane Doe')
  })

  it('parses a valid resume with only required fields', () => {
    const resume = {
      fullName: 'John Smith',
      email: 'john@example.com',
      phone: '555-1234',
      experience: [],
      education: [],
      skills: [],
    }
    const result = ResumeSchema.safeParse(resume)
    expect(result.success).toBe(true)
  })

  it('fails when fullName is missing', () => {
    const resume = {
      email: 'a@b.com',
      phone: '555',
      experience: [],
      education: [],
      skills: [],
    }
    const result = ResumeSchema.safeParse(resume)
    expect(result.success).toBe(false)
    expect(() => ResumeSchema.parse(resume)).toThrow()
  })

  it('fails on invalid email format', () => {
    const resume = {
      fullName: 'Jane',
      email: 'not-an-email',
      phone: '555',
      experience: [],
      education: [],
      skills: [],
    }
    const result = ResumeSchema.safeParse(resume)
    expect(result.success).toBe(false)
  })

  it('fails on invalid linkedin URL', () => {
    const resume = {
      fullName: 'Jane',
      email: 'jane@example.com',
      phone: '555',
      linkedin: 'not a url',
      experience: [],
      education: [],
      skills: [],
    }
    const result = ResumeSchema.safeParse(resume)
    expect(result.success).toBe(false)
  })

  it('fails when experience/education/skills are not arrays', () => {
    const badExperience = ResumeSchema.safeParse({
      fullName: 'Jane',
      email: 'jane@example.com',
      phone: '555',
      experience: 'nope',
      education: [],
      skills: [],
    })
    expect(badExperience.success).toBe(false)

    const badEducation = ResumeSchema.safeParse({
      fullName: 'Jane',
      email: 'jane@example.com',
      phone: '555',
      experience: [],
      education: {},
      skills: [],
    })
    expect(badEducation.success).toBe(false)

    const badSkills = ResumeSchema.safeParse({
      fullName: 'Jane',
      email: 'jane@example.com',
      phone: '555',
      experience: [],
      education: [],
      skills: 'TypeScript',
    })
    expect(badSkills.success).toBe(false)
  })
})
