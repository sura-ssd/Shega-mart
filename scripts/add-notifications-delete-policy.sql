-- Add DELETE policy for notifications table
-- Allow users to delete their own notifications

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);
