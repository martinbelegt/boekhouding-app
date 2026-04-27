import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ewiozbdikpaeavunxvlx.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3aW96YmRpa3BhZWF2dW54dmx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjEyMjIsImV4cCI6MjA5MjU5NzIyMn0.PeQKEZ5xa6H7sMGpfSDvvUo9QZ4GyVUQcrdGINPFDl0";
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      apikey: supabaseKey,
    },
  },
});
