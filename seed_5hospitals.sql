-- Replace all hospital and doctor data with 5 verified HD hospitals + 25 doctors
-- Step 1: Clear existing data (junction table first due to FK)
DELETE FROM doctor_hospital_links;
DELETE FROM doctors;
DELETE FROM hospitals;

-- ═══════════════════════════════════════════════════════════════════
-- HOSPITALS (5)
-- ═══════════════════════════════════════════════════════════════════

-- 1. SeCURE Hospital, Hubballi
INSERT INTO hospitals (
  id, hospital_id, name, short_name, type, category, city, area, address, pincode,
  phone, website, google_maps_url,
  emergency, icu_available, blood_bank, ambulance, pharmacy, lab,
  specialties, departments, facilities,
  bed_count, opd_timings, rating, total_ratings,
  accreditation, description, is_active, is_verified, source, last_verified
) VALUES (
  1, 'HOS-001', 'SeCURE Hospital', 'SeCURE', 'Multi-Speciality Hospital', 'Private',
  'Hubballi', 'Vidyanagar', 'Vidyanagar, Hubballi, Karnataka 580031', '580031',
  '0836 425 2020', NULL,
  'https://maps.google.com/?q=SeCURE+Hospital+Hubballi',
  1, 1, 1, 1, 1, 1,
  '["Interventional Cardiology","Neuro & Spine Surgery","Surgical Oncology","Nephrology","Sports Medicine","Joint Replacement","General Surgery","Critical Care"]',
  '["Cardiology","Neurosurgery","Oncology","Nephrology","Orthopaedics","ICU","Emergency"]',
  '["24/7 Emergency","ICU","Blood Bank","Ambulance","Pharmacy","Laboratory","OPD","Operation Theatre"]',
  200, 'Mon–Sat: 9:00 AM – 6:00 PM', 4.8, 320,
  NULL,
  'SeCURE Hospital, Hubballi is a leading multi-speciality hospital offering advanced cardiac, neurosurgical, oncological and nephrology care with state-of-the-art infrastructure.',
  1, 1, 'Official/Verified', 'September 2026'
);

-- 2. HCG Suchirayu Hospital, Hubballi
INSERT INTO hospitals (
  id, hospital_id, name, short_name, type, category, city, area, address, pincode,
  phone, website, google_maps_url,
  emergency, icu_available, blood_bank, ambulance, pharmacy, lab,
  specialties, departments, facilities,
  bed_count, opd_timings, rating, total_ratings,
  accreditation, description, is_active, is_verified, source, last_verified
) VALUES (
  2, 'HOS-002', 'HCG Suchirayu Hospital', 'HCG Suchirayu', 'Multi-Speciality Hospital', 'Private',
  'Hubballi', 'Navanagar', 'Navanagar, Hubballi, Karnataka 580025', '580025',
  '080 4293 0913', 'https://www.hcgoncology.com',
  'https://maps.google.com/?q=HCG+Suchirayu+Hospital+Hubballi',
  1, 1, 1, 1, 1, 1,
  '["Interventional Cardiology","Neurology","Orthopaedic Surgery","Medical Gastroenterology","Obstetrics & Gynaecology","Oncology","Internal Medicine","Radiology"]',
  '["Cardiology","Neurology","Orthopaedics","Gastroenterology","OBG","Oncology","ICU","Emergency"]',
  '["24/7 Emergency","ICU","Blood Bank","Ambulance","Pharmacy","Laboratory","Radiology","OPD"]',
  350, 'Mon–Sat: 8:00 AM – 8:00 PM', 4.4, 215,
  'NABH',
  'HCG Suchirayu Hospital, Hubballi is a NABH-accredited multi-speciality hospital offering comprehensive care including interventional cardiology, neurology, gastroenterology and women''s health.',
  1, 1, 'Official/Verified', 'September 2026'
);

