-- Medical Reports table
CREATE TABLE IF NOT EXISTS medical_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id TEXT UNIQUE NOT NULL,
  patient_id INTEGER NOT NULL,
  doctor_id INTEGER,
  appointment_id INTEGER,
  report_type TEXT NOT NULL,
  report_title TEXT NOT NULL,
  report_date TEXT NOT NULL,
  description TEXT,
  findings TEXT,
  file_url TEXT,
  file_name TEXT,
  lab_name TEXT,
  status TEXT DEFAULT 'pending',
  is_critical INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_id TEXT UNIQUE NOT NULL,
  patient_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  appointment_id INTEGER,
  diagnosis TEXT,
  medicines TEXT NOT NULL DEFAULT '[]',
  instructions TEXT,
  valid_till TEXT,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- Medication Reminders table
CREATE TABLE IF NOT EXISTS medication_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_id TEXT UNIQUE NOT NULL,
  patient_id INTEGER NOT NULL,
  prescription_id INTEGER NOT NULL,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT DEFAULT 'daily',
  times TEXT DEFAULT '["08:00","14:00","20:00"]',
  start_date TEXT NOT NULL,
  end_date TEXT,
  is_active INTEGER DEFAULT 1,
  last_reminded_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
);

-- Chat Messages table (for AI chatbot persistence)
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_patient ON medical_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_reports_doctor ON medical_reports(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_reminders_patient ON medication_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id);
