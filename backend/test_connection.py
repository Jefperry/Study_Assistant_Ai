from supabase_client import supabase

def test_connection():
    try:
        # Test by fetching from a table or just checking auth
        response = supabase.auth.get_session()
        print("✅ Successfully connected to Supabase!")
        print(f"Session: {response}")
        
        # Optional: Test a simple query (if you have a table)
        # data = supabase.table("your_table_name").select("*").limit(1).execute()
        # print(f"Data: {data}")
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    test_connection()