-- 3. SDM College of Medical Sciences & Hospital, Dharwad
INSERT INTO hospitals (
  id, hospital_id, name, short_name, type, category, city, area, address, pincode,
  phone, website, google_maps_url,
  emergency, icu_available, blood_bank, ambulance, pharmacy, lab,
  specialties, departments, facilities,
  bed_count, opd_timings, rating, total_ratings,
  accreditation, description, is_active, is_verified, source, last_verified
) VALUES (
  3, 'HOS-003', 'SDM College of Medical Sciences & Hospital', 'SDM Hospital', 'Teaching Hospital', 'Government-Aided',
  'Dharwad', 'Sattur', 'Manjushree Nagar, Sattur, Dharwad, Karnataka 580009', '580009',
  '0836 247 8600', 'https://www.sdmcms.edu.in',
  'https://maps.google.com/?q=SDM+College+of+Medical+Sciences+Dharwad',
  1, 1, 1, 1, 1, 1,
  '["General Medicine","Orthopaedics","Obstetrics & Gynaecology","Paediatrics","ENT","Surgery","Psychiatry","Radiology"]',
  '["General Medicine","Orthopaedics","OBG","Paediatrics","ENT","Surgery","Psychiatry","Ophthalmology","ICU","Emergency"]',
  '["24/7 Emergency","ICU","Blood Bank","Ambulance","Pharmacy","Laboratory","Teaching Hospital","OPD","Operation Theatre"]',
  900, 'Mon–Sat: 8:00 AM – 4:00 PM (OPD); 24/7 Emergency', 4.1, 180,
  'MCI Approved',
  'SDM College of Medical Sciences & Hospital, Dharwad is a premier teaching hospital affiliated to Rajiv Gandhi University of Health Sciences, offering comprehensive care across all major specialties.',
  1, 1, 'Official/Verified', 'September 2026'
);

-- 4. Vivekanand General Hospital, Hubballi
INSERT INTO hospitals (
  id, hospital_id, name, short_name, type, category, city, area, address, pincode,
  phone, website, google_maps_url,
  emergency, icu_available, blood_bank, ambulance, pharmacy, lab,
  specialties, departments, facilities,
  bed_count, opd_timings, rating, total_ratings,
  accreditation, description, is_active, is_verified, source, last_verified
) VALUES (
  4, 'HOS-004', 'Vivekanand General Hospital', 'Vivekanand Hospital', 'General Hospital', 'Private',
  'Hubballi', 'Deshpande Nagar', 'Deshpande Nagar, Hubballi, Karnataka 580029', '580029',
  '0836 225 1003', NULL,
  'https://maps.google.com/?q=Vivekanand+General+Hospital+Hubballi',
  1, 1, 0, 1, 1, 1,
  '["General Medicine","Diabetology","Obstetrics & Gynaecology","Neurology","Interventional Cardiology","ENT","Internal Medicine"]',
  '["General Medicine","OBG","Neurology","Cardiology","ENT","ICU","Emergency"]',
  '["24/7 Emergency","ICU","Ambulance","Pharmacy","Laboratory","OPD","Operation Theatre"]',
  150, 'Mon–Sat: 9:00 AM – 6:00 PM', 4.2, 142,
  NULL,
  'Vivekanand General Hospital, Hubballi offers trusted healthcare in general medicine, diabetology, neurology, cardiology and women''s health, serving the Hubballi–Dharwad region for decades.',
  1, 1, 'Official/Verified', 'September 2026'
);

