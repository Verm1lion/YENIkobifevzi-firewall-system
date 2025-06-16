# File: backend/create_admin.py
# Güncellenmiş: Database init + Admin user creation

import asyncio
import sys
import os

# Backend app modüllerini import edebilmek için path ekleyelim
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.hash import bcrypt
from datetime import datetime
from app.config import settings

async def initialize_database():
    """Database'i initialize et - collections ve index'ler oluştur"""
    print("🔄 Database initialize ediliyor...")
    
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    try:
        # Collections oluştur
        collections_to_create = [
            'users',
            'firewall_rules', 
            'logs',
            'blocked_packets',
            'alerts',
            'interfaces',
            'routes',
            'firewall_groups',
            'blocked_domains',
            'dns_proxy_config',
            'nat_config'
        ]
        
        existing_collections = await db.list_collection_names()
        
        for collection_name in collections_to_create:
            if collection_name not in existing_collections:
                await db.create_collection(collection_name)
                print(f"   ✅ Collection '{collection_name}' oluşturuldu")
            else:
                print(f"   ℹ️  Collection '{collection_name}' zaten mevcut")
        
        # Index'leri oluştur
        print("🔍 Index'ler oluşturuluyor...")
        
        # Users collection indexes
        try:
            await db.users.create_index([("username", 1)], unique=True)
            print("   ✅ users.username index oluşturuldu")
        except Exception as e:
            if "already exists" not in str(e):
                print(f"   ⚠️  users.username index hatası: {e}")
        
        # Firewall rules indexes
        try:
            await db.firewall_rules.create_index([("rule_name", 1)], unique=True)
            print("   ✅ firewall_rules.rule_name index oluşturuldu")
        except Exception as e:
            if "already exists" not in str(e):
                print(f"   ⚠️  firewall_rules.rule_name index hatası: {e}")
        
        # Time-based collections indexes
        for collection in ['logs', 'blocked_packets', 'alerts']:
            try:
                await db[collection].create_index([("timestamp", -1)])
                print(f"   ✅ {collection}.timestamp index oluşturuldu")
            except Exception as e:
                if "already exists" not in str(e):
                    print(f"   ⚠️  {collection}.timestamp index hatası: {e}")
        
        # Interfaces index
        try:
            await db.interfaces.create_index([("interface_name", 1)], unique=True)
            print("   ✅ interfaces.interface_name index oluşturuldu")
        except Exception as e:
            if "already exists" not in str(e):
                print(f"   ⚠️  interfaces.interface_name index hatası: {e}")
        
        # Blocked domains index
        try:
            await db.blocked_domains.create_index([("domain", 1)], unique=True)
            print("   ✅ blocked_domains.domain index oluşturuldu")
        except Exception as e:
            if "already exists" not in str(e):
                print(f"   ⚠️  blocked_domains.domain index hatası: {e}")
        
        print("✅ Database initialization tamamlandı!")
        return True
        
    except Exception as e:
        print(f"❌ Database initialization hatası: {e}")
        return False
        
    finally:
        client.close()

async def create_admin_user():
    """Varsayılan admin kullanıcısı oluştur"""
    print("🔄 Admin kullanıcısı kontrol ediliyor...")
    
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    try:
        # Admin kullanıcısı var mı kontrol et
        existing_admin = await db["users"].find_one({"username": "admin"})
        if existing_admin:
            print("✅ Admin kullanıcısı zaten mevcut")
            print("   Username: admin")
            print("   Password: admin123")
            return True
        
        # Admin kullanıcısı oluştur
        print("🔄 Admin kullanıcısı oluşturuluyor...")
        hashed_password = bcrypt.hash("admin123")
        admin_user = {
            "username": "admin",
            "hashed_password": hashed_password,
            "role": "admin",
            "created_at": datetime.utcnow()
        }
        
        result = await db["users"].insert_one(admin_user)
        print("✅ Admin kullanıcısı başarıyla oluşturuldu!")
        print("   Username: admin")
        print("   Password: admin123")
        print(f"   Database ID: {result.inserted_id}")
        return True
        
    except Exception as e:
        print(f"❌ Admin kullanıcısı oluşturma hatası: {e}")
        return False
        
    finally:
        client.close()

