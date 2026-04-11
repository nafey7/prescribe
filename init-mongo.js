db = db.getSiblingDB("medical_chat");

db.createCollection("chat_sessions");
db.createCollection("chat_messages");

db.chat_sessions.createIndex({ chat_id: 1 }, { unique: true });
db.chat_sessions.createIndex({ created_at: 1 });

db.chat_messages.createIndex({ chat_id: 1, timestamp: 1 });
db.chat_messages.createIndex({ patient_id: 1 });

print("MongoDB initialized: medical_chat database with chat_sessions and chat_messages collections");