-- 5. KLE Hospital & Medical Research Centre, Hubballi
INSERT INTO hospitals (
  id, hospital_id, name, short_name, type, category, city, area, address, pincode,
  phone, website, google_maps_url,
  emergency, icu_available, blood_bank, ambulance, pharmacy, lab,
  specialties, departments, facilities,
  bed_count, opd_timings, rating, total_ratings,
  accreditation, description, is_active, is_verified, source, last_verified
) VALUES (
  5, 'HOS-005', 'KLE Hospital & Medical Research Centre', 'KLE Hospital', 'Teaching Hospital', 'Private-Aided',
  'Hubballi', 'Nehru Nagar', 'JNMC Campus, Nehru Nagar, Hubballi, Karnataka 580028', '580028',
  '0836 200 7777', 'https://www.kledeemeduniversity.edu.in',
  'https://maps.google.com/?q=KLE+Hospital+Hubballi',
  1, 1, 1, 1, 1, 1,
  '["General Medicine","Psychiatry","Respiratory Medicine","Ophthalmology","Obstetrics & Gynaecology","Surgery","Paediatrics","Radiology"]',
  '["General Medicine","Psychiatry","Pulmonology","Ophthalmology","OBG","Surgery","Paediatrics","ICU","Emergency"]',
  '["24/7 Emergency","ICU","Blood Bank","Ambulance","Pharmacy","Laboratory","Teaching Hospital","OPD","Operation Theatre","Research Centre"]',
  1400, 'Mon–Sat: 8:00 AM – 5:00 PM (OPD); 24/7 Emergency', 3.6, 290,
  'MCI/NMC Approved',
  'KLE Hospital & Medical Research Centre, affiliated to KLE Academy of Higher Education, is one of the largest hospitals in North Karnataka offering comprehensive tertiary care and research.',
  1, 1, 'Official/Verified', 'September 2026'
);

-- ═══════════════════════════════════════════════════════════════════
-- DOCTORS (25) — 5 per hospital
-- user_id and email are UNIQUE NOT NULL — using deterministic fake values
-- ═══════════════════════════════════════════════════════════════════

-- ─── SeCURE Hospital (hospital_id = 1) ─────────────────────────────

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  1, 'doc-001', 'Dr. Sharath M Vijapur', 'sharath.vijapur@secure.hosp', 'Cardiologist', 'MD (Medicine), DM (Interventional Cardiology)', 14,
  'SeCURE Hospital', 1, 'Hubballi', 'Karnataka',
  '["Heart attack","Coronary artery disease","Angioplasty","Stenting","Arrhythmia","Heart failure","Interventional cardiology"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 700, 4.8, 95, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  2, 'doc-002', 'Dr. Praveenkumar Saligoudar', 'praveenkumar.saligoudar@secure.hosp', 'Neurosurgeon', 'MS (General Surgery), MCh (Neurosurgery)', 12,
  'SeCURE Hospital', 1, 'Hubballi', 'Karnataka',
  '["Brain tumor","Spinal disc herniation","Cervical spondylosis","Lumbar spondylosis","Stroke surgery","Spine fracture","Neurovascular conditions"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 800, 4.7, 78, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  3, 'doc-003', 'Dr. Ravi Koppad', 'ravi.koppad@secure.hosp', 'Oncologist', 'MS (General Surgery), MCh (Surgical Oncology)', 15,
  'SeCURE Hospital', 1, 'Hubballi', 'Karnataka',
  '["Breast cancer","Colon cancer","Stomach cancer","Thyroid cancer","Liver cancer","Surgical oncology","Cancer staging"]',
  '["Mon","Tue","Wed","Thu","Fri"]', 900, 4.9, 110, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  4, 'doc-004', 'Dr. Niyaz Ahmed Janvekar', 'niyaz.janvekar@secure.hosp', 'Nephrologist', 'MD (Medicine), DM (Nephrology)', 11,
  'SeCURE Hospital', 1, 'Hubballi', 'Karnataka',
  '["Chronic kidney disease","Dialysis","Kidney failure","Nephrotic syndrome","Glomerulonephritis","Hypertensive nephropathy","Renal transplantation"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 750, 4.6, 62, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  5, 'doc-005', 'Dr. Shyam Bhairi', 'shyam.bhairi@secure.hosp', 'Orthopaedic', 'MS (Orthopaedics), Fellowship (Sports Medicine & Joint Replacement)', 13,
  'SeCURE Hospital', 1, 'Hubballi', 'Karnataka',
  '["Sports injury","Knee replacement","Hip replacement","ACL tear","Ligament reconstruction","Shoulder surgery","Arthroscopy"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 700, 4.7, 84, 1, 1, 'Official/Verified', 'September 2026'
);

