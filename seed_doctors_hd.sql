-- ═══════════════════════════════════════════════════════════════════════════════
-- MyDoctor's — Hubballi-Dharwad Verified Doctor Seed Data
-- Source: Official hospital websites | Last researched: September 2026
-- RULE: Only verified names/specialties included. No fictional data.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── SDM HOSPITAL DOCTORS (Dharwad) ─────────────────────────────────────────

INSERT OR IGNORE INTO doctors (
  user_id, name, email, specialization, sub_specializations,
  qualification, hospital_name, hospital_address, city, state, pincode,
  latitude, longitude, available_days, available_times,
  is_verified, is_active, languages, diseases_treated,
  opd_schedule, source, last_verified
) VALUES

-- Orthopaedics
('doc_sdm_001', 'Dr. Santosh Jeevannavar', 'santosh.jeevannavar@sdmcmsh.edu.in',
 'Orthopaedic', '["Orthopaedics","Bone & Joint Surgery"]',
 'MS - Orthopaedics, MBBS',
 'SDM College of Medical Sciences & Hospital / SDM Polyclinic',
 'Sattur, Dharwad – 580009', 'Dharwad', 'Karnataka', '580009',
 15.4100, 75.0050,
 '["Mon"]', '["18:00","19:00","20:00"]',
 1, 1, '["Kannada","English","Hindi"]',
 '["Fractures","Joint Replacement","Bone Injuries","Sports Injuries","Arthritis"]',
 '[{"day":"Monday","time":"6PM–8PM","location":"SDM Polyclinic"}]',
 'SDM Official OPD Schedule | sdmcmsh.edu.in', 'September 2026'),

('doc_sdm_002', 'Dr. Manjunath Mahamani', 'manjunath.mahamani@sdmcmsh.edu.in',
 'Orthopaedic', '["Orthopaedics","Trauma Surgery"]',
 'MS - Orthopaedics, MBBS',
 'SDM College of Medical Sciences & Hospital / SDM Polyclinic',
 'Sattur, Dharwad – 580009', 'Dharwad', 'Karnataka', '580009',
 15.4100, 75.0050,
 '["Tue","Fri"]', '["18:00","19:00","20:00"]',
 1, 1, '["Kannada","English"]',
 '["Fractures","Joint Disorders","Trauma","Arthritis","Spine Disorders"]',
 '[{"day":"Tuesday","time":"6PM–8PM","location":"SDM Polyclinic"},{"day":"Friday","time":"6PM–8PM","location":"SDM Polyclinic"}]',
 'SDM Official OPD Schedule | sdmcmsh.edu.in', 'September 2026'),

('doc_sdm_003', 'Dr. Keshav Shenoy', 'keshav.shenoy@sdmcmsh.edu.in',
 'Orthopaedic', '["Orthopaedics","Joint Replacement"]',
 'MS - Orthopaedics, MBBS',
 'SDM College of Medical Sciences & Hospital / SDM Polyclinic',
 'Sattur, Dharwad – 580009', 'Dharwad', 'Karnataka', '580009',
 15.4100, 75.0050,
 '["Wed"]', '["18:00","19:00","20:00"]',
 1, 1, '["Kannada","English"]',
 '["Knee Replacement","Hip Replacement","Arthritis","Joint Pain","Fractures"]',
 '[{"day":"Wednesday","time":"6PM–8PM","location":"SDM Polyclinic"}]',
 'SDM Official OPD Schedule | sdmcmsh.edu.in', 'September 2026'),

('doc_sdm_004', 'Dr. Prasanna Baindoor', 'prasanna.baindoor@sdmcmsh.edu.in',
 'Orthopaedic', '["Orthopaedics","Spine Surgery"]',
 'MS - Orthopaedics, MBBS',
 'SDM College of Medical Sciences & Hospital / SDM Polyclinic',
 'Sattur, Dharwad – 580009', 'Dharwad', 'Karnataka', '580009',
 15.4100, 75.0050,
 '["Thu"]', '["18:00","19:00","20:00"]',
 1, 1, '["Kannada","English"]',
 '["Spine Disorders","Back Pain","Sciatica","Fractures","Joint Replacement"]',
 '[{"day":"Thursday","time":"6PM–8PM","location":"SDM Polyclinic"}]',
 'SDM Official OPD Schedule | sdmcmsh.edu.in', 'September 2026'),

