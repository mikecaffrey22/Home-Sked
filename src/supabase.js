import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yezagcjokysffndgcqkg.supabase.co';
const supabaseKey = 'sb_publishable_foHXjfEGpyWLUu6BeuZ5sw_NU5vWEpX';

export const supabase = createClient(supabaseUrl, supabaseKey);
