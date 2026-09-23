-- ─── HOSPITALS TABLE ─────────────────────────────────────────────────────────
-- Stores all hospital/clinic records for Hubballi-Dharwad and beyond.
-- Designed to be extended without UI changes.

CREATE TABLE IF NOT EXISTS hospitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  type TEXT NOT NULL,              -- 'Government', 'Private', 'Trust', 'Charitable'
  category TEXT DEFAULT 'General', -- 'Multi-specialty', 'Super-specialty', 'Cancer', 'Children', 'Heart', etc.
  city TEXT NOT NULL,              -- 'Hubballi' or 'Dharwad'
  area TEXT,
  address TEXT NOT NULL,
  pincode TEXT,
  phone TEXT,
  phone2 TEXT,
  emergency_phone TEXT,
  website TEXT,
  email TEXT,
  latitude REAL,
  longitude REAL,
  google_maps_url TEXT,
  emergency INTEGER DEFAULT 0,    -- 1 = 24x7 emergency available
  icu_available INTEGER DEFAULT 0,
  blood_bank INTEGER DEFAULT 0,
  ambulance INTEGER DEFAULT 0,
  pharmacy INTEGER DEFAULT 1,
  lab INTEGER DEFAULT 1,
  specialties TEXT DEFAULT '[]',  -- JSON array of specialty names
  departments TEXT DEFAULT '[]',  -- JSON array of department details
  facilities TEXT DEFAULT '[]',   -- JSON array of facility names
  bed_count INTEGER,
  opd_timings TEXT,               -- e.g. "Mon-Sat 8AM-8PM"
  opd_details TEXT,               -- JSON for structured OPD schedule
  appointment_phone TEXT,
  appointment_url TEXT,
  rating REAL,
  total_ratings INTEGER DEFAULT 0,
  accreditation TEXT,             -- 'NABH', 'JCI', etc.
  established_year INTEGER,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  is_verified INTEGER DEFAULT 1,
  source TEXT DEFAULT 'Official/verified source',
  last_verified TEXT DEFAULT 'September 2026',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Link table: doctors ↔ hospitals (a doctor can be at multiple hospitals)
CREATE TABLE IF NOT EXISTS doctor_hospital_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id INTEGER NOT NULL,
  hospital_id INTEGER NOT NULL,
  department TEXT,
  designation TEXT,
  opd_days TEXT DEFAULT '[]',     -- JSON array e.g. ["Mon","Tue"]
  opd_times TEXT,                 -- e.g. "6PM-8PM"
  is_primary INTEGER DEFAULT 1,   -- 1 = primary hospital
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  UNIQUE(doctor_id, hospital_id)
);

-- Add hospital_id foreign key to doctors table
ALTER TABLE doctors ADD COLUMN hospital_id INTEGER REFERENCES hospitals(id);
ALTER TABLE doctors ADD COLUMN sub_specializations_detail TEXT DEFAULT '[]';
ALTER TABLE doctors ADD COLUMN opd_schedule TEXT DEFAULT '[]';
ALTER TABLE doctors ADD COLUMN awards TEXT DEFAULT '[]';
ALTER TABLE doctors ADD COLUMN publications TEXT DEFAULT '[]';
ALTER TABLE doctors ADD COLUMN kmc_reg_number TEXT;
ALTER TABLE doctors ADD COLUMN source TEXT DEFAULT 'Official/verified source';
ALTER TABLE doctors ADD COLUMN last_verified TEXT DEFAULT 'September 2026';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON hospitals(city);
CREATE INDEX IF NOT EXISTS idx_hospitals_type ON hospitals(type);
CREATE INDEX IF NOT EXISTS idx_hospitals_emergency ON hospitals(emergency);
CREATE INDEX IF NOT EXISTS idx_dhl_doctor ON doctor_hospital_links(doctor_id);
CREATE INDEX IF NOT EXISTS idx_dhl_hospital ON doctor_hospital_links(hospital_id);
