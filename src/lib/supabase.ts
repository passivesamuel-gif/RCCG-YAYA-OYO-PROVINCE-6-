import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tcfdqenrwofuqedmzuwq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DY_W-HeCS75U7AZvSALtrA_zDCJyHvH';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
