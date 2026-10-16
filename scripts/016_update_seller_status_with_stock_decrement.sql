-- Drop the existing update_seller_status function
DROP FUNCTION IF EXISTS public.update_seller_status(UUID, TEXT) CASCADE;

-- Create an enhanced function that decrements stock when status is set to completed
CREATE OR REPLACE FUNCTION public.update_seller_status(
  p_item_id UUID,
  p_new_status TEXT
)
RETURNS JSON AS $$
DECLARE
  v_product_id UUID;
  v_seller_id UUID;
  v_quantity INTEGER;
  v_result JSON;
BEGIN
  -- Get the product_id, seller_id, and quantity for this order item
  SELECT oi.product_id, p.seller_id, oi.quantity
  INTO v_product_id, v_seller_id, v_quantity
  FROM public.order_items oi
  INNER JOIN public.products p ON oi.product_id = p.id
  WHERE oi.id = p_item_id;

  -- Check if the current user is the seller of this product
  IF v_seller_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You are not the seller of this product';
  END IF;

  -- Update the seller_status
  UPDATE public.order_items
  SET seller_status = p_new_status
  WHERE id = p_item_id;

  -- If status is being set to 'completed', decrement the stock
  IF p_new_status = 'completed' THEN
    UPDATE public.products
    SET stock = GREATEST(0, stock - v_quantity)
    WHERE id = v_product_id;

    -- Return success with stock decremented message
    SELECT json_build_object(
      'success', true,
      'message', 'Status updated and stock decremented',
      'item_id', p_item_id,
      'new_status', p_new_status,
      'stock_decremented', v_quantity
    ) INTO v_result;
  ELSE
    -- Return success without stock change
    SELECT json_build_object(
      'success', true,
      'message', 'Status updated',
      'item_id', p_item_id,
      'new_status', p_new_status
    ) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
