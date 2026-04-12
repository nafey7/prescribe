db = db.getSiblingDB("medical_chat");

db.createCollection("chat_sessions");
db.createCollection("chat_messages");

db.chat_sessions.createIndex({ chat_id: 1 }, { unique: true });
db.chat_sessions.createIndex({ created_at: 1 });

db.chat_messages.createIndex({ chat_id: 1, timestamp: 1 });
db.chat_messages.createIndex({ patient_id: 1 });

db.createCollection("users");
db.users.createIndex({ user_id: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ patient_slug: 1 }, { unique: true, sparse: true });

db.createCollection("documents");
db.documents.createIndex({ document_id: 1 }, { unique: true });
db.documents.createIndex({ patient_id: 1, uploaded_at: -1 });
db.documents.createIndex({ patient_id: 1, category: 1 });

db.createCollection("suggestions");
db.suggestions.createIndex({ suggestion_id: 1 }, { unique: true });
db.suggestions.createIndex({ patient_id: 1, status: 1, created_at: -1 });
db.suggestions.createIndex({ document_id: 1 });

print("MongoDB initialized: medical_chat database with chat_sessions, chat_messages, users, documents, and suggestions collections");
