import asyncio
import random
import string
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = "mongodb://localhost:27017"
DB_NAME = "kobi_firewall_db"

async def insert_test_logs(num_logs=10):
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]

    for i in range(num_logs):
        doc = {
            "timestamp": datetime.utcnow(),
            "level": random.choice(["INFO","WARN","ERROR"]),
            "message": "Test log " + ''.join(random.choices(string.ascii_letters, k=5)),
            "source_ip": f"192.168.1.{random.randint(1,255)}"
        }
        await db["logs"].insert_one(doc)
        print(f"Inserted log {i+1}: {doc}")

    print(f"{num_logs} test logs inserted.")

if __name__ == "__main__":
    asyncio.run(insert_test_logs(10))