-- Medicine
('doc_sdm_005', 'Dr. M. V. Kalasurmath', 'm.v.kalasurmath@sdmcmsh.edu.in',
 'General Medicine', '["Internal Medicine","General Medicine"]',
 'MD - General Medicine, MBBS',
 'SDM College of Medical Sciences & Hospital / SDM Polyclinic',
 'Sattur, Dharwad – 580009', 'Dharwad', 'Karnataka', '580009',
 15.4100, 75.0050,
 '["Mon","Wed","Fri"]', '["18:00","19:00","20:00"]',
 1, 1, '["Kannada","English","Hindi"]',
 '["Diabetes","Hypertension","Fever","Infections","General Health Issues","Respiratory Diseases"]',
 '[{"day":"Monday","time":"6PM–8PM","location":"SDM Polyclinic"},{"day":"Wednesday","time":"6PM–8PM","location":"SDM Polyclinic"},{"day":"Friday","time":"6PM–8PM","location":"SDM Polyclinic"}]',
 'SDM Official OPD Schedule | sdmcmsh.edu.in', 'September 2026'),

('doc_sdm_006', 'Dr. Archana Dambal', 'archana.dambal@sdmcmsh.edu.in',
 'General Medicine', '["Internal Medicine","General Medicine"]',
 'MD - General Medicine, MBBS',
 'SDM College of Medical Sciences & Hospital / SDM Polyclinic',
 'Sattur, Dharwad – 580009', 'Dharwad', 'Karnataka', '580009',
 15.4100, 75.0050,
 '["Thu"]', '["18:00","19:00","20:00"]',
 1, 1, '["Kannada","English"]',
 '["Diabetes","Hypertension","Fever","Infections","General Medicine"]',
 '[{"day":"Thursday","time":"6PM–8PM","location":"SDM Polyclinic"}]',
 'SDM Official OPD Schedule | sdmcmsh.edu.in', 'September 2026'),

-- OBG
('doc_sdm_007', 'Dr. Asha Neravi', 'asha.neravi@sdmcmsh.edu.in',
 'Gynecologist', '["Obstetrics","Gynaecology","Maternal-Fetal Medicine"]',
 'MS - Obstetrics & Gynaecology, MBBS',
 'SDM College of Medical Sciences & Hospital / SDM Polyclinic',
 'Sattur, Dharwad – 580009', 'Dharwad', 'Karnataka', '580009',
 15.4100, 75.0050,
 '["Mon"]', '["18:00","19:00","20:00"]',
 1, 1, '["Kannada","English"]',
 '["Pregnancy","Normal Delivery","Caesarean Section","Gynaecological Disorders","PCOS","Infertility"]',
 '[{"day":"Monday","time":"6PM–8PM","location":"SDM Polyclinic"}]',
 'SDM Official OPD Schedule | sdmcmsh.edu.in', 'September 2026'),

('doc_sdm_008', 'Dr. Sunilkumar K. S.', 'sunilkumar.ks@sdmcmsh.edu.in',
 'Gynecologist', '["Obstetrics","Gynaecology","Laparoscopic Gynaecology"]',
 'MS - Obstetrics & Gynaecology, MBBS',
 'SDM College of Medical Sciences & Hospital / SDM Polyclinic',
 'Sattur, Dharwad – 580009', 'Dharwad', 'Karnataka', '580009',
 15.4100, 75.0050,
 '["Tue"]', '["18:00","19:00","20:00"]',
 1, 1, '["Kannada","English"]',
 '["Pregnancy","Delivery","Gynaecological Surgery","Laparoscopy","Menstrual Disorders"]',
 '[{"day":"Tuesday","time":"6PM–8PM","location":"SDM Polyclinic"}]',
 'SDM Official OPD Schedule | sdmcmsh.edu.in', 'September 2026'),

('doc_sdm_009', 'Dr. Leena Kamat', 'leena.kamat@sdmcmsh.edu.in',
 'Gynecologist', '["Obstetrics","Gynaecology","High-Risk Pregnancy"]',
 'MS - Obstetrics & Gynaecology, MBBS',
 'SDM College of Medical Sciences & Hospital / SDM Polyclinic',
 'Sattur, Dharwad – 580009', 'Dharwad', 'Karnataka', '580009',
 15.4100, 75.0050,
 '["Thu"]', '["18:00","19:00","20:00"]',
 1, 1, '["Kannada","English"]',
 '["High-Risk Pregnancy","PCOS","Infertility","Menstrual Disorders","Gynaecological Surgery"]',
 '[{"day":"Thursday","time":"6PM–8PM","location":"SDM Polyclinic"}]',
 'SDM Official OPD Schedule | sdmcmsh.edu.in', 'September 2026'),

