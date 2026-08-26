from app import create_app, db
import os

app = create_app()

if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() in ('true', '1')
    app.run(debug=debug, port=5000)
