db = db.getSiblingDB("medical_chat");

// ── Collections ─────────────────────────────────────────────────────────────

db.createCollection("users");
db.createCollection("patient_profiles");
db.createCollection("doctor_profiles");
db.createCollection("doctor_patient_links");
db.createCollection("prescriptions");
db.createCollection("patient_documents");
db.createCollection("chat_sessions");
db.createCollection("chat_messages");
db.createCollection("documents");
db.createCollection("suggestions");

// ── users ───────────────────────────────────────────────────────────────────

db.users.createIndex({ user_id: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ status: 1 });
db.users.createIndex({ patient_slug: 1 }, { unique: true, sparse: true });

// ── patient_profiles ────────────────────────────────────────────────────────

db.patient_profiles.createIndex({ patient_id: 1 }, { unique: true });
db.patient_profiles.createIndex({ user_id: 1 }, { unique: true });
db.patient_profiles.createIndex({ full_name: 1 });

// ── doctor_profiles ─────────────────────────────────────────────────────────

db.doctor_profiles.createIndex({ doctor_id: 1 }, { unique: true });
db.doctor_profiles.createIndex({ user_id: 1 }, { unique: true });
db.doctor_profiles.createIndex(
  { license_number: 1 },
  { unique: true, partialFilterExpression: { license_number: { $type: "string" } } }
);
db.doctor_profiles.createIndex({ specialization: 1 });
db.doctor_profiles.createIndex({ full_name: 1 });

// ── doctor_patient_links ────────────────────────────────────────────────────

db.doctor_patient_links.createIndex({ link_id: 1 }, { unique: true });
db.doctor_patient_links.createIndex(
  { doctor_id: 1, patient_id: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" },
    name: "unique_active_link",
  }
);
db.doctor_patient_links.createIndex({ patient_id: 1, status: 1 });
db.doctor_patient_links.createIndex({ doctor_id: 1, status: 1 });
db.doctor_patient_links.createIndex({ requested_at: 1 });

// ── prescriptions ───────────────────────────────────────────────────────────

db.prescriptions.createIndex({ prescription_id: 1 }, { unique: true });
db.prescriptions.createIndex({ patient_id: 1, issued_at: -1 });
db.prescriptions.createIndex({ doctor_id: 1, issued_at: -1 });
db.prescriptions.createIndex({ status: 1 });

// ── patient_documents ───────────────────────────────────────────────────────

db.patient_documents.createIndex({ document_id: 1 }, { unique: true });
db.patient_documents.createIndex({ patient_id: 1, uploaded_at: -1 });
db.patient_documents.createIndex({ document_type: 1 });
db.patient_documents.createIndex({ visibility: 1 });

// ── chat_sessions ───────────────────────────────────────────────────────────

db.chat_sessions.createIndex({ chat_id: 1 }, { unique: true });
db.chat_sessions.createIndex({ owner_user_id: 1, updated_at: -1 });
db.chat_sessions.createIndex({ patient_id: 1, updated_at: -1 });
db.chat_sessions.createIndex({ doctor_id: 1, updated_at: -1 });
db.chat_sessions.createIndex({ created_at: 1 });

// ── chat_messages ───────────────────────────────────────────────────────────

db.chat_messages.createIndex({ message_id: 1 }, { unique: true });
db.chat_messages.createIndex({ chat_id: 1, timestamp: 1 });
db.chat_messages.createIndex({ patient_id: 1, timestamp: 1 });

// ── documents (GridFS-backed upload metadata) ───────────────────────────────

db.documents.createIndex({ document_id: 1 }, { unique: true });
db.documents.createIndex({ patient_id: 1, uploaded_at: -1 });
db.documents.createIndex({ patient_id: 1, category: 1 });

// ── suggestions ─────────────────────────────────────────────────────────────

db.suggestions.createIndex({ suggestion_id: 1 }, { unique: true });
db.suggestions.createIndex({ patient_id: 1, status: 1, created_at: -1 });
db.suggestions.createIndex({ document_id: 1 });

print(
  "MongoDB initialized: medical_chat database with all collections and indexes"
);