-- ─── HCG Suchirayu Hospital (hospital_id = 2) ──────────────────────

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  6, 'doc-006', 'Prof. Dr. Narendra Hiregoudar', 'narendra.hiregoudar@hcg.hosp', 'Cardiologist', 'MD (Medicine), DM (Cardiology), Professor of Cardiology', 25,
  'HCG Suchirayu Hospital', 2, 'Hubballi', 'Karnataka',
  '["Coronary artery disease","Heart failure","Angioplasty","Cardiac electrophysiology","Valvular heart disease","Hypertension","Dyslipidaemia"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 1000, 4.9, 185, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  7, 'doc-007', 'Dr. Rajendra I. Dugani', 'rajendra.dugani@hcg.hosp', 'Neurologist', 'MD (Medicine), DM (Neurology)', 16,
  'HCG Suchirayu Hospital', 2, 'Hubballi', 'Karnataka',
  '["Epilepsy","Stroke","Migraine","Parkinson disease","Multiple sclerosis","Neuropathy","Dementia","Headache"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 800, 4.7, 132, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  8, 'doc-008', 'Dr. Suresh Korlhalli', 'suresh.korlhalli@hcg.hosp', 'Orthopaedic', 'MS (Orthopaedics)', 18,
  'HCG Suchirayu Hospital', 2, 'Hubballi', 'Karnataka',
  '["Fractures","Joint replacement","Spine surgery","Bone infection","Deformity correction","Trauma surgery","Arthroplasty"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 700, 4.6, 98, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  9, 'doc-009', 'Dr. Sanjeev Chatni', 'sanjeev.chatni@hcg.hosp', 'Gastroenterologist', 'MD (Medicine), DM (Gastroenterology)', 14,
  'HCG Suchirayu Hospital', 2, 'Hubballi', 'Karnataka',
  '["GERD","Irritable bowel syndrome","Liver cirrhosis","Hepatitis","Colonoscopy","Endoscopy","Pancreatitis","Peptic ulcer"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 800, 4.8, 117, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  10, 'doc-010', 'Dr. Rashmi Hiremath', 'rashmi.hiremath@hcg.hosp', 'Gynecologist', 'MS (Obstetrics & Gynaecology)', 12,
  'HCG Suchirayu Hospital', 2, 'Hubballi', 'Karnataka',
  '["High-risk pregnancy","Normal delivery","Caesarean section","PCOD","Endometriosis","Uterine fibroids","Infertility","Menopause"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 650, 4.7, 143, 1, 1, 'Official/Verified', 'September 2026'
);

-- ─── SDM Hospital, Dharwad (hospital_id = 3) ───────────────────────

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  11, 'doc-011', 'Dr. Kiran Aithal', 'kiran.aithal@sdm.hosp', 'General Medicine', 'MD (General Medicine)', 18,
  'SDM College of Medical Sciences & Hospital', 3, 'Dharwad', 'Karnataka',
  '["Fever","Diabetes","Hypertension","Thyroid disorders","Anaemia","Respiratory infections","General health issues","Geriatric care"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 400, 4.5, 210, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  12, 'doc-012', 'Dr. Santosh S Jeevannavar', 'santosh.jeevannavar@sdm.hosp', 'Orthopaedic', 'MS (Orthopaedics)', 14,
  'SDM College of Medical Sciences & Hospital', 3, 'Dharwad', 'Karnataka',
  '["Bone fractures","Arthritis","Scoliosis","Sports injuries","Knee pain","Hip disorders","Paediatric orthopaedics"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 400, 4.4, 98, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  13, 'doc-013', 'Dr. Sunilkumar K.S.', 'sunilkumar.ks@sdm.hosp', 'Gynecologist', 'MS (Obstetrics & Gynaecology)', 16,
  'SDM College of Medical Sciences & Hospital', 3, 'Dharwad', 'Karnataka',
  '["Prenatal care","Normal & complicated deliveries","Gynaecological surgeries","PCOD","Cervical cancer screening","Infertility evaluation"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 400, 4.6, 124, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  14, 'doc-014', 'Dr. Vijay K Kulkarni', 'vijay.kulkarni@sdm.hosp', 'Pediatrician', 'MD (Paediatrics)', 20,
  'SDM College of Medical Sciences & Hospital', 3, 'Dharwad', 'Karnataka',
  '["Newborn care","Childhood fever","Growth disorders","Malnutrition","Asthma in children","Vaccination","Paediatric infections"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 400, 4.7, 175, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  15, 'doc-015', 'Dr. Raghunath Shanbag', 'raghunath.shanbag@sdm.hosp', 'ENT', 'MS (ENT)', 17,
  'SDM College of Medical Sciences & Hospital', 3, 'Dharwad', 'Karnataka',
  '["Hearing loss","Tonsillitis","Sinusitis","Nasal polyps","Thyroid swelling","Ear infections","Vertigo","Adenoids"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 400, 4.5, 88, 1, 1, 'Official/Verified', 'September 2026'
);

