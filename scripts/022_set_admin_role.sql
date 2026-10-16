-- Set a user as admin
-- Replace 'your-email@example.com' with the actual email address of the user you want to make admin

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'surashiferaw564@gmail.com';

-- To verify the change:
SELECT id, email, full_name, role FROM public.profiles WHERE role = 'admin';
