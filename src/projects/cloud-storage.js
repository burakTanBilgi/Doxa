import { supabase, supabaseConfigured } from '../auth/supabaseClient';

const TABLE = 'doxa_charts';

function assertReady() {
  if (!supabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }
}

export async function cloudListProjects(userId) {
  assertReady();
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, title, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function cloudLoadProject(id) {
  assertReady();
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, title, payload, updated_at, user_id')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function cloudCreateProject(userId, title, payload) {
  assertReady();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ user_id: userId, title, payload })
    .select('id, title, updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function cloudUpdateProject(id, userId, fields) {
  assertReady();
  const patch = { ...fields, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, title, updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function cloudDeleteProject(id, userId) {
  assertReady();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}
