-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  specialization TEXT NOT NULL,
  sub_specializations TEXT DEFAULT '[]',
  experience_years INTEGER DEFAULT 0,
  qualification TEXT,
  bio TEXT,
  hospital_name TEXT,
  hospital_address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  latitude REAL,
  longitude REAL,
  profile_image TEXT DEFAULT '',
  consultation_fee REAL DEFAULT 0,
  available_days TEXT DEFAULT '["Mon","Tue","Wed","Thu","Fri"]',
  available_times TEXT DEFAULT '["09:00","10:00","11:00","14:00","15:00","16:00"]',
  rating REAL DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  languages TEXT DEFAULT '["English"]',
  diseases_treated TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  dob TEXT,
  gender TEXT,
  blood_group TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  latitude REAL,
  longitude REAL,
  medical_history TEXT DEFAULT '[]',
  allergies TEXT DEFAULT '[]',
  current_medications TEXT DEFAULT '[]',
  profile_image TEXT DEFAULT '',
  emergency_contact TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id TEXT UNIQUE NOT NULL,
  doctor_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reason TEXT,
  symptoms TEXT DEFAULT '[]',
  predicted_disease TEXT,
  notes TEXT,
  prescription TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  appointment_id INTEGER,
  rating INTEGER NOT NULL,
  review_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_city ON doctors(city);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
