import os
from supabase import create_client, Client

url = "https://vqxgcaxfixbyihyyvexn.supabase.co"
key = "sb_publishable_FjZUXBTbqPrieJjYwrELkg_Uh4zZPFB"

try:
    supabase: Client = create_client(url, key)
    res = supabase.table("records").select("*").execute()
    print("SUCCESS")
    print(res)
except Exception as e:
    print(f"FAILED: {e}")