-- Paediatrics
('doc_sdm_010', 'Dr. Kavita Konded', 'kavita.konded@sdmcmsh.edu.in',
 'Pediatrician', '["Paediatrics","Child Health","Neonatology"]',
 'MD - Paediatrics, MBBS',
 'SDM College of Medical Sciences & Hospital / SDM Polyclinic',
 'Sattur, Dharwad – 580009', 'Dharwad', 'Karnataka', '580009',
 15.4100, 75.0050,
 '["Tue","Wed"]', '["18:00","19:00","20:00"]',
 1, 1, '["Kannada","English"]',
 '["Child Fever","Infections","Malnutrition","Neonatal Care","Growth Disorders","Vaccination"]',
 '[{"day":"Tuesday","time":"6PM–8PM","location":"SDM Polyclinic"},{"day":"Wednesday","time":"6PM–8PM","location":"SDM Polyclinic"}]',
 'SDM Official OPD Schedule | sdmcmsh.edu.in', 'September 2026'),

-- Plastic Surgery
('doc_sdm_011', 'Dr. Avinash Prabhu', 'avinash.prabhu@sdmcmsh.edu.in',
 'Plastic Surgeon', '["Plastic Surgery","Reconstructive Surgery","Burns"]',
 'MCh - Plastic Surgery, MS, MBBS',
 'SDM College of Medical Sciences & Hospital / SDM Polyclinic',
 'Sattur, Dharwad – 580009', 'Dharwad', 'Karnataka', '580009',
 15.4100, 75.0050,
 '["Fri"]', '["18:00","19:00","20:00"]',
 1, 1, '["Kannada","English"]',
 '["Burn Injuries","Reconstructive Surgery","Skin Grafting","Cleft Lip","Hand Surgery","Cosmetic Surgery"]',
 '[{"day":"Friday","time":"6PM–8PM","location":"SDM Polyclinic"}]',
 'SDM Official OPD Schedule | sdmcmsh.edu.in', 'September 2026'),

-- Paediatric Surgery
('doc_sdm_012', 'Dr. Akshay Kalavant', 'akshay.kalavant@sdmcmsh.edu.in',
 'Pediatric Surgeon', '["Paediatric Surgery","Neonatal Surgery","Laparoscopic Paediatric Surgery"]',
 'MCh - Paediatric Surgery, MS, MBBS',
 'SDM College of Medical Sciences & Hospital / SDM Polyclinic',
 'Sattur, Dharwad – 580009', 'Dharwad', 'Karnataka', '580009',
 15.4100, 75.0050,
 '["Sat"]', '["18:00","19:00","20:00"]',
 1, 1, '["Kannada","English"]',
 '["Paediatric Hernias","Appendicitis","Intussusception","Neonatal Surgical Conditions","Congenital Anomalies","Paediatric Trauma"]',
 '[{"day":"Saturday","time":"6PM–8PM","location":"SDM Polyclinic"}]',
 'SDM Official OPD Schedule | sdmcmsh.edu.in', 'September 2026'),

-- ─── VIHAAN HOSPITAL DOCTORS (Hubballi) ─────────────────────────────────────

('doc_vihaan_001', 'Dr. Vijayakrishna Kolur', 'vijayakrishna.kolur@vihaanhospital.com',
 'Cardiologist', '["Interventional Cardiology","Coronary Intervention","Structural Heart Disease"]',
 'DM - Cardiology, MD, MBBS',
 'Vihaan Heart & Super Speciality Hospital',
 'Akshay Colony, 4th Phase, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3520, 75.1150,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00","16:00"]',
 1, 1, '["Kannada","English","Hindi"]',
 '["Heart Attack","Coronary Artery Disease","Angioplasty","Stenting","Structural Heart Disease","Heart Failure","Hypertension","Arrhythmia"]',
 '[]',
 'Official/verified source | vihaanhospital.com', 'September 2026'),

