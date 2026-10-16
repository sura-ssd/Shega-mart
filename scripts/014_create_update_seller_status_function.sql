-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_seller_status(uuid, text);

-- Create function to update seller status safely
CREATE OR REPLACE FUNCTION update_seller_status(
  item_id uuid,
  new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_id_check uuid;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if the current user is the seller of this product
  SELECT p.seller_id INTO seller_id_check
  FROM order_items oi
  JOIN products p ON oi.product_id = p.id
  WHERE oi.id = item_id;
  
  -- Only allow update if user is the seller
  IF seller_id_check = current_user_id THEN
    UPDATE order_items
    SET seller_status = new_status
    WHERE id = item_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized: You can only update status for your own products';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_seller_status(uuid, text) TO authenticated;
