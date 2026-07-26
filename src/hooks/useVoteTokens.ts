import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const MAX_WEEKLY_VOTES = 4;

export function useVoteTokens() {
  const [tokens, setTokens] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    setUserId(uid);

    if (!uid) {
      setTokens(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('users')
      .select('vote_tokens')
      .eq('id', uid)
      .maybeSingle();

    setTokens(data?.vote_tokens ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  return {
    tokens,
    max: MAX_WEEKLY_VOTES,
    remaining: tokens,
    userId,
    loading,
    refresh,
    setTokens,
  };
}
