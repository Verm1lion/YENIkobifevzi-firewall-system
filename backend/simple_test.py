# simple_test.py
from fastapi import FastAPI
import uvicorn

app = FastAPI(title="Test Server")

@app.get("/")
def read_root():
    return {"message": "Test server is working!"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Simple test server"}

if __name__ == "__main__":
    print("Starting simple test server...")
    uvicorn.run(app, host="127.0.0.1", port=8000)