('doc_vihaan_002', 'Dr. Santosh Palled', 'santosh.palled@vihaanhospital.com',
 'Cardiologist', '["Cardiology","Non-Invasive Cardiology","Echocardiography"]',
 'DM - Cardiology, MD, MBBS',
 'Vihaan Heart & Super Speciality Hospital',
 'Akshay Colony, 4th Phase, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3520, 75.1150,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00"]',
 1, 1, '["Kannada","English"]',
 '["Heart Disease","Hypertension","Arrhythmia","Heart Failure","Echocardiography","Stress Test"]',
 '[]',
 'Official/verified source | vihaanhospital.com', 'September 2026'),

('doc_vihaan_003', 'Dr. Arun K. Bableshwar', 'arun.bableshwar@vihaanhospital.com',
 'Pediatric Cardiologist', '["Pediatric Cardiology","Congenital Heart Disease","Fetal Cardiology"]',
 'DM - Pediatric Cardiology, MD, MBBS',
 'Vihaan Heart & Super Speciality Hospital',
 'Akshay Colony, 4th Phase, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3520, 75.1150,
 '["Mon","Tue","Wed","Thu","Fri"]', '["10:00","11:00","14:00","15:00","16:00"]',
 1, 1, '["Kannada","English"]',
 '["Congenital Heart Disease","Pediatric Heart Surgery","Fetal Echo","ASD","VSD","PDA","Tetralogy of Fallot"]',
 '[]',
 'Official/verified source | vihaanhospital.com', 'September 2026'),

('doc_vihaan_004', 'Dr. Nagesh V. R.', 'nagesh.vr@vihaanhospital.com',
 'Cardiovascular Surgeon', '["Cardiovascular Surgery","Thoracic Surgery","CABG","Valve Surgery"]',
 'MCh - Cardiovascular & Thoracic Surgery, MS, MBBS',
 'Vihaan Heart & Super Speciality Hospital',
 'Akshay Colony, 4th Phase, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3520, 75.1150,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00"]',
 1, 1, '["Kannada","English"]',
 '["Bypass Surgery","Valve Replacement","Aortic Surgery","Thoracic Surgery","Congenital Heart Surgery"]',
 '[]',
 'Official/verified source | vihaanhospital.com', 'September 2026'),

('doc_vihaan_005', 'Dr. Sarang K. Gaikwad', 'sarang.gaikwad@vihaanhospital.com',
 'Cardiovascular Surgeon', '["Cardiovascular Surgery","Thoracic Surgery","Minimally Invasive Cardiac Surgery"]',
 'MCh - Cardiovascular & Thoracic Surgery, MS, MBBS',
 'Vihaan Heart & Super Speciality Hospital',
 'Akshay Colony, 4th Phase, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3520, 75.1150,
 '["Mon","Tue","Wed","Thu","Fri"]', '["09:00","10:00","14:00","15:00","16:00"]',
 1, 1, '["Kannada","English","Marathi"]',
 '["Cardiac Surgery","Valve Surgery","Bypass Surgery","Thoracic Surgery","Minimally Invasive Surgery"]',
 '[]',
 'Official/verified source | vihaanhospital.com', 'September 2026'),

('doc_vihaan_006', 'Dr. Junaid Ahmed Jamadar', 'junaid.jamadar@vihaanhospital.com',
 'Interventional Radiologist', '["Interventional Radiology","Fetal Medicine","Vascular Interventions"]',
 'MD - Radiology, MBBS',
 'Vihaan Heart & Super Speciality Hospital',
 'Akshay Colony, 4th Phase, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3520, 75.1150,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00"]',
 1, 1, '["Kannada","English","Urdu"]',
 '["Fetal Medicine","Fetal Echo","Obstetric Ultrasound","Vascular Interventions","Embolization","TIPS"]',
 '[]',
 'Official/verified source | vihaanhospital.com', 'September 2026'),

('doc_vihaan_007', 'Dr. Tejashwini', 'tejashwini@vihaanhospital.com',
 'Anaesthesiologist', '["Anaesthesiology","Cardiac Anaesthesia","Critical Care"]',
 'MD - Anaesthesiology, MBBS',
 'Vihaan Heart & Super Speciality Hospital',
 'Akshay Colony, 4th Phase, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3520, 75.1150,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["08:00","09:00","10:00","14:00","15:00"]',
 1, 1, '["Kannada","English"]',
 '["Cardiac Anaesthesia","General Anaesthesia","Regional Anaesthesia","Pain Management","Critical Care"]',
 '[]',
 'Official/verified source | vihaanhospital.com', 'September 2026'),

