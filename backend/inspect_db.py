import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from sqlalchemy import inspect as sa_inspect, text

def inspect_aiven():
    app = create_app()
    with app.app_context():
        target = app.config['SQLALCHEMY_DATABASE_URI'].split('@')[-1] if '@' in app.config['SQLALCHEMY_DATABASE_URI'] else 'Local DB'
        print(f"\n=======================================================")
        print(f" DATABASE HOST: {target}")
        print(f"=======================================================\n")
        
        inspector = sa_inspect(db.engine)
        tables = inspector.get_table_names()
        
        if not tables:
            print("No tables found in this database.")
            return

        print(f"Found {len(tables)} tables in database:\n")
        
        for table in tables:
            columns = inspector.get_columns(table)
            count_res = db.session.execute(text(f"SELECT COUNT(*) FROM `{table}`")).scalar()
            col_names = [col['name'] for col in columns]
            
            print(f"• Table: {table} ({count_res} rows)")
            print(f"  Columns ({len(columns)}): {', '.join(col_names)}")
            print("-" * 55)

if __name__ == "__main__":
    inspect_aiven()
