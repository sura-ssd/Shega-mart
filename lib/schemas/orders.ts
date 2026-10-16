import { z } from 'zod'

export const CreateOrderSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.string().uuid('Invalid product ID'),
      quantity: z.number().int().positive('Quantity must be positive'),
    })
  ).min(1, 'Order must contain at least one item'),
  total_amount: z.number().positive('Total amount must be positive'),
  payment_method: z.enum(['card', 'bank_transfer', 'cash_on_delivery', 'chapa'], {
    errorMap: () => ({ message: 'Invalid payment method' }),
  }),
})

export const UpdateOrderStatusSchema = z.object({
  order_id: z.string().uuid('Invalid order ID'),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid order status' }),
  }),
  notes: z.string().optional(),
})

export const CreateReturnSchema = z.object({
  order_id: z.string().uuid('Invalid order ID'),
  reason: z.string().min(3, 'Return reason must be at least 3 characters'),
  items: z.array(
    z.object({
      product_id: z.string().uuid('Invalid product ID'),
      quantity: z.number().int().positive('Quantity must be positive'),
    })
  ).min(1, 'Return must contain at least one item'),
})

export const UpdateReturnStatusSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Invalid return status' }),
  }),
  notes: z.string().optional(),
})

export const CreateNotificationSchema = z.object({
  type: z.enum([
    'order_placed',
    'order_delivered',
    'return_requested',
    'return_approved',
    'return_rejected',
    'product_created',
    'low_stock_alert',
    'product_moderation_approved',
    'product_moderation_rejected',
    'cart_recovery',
  ]),
  orderId: z.string().uuid().optional(),
  sellerIds: z.array(z.string().uuid()).optional(),
  customerName: z.string().max(255).optional(),
  customerEmail: z.string().email().optional(),
  orderAmount: z.number().positive().optional(),
  productName: z.string().max(255).optional(),
  reason: z.string().max(500).optional(),
  refundMethod: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  customerId: z.string().uuid().optional(),
  lowStockValue: z.number().int().min(0).optional(),
  threshold: z.number().int().min(0).optional(),
})

export const DeleteNotificationSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
})

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>
export type CreateReturnInput = z.infer<typeof CreateReturnSchema>
export type UpdateReturnStatusInput = z.infer<typeof UpdateReturnStatusSchema>
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>
export type DeleteNotificationInput = z.infer<typeof DeleteNotificationSchema>
