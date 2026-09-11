import { z } from 'zod'

export const WorkExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  bullets: z.array(z.string()),
})

export const EducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const ResumeSchema = z.object({
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  location: z.string().optional(),
  linkedin: z.string().url().optional(),
  github: z.string().url().optional(),
  portfolio: z.string().url().optional(),
  summary: z.string().optional(),
  experience: z.array(WorkExperienceSchema),
  education: z.array(EducationSchema),
  skills: z.array(z.string()),
})

export type Resume = z.infer<typeof ResumeSchema>
export type WorkExperience = z.infer<typeof WorkExperienceSchema>
export type Education = z.infer<typeof EducationSchema>
