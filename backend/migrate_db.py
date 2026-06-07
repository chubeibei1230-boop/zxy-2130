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
            ("supplement_status", "VARCHAR(20)"),
            ("supplement_requested_by", "INTEGER"),
            ("supplement_requested_at", "DATETIME"),
            ("supplement_request_note", "TEXT"),
            ("supplement_count", "INTEGER DEFAULT 0"),
        ]
        
        for col_name, col_type in new_columns:
            if col_name not in columns:
                print(f"Adding column {col_name} to applications table...")
                cursor.execute(f"ALTER TABLE applications ADD COLUMN {col_name} {col_type}")
            else:
                print(f"Column {col_name} already exists, skipping...")
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS supplement_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                application_id INTEGER NOT NULL,
                node_id INTEGER NOT NULL,
                requested_by INTEGER NOT NULL,
                request_note TEXT NOT NULL,
                requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                submitted_content TEXT,
                submitted_attachments TEXT,
                submitted_at DATETIME,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
                FOREIGN KEY (node_id) REFERENCES workflow_nodes(id) ON DELETE CASCADE,
                FOREIGN KEY (requested_by) REFERENCES users(id)
            )
        """)
        print("Created supplement_records table (if not exists)")
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