async def create_sample_data():
    """Örnek veri oluştur (opsiyonel)"""
    print("🔄 Örnek veriler oluşturuluyor...")
    
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    try:
        # DNS proxy config (default disabled)
        dns_config = await db["dns_proxy_config"].find_one({"_id": "main"})
        if not dns_config:
            await db["dns_proxy_config"].insert_one({
                "_id": "main",
                "enabled": False,
                "lan_interface": "",
                "port": 53,
                "created_at": datetime.utcnow()
            })
            print("   ✅ DNS proxy config oluşturuldu")
        
        # NAT config (default disabled)  
        nat_config = await db["nat_config"].find_one({"_id": "main"})
        if not nat_config:
            await db["nat_config"].insert_one({
                "_id": "main",
                "enabled": False,
                "wan": "",
                "lan": "",
                "created_at": datetime.utcnow()
            })
            print("   ✅ NAT config oluşturuldu")
        
        # Sample firewall group
        existing_group = await db["firewall_groups"].find_one({"group_name": "Web Services"})
        if not existing_group:
            await db["firewall_groups"].insert_one({
                "group_name": "Web Services",
                "description": "HTTP/HTTPS web servisleri için kurallar",
                "created_at": datetime.utcnow()
            })
            print("   ✅ Örnek firewall grubu oluşturuldu")
        
        print("✅ Örnek veriler oluşturuldu!")
        return True
        
    except Exception as e:
        print(f"❌ Örnek veri oluşturma hatası: {e}")
        return False
        
    finally:
        client.close()

async def check_database_connection():
    """Database bağlantısını test et"""
    print("🔄 MongoDB bağlantısı test ediliyor...")
    
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    
    try:
        # Ping ile bağlantıyı test et
        await client.admin.command('ping')
        print("✅ MongoDB bağlantısı başarılı")
        
        # Database listesini al
        db_list = await client.list_database_names()
        print(f"📁 Mevcut databases: {', '.join(db_list)}")
        
        # Server info
        server_info = await client.server_info()
        print(f"🗄️  MongoDB version: {server_info.get('version', 'Unknown')}")
        
        return True
        
    except Exception as e:
        print(f"❌ MongoDB bağlantı hatası: {e}")
        print(f"   Bağlantı URL'i: {settings.MONGODB_URL}")
        print("\n💡 MongoDB'yi başlatmak için:")
        print("   macOS: brew services start mongodb-community")
        print("   Linux: sudo systemctl start mongod")
        print("   Windows: net start MongoDB")
        print("   Docker: docker run -d -p 27017:27017 mongo:latest")
        return False
        
    finally:
        client.close()

async def main():
    """Ana fonksiyon - Full initialization"""
    print("🚀 KOBI Firewall - Database Initialization & Setup")
    print("=" * 60)
    
    success_steps = []
    
    # 1. Bağlantı testi
    if await check_database_connection():
        success_steps.append("Database Connection")
    else:
        print("\n❌ MongoDB bağlantısı kurulamadı. Kurulum durduruldu.")
        return 1
    
    # 2. Database initialization
    if await initialize_database():
        success_steps.append("Database Initialization")
    else:
        print("\n❌ Database initialization başarısız.")
        return 1
    
    # 3. Admin kullanıcısı oluştur
    if await create_admin_user():
        success_steps.append("Admin User Creation")
    else:
        print("\n❌ Admin kullanıcısı oluşturulamadı.")
        return 1
    
    # 4. Örnek veri oluştur
    if await create_sample_data():
        success_steps.append("Sample Data Creation")
    else:
        print("\n⚠️  Örnek veri oluşturulamadı, ancak devam ediliyor.")
    
    # Sonuç
    print("\n" + "=" * 60)
    print("✅ KOBI Firewall kurulumu tamamlandı!")
    print(f"📋 Başarılı adımlar: {', '.join(success_steps)}")
    print("\n🌐 Erişim Bilgileri:")
    print("   Web UI: http://localhost:3000")
    print("   API: http://localhost:8000") 
    print("   Username: admin")
    print("   Password: admin123")
    print("\n🔧 Sistem hazır! Firewall kurallarını, DNS engellemeyi ve NAT ayarlarını yapılandırabilirsiniz.")
    
    return 0

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n⚠️  Kurulum kullanıcı tarafından iptal edildi.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Beklenmeyen hata: {e}")
        sys.exit(1)