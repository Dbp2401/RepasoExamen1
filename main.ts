import { serve } from "https://deno.land/std/http/server.ts";

serve((_req) => new Response("Hello from Deno Deploy!"), { port: 8000 });

console.log("Server running on port 8000");
