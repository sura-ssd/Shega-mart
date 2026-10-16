import { z } from 'zod'

export const CreateProductSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters').max(255),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().positive('Price must be positive'),
  category_id: z.string().uuid('Invalid category ID'),
  image_url: z.string().url('Invalid image URL').optional(),
  image_urls: z.array(z.string().url('Invalid image URL')).max(10).optional(),
  stock: z.number().int().non_negative('Stock must be non-negative'),
})

export const UpdateProductSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters').max(255).optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').optional(),
  price: z.number().positive('Price must be positive').optional(),
  image_url: z.string().url('Invalid image URL').optional(),
  image_urls: z.array(z.string().url('Invalid image URL')).max(10).optional(),
  stock: z.number().int().non_negative('Stock must be non-negative').optional(),
})

export const CreateCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(100),
  image_url: z.string().url('Invalid image URL').optional(),
})

export type CreateProductInput = z.infer<typeof CreateProductSchema>
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>
