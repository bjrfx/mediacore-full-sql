"""
Passenger WSGI Entry Point for cPanel Deployment

This file is required for cPanel Python App with Passenger.
Configure in cPanel:
    - Application startup file: passenger_wsgi.py
    - Application Entry point: application
"""
import sys
import os

# Add application directory to Python path
INTERP = os.path.expanduser("~/virtualenv/vosk-stt/3.13/bin/python")
if sys.executable != INTERP:
    os.execl(INTERP, INTERP, *sys.argv)

# Add app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set environment
os.environ.setdefault('FLASK_ENV', 'production')

# Import Flask app
from app import app as application

# For compatibility
app = application

# Passenger expects 'application' callable
if __name__ == '__main__':
    application.run()
