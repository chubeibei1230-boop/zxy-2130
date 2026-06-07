import sqlite3

DB_PATH = "./workflow.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("PRAGMA table_info(applications)")
        columns = [col[1] for col in cursor.fetchall()]
        
        new_columns = [
            ("withdrawn_at", "DATETIME"),
            ("withdrawn_by", "INTEGER"),
            ("withdraw_reason", "TEXT"),
            ("original_application_id", "INTEGER"),
        ]
        
        for col_name, col_type in new_columns:
            if col_name not in columns:
                print(f"Adding column {col_name} to applications table...")
                cursor.execute(f"ALTER TABLE applications ADD COLUMN {col_name} {col_type}")
            else:
                print(f"Column {col_name} already exists, skipping...")
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
