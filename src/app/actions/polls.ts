'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function castVote(pollId: number, optionId: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('cast_vote', { p_poll_id: pollId, p_option_id: optionId } as never);
  if (error) return { error: error.message };
  revalidatePath('/bulletin');
  return { success: true };
}