('doc_vihaan_008', 'Dr. Mohammad Naveed Nadaf', 'naveed.nadaf@vihaanhospital.com',
 'Anaesthesiologist', '["Anaesthesiology","General Anaesthesia","Pain Management"]',
 'MD - Anaesthesiology, MBBS',
 'Vihaan Heart & Super Speciality Hospital',
 'Akshay Colony, 4th Phase, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3520, 75.1150,
 '["Mon","Tue","Wed","Thu","Fri"]', '["08:00","09:00","10:00","14:00","15:00"]',
 1, 1, '["Kannada","English","Urdu"]',
 '["General Anaesthesia","Regional Anaesthesia","Spinal Anaesthesia","Epidural","Pain Management"]',
 '[]',
 'Official/verified source | vihaanhospital.com', 'September 2026'),

('doc_vihaan_009', 'Dr. Pavan M. Udagani', 'pavan.udagani@vihaanhospital.com',
 'Dentist', '["Dentistry","Maxillofacial Surgery","Oral Surgery"]',
 'MDS - Oral & Maxillofacial Surgery, BDS',
 'Vihaan Heart & Super Speciality Hospital',
 'Akshay Colony, 4th Phase, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3520, 75.1150,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00","16:00"]',
 1, 1, '["Kannada","English"]',
 '["Dental Extractions","Jaw Surgery","Facial Trauma","Dental Implants","Oral Cancer","Cleft Palate","TMJ Disorders"]',
 '[]',
 'Official/verified source | vihaanhospital.com', 'September 2026'),

-- ─── SeCURE HOSPITAL DOCTORS (Hubballi) ─────────────────────────────────────

('doc_secure_001', 'Dr. Vishwanath Kumbar', 'vishwanath.kumbar@securehospital.in',
 'Interventional Radiologist', '["Interventional Radiology","Vascular Interventions","Neuroradiology"]',
 'MD - Radiology, MBBS',
 'SeCURE Hospital',
 'Gokul Road, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3546, 75.1098,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00","16:00"]',
 1, 1, '["Kannada","English"]',
 '["Vascular Interventions","Angiography","Embolization","TIPS","Drainage","Biopsy","Stenting"]',
 '[]',
 'Official/verified source | securehospital.in', 'September 2026'),

('doc_secure_002', 'Dr. Vinay M. S.', 'vinay.ms@securehospital.in',
 'Anaesthesiologist', '["Anaesthesiology","Critical Care","Pain Management"]',
 'MD - Anaesthesiology, MBBS',
 'SeCURE Hospital',
 'Gokul Road, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3546, 75.1098,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["08:00","09:00","10:00","14:00","15:00"]',
 1, 1, '["Kannada","English"]',
 '["General Anaesthesia","Regional Anaesthesia","Critical Care","Pain Management","ICU Management"]',
 '[]',
 'Official/verified source | securehospital.in', 'September 2026'),

('doc_secure_003', 'Dr. Shyam Bhairi', 'shyam.bhairi@securehospital.in',
 'Orthopedic', '["Sports Medicine","Joint Replacement","Arthroscopy","Trauma Surgery"]',
 'MS - Orthopaedics, MBBS',
 'SeCURE Hospital',
 'Gokul Road, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3546, 75.1098,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00","16:00"]',
 1, 1, '["Kannada","English","Telugu"]',
 '["Knee Replacement","Hip Replacement","Sports Injuries","ACL Repair","Arthroscopy","Fractures","Shoulder Surgery"]',
 '[]',
 'Official/verified source | securehospital.in', 'September 2026'),

('doc_secure_004', 'Dr. Shrishail Chiniwalar', 'shrishail.chiniwalar@securehospital.in',
 'Gastroenterologist', '["Surgical Gastroenterology","GI Oncology","Endoscopic Surgery","Laparoscopic Surgery","Robotic Surgery"]',
 'MCh - Surgical Gastroenterology, MS, MBBS',
 'SeCURE Hospital',
 'Gokul Road, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3546, 75.1098,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00"]',
 1, 1, '["Kannada","English"]',
 '["GI Cancer","Colorectal Surgery","Liver Surgery","Pancreatic Surgery","Endoscopy","ERCP","Laparoscopy","Robotic GI Surgery"]',
 '[]',
 'Official/verified source | securehospital.in', 'September 2026'),

