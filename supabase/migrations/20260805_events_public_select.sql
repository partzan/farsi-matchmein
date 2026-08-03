-- Guests need to browse voting events before signup.
DROP POLICY IF EXISTS "Events are viewable by everyone." ON public.events;
CREATE POLICY "Events are viewable by everyone."
  ON public.events
  FOR SELECT
  USING (true);
