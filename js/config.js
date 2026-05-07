const SUPABASE_URL = 'https://fzvmofahkbxatrmspuom.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zrLQtDhdNp-UZBoZkfnWnA_m0q3YYa8';
const GOOGLE_API_KEY = 'AIzaSyBEqgXiCvqoSoUYnnWF3Ort1ZlSQ1rS47Y';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