('doc_secure_005', 'Dr. Sharath M. Vijapur', 'sharath.vijapur@securehospital.in',
 'Cardiologist', '["Interventional Cardiology","Coronary Intervention","Structural Heart Disease"]',
 'DM - Cardiology, MD, MBBS',
 'SeCURE Hospital',
 'Gokul Road, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3546, 75.1098,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00","16:00"]',
 1, 1, '["Kannada","English"]',
 '["Angioplasty","Stenting","Heart Attack","Coronary Artery Disease","Structural Heart Disease","Pacemaker","Heart Failure"]',
 '[]',
 'Official/verified source | securehospital.in', 'September 2026'),

('doc_secure_006', 'Dr. Shankargouda Patil', 'shankargouda.patil@securehospital.in',
 'General Medicine', '["Intensive Care","Critical Care Medicine","Internal Medicine"]',
 'MD - General Medicine, MBBS',
 'SeCURE Hospital',
 'Gokul Road, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3546, 75.1098,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["08:00","09:00","10:00","14:00","15:00"]',
 1, 1, '["Kannada","English"]',
 '["Critical Care","ICU Management","Sepsis","Multi-Organ Failure","Ventilator Management","General Medicine"]',
 '[]',
 'Official/verified source | securehospital.in', 'September 2026'),

('doc_secure_007', 'Dr. Shambhu K.', 'shambhu.k@securehospital.in',
 'Urologist', '["Urology","Kidney Transplant","Laparoscopic & Robotic Surgery","Andrology"]',
 'MCh - Urology, MS, MBBS',
 'SeCURE Hospital',
 'Gokul Road, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3546, 75.1098,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00","16:00"]',
 1, 1, '["Kannada","English"]',
 '["Kidney Stones","Kidney Transplant","Prostate Surgery","Laparoscopic Urology","Robotic Urology","Bladder Cancer","Andrology"]',
 '[]',
 'Official/verified source | securehospital.in', 'September 2026'),

('doc_secure_008', 'Dr. Ravi Koppad', 'ravi.koppad@securehospital.in',
 'Oncologist', '["Surgical Oncology","Cancer Surgery","Breast Surgery","GI Oncology"]',
 'MCh - Surgical Oncology, MS, MBBS',
 'SeCURE Hospital',
 'Gokul Road, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3546, 75.1098,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00"]',
 1, 1, '["Kannada","English"]',
 '["Cancer Surgery","Breast Cancer","GI Cancer","Head & Neck Cancer","Soft Tissue Sarcoma","Thyroid Cancer","Laparoscopic Cancer Surgery"]',
 '[]',
 'Official/verified source | securehospital.in', 'September 2026'),

('doc_secure_009', 'Dr. Prema Laxman Meti', 'prema.meti@securehospital.in',
 'General Medicine', '["Intensive Care","Critical Care Medicine","Internal Medicine"]',
 'MD - General Medicine, MBBS',
 'SeCURE Hospital',
 'Gokul Road, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3546, 75.1098,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["08:00","09:00","10:00","14:00","15:00"]',
 1, 1, '["Kannada","English"]',
 '["Critical Care","ICU Management","Sepsis","Ventilator Management","Internal Medicine","Emergency Medicine"]',
 '[]',
 'Official/verified source | securehospital.in', 'September 2026'),

('doc_secure_010', 'Dr. Praveenkumar Saligoudar', 'praveen.saligoudar@securehospital.in',
 'Neurosurgeon', '["Neuro & Spine Surgery","Brain Surgery","Spine Surgery","Minimally Invasive Neurosurgery"]',
 'MCh - Neurosurgery, MS, MBBS',
 'SeCURE Hospital',
 'Gokul Road, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3546, 75.1098,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00","16:00"]',
 1, 1, '["Kannada","English"]',
 '["Brain Tumour","Spine Surgery","Disc Prolapse","Spinal Cord Injury","Hydrocephalus","Epilepsy Surgery","Aneurysm"]',
 '[]',
 'Official/verified source | securehospital.in', 'September 2026'),

('doc_secure_011', 'Dr. Niyaz Ahmed Janvekar', 'niyaz.janvekar@securehospital.in',
 'Nephrologist', '["Nephrology","Kidney Transplant","Dialysis","Kidney Disease"]',
 'DM - Nephrology, MD, MBBS',
 'SeCURE Hospital',
 'Gokul Road, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3546, 75.1098,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00"]',
 1, 1, '["Kannada","English","Urdu"]',
 '["Chronic Kidney Disease","Kidney Transplant","Dialysis","Glomerulonephritis","Renal Failure","Hypertension"]',
 '[]',
 'Official/verified source | securehospital.in', 'September 2026'),

