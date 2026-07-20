#!/bin/bash
# Create virtualenv and install Python pipeline dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
echo ""
echo "Setup complete. To start the pipeline:"
echo "  source .venv/bin/activate"
echo "  uvicorn main:app --port 3001 --reload"
