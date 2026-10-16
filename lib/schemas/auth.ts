import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  userType: z.enum(['customer', 'seller'], {
    errorMap: () => ({ message: 'User type must be customer or seller' }),
  }),
})

export const UpdateProfileSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type SignupInput = z.infer<typeof SignupSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