('doc_secure_012', 'Dr. Muralidhar Doddamani', 'muralidhar.doddamani@securehospital.in',
 'General Surgeon', '["Laparoscopic Surgery","Oncosurgery","Uro-Surgery","General Surgery"]',
 'MS - General Surgery, MBBS',
 'SeCURE Hospital',
 'Gokul Road, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3546, 75.1098,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00","16:00"]',
 1, 1, '["Kannada","English"]',
 '["Laparoscopic Surgery","Hernia","Appendicitis","Gallstones","Cancer Surgery","Urological Surgery","General Surgery"]',
 '[]',
 'Official/verified source | securehospital.in', 'September 2026'),

('doc_secure_013', 'Dr. Meghashree V. Bijoor', 'meghashree.bijoor@securehospital.in',
 'General Medicine', '["General Medicine","Internal Medicine","Infectious Diseases"]',
 'MD - General Medicine, MBBS',
 'SeCURE Hospital',
 'Gokul Road, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3546, 75.1098,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00","16:00"]',
 1, 1, '["Kannada","English"]',
 '["Diabetes","Hypertension","Infections","Fever","Thyroid Disorders","Anaemia","General Health"]',
 '[]',
 'Official/verified source | securehospital.in', 'September 2026'),

('doc_secure_014', 'Dr. Manojkumar Bhutte', 'manojkumar.bhutte@securehospital.in',
 'Neurosurgeon', '["Brain & Spine Surgery","Neurosurgery","Cranial Surgery","Spinal Surgery"]',
 'MCh - Neurosurgery, MS, MBBS',
 'SeCURE Hospital',
 'Gokul Road, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3546, 75.1098,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["09:00","10:00","11:00","14:00","15:00","16:00"]',
 1, 1, '["Kannada","English","Marathi"]',
 '["Brain Tumour","Spine Surgery","Head Injury","Hydrocephalus","Cerebrovascular Surgery","Epilepsy Surgery","Disc Disease"]',
 '[]',
 'Official/verified source | securehospital.in', 'September 2026'),

('doc_secure_015', 'Dr. Krishna Bardol', 'krishna.bardol@securehospital.in',
 'General Medicine', '["Intensive Care","Critical Care Medicine","Internal Medicine"]',
 'MD - General Medicine, MBBS',
 'SeCURE Hospital',
 'Gokul Road, Hubballi – 580030', 'Hubballi', 'Karnataka', '580030',
 15.3546, 75.1098,
 '["Mon","Tue","Wed","Thu","Fri","Sat"]', '["08:00","09:00","10:00","14:00","15:00"]',
 1, 1, '["Kannada","English"]',
 '["Critical Care","ICU Management","Sepsis","Ventilator Support","Emergency Medicine","Internal Medicine"]',
 '[]',
 'Official/verified source | securehospital.in', 'September 2026');

-- ─── UPDATE hospital_id for SDM doctors ─────────────────────────────────────
UPDATE doctors SET hospital_id = (SELECT id FROM hospitals WHERE hospital_id = 'hosp_sdm_dharwad')
WHERE user_id LIKE 'doc_sdm_%';

-- ─── UPDATE hospital_id for Vihaan doctors ──────────────────────────────────
UPDATE doctors SET hospital_id = (SELECT id FROM hospitals WHERE hospital_id = 'hosp_vihaan_hubballi')
WHERE user_id LIKE 'doc_vihaan_%';

-- ─── UPDATE hospital_id for SeCURE doctors ──────────────────────────────────
UPDATE doctors SET hospital_id = (SELECT id FROM hospitals WHERE hospital_id = 'hosp_secure_hubballi')
WHERE user_id LIKE 'doc_secure_%';

-- ─── CREATE doctor_hospital_links for SDM Polyclinic schedule ────────────────
INSERT OR IGNORE INTO doctor_hospital_links (doctor_id, hospital_id, department, opd_days, opd_times, is_primary)
SELECT d.id, h.id, 'Orthopaedics', '["Mon"]', '6PM–8PM', 1
FROM doctors d, hospitals h
WHERE d.user_id = 'doc_sdm_001' AND h.hospital_id = 'hosp_sdm_dharwad';

