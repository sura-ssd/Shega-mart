-- Create admin functions to bypass RLS policies
-- These functions allow admins to view all data without triggering infinite recursion

-- Function to get all orders for admin
CREATE OR REPLACE FUNCTION get_admin_orders()
RETURNS TABLE (
  id uuid,
  customer_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  shipping_address text,
  payment_method text,
  total_amount numeric,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  customer_full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Return all orders with customer info
  RETURN QUERY
  SELECT 
    o.id,
    o.customer_id,
    o.customer_name,
    o.customer_email,
    o.customer_phone,
    o.shipping_address,
    o.payment_method,
    o.total_amount,
    o.status,
    o.created_at,
    o.updated_at,
    p.full_name as customer_full_name
  FROM orders o
  LEFT JOIN profiles p ON o.customer_id = p.id
  ORDER BY o.created_at DESC;
END;
$$;
