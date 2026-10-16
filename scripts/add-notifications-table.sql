-- Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'order_expired', 'order_cancelled', etc.
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Create function to insert notifications automatically
CREATE OR REPLACE FUNCTION insert_order_expired_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called when an order is deleted
  -- Insert notification for customer
  INSERT INTO notifications (user_id, title, message, type, order_id)
  VALUES (
    NEW.customer_id,
    'Order Cancelled',
    'Your order #' || NEW.id || ' has been cancelled due to non-payment after 24 hours.',
    'order_expired',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