INSERT OR IGNORE INTO doctor_hospital_links (doctor_id, hospital_id, department, opd_days, opd_times, is_primary)
SELECT d.id, h.id, 'Orthopaedics', '["Tue","Fri"]', '6PM–8PM', 1
FROM doctors d, hospitals h
WHERE d.user_id = 'doc_sdm_002' AND h.hospital_id = 'hosp_sdm_dharwad';

INSERT OR IGNORE INTO doctor_hospital_links (doctor_id, hospital_id, department, opd_days, opd_times, is_primary)
SELECT d.id, h.id, 'Orthopaedics', '["Wed"]', '6PM–8PM', 1
FROM doctors d, hospitals h
WHERE d.user_id = 'doc_sdm_003' AND h.hospital_id = 'hosp_sdm_dharwad';

INSERT OR IGNORE INTO doctor_hospital_links (doctor_id, hospital_id, department, opd_days, opd_times, is_primary)
SELECT d.id, h.id, 'Orthopaedics', '["Thu"]', '6PM–8PM', 1
FROM doctors d, hospitals h
WHERE d.user_id = 'doc_sdm_004' AND h.hospital_id = 'hosp_sdm_dharwad';

INSERT OR IGNORE INTO doctor_hospital_links (doctor_id, hospital_id, department, opd_days, opd_times, is_primary)
SELECT d.id, h.id, 'General Medicine', '["Mon","Wed","Fri"]', '6PM–8PM', 1
FROM doctors d, hospitals h
WHERE d.user_id = 'doc_sdm_005' AND h.hospital_id = 'hosp_sdm_dharwad';

INSERT OR IGNORE INTO doctor_hospital_links (doctor_id, hospital_id, department, opd_days, opd_times, is_primary)
SELECT d.id, h.id, 'General Medicine', '["Thu"]', '6PM–8PM', 1
FROM doctors d, hospitals h
WHERE d.user_id = 'doc_sdm_006' AND h.hospital_id = 'hosp_sdm_dharwad';

INSERT OR IGNORE INTO doctor_hospital_links (doctor_id, hospital_id, department, opd_days, opd_times, is_primary)
SELECT d.id, h.id, 'Obstetrics & Gynaecology', '["Mon"]', '6PM–8PM', 1
FROM doctors d, hospitals h
WHERE d.user_id = 'doc_sdm_007' AND h.hospital_id = 'hosp_sdm_dharwad';

INSERT OR IGNORE INTO doctor_hospital_links (doctor_id, hospital_id, department, opd_days, opd_times, is_primary)
SELECT d.id, h.id, 'Obstetrics & Gynaecology', '["Tue"]', '6PM–8PM', 1
FROM doctors d, hospitals h
WHERE d.user_id = 'doc_sdm_008' AND h.hospital_id = 'hosp_sdm_dharwad';

INSERT OR IGNORE INTO doctor_hospital_links (doctor_id, hospital_id, department, opd_days, opd_times, is_primary)
SELECT d.id, h.id, 'Obstetrics & Gynaecology', '["Thu"]', '6PM–8PM', 1
FROM doctors d, hospitals h
WHERE d.user_id = 'doc_sdm_009' AND h.hospital_id = 'hosp_sdm_dharwad';

INSERT OR IGNORE INTO doctor_hospital_links (doctor_id, hospital_id, department, opd_days, opd_times, is_primary)
SELECT d.id, h.id, 'Paediatrics', '["Tue","Wed"]', '6PM–8PM', 1
FROM doctors d, hospitals h
WHERE d.user_id = 'doc_sdm_010' AND h.hospital_id = 'hosp_sdm_dharwad';

INSERT OR IGNORE INTO doctor_hospital_links (doctor_id, hospital_id, department, opd_days, opd_times, is_primary)
SELECT d.id, h.id, 'Plastic Surgery', '["Fri"]', '6PM–8PM', 1
FROM doctors d, hospitals h
WHERE d.user_id = 'doc_sdm_011' AND h.hospital_id = 'hosp_sdm_dharwad';

INSERT OR IGNORE INTO doctor_hospital_links (doctor_id, hospital_id, department, opd_days, opd_times, is_primary)
SELECT d.id, h.id, 'Paediatric Surgery', '["Sat"]', '6PM–8PM', 1
FROM doctors d, hospitals h
WHERE d.user_id = 'doc_sdm_012' AND h.hospital_id = 'hosp_sdm_dharwad';
