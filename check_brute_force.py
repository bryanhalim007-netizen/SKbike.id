#!/usr/bin/env python3
"""
Check MongoDB login_attempts collection to debug brute force protection
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

async def check_attempts():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("Checking login_attempts collection...")
    attempts = await db.login_attempts.find({}).to_list(100)
    
    if not attempts:
        print("No login attempts found in database")
    else:
        print(f"\nFound {len(attempts)} login attempt records:\n")
        for attempt in attempts:
            print(f"Identifier: {attempt.get('identifier')}")
            print(f"Count: {attempt.get('count')}")
            print(f"Last attempt: {attempt.get('last_attempt')}")
            print(f"Locked until: {attempt.get('locked_until', 'N/A')}")
            print("-" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_attempts())