-- ─── Vivekanand General Hospital (hospital_id = 4) ─────────────────

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  16, 'doc-016', 'Dr. G. B. Sattur', 'gb.sattur@vivekanand.hosp', 'General Medicine', 'MD (General Medicine), Diabetology', 22,
  'Vivekanand General Hospital', 4, 'Hubballi', 'Karnataka',
  '["Diabetes type 1 & 2","Metabolic syndrome","Hypertension","Thyroid disease","Obesity","General medicine","Geriatric care"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 500, 4.5, 168, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  17, 'doc-017', 'Dr. Sunitha Tankasali', 'sunitha.tankasali@vivekanand.hosp', 'Gynecologist', 'MS (Obstetrics & Gynaecology)', 15,
  'Vivekanand General Hospital', 4, 'Hubballi', 'Karnataka',
  '["Normal delivery","Caesarean section","PCOD","Uterine fibroids","Infertility","Laparoscopic surgery","Antenatal care"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 500, 4.6, 131, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  18, 'doc-018', 'Dr. Datta Nadgir', 'datta.nadgir@vivekanand.hosp', 'Neurologist', 'MD (Medicine), DM (Neurology)', 13,
  'Vivekanand General Hospital', 4, 'Hubballi', 'Karnataka',
  '["Stroke","Epilepsy","Headache","Dementia","Neuropathy","Parkinson disease","Multiple sclerosis","Brain infections"]',
  '["Mon","Tue","Wed","Thu","Fri"]', 600, 4.4, 76, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  19, 'doc-019', 'Dr. Ameet Sattur', 'ameet.sattur@vivekanand.hosp', 'Cardiologist', 'MD (Medicine), DM (Interventional Cardiology)', 14,
  'Vivekanand General Hospital', 4, 'Hubballi', 'Karnataka',
  '["Coronary artery disease","Angioplasty","Stenting","Hypertension","Heart failure","Arrhythmia","Echocardiography"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 700, 4.7, 102, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  20, 'doc-020', 'Dr. Suhas Desai', 'suhas.desai@vivekanand.hosp', 'ENT', 'MS (ENT), Fellowship (Head & Neck Surgery)', 16,
  'Vivekanand General Hospital', 4, 'Hubballi', 'Karnataka',
  '["Ear infections","Sinusitis","Tonsillitis","Hearing loss","Vertigo","Nasal obstruction","Thyroid nodules","Snoring & sleep apnoea"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 500, 4.5, 89, 1, 1, 'Official/Verified', 'September 2026'
);

-- ─── KLE Hospital (hospital_id = 5) ────────────────────────────────

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  21, 'doc-021', 'Dr. Pooja Naik', 'pooja.naik@kle.hosp', 'General Medicine', 'MD (General Medicine)', 10,
  'KLE Hospital & Medical Research Centre', 5, 'Hubballi', 'Karnataka',
  '["Fever","Infections","Diabetes","Hypertension","Anaemia","Respiratory illness","General health checkup","Lifestyle diseases"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 350, 4.3, 145, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  22, 'doc-022', 'Dr. Arun V Gadad', 'arun.gadad@kle.hosp', 'Psychiatrist', 'MD (Psychiatry)', 12,
  'KLE Hospital & Medical Research Centre', 5, 'Hubballi', 'Karnataka',
  '["Depression","Anxiety disorders","Schizophrenia","Bipolar disorder","OCD","PTSD","Addiction","Child psychiatry","Sleep disorders"]',
  '["Mon","Tue","Wed","Thu","Fri"]', 500, 4.4, 93, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  23, 'doc-023', 'Dr. Shrikant Hiremath', 'shrikant.hiremath@kle.hosp', 'Pulmonologist', 'MD (Respiratory Medicine), DNB (Pulmonology)', 14,
  'KLE Hospital & Medical Research Centre', 5, 'Hubballi', 'Karnataka',
  '["Asthma","COPD","Tuberculosis","Pneumonia","Sleep apnoea","Lung cancer","Interstitial lung disease","Bronchitis"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 500, 4.5, 107, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  24, 'doc-024', 'Dr. Lakshmi B R', 'lakshmi.br@kle.hosp', 'Ophthalmologist', 'MS (Ophthalmology)', 11,
  'KLE Hospital & Medical Research Centre', 5, 'Hubballi', 'Karnataka',
  '["Cataract","Glaucoma","Diabetic retinopathy","Corneal diseases","Squint","Retinal diseases","Dry eye","Refractive errors"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 450, 4.4, 86, 1, 1, 'Official/Verified', 'September 2026'
);

