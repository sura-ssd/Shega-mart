export type UserRole = "customer" | "seller" | "admin"

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  address: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  created_at: string
}

export interface Product {
  id: string
  seller_id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  image_urls?: string[]
  size_options?: string[]
  color_options?: string[]
  stock: number
  low_stock_threshold?: number
  is_active: boolean
  moderation_status?: "pending" | "approved" | "rejected"
  moderation_notes?: string | null
  moderated_by?: string | null
  moderated_at?: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  customer_id: string
  total_amount: number
  status: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price: number
  created_at: string
}