INSERT INTO doctors (id, user_id, name, email, specialization, qualification, experience_years, hospital_name, hospital_id, city, state,
  diseases_treated, available_days, consultation_fee, rating, total_ratings, is_verified, is_active, source, last_verified)
VALUES (
  25, 'doc-025', 'Dr. Swetha R Vernekar', 'swetha.vernekar@kle.hosp', 'Gynecologist', 'MS (Obstetrics & Gynaecology)', 9,
  'KLE Hospital & Medical Research Centre', 5, 'Hubballi', 'Karnataka',
  '["High-risk pregnancy","Normal delivery","Caesarean section","PCOD","Endometriosis","Uterine fibroids","Infertility","Adolescent gynaecology"]',
  '["Mon","Tue","Wed","Thu","Fri","Sat"]', 450, 4.3, 119, 1, 1, 'Official/Verified', 'September 2026'
);

-- ═══════════════════════════════════════════════════════════════════
-- DOCTOR-HOSPITAL LINKS (junction table)
-- Note: column is opd_times (not opd_timings)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO doctor_hospital_links (doctor_id, hospital_id, is_primary, opd_days, opd_times) VALUES
(1,  1, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 10:00 AM – 2:00 PM'),
(2,  1, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 10:00 AM – 1:00 PM'),
(3,  1, 1, '["Mon","Tue","Wed","Thu","Fri"]',       'Mon–Fri: 11:00 AM – 2:00 PM'),
(4,  1, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 9:00 AM – 1:00 PM'),
(5,  1, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 9:00 AM – 1:00 PM'),
(6,  2, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 10:00 AM – 2:00 PM'),
(7,  2, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 9:00 AM – 1:00 PM'),
(8,  2, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 10:00 AM – 1:00 PM'),
(9,  2, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 9:30 AM – 1:30 PM'),
(10, 2, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 9:00 AM – 1:00 PM'),
(11, 3, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 9:00 AM – 12:00 PM'),
(12, 3, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 9:00 AM – 12:00 PM'),
(13, 3, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 9:00 AM – 12:00 PM'),
(14, 3, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 9:00 AM – 12:00 PM'),
(15, 3, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 9:00 AM – 12:00 PM'),
(16, 4, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 10:00 AM – 1:00 PM'),
(17, 4, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 10:00 AM – 1:00 PM'),
(18, 4, 1, '["Mon","Tue","Wed","Thu","Fri"]',       'Mon–Fri: 11:00 AM – 2:00 PM'),
(19, 4, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 10:00 AM – 1:00 PM'),
(20, 4, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 10:00 AM – 1:00 PM'),
(21, 5, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 8:30 AM – 12:00 PM'),
(22, 5, 1, '["Mon","Tue","Wed","Thu","Fri"]',       'Mon–Fri: 10:00 AM – 1:00 PM'),
(23, 5, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 9:00 AM – 12:00 PM'),
(24, 5, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 9:00 AM – 12:00 PM'),
(25, 5, 1, '["Mon","Tue","Wed","Thu","Fri","Sat"]', 'Mon–Sat: 9:00 AM – 12:00 PM');
