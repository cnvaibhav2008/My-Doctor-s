import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Session-Token']
}))

// ─── UTILITY FUNCTIONS ───────────────────────────────────────────────────────
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function hashPassword(password: string): string {
  // Simple hash for demo - in production use proper bcrypt
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0') + password.length.toString(16)
}

// ─── AI SYMPTOM ENGINE ────────────────────────────────────────────────────────
const DISEASE_SYMPTOM_MAP: Record<string, {
  symptoms: string[], specialization: string, description: string, urgency: string, bodyPart?: string
}> = {
  "Myocardial Infarction (Heart Attack)": {
    symptoms: ["chest pain", "chest tightness", "shortness of breath", "arm pain", "jaw pain", "sweating", "nausea", "dizziness"],
    specialization: "Cardiologist", description: "Blockage of blood flow to the heart muscle", urgency: "emergency", bodyPart: "chest"
  },
  "Hypertension": {
    symptoms: ["headache", "dizziness", "blurred vision", "chest pain", "shortness of breath", "nosebleed", "fatigue"],
    specialization: "Cardiologist", description: "High blood pressure condition", urgency: "moderate", bodyPart: "chest"
  },
  "Angina": {
    symptoms: ["chest pain", "chest pressure", "shortness of breath", "fatigue", "dizziness", "pain radiating to arm"],
    specialization: "Cardiologist", description: "Chest pain due to reduced blood flow to heart", urgency: "high", bodyPart: "chest"
  },
  "Migraine": {
    symptoms: ["severe headache", "throbbing pain", "nausea", "vomiting", "sensitivity to light", "sensitivity to sound", "aura", "vision changes"],
    specialization: "Neurologist", description: "Intense recurring headache disorder", urgency: "moderate", bodyPart: "head"
  },
  "Epilepsy": {
    symptoms: ["seizures", "loss of consciousness", "convulsions", "confusion", "staring spells", "muscle stiffness"],
    specialization: "Neurologist", description: "Neurological disorder causing recurring seizures", urgency: "high", bodyPart: "head"
  },
  "Stroke": {
    symptoms: ["sudden numbness", "confusion", "trouble speaking", "vision problems", "severe headache", "dizziness", "loss of balance", "facial drooping"],
    specialization: "Neurologist", description: "Brain attack due to blocked or ruptured blood vessel", urgency: "emergency", bodyPart: "head"
  },
  "Parkinson Disease": {
    symptoms: ["tremors", "stiffness", "slow movement", "balance problems", "speech changes", "writing changes"],
    specialization: "Neurologist", description: "Progressive nervous system disorder affecting movement", urgency: "low", bodyPart: "head"
  },
  "Acne": {
    symptoms: ["pimples", "blackheads", "whiteheads", "oily skin", "skin redness", "inflammation", "scarring"],
    specialization: "Dermatologist", description: "Skin condition causing pimples and breakouts", urgency: "low", bodyPart: "skin"
  },
  "Eczema": {
    symptoms: ["itchy skin", "red patches", "dry skin", "scaling", "skin inflammation", "rashes", "blisters"],
    specialization: "Dermatologist", description: "Chronic skin condition causing inflammation and itching", urgency: "low", bodyPart: "skin"
  },
  "Psoriasis": {
    symptoms: ["red patches", "thick scales", "dry skin", "itching", "burning sensation", "joint pain", "nail changes"],
    specialization: "Dermatologist", description: "Autoimmune condition causing rapid skin cell buildup", urgency: "low", bodyPart: "skin"
  },
  "Skin Allergy": {
    symptoms: ["itching", "hives", "redness", "swelling", "rashes", "skin peeling", "warmth"],
    specialization: "Dermatologist", description: "Allergic reaction on skin", urgency: "moderate", bodyPart: "skin"
  },
  "Arthritis": {
    symptoms: ["joint pain", "stiffness", "swelling", "reduced range of motion", "redness", "warmth around joints", "fatigue"],
    specialization: "Orthopedic", description: "Inflammation of joints causing pain and stiffness", urgency: "low", bodyPart: "joints"
  },
  "Back Pain": {
    symptoms: ["lower back pain", "muscle ache", "shooting pain", "stabbing pain", "pain down leg", "limited flexibility", "stiffness"],
    specialization: "Orthopedic", description: "Pain in the back region affecting movement", urgency: "moderate", bodyPart: "back"
  },
  "Fracture": {
    symptoms: ["intense pain", "swelling", "bruising", "deformity", "inability to move", "tenderness", "numbness"],
    specialization: "Orthopedic", description: "Break in bone continuity", urgency: "high", bodyPart: "limbs"
  },
  "Sciatica": {
    symptoms: ["leg pain", "lower back pain", "numbness in leg", "tingling", "weakness", "pain radiating from back to leg"],
    specialization: "Orthopedic", description: "Pain along sciatic nerve from lower back to leg", urgency: "moderate", bodyPart: "back"
  },
  "PCOS": {
    symptoms: ["irregular periods", "weight gain", "acne", "excessive hair growth", "hair thinning", "infertility", "pelvic pain"],
    specialization: "Gynecologist", description: "Hormonal disorder in women with ovarian cysts", urgency: "moderate", bodyPart: "abdomen"
  },
  "Pregnancy Complications": {
    symptoms: ["abdominal pain", "bleeding", "nausea", "vomiting", "swelling", "high blood pressure", "headache"],
    specialization: "Gynecologist", description: "Medical issues during pregnancy", urgency: "high", bodyPart: "abdomen"
  },
  "Endometriosis": {
    symptoms: ["painful periods", "pelvic pain", "pain during intercourse", "heavy bleeding", "infertility", "back pain"],
    specialization: "Gynecologist", description: "Tissue similar to uterine lining grows outside uterus", urgency: "moderate", bodyPart: "abdomen"
  },
  "Asthma": {
    symptoms: ["wheezing", "shortness of breath", "chest tightness", "coughing", "difficulty breathing", "night cough"],
    specialization: "Pulmonologist", description: "Chronic respiratory condition causing airway inflammation", urgency: "high", bodyPart: "chest"
  },
  "COPD": {
    symptoms: ["chronic cough", "shortness of breath", "wheezing", "chest tightness", "excess mucus", "bluish lips"],
    specialization: "Pulmonologist", description: "Chronic obstructive lung disease making breathing difficult", urgency: "high", bodyPart: "chest"
  },
  "Pneumonia": {
    symptoms: ["fever", "chills", "cough", "chest pain", "shortness of breath", "fatigue", "sweating", "nausea"],
    specialization: "Pulmonologist", description: "Lung infection causing inflammation of air sacs", urgency: "high", bodyPart: "chest"
  },
  "Bronchitis": {
    symptoms: ["cough", "mucus production", "fatigue", "shortness of breath", "slight fever", "chest discomfort"],
    specialization: "Pulmonologist", description: "Inflammation of bronchial tubes", urgency: "moderate", bodyPart: "chest"
  },
  "Diabetes Type 2": {
    symptoms: ["frequent urination", "increased thirst", "weight loss", "fatigue", "blurred vision", "slow healing", "numbness in feet", "tingling"],
    specialization: "Endocrinologist", description: "Metabolic disorder affecting blood sugar regulation", urgency: "moderate", bodyPart: "abdomen"
  },
  "Hypothyroidism": {
    symptoms: ["fatigue", "weight gain", "cold sensitivity", "constipation", "depression", "dry skin", "hair loss", "slow heart rate", "muscle weakness"],
    specialization: "Endocrinologist", description: "Underactive thyroid gland", urgency: "low", bodyPart: "neck"
  },
  "Hyperthyroidism": {
    symptoms: ["weight loss", "rapid heartbeat", "anxiety", "tremors", "sweating", "heat sensitivity", "frequent bowel movements", "enlarged thyroid"],
    specialization: "Endocrinologist", description: "Overactive thyroid gland", urgency: "moderate", bodyPart: "neck"
  },
  "Irritable Bowel Syndrome": {
    symptoms: ["abdominal pain", "bloating", "constipation", "diarrhea", "gas", "mucus in stool", "cramps"],
    specialization: "Gastroenterologist", description: "Disorder affecting large intestine", urgency: "low", bodyPart: "abdomen"
  },
  "Gastritis": {
    symptoms: ["stomach pain", "nausea", "vomiting", "indigestion", "bloating", "loss of appetite", "burning stomach"],
    specialization: "Gastroenterologist", description: "Inflammation of stomach lining", urgency: "moderate", bodyPart: "abdomen"
  },
  "Hepatitis": {
    symptoms: ["jaundice", "fatigue", "abdominal pain", "dark urine", "pale stools", "nausea", "vomiting", "loss of appetite"],
    specialization: "Gastroenterologist", description: "Inflammation of liver", urgency: "high", bodyPart: "abdomen"
  },
  "Acid Reflux": {
    symptoms: ["heartburn", "chest pain", "regurgitation", "difficulty swallowing", "chronic cough", "hoarseness", "sour taste"],
    specialization: "Gastroenterologist", description: "Stomach acid flows back into esophagus", urgency: "low", bodyPart: "chest"
  },
  "Fever": {
    symptoms: ["high temperature", "chills", "sweating", "headache", "muscle aches", "weakness", "loss of appetite"],
    specialization: "General Physician", description: "Elevated body temperature indicating infection or illness", urgency: "moderate", bodyPart: "general"
  },
  "Common Cold": {
    symptoms: ["runny nose", "sneezing", "sore throat", "cough", "congestion", "mild headache", "slight fever"],
    specialization: "General Physician", description: "Viral infection of upper respiratory tract", urgency: "low", bodyPart: "head"
  },
  "Urinary Tract Infection": {
    symptoms: ["burning urination", "frequent urination", "cloudy urine", "pelvic pain", "strong odor", "blood in urine", "fever"],
    specialization: "General Physician", description: "Infection in the urinary system", urgency: "moderate", bodyPart: "abdomen"
  },
  "Dengue Fever": {
    symptoms: ["high fever", "severe headache", "pain behind eyes", "joint pain", "muscle pain", "rash", "bleeding", "nausea"],
    specialization: "General Physician", description: "Mosquito-borne viral infection", urgency: "high", bodyPart: "general"
  }
}

function analyzeSymptoms(symptoms: string[], bodyPart?: string): {
  predictions: Array<{ disease: string; confidence: number; specialization: string; description: string; urgency: string }>;
  recommendedSpecializations: string[];
  urgencyLevel: string;
} {
  const normalizedSymptoms = symptoms.map(s => s.toLowerCase().trim())
  const scores: Record<string, number> = {}

  for (const [disease, data] of Object.entries(DISEASE_SYMPTOM_MAP)) {
    let score = 0
    const diseaseSymptoms = data.symptoms.map(s => s.toLowerCase())

    for (const symptom of normalizedSymptoms) {
      for (const ds of diseaseSymptoms) {
        if (ds.includes(symptom) || symptom.includes(ds)) {
          score += 2
        } else if (symptom.split(' ').some(word => ds.includes(word) && word.length > 3)) {
          score += 1
        }
      }
    }

    // Body part bonus
    if (bodyPart && data.bodyPart) {
      const bodyPartMap: Record<string, string[]> = {
        'head': ['head', 'brain', 'face'],
        'chest': ['chest', 'heart', 'lungs'],
        'abdomen': ['abdomen', 'stomach', 'liver'],
        'back': ['back', 'spine'],
        'limbs': ['arm', 'leg', 'limbs', 'joints'],
        'skin': ['skin'],
        'neck': ['neck', 'throat'],
        'general': ['general']
      }
      for (const [bpKey, bpAliases] of Object.entries(bodyPartMap)) {
        if (bpAliases.some(a => bodyPart.toLowerCase().includes(a))) {
          if (data.bodyPart === bpKey || bpAliases.some(a => data.bodyPart === a)) {
            score += 3
          }
        }
      }
    }

    if (score > 0) {
      const maxPossible = Math.min(normalizedSymptoms.length, data.symptoms.length) * 2
      scores[disease] = Math.min(95, Math.round((score / Math.max(maxPossible, 4)) * 100))
    }
  }

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .filter(([, score]) => score > 15)

  const predictions = sorted.map(([disease, confidence]) => ({
    disease,
    confidence,
    specialization: DISEASE_SYMPTOM_MAP[disease].specialization,
    description: DISEASE_SYMPTOM_MAP[disease].description,
    urgency: DISEASE_SYMPTOM_MAP[disease].urgency
  }))

  const specializations = [...new Set(predictions.map(p => p.specialization))]
  const urgencies = predictions.map(p => p.urgency)
  let urgencyLevel = 'low'
  if (urgencies.includes('emergency')) urgencyLevel = 'emergency'
  else if (urgencies.includes('high')) urgencyLevel = 'high'
  else if (urgencies.includes('moderate')) urgencyLevel = 'moderate'

  return { predictions, recommendedSpecializations: specializations, urgencyLevel }
}

function matchDoctorsToDisease(disease: string, specialization: string, doctors: any[]): any[] {
  return doctors.filter(doc => {
    if (doc.specialization === specialization) return true
    const diseases = JSON.parse(doc.diseases_treated || '[]') as string[]
    return diseases.some(d => d.toLowerCase().includes(disease.toLowerCase()) ||
      disease.toLowerCase().includes(d.toLowerCase()))
  })
}

// ─── SESSION MIDDLEWARE ───────────────────────────────────────────────────────
async function getSession(db: D1Database, token: string) {
  if (!token) return null
  try {
    const session = await db.prepare(
      'SELECT * FROM sessions WHERE session_token = ? AND expires_at > datetime("now")'
    ).bind(token).first()
    return session
  } catch { return null }
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/auth/register/doctor', async (c) => {
  try {
    const body = await c.req.json()
    const { name, email, password, phone, specialization, experience_years, qualification, hospital_name, hospital_address, city, state, pincode, consultation_fee, bio } = body

    if (!name || !email || !password || !specialization) {
      return c.json({ success: false, error: 'Required fields missing' }, 400)
    }

    const existing = await c.env.DB.prepare('SELECT id FROM doctors WHERE email = ?').bind(email).first()
    if (existing) return c.json({ success: false, error: 'Email already registered' }, 409)

    const userId = generateId('doc')
    const hashedPwd = hashPassword(password)

    await c.env.DB.prepare(`
      INSERT INTO doctors (user_id, name, email, phone, specialization, experience_years, qualification, hospital_name, hospital_address, city, state, pincode, consultation_fee, bio, diseases_treated, sub_specializations, available_days, available_times, languages, is_verified, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
    `).bind(
      userId, name, email + ':' + hashedPwd, phone || '', specialization,
      experience_years || 0, qualification || '', hospital_name || '',
      hospital_address || '', city || '', state || '', pincode || '',
      consultation_fee || 500, bio || '',
      JSON.stringify([]), JSON.stringify([]),
      JSON.stringify(["Mon","Tue","Wed","Thu","Fri"]),
      JSON.stringify(["09:00","10:00","11:00","14:00","15:00","16:00"]),
      JSON.stringify(["English"]), 0, 1
    ).run()

    // Store email separately for login
    await c.env.DB.prepare(`UPDATE doctors SET email = ? WHERE user_id = ?`).bind(email, userId).run()
    await c.env.DB.prepare(`UPDATE doctors SET user_id = ? WHERE user_id = ?`).bind(userId + ':' + hashedPwd, userId).run()

    // Actually let's simplify: store password hash in user_id field pattern
    const doctor = await c.env.DB.prepare('SELECT * FROM doctors WHERE email = ?').bind(email).first() as any
    const token = generateSessionToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await c.env.DB.prepare('INSERT INTO sessions (session_token, user_id, user_type, expires_at) VALUES (?, ?, ?, ?)').bind(token, String(doctor.id), 'doctor', expiresAt).run()

    return c.json({ success: true, token, user: { id: doctor.id, name, email, type: 'doctor', specialization } })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.post('/api/auth/register/patient', async (c) => {
  try {
    const body = await c.req.json()
    const { name, email, password, phone, dob, gender, blood_group, address, city, state, pincode } = body

    if (!name || !email || !password) {
      return c.json({ success: false, error: 'Required fields missing' }, 400)
    }

    const existing = await c.env.DB.prepare('SELECT id FROM patients WHERE email = ?').bind(email).first()
    if (existing) return c.json({ success: false, error: 'Email already registered' }, 409)

    const userId = generateId('pat')
    const hashedPwd = hashPassword(password)

    await c.env.DB.prepare(`
      INSERT INTO patients (user_id, name, email, phone, dob, gender, blood_group, address, city, state, pincode, medical_history, allergies, current_medications, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      userId + ':' + hashedPwd, name, email, phone || '', dob || '', gender || '',
      blood_group || '', address || '', city || '', state || '', pincode || '',
      JSON.stringify([]), JSON.stringify([]), JSON.stringify([]), 1
    ).run()

    const patient = await c.env.DB.prepare('SELECT * FROM patients WHERE email = ?').bind(email).first() as any
    const token = generateSessionToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await c.env.DB.prepare('INSERT INTO sessions (session_token, user_id, user_type, expires_at) VALUES (?, ?, ?, ?)').bind(token, String(patient.id), 'patient', expiresAt).run()

    return c.json({ success: true, token, user: { id: patient.id, name, email, type: 'patient' } })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.post('/api/auth/login', async (c) => {
  try {
    const { email, password, userType } = await c.req.json()
    if (!email || !password || !userType) return c.json({ success: false, error: 'Missing credentials' }, 400)

    const hashedPwd = hashPassword(password)
    let user: any = null
    let userId = ''

    if (userType === 'doctor') {
      user = await c.env.DB.prepare('SELECT * FROM doctors WHERE email = ?').bind(email).first() as any
      if (!user) return c.json({ success: false, error: 'Invalid credentials' }, 401)
      // Verify password from user_id field
      if (!user.user_id.endsWith(':' + hashedPwd) && !user.user_id.includes(':' + hashedPwd)) {
        // Try simple check
        const storedHash = user.user_id.split(':').pop()
        if (storedHash !== hashedPwd) return c.json({ success: false, error: 'Invalid credentials' }, 401)
      }
      userId = String(user.id)
    } else {
      user = await c.env.DB.prepare('SELECT * FROM patients WHERE email = ?').bind(email).first() as any
      if (!user) return c.json({ success: false, error: 'Invalid credentials' }, 401)
      const storedHash = user.user_id.split(':').pop()
      if (storedHash !== hashedPwd) return c.json({ success: false, error: 'Invalid credentials' }, 401)
      userId = String(user.id)
    }

    const token = generateSessionToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await c.env.DB.prepare('INSERT INTO sessions (session_token, user_id, user_type, expires_at) VALUES (?, ?, ?, ?)').bind(token, userId, userType, expiresAt).run()

    const userData = userType === 'doctor'
      ? { id: user.id, name: user.name, email, type: 'doctor', specialization: user.specialization, hospital_name: user.hospital_name, profile_image: user.profile_image }
      : { id: user.id, name: user.name, email, type: 'patient', profile_image: user.profile_image }

    return c.json({ success: true, token, user: userData })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.post('/api/auth/logout', async (c) => {
  const token = c.req.header('X-Session-Token')
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE session_token = ?').bind(token).run()
  return c.json({ success: true })
})

// ─── DOCTOR ROUTES ────────────────────────────────────────────────────────────
app.get('/api/doctors', async (c) => {
  try {
    const { specialization, city, disease, search, limit = '20', offset = '0' } = c.req.query()
    let query = 'SELECT * FROM doctors WHERE is_active = 1'
    const params: any[] = []

    if (specialization) { query += ' AND specialization = ?'; params.push(specialization) }
    if (city) { query += ' AND (city LIKE ? OR state LIKE ?)'; params.push(`%${city}%`, `%${city}%`) }
    if (search) {
      query += ' AND (name LIKE ? OR hospital_name LIKE ? OR specialization LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    if (disease) {
      query += ' AND (diseases_treated LIKE ? OR specialization LIKE ?)'
      params.push(`%${disease}%`, `%${disease}%`)
    }

    query += ' ORDER BY rating DESC, total_ratings DESC'
    query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`

    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    const doctors = results.map((d: any) => ({
      ...d,
      sub_specializations: JSON.parse(d.sub_specializations || '[]'),
      available_days: JSON.parse(d.available_days || '[]'),
      available_times: JSON.parse(d.available_times || '[]'),
      languages: JSON.parse(d.languages || '[]'),
      diseases_treated: JSON.parse(d.diseases_treated || '[]'),
      user_id: undefined
    }))

    return c.json({ success: true, doctors, total: doctors.length })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.get('/api/doctors/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const doctor = await c.env.DB.prepare('SELECT * FROM doctors WHERE id = ? AND is_active = 1').bind(id).first() as any
    if (!doctor) return c.json({ success: false, error: 'Doctor not found' }, 404)

    const reviews = await c.env.DB.prepare(
      'SELECT r.*, p.name as patient_name FROM reviews r JOIN patients p ON r.patient_id = p.id WHERE r.doctor_id = ? ORDER BY r.created_at DESC LIMIT 10'
    ).bind(id).all()

    return c.json({
      success: true,
      doctor: {
        ...doctor,
        sub_specializations: JSON.parse(doctor.sub_specializations || '[]'),
        available_days: JSON.parse(doctor.available_days || '[]'),
        available_times: JSON.parse(doctor.available_times || '[]'),
        languages: JSON.parse(doctor.languages || '[]'),
        diseases_treated: JSON.parse(doctor.diseases_treated || '[]'),
        user_id: undefined
      },
      reviews: reviews.results
    })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.put('/api/doctors/profile', async (c) => {
  try {
    const token = c.req.header('X-Session-Token')
    const session = await getSession(c.env.DB, token || '')
    if (!session || session.user_type !== 'doctor') return c.json({ success: false, error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const fields = ['name', 'phone', 'specialization', 'sub_specializations', 'experience_years',
      'qualification', 'bio', 'hospital_name', 'hospital_address', 'city', 'state', 'pincode',
      'latitude', 'longitude', 'consultation_fee', 'available_days', 'available_times',
      'profile_image', 'languages', 'diseases_treated']

    const updates: string[] = []
    const values: any[] = []

    for (const field of fields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`)
        values.push(typeof body[field] === 'object' ? JSON.stringify(body[field]) : body[field])
      }
    }

    if (updates.length === 0) return c.json({ success: false, error: 'No fields to update' }, 400)

    values.push(session.user_id)
    await c.env.DB.prepare(`UPDATE doctors SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...values).run()

    return c.json({ success: true, message: 'Profile updated successfully' })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ─── PATIENT ROUTES ───────────────────────────────────────────────────────────
app.get('/api/patients/profile', async (c) => {
  try {
    const token = c.req.header('X-Session-Token')
    const session = await getSession(c.env.DB, token || '')
    if (!session || session.user_type !== 'patient') return c.json({ success: false, error: 'Unauthorized' }, 401)

    const patient = await c.env.DB.prepare('SELECT * FROM patients WHERE id = ?').bind(session.user_id).first() as any
    if (!patient) return c.json({ success: false, error: 'Patient not found' }, 404)

    return c.json({
      success: true,
      patient: {
        ...patient,
        medical_history: JSON.parse(patient.medical_history || '[]'),
        allergies: JSON.parse(patient.allergies || '[]'),
        current_medications: JSON.parse(patient.current_medications || '[]'),
        user_id: undefined
      }
    })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.put('/api/patients/profile', async (c) => {
  try {
    const token = c.req.header('X-Session-Token')
    const session = await getSession(c.env.DB, token || '')
    if (!session || session.user_type !== 'patient') return c.json({ success: false, error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const fields = ['name', 'phone', 'dob', 'gender', 'blood_group', 'address', 'city', 'state', 'pincode',
      'latitude', 'longitude', 'medical_history', 'allergies', 'current_medications', 'profile_image', 'emergency_contact']

    const updates: string[] = []
    const values: any[] = []
    for (const field of fields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`)
        values.push(typeof body[field] === 'object' ? JSON.stringify(body[field]) : body[field])
      }
    }

    if (updates.length === 0) return c.json({ success: false, error: 'No fields to update' }, 400)
    values.push(session.user_id)
    await c.env.DB.prepare(`UPDATE patients SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...values).run()

    return c.json({ success: true, message: 'Profile updated successfully' })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ─── AI ROUTES ────────────────────────────────────────────────────────────────
app.post('/api/ai/analyze-symptoms', async (c) => {
  try {
    const { symptoms, bodyPart, disease } = await c.req.json()

    if (disease) {
      // Find doctors for specific disease
      const { results } = await c.env.DB.prepare(
        `SELECT * FROM doctors WHERE is_active = 1 AND (diseases_treated LIKE ? OR specialization LIKE ?) ORDER BY rating DESC LIMIT 10`
      ).bind(`%${disease}%`, `%${disease}%`).all()

      const doctors = results.map((d: any) => ({
        ...d,
        sub_specializations: JSON.parse(d.sub_specializations || '[]'),
        available_days: JSON.parse(d.available_days || '[]'),
        available_times: JSON.parse(d.available_times || '[]'),
        languages: JSON.parse(d.languages || '[]'),
        diseases_treated: JSON.parse(d.diseases_treated || '[]'),
        user_id: undefined
      }))

      return c.json({ success: true, matchedDoctors: doctors, searchedDisease: disease })
    }

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return c.json({ success: false, error: 'Symptoms required' }, 400)
    }

    const analysis = analyzeSymptoms(symptoms, bodyPart)

    // Fetch matching doctors
    let matchedDoctors: any[] = []
    if (analysis.recommendedSpecializations.length > 0) {
      const specs = analysis.recommendedSpecializations.slice(0, 3)
      const placeholders = specs.map(() => '?').join(', ')
      const { results } = await c.env.DB.prepare(
        `SELECT * FROM doctors WHERE is_active = 1 AND specialization IN (${placeholders}) ORDER BY rating DESC LIMIT 15`
      ).bind(...specs).all()

      matchedDoctors = results.map((d: any) => ({
        ...d,
        sub_specializations: JSON.parse(d.sub_specializations || '[]'),
        available_days: JSON.parse(d.available_days || '[]'),
        available_times: JSON.parse(d.available_times || '[]'),
        languages: JSON.parse(d.languages || '[]'),
        diseases_treated: JSON.parse(d.diseases_treated || '[]'),
        user_id: undefined
      }))
    }

    return c.json({ success: true, analysis, matchedDoctors })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ─── APPOINTMENT ROUTES ───────────────────────────────────────────────────────
app.post('/api/appointments/book', async (c) => {
  try {
    const token = c.req.header('X-Session-Token')
    const session = await getSession(c.env.DB, token || '')
    if (!session || session.user_type !== 'patient') return c.json({ success: false, error: 'Unauthorized' }, 401)

    const { doctor_id, appointment_date, appointment_time, reason, symptoms, predicted_disease } = await c.req.json()
    if (!doctor_id || !appointment_date || !appointment_time) return c.json({ success: false, error: 'Required fields missing' }, 400)

    // Check availability
    const existing = await c.env.DB.prepare(
      'SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != "cancelled"'
    ).bind(doctor_id, appointment_date, appointment_time).first()

    if (existing) return c.json({ success: false, error: 'Slot not available. Please choose another time.' }, 409)

    const appointmentId = generateId('APT').toUpperCase().replace('APT_', 'APT').substring(0, 12)

    await c.env.DB.prepare(`
      INSERT INTO appointments (appointment_id, doctor_id, patient_id, appointment_date, appointment_time, reason, symptoms, predicted_disease, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
    `).bind(
      appointmentId, doctor_id, session.user_id, appointment_date, appointment_time,
      reason || '', JSON.stringify(symptoms || []), predicted_disease || ''
    ).run()

    const appointment = await c.env.DB.prepare('SELECT * FROM appointments WHERE appointment_id = ?').bind(appointmentId).first()
    return c.json({ success: true, appointment, message: 'Appointment booked successfully!' })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.get('/api/appointments/patient', async (c) => {
  try {
    const token = c.req.header('X-Session-Token')
    const session = await getSession(c.env.DB, token || '')
    if (!session || session.user_type !== 'patient') return c.json({ success: false, error: 'Unauthorized' }, 401)

    const { results } = await c.env.DB.prepare(`
      SELECT a.*, d.name as doctor_name, d.specialization, d.hospital_name, d.profile_image as doctor_image
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.patient_id = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `).bind(session.user_id).all()

    return c.json({ success: true, appointments: results })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.get('/api/appointments/doctor', async (c) => {
  try {
    const token = c.req.header('X-Session-Token')
    const session = await getSession(c.env.DB, token || '')
    if (!session || session.user_type !== 'doctor') return c.json({ success: false, error: 'Unauthorized' }, 401)

    const { results } = await c.env.DB.prepare(`
      SELECT a.*, p.name as patient_name, p.phone as patient_phone, p.dob as patient_dob, p.gender as patient_gender
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.doctor_id = ?
      ORDER BY a.appointment_date ASC, a.appointment_time ASC
    `).bind(session.user_id).all()

    return c.json({ success: true, appointments: results })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.put('/api/appointments/:id/status', async (c) => {
  try {
    const token = c.req.header('X-Session-Token')
    const session = await getSession(c.env.DB, token || '')
    if (!session) return c.json({ success: false, error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const { status, notes, prescription } = await c.req.json()

    await c.env.DB.prepare(
      `UPDATE appointments SET status = ?, notes = ?, prescription = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(status, notes || '', prescription || '', id).run()

    return c.json({ success: true, message: 'Appointment updated' })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ─── REVIEWS ──────────────────────────────────────────────────────────────────
app.post('/api/reviews', async (c) => {
  try {
    const token = c.req.header('X-Session-Token')
    const session = await getSession(c.env.DB, token || '')
    if (!session || session.user_type !== 'patient') return c.json({ success: false, error: 'Unauthorized' }, 401)

    const { doctor_id, rating, review_text, appointment_id } = await c.req.json()
    if (!doctor_id || !rating) return c.json({ success: false, error: 'Missing required fields' }, 400)

    await c.env.DB.prepare(
      'INSERT INTO reviews (doctor_id, patient_id, appointment_id, rating, review_text) VALUES (?, ?, ?, ?, ?)'
    ).bind(doctor_id, session.user_id, appointment_id || null, rating, review_text || '').run()

    // Update doctor rating
    const ratingData = await c.env.DB.prepare(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE doctor_id = ?'
    ).bind(doctor_id).first() as any

    await c.env.DB.prepare(
      'UPDATE doctors SET rating = ?, total_ratings = ? WHERE id = ?'
    ).bind(Math.round(ratingData.avg_rating * 10) / 10, ratingData.total, doctor_id).run()

    return c.json({ success: true, message: 'Review submitted successfully' })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ─── NEARBY SERVICES (using location) ─────────────────────────────────────────
app.get('/api/nearby/hospitals', async (c) => {
  const { lat, lng, city } = c.req.query()

  const hospitals = [
    { name: "AIIMS", type: "Government Hospital", distance: "2.3 km", rating: 4.5, phone: "011-26588500", emergency: true, specialties: ["All Departments"] },
    { name: "Apollo Hospital", type: "Private Hospital", distance: "3.1 km", rating: 4.8, phone: "1860-500-1066", emergency: true, specialties: ["Cardiology","Oncology","Neurology"] },
    { name: "Fortis Hospital", type: "Private Hospital", distance: "4.2 km", rating: 4.6, phone: "1800-111-5656", emergency: true, specialties: ["Orthopedics","Neurosciences"] },
    { name: "Max Super Specialty", type: "Private Hospital", distance: "5.0 km", rating: 4.7, phone: "011-26515050", emergency: true, specialties: ["Oncology","Cardiology"] },
    { name: "City Government Hospital", type: "Government Hospital", distance: "1.2 km", rating: 3.9, phone: "Local", emergency: true, specialties: ["General"] }
  ]

  const scanCentres = [
    { name: "Dr. Lal PathLabs", type: "Diagnostic Centre", distance: "1.1 km", rating: 4.4, phone: "011-39885050", services: ["Blood Tests","Urine Tests","Pathology"] },
    { name: "SRL Diagnostics", type: "Diagnostic Centre", distance: "2.0 km", rating: 4.3, phone: "1800-102-7774", services: ["CT Scan","MRI","X-Ray","Blood Tests"] },
    { name: "Thyrocare", type: "Diagnostic Centre", distance: "2.5 km", rating: 4.5, phone: "9820900900", services: ["Blood Tests","Wellness Packages"] },
    { name: "Metropolis Healthcare", type: "Diagnostic Centre", distance: "3.2 km", rating: 4.4, phone: "1800-200-3091", services: ["Pathology","Radiology","Molecular Diagnostics"] }
  ]

  const pharmacies = [
    { name: "MedPlus Pharmacy", type: "Pharmacy", distance: "0.5 km", rating: 4.2, phone: "1800-103-0144", open24: true },
    { name: "Apollo Pharmacy", type: "Pharmacy", distance: "0.8 km", rating: 4.5, phone: "1860-500-1066", open24: true },
    { name: "Netmeds Store", type: "Pharmacy", distance: "1.5 km", rating: 4.1, phone: "044-71279999", open24: false },
    { name: "Guardian Pharmacy", type: "Pharmacy", distance: "1.9 km", rating: 4.3, phone: "Local", open24: false }
  ]

  return c.json({ success: true, hospitals, scanCentres, pharmacies, location: { lat, lng, city } })
})

// ─── STATIC FILES ─────────────────────────────────────────────────────────────
app.use('/static/*', serveStatic({ root: './public' }))

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>MyDoctor's - Find the Right Doctor Near You</title>
<meta name="description" content="Find and book the best doctors near you. AI-powered disease prediction, symptom checker, nearby hospitals and medical services.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏥</text></svg>">
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<link href="/static/styles.css" rel="stylesheet">
</head>
<body>
<!-- LOADING SCREEN -->
<div id="loadingScreen" class="loading-screen">
  <div class="loading-content">
    <div class="loading-logo">
      <i class="fas fa-heartbeat"></i>
      <span>MyDoctor's</span>
    </div>
    <div class="loading-bar"><div class="loading-fill"></div></div>
    <p>Loading your health companion...</p>
  </div>
</div>

<!-- NAVIGATION -->
<nav class="navbar" id="navbar">
  <div class="nav-container">
    <a href="#" class="nav-logo" onclick="showPage('home')">
      <div class="logo-icon"><i class="fas fa-heartbeat"></i></div>
      <div class="logo-text"><span class="logo-main">MyDoctor's</span><span class="logo-sub">Health at your fingertips</span></div>
    </a>
    <div class="nav-menu" id="navMenu">
      <a class="nav-link active" onclick="showPage('home')" href="#">Home</a>
      <a class="nav-link" onclick="showPage('findDoctors')" href="#">Find Doctors</a>
      <a class="nav-link" onclick="showPage('aiChecker')" href="#">AI Checker</a>
      <a class="nav-link" onclick="showPage('nearby')" href="#">Nearby Services</a>
      <a class="nav-link" onclick="showPage('appointments')" href="#">Appointments</a>
    </div>
    <div class="nav-actions">
      <div id="guestActions" class="nav-auth-btns">
        <button class="btn-login" onclick="openModal('loginModal')"><i class="fas fa-sign-in-alt"></i> Login</button>
        <button class="btn-register" onclick="openModal('registerModal')"><i class="fas fa-user-plus"></i> Register</button>
      </div>
      <div id="userActions" class="user-menu" style="display:none">
        <div class="user-avatar" id="userAvatar" onclick="toggleUserMenu()">
          <img src="" alt="" id="userAvatarImg" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="avatar-fallback" id="avatarFallback"><i class="fas fa-user"></i></div>
        </div>
        <div class="user-dropdown" id="userDropdown">
          <div class="dropdown-header"><div id="dropUserName" class="dropdown-name"></div><div id="dropUserType" class="dropdown-type"></div></div>
          <a onclick="showPage('dashboard')" href="#"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
          <a onclick="showPage('profile')" href="#"><i class="fas fa-user-edit"></i> My Profile</a>
          <a onclick="showPage('appointments')" href="#"><i class="fas fa-calendar-check"></i> Appointments</a>
          <hr>
          <a onclick="logout()" class="logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</a>
        </div>
      </div>
      <button class="hamburger" id="hamburger" onclick="toggleMenu()">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</nav>

<!-- ═══════════════ HOME PAGE ═══════════════ -->
<div id="page-home" class="page active">
  <!-- HERO SECTION -->
  <section class="hero">
    <div class="hero-bg">
      <div class="hero-blob blob1"></div>
      <div class="hero-blob blob2"></div>
      <div class="hero-blob blob3"></div>
    </div>
    <div class="hero-content">
      <div class="hero-text">
        <div class="hero-badge"><i class="fas fa-shield-alt"></i> Trusted by 1M+ Patients</div>
        <h1 class="hero-title">Find the <span class="gradient-text">Right Doctor</span><br>Near You, Instantly</h1>
        <p class="hero-subtitle">AI-powered symptom analysis, instant doctor matching, and seamless appointment booking — all in one place.</p>
        <div class="hero-search-box">
          <div class="search-row">
            <div class="search-input-group">
              <i class="fas fa-search search-icon"></i>
              <input type="text" id="heroSearchInput" placeholder="Search by disease, symptom or doctor name..." class="search-input">
            </div>
            <div class="search-input-group">
              <i class="fas fa-map-marker-alt search-icon"></i>
              <input type="text" id="heroLocationInput" placeholder="Enter your city..." class="search-input">
            </div>
            <button class="btn-search-hero" onclick="heroSearch()"><i class="fas fa-search"></i> Search</button>
          </div>
          <div class="quick-tags">
            <span class="tag" onclick="quickSearch('Cardiologist')"><i class="fas fa-heart"></i> Heart</span>
            <span class="tag" onclick="quickSearch('Orthopedic')"><i class="fas fa-bone"></i> Bones</span>
            <span class="tag" onclick="quickSearch('Neurologist')"><i class="fas fa-brain"></i> Brain</span>
            <span class="tag" onclick="quickSearch('Dermatologist')"><i class="fas fa-allergies"></i> Skin</span>
            <span class="tag" onclick="quickSearch('Gynecologist')"><i class="fas fa-female"></i> Women</span>
            <span class="tag" onclick="quickSearch('Pulmonologist')"><i class="fas fa-lungs"></i> Lungs</span>
          </div>
        </div>
        <div class="hero-actions">
          <button class="btn-primary-hero" onclick="showPage('aiChecker')"><i class="fas fa-robot"></i> AI Symptom Checker</button>
          <button class="btn-secondary-hero" onclick="showPage('findDoctors')"><i class="fas fa-stethoscope"></i> Browse Doctors</button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="hero-card-float card-float-1">
          <div class="float-icon green"><i class="fas fa-check-circle"></i></div>
          <div><div class="float-title">Appointment Confirmed</div><div class="float-sub">Dr. Priya Sharma • Today 3PM</div></div>
        </div>
        <div class="hero-card-float card-float-2">
          <div class="float-icon blue"><i class="fas fa-robot"></i></div>
          <div><div class="float-title">AI Analysis Complete</div><div class="float-sub">3 doctors matched for you</div></div>
        </div>
        <div class="hero-main-visual">
          <div class="visual-circle outer-ring"></div>
          <div class="visual-circle mid-ring"></div>
          <div class="visual-inner">
            <i class="fas fa-stethoscope visual-icon"></i>
            <div class="pulse-ring"></div>
          </div>
          <div class="orbit-dot dot1"><i class="fas fa-heartbeat"></i></div>
          <div class="orbit-dot dot2"><i class="fas fa-pills"></i></div>
          <div class="orbit-dot dot3"><i class="fas fa-microscope"></i></div>
          <div class="orbit-dot dot4"><i class="fas fa-ambulance"></i></div>
        </div>
        <div class="hero-card-float card-float-3">
          <div class="float-icon orange"><i class="fas fa-star"></i></div>
          <div><div class="float-title">4.9/5 Rating</div><div class="float-sub">50K+ happy patients</div></div>
        </div>
      </div>
    </div>
  </section>

  <!-- STATS -->
  <section class="stats-section">
    <div class="container">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-number" data-count="10000">0</div>
          <div class="stat-label"><i class="fas fa-user-md"></i> Verified Doctors</div>
        </div>
        <div class="stat-item">
          <div class="stat-number" data-count="500000">0</div>
          <div class="stat-label"><i class="fas fa-users"></i> Patients Served</div>
        </div>
        <div class="stat-item">
          <div class="stat-number" data-count="50">0</div>
          <div class="stat-label"><i class="fas fa-map-marker-alt"></i> Cities Covered</div>
        </div>
        <div class="stat-item">
          <div class="stat-number" data-count="30">0</div>
          <div class="stat-label"><i class="fas fa-stethoscope"></i> Specializations</div>
        </div>
      </div>
    </div>
  </section>

  <!-- SPECIALIZATIONS -->
  <section class="specializations-section">
    <div class="container">
      <div class="section-header">
        <div class="section-badge">Our Specialties</div>
        <h2>Find Experts in <span class="gradient-text">Every Field</span></h2>
        <p>Browse top medical specializations and find the best specialists</p>
      </div>
      <div class="spec-grid">
        <div class="spec-card" onclick="filterBySpec('Cardiologist')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#ff6b6b,#ee5a24)"><i class="fas fa-heart"></i></div>
          <div class="spec-name">Cardiology</div>
          <div class="spec-count">Heart & Vascular</div>
        </div>
        <div class="spec-card" onclick="filterBySpec('Neurologist')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#a29bfe,#6c5ce7)"><i class="fas fa-brain"></i></div>
          <div class="spec-name">Neurology</div>
          <div class="spec-count">Brain & Nerves</div>
        </div>
        <div class="spec-card" onclick="filterBySpec('Orthopedic')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#74b9ff,#0984e3)"><i class="fas fa-bone"></i></div>
          <div class="spec-name">Orthopedics</div>
          <div class="spec-count">Bones & Joints</div>
        </div>
        <div class="spec-card" onclick="filterBySpec('Dermatologist')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#fd79a8,#e84393)"><i class="fas fa-allergies"></i></div>
          <div class="spec-name">Dermatology</div>
          <div class="spec-count">Skin & Hair</div>
        </div>
        <div class="spec-card" onclick="filterBySpec('Gynecologist')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#fdcb6e,#e17055)"><i class="fas fa-female"></i></div>
          <div class="spec-name">Gynecology</div>
          <div class="spec-count">Women's Health</div>
        </div>
        <div class="spec-card" onclick="filterBySpec('Pulmonologist')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#55efc4,#00b894)"><i class="fas fa-lungs"></i></div>
          <div class="spec-name">Pulmonology</div>
          <div class="spec-count">Lungs & Breathing</div>
        </div>
        <div class="spec-card" onclick="filterBySpec('Endocrinologist')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#ffeaa7,#fdcb6e)"><i class="fas fa-vial"></i></div>
          <div class="spec-name">Endocrinology</div>
          <div class="spec-count">Hormones & Diabetes</div>
        </div>
        <div class="spec-card" onclick="filterBySpec('Gastroenterologist')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#81ecec,#00cec9)"><i class="fas fa-stomach"></i></div>
          <div class="spec-name">Gastroenterology</div>
          <div class="spec-count">Digestive System</div>
        </div>
      </div>
    </div>
  </section>

  <!-- HOW IT WORKS -->
  <section class="how-it-works">
    <div class="container">
      <div class="section-header">
        <div class="section-badge">Simple Process</div>
        <h2>How <span class="gradient-text">MyDoctor's</span> Works</h2>
      </div>
      <div class="steps-grid">
        <div class="step-card">
          <div class="step-num">01</div>
          <div class="step-icon"><i class="fas fa-robot"></i></div>
          <h3>Describe Symptoms</h3>
          <p>Use our AI body diagram or describe your symptoms and our AI instantly analyzes them</p>
        </div>
        <div class="step-arrow"><i class="fas fa-arrow-right"></i></div>
        <div class="step-card">
          <div class="step-num">02</div>
          <div class="step-icon"><i class="fas fa-user-md"></i></div>
          <h3>Get Matched</h3>
          <p>AI matches you with the most suitable specialists based on your condition and location</p>
        </div>
        <div class="step-arrow"><i class="fas fa-arrow-right"></i></div>
        <div class="step-card">
          <div class="step-num">03</div>
          <div class="step-icon"><i class="fas fa-calendar-check"></i></div>
          <h3>Book Appointment</h3>
          <p>Choose your preferred doctor and book an appointment in seconds</p>
        </div>
        <div class="step-arrow"><i class="fas fa-arrow-right"></i></div>
        <div class="step-card">
          <div class="step-num">04</div>
          <div class="step-icon"><i class="fas fa-heartbeat"></i></div>
          <h3>Get Better</h3>
          <p>Visit your doctor with all your health information ready and start your recovery</p>
        </div>
      </div>
    </div>
  </section>

  <!-- FEATURED DOCTORS -->
  <section class="featured-doctors">
    <div class="container">
      <div class="section-header">
        <div class="section-badge">Top Rated</div>
        <h2>Featured <span class="gradient-text">Doctors</span></h2>
        <p>Meet our highly rated medical professionals</p>
      </div>
      <div class="doctors-grid" id="featuredDoctors">
        <div class="loading-skeleton"></div>
        <div class="loading-skeleton"></div>
        <div class="loading-skeleton"></div>
        <div class="loading-skeleton"></div>
      </div>
      <div class="text-center mt-4">
        <button class="btn-view-all" onclick="showPage('findDoctors')"><i class="fas fa-arrow-right"></i> View All Doctors</button>
      </div>
    </div>
  </section>

  <!-- AI FEATURE HIGHLIGHT -->
  <section class="ai-feature-section">
    <div class="container">
      <div class="ai-feature-grid">
        <div class="ai-feature-text">
          <div class="section-badge"><i class="fas fa-robot"></i> Powered by AI</div>
          <h2>Smart <span class="gradient-text">Symptom Checker</span></h2>
          <p>Our advanced AI analyzes your symptoms and body diagram selections to predict possible conditions and match you with the right specialists.</p>
          <ul class="ai-features-list">
            <li><i class="fas fa-check-circle"></i> Interactive 3D body diagram for precise symptom location</li>
            <li><i class="fas fa-check-circle"></i> Disease prediction with confidence scores</li>
            <li><i class="fas fa-check-circle"></i> Instant specialist matching based on condition</li>
            <li><i class="fas fa-check-circle"></i> Emergency alert for critical symptoms</li>
            <li><i class="fas fa-check-circle"></i> Multilingual symptom input support</li>
          </ul>
          <button class="btn-primary-hero" onclick="showPage('aiChecker')"><i class="fas fa-robot"></i> Try AI Checker Now</button>
        </div>
        <div class="ai-feature-visual">
          <div class="ai-mockup">
            <div class="ai-mockup-header"><div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div><span>AI Symptom Analyzer</span></div>
            <div class="ai-mockup-body">
              <div class="ai-symptom-chip"><i class="fas fa-thermometer-half"></i> Fever</div>
              <div class="ai-symptom-chip"><i class="fas fa-head-side-cough"></i> Cough</div>
              <div class="ai-symptom-chip"><i class="fas fa-lungs"></i> Shortness of breath</div>
              <div class="ai-divider">AI Analysis Result</div>
              <div class="ai-result-item"><span class="ai-disease">Pneumonia</span><div class="ai-bar"><div class="ai-fill" style="width:82%"></div></div><span>82%</span></div>
              <div class="ai-result-item"><span class="ai-disease">Bronchitis</span><div class="ai-bar"><div class="ai-fill" style="width:65%"></div></div><span>65%</span></div>
              <div class="ai-result-item"><span class="ai-disease">Asthma</span><div class="ai-bar"><div class="ai-fill" style="width:48%"></div></div><span>48%</span></div>
              <div class="ai-recommendation"><i class="fas fa-user-md"></i> Consult a <strong>Pulmonologist</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>

<!-- ═══════════════ FIND DOCTORS PAGE ═══════════════ -->
<div id="page-findDoctors" class="page">
  <div class="page-header-bg">
    <div class="container">
      <h1><i class="fas fa-user-md"></i> Find Doctors</h1>
      <p>Search from thousands of verified specialists near you</p>
    </div>
  </div>
  <div class="container">
    <div class="filter-bar">
      <div class="filter-search">
        <i class="fas fa-search"></i>
        <input type="text" id="doctorSearch" placeholder="Search doctor, specialization or hospital..." oninput="searchDoctors()">
      </div>
      <select class="filter-select" id="specFilter" onchange="searchDoctors()">
        <option value="">All Specializations</option>
        <option>Cardiologist</option><option>Neurologist</option><option>Orthopedic</option>
        <option>Dermatologist</option><option>Gynecologist</option><option>Pulmonologist</option>
        <option>Endocrinologist</option><option>Gastroenterologist</option><option>General Physician</option>
      </select>
      <input type="text" class="filter-select" id="cityFilter" placeholder="City..." oninput="searchDoctors()" style="min-width:120px">
      <select class="filter-select" id="sortFilter" onchange="searchDoctors()">
        <option value="rating">Sort by Rating</option>
        <option value="experience">By Experience</option>
        <option value="fee_low">Fee: Low to High</option>
        <option value="fee_high">Fee: High to Low</option>
      </select>
      <button class="btn-filter-clear" onclick="clearFilters()"><i class="fas fa-times"></i> Clear</button>
    </div>
    <div class="results-info" id="resultsInfo"></div>
    <div class="doctors-list" id="doctorsList">
      <div class="loading-state"><div class="spinner"></div><p>Finding doctors near you...</p></div>
    </div>
  </div>
</div>

<!-- ═══════════════ AI SYMPTOM CHECKER ═══════════════ -->
<div id="page-aiChecker" class="page">
  <div class="page-header-bg ai-header">
    <div class="container">
      <h1><i class="fas fa-robot"></i> AI Symptom Checker</h1>
      <p>Describe your symptoms and get instant disease predictions with doctor recommendations</p>
    </div>
  </div>
  <div class="container">
    <div class="ai-checker-layout">
      <!-- LEFT: Body Diagram -->
      <div class="body-diagram-panel">
        <h3><i class="fas fa-male"></i> Select Affected Body Part</h3>
        <p class="diagram-hint">Click on the body part to add location context</p>
        <div class="body-diagram-container">
          <svg id="bodyDiagram" viewBox="0 0 200 420" xmlns="http://www.w3.org/2000/svg" class="body-svg">
            <!-- Head -->
            <g class="body-part" id="bp-head" onclick="selectBodyPart('head','Head')" title="Head">
              <ellipse cx="100" cy="40" rx="28" ry="35" fill="#e8d5c4" stroke="#c9a87a" stroke-width="2"/>
              <circle cx="88" cy="35" r="4" fill="#5d4037" opacity="0.7"/>
              <circle cx="112" cy="35" r="4" fill="#5d4037" opacity="0.7"/>
              <path d="M88 50 Q100 58 112 50" stroke="#c9a87a" stroke-width="1.5" fill="none"/>
              <text x="100" y="90" text-anchor="middle" class="body-label">Head</text>
            </g>
            <!-- Neck -->
            <g class="body-part" id="bp-neck" onclick="selectBodyPart('neck','Neck/Throat')" title="Neck">
              <rect x="88" y="72" width="24" height="20" rx="5" fill="#e8d5c4" stroke="#c9a87a" stroke-width="1.5"/>
              <text x="100" y="105" text-anchor="middle" class="body-label">Neck</text>
            </g>
            <!-- Chest -->
            <g class="body-part" id="bp-chest" onclick="selectBodyPart('chest','Chest')" title="Chest">
              <rect x="68" y="92" width="64" height="70" rx="10" fill="#e8d5c4" stroke="#c9a87a" stroke-width="2"/>
              <line x1="100" y1="95" x2="100" y2="158" stroke="#c9a87a" stroke-width="1" stroke-dasharray="3,2"/>
              <path d="M78 108 Q88 104 100 108 Q112 104 122 108" stroke="#c9a87a" stroke-width="1.5" fill="none"/>
              <text x="100" y="175" text-anchor="middle" class="body-label">Chest</text>
            </g>
            <!-- Abdomen -->
            <g class="body-part" id="bp-abdomen" onclick="selectBodyPart('abdomen','Abdomen')" title="Abdomen">
              <rect x="72" y="162" width="56" height="55" rx="8" fill="#e8d5c4" stroke="#c9a87a" stroke-width="2"/>
              <ellipse cx="100" cy="185" rx="5" ry="7" fill="none" stroke="#c9a87a" stroke-width="1"/>
              <text x="100" y="232" text-anchor="middle" class="body-label">Abdomen</text>
            </g>
            <!-- Left Arm -->
            <g class="body-part" id="bp-left-arm" onclick="selectBodyPart('arm','Left Arm')" title="Left Arm">
              <rect x="28" y="92" width="38" height="90" rx="15" fill="#e8d5c4" stroke="#c9a87a" stroke-width="1.5"/>
              <rect x="20" y="182" width="38" height="55" rx="12" fill="#e8d5c4" stroke="#c9a87a" stroke-width="1.5"/>
              <text x="39" y="255" text-anchor="middle" class="body-label">L.Arm</text>
            </g>
            <!-- Right Arm -->
            <g class="body-part" id="bp-right-arm" onclick="selectBodyPart('arm','Right Arm')" title="Right Arm">
              <rect x="134" y="92" width="38" height="90" rx="15" fill="#e8d5c4" stroke="#c9a87a" stroke-width="1.5"/>
              <rect x="142" y="182" width="38" height="55" rx="12" fill="#e8d5c4" stroke="#c9a87a" stroke-width="1.5"/>
              <text x="161" y="255" text-anchor="middle" class="body-label">R.Arm</text>
            </g>
            <!-- Pelvic -->
            <g class="body-part" id="bp-pelvis" onclick="selectBodyPart('pelvis','Pelvic Region')" title="Pelvis">
              <rect x="70" y="217" width="60" height="35" rx="8" fill="#e8d5c4" stroke="#c9a87a" stroke-width="1.5"/>
              <text x="100" y="264" text-anchor="middle" class="body-label">Pelvis</text>
            </g>
            <!-- Left Leg -->
            <g class="body-part" id="bp-left-leg" onclick="selectBodyPart('leg','Left Leg')" title="Left Leg">
              <rect x="68" y="252" width="28" height="90" rx="12" fill="#e8d5c4" stroke="#c9a87a" stroke-width="1.5"/>
              <rect x="62" y="342" width="28" height="60" rx="10" fill="#e8d5c4" stroke="#c9a87a" stroke-width="1.5"/>
              <rect x="55" y="398" width="38" height="18" rx="8" fill="#c9a87a" stroke="#a07855" stroke-width="1"/>
              <text x="76" y="430" text-anchor="middle" class="body-label">L.Leg</text>
            </g>
            <!-- Right Leg -->
            <g class="body-part" id="bp-right-leg" onclick="selectBodyPart('leg','Right Leg')" title="Right Leg">
              <rect x="104" y="252" width="28" height="90" rx="12" fill="#e8d5c4" stroke="#c9a87a" stroke-width="1.5"/>
              <rect x="110" y="342" width="28" height="60" rx="10" fill="#e8d5c4" stroke="#c9a87a" stroke-width="1.5"/>
              <rect x="107" y="398" width="38" height="18" rx="8" fill="#c9a87a" stroke="#a07855" stroke-width="1"/>
              <text x="118" y="430" text-anchor="middle" class="body-label">R.Leg</text>
            </g>
            <!-- Back indicator -->
            <text x="5" y="130" class="body-label small-label" style="font-size:8px;fill:#999">◄Back</text>
          </svg>
          <div class="selected-part-badge" id="selectedPartBadge" style="display:none">
            <i class="fas fa-map-marker-alt"></i> <span id="selectedPartName"></span>
            <button onclick="clearBodyPart()"><i class="fas fa-times"></i></button>
          </div>
        </div>
        <div class="body-legend">
          <div class="legend-item"><div class="legend-color default"></div>Normal</div>
          <div class="legend-item"><div class="legend-color selected"></div>Selected</div>
          <div class="legend-item"><div class="legend-color hover"></div>Hover</div>
        </div>
      </div>

      <!-- RIGHT: Symptom Input -->
      <div class="symptom-input-panel">
        <div class="ai-tabs">
          <button class="ai-tab active" onclick="switchAITab('symptoms', this)"><i class="fas fa-list-ul"></i> Symptoms</button>
          <button class="ai-tab" onclick="switchAITab('disease', this)"><i class="fas fa-search"></i> Search Disease</button>
        </div>

        <!-- Symptoms Tab -->
        <div id="tab-symptoms" class="ai-tab-content active">
          <div class="symptom-input-section">
            <label>Enter your symptoms:</label>
            <div class="symptom-tags-input">
              <div class="symptom-tags" id="symptomTags"></div>
              <input type="text" id="symptomInput" placeholder="Type a symptom and press Enter..." onkeydown="handleSymptomInput(event)">
            </div>
            <div class="symptom-suggestions" id="symptomSuggestions"></div>
          </div>
          <div class="common-symptoms">
            <p>Common symptoms:</p>
            <div class="common-chips" id="commonChips">
              <span onclick="addSymptom('Headache')">Headache</span>
              <span onclick="addSymptom('Fever')">Fever</span>
              <span onclick="addSymptom('Chest pain')">Chest pain</span>
              <span onclick="addSymptom('Cough')">Cough</span>
              <span onclick="addSymptom('Fatigue')">Fatigue</span>
              <span onclick="addSymptom('Nausea')">Nausea</span>
              <span onclick="addSymptom('Dizziness')">Dizziness</span>
              <span onclick="addSymptom('Back pain')">Back pain</span>
              <span onclick="addSymptom('Joint pain')">Joint pain</span>
              <span onclick="addSymptom('Shortness of breath')">Shortness of breath</span>
              <span onclick="addSymptom('Abdominal pain')">Abdominal pain</span>
              <span onclick="addSymptom('Skin rash')">Skin rash</span>
            </div>
          </div>
          <button class="btn-analyze" onclick="analyzeSymptoms()" id="analyzeBtn">
            <i class="fas fa-robot"></i> Analyze Symptoms with AI
          </button>
        </div>

        <!-- Disease Search Tab -->
        <div id="tab-disease" class="ai-tab-content">
          <div class="disease-search-section">
            <label>Search for a specific disease or condition:</label>
            <div class="disease-search-input">
              <i class="fas fa-search"></i>
              <input type="text" id="diseaseSearchInput" placeholder="e.g. Diabetes, Heart Disease, Asthma..." oninput="diseaseSearchSuggest()">
            </div>
            <div class="disease-suggestions" id="diseaseSuggestions"></div>
            <button class="btn-analyze" onclick="searchByDisease()" style="margin-top:1rem">
              <i class="fas fa-search"></i> Find Matching Doctors
            </button>
          </div>
        </div>

        <!-- AI Results -->
        <div id="aiResults" class="ai-results" style="display:none">
          <div class="ai-results-header">
            <h3><i class="fas fa-chart-bar"></i> AI Analysis Results</h3>
            <div id="urgencyAlert" class="urgency-alert"></div>
          </div>
          <div id="aiPredictions" class="ai-predictions"></div>
          <div class="ai-disclaimer"><i class="fas fa-info-circle"></i> This is an AI-based analysis for guidance only. Please consult a qualified doctor for proper diagnosis.</div>
          <div id="matchedDoctorsSection">
            <h3><i class="fas fa-user-md"></i> Recommended Doctors</h3>
            <div id="matchedDoctors" class="doctors-grid"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════ NEARBY SERVICES ═══════════════ -->
<div id="page-nearby" class="page">
  <div class="page-header-bg nearby-header">
    <div class="container">
      <h1><i class="fas fa-map-marker-alt"></i> Nearby Medical Services</h1>
      <p>Find hospitals, diagnostic centres, and pharmacies near you</p>
    </div>
  </div>
  <div class="container">
    <div class="location-bar">
      <div class="location-input-group">
        <i class="fas fa-map-marker-alt"></i>
        <input type="text" id="nearbyLocation" placeholder="Enter your city or enable location..." class="location-input">
      </div>
      <button class="btn-locate" onclick="detectLocation()"><i class="fas fa-crosshairs"></i> Use My Location</button>
      <button class="btn-search-nearby" onclick="searchNearby()"><i class="fas fa-search"></i> Search</button>
    </div>
    <div class="nearby-tabs">
      <button class="nearby-tab active" onclick="switchNearbyTab('hospitals', this)"><i class="fas fa-hospital"></i> Hospitals</button>
      <button class="nearby-tab" onclick="switchNearbyTab('diagnostic', this)"><i class="fas fa-microscope"></i> Diagnostic Centres</button>
      <button class="nearby-tab" onclick="switchNearbyTab('pharmacy', this)"><i class="fas fa-pills"></i> Pharmacies</button>
    </div>
    <div id="tab-hospitals" class="nearby-tab-content active">
      <div id="hospitalsList" class="nearby-grid"><div class="loading-state"><div class="spinner"></div><p>Finding nearby hospitals...</p></div></div>
    </div>
    <div id="tab-diagnostic" class="nearby-tab-content">
      <div id="diagnosticList" class="nearby-grid"></div>
    </div>
    <div id="tab-pharmacy" class="nearby-tab-content">
      <div id="pharmacyList" class="nearby-grid"></div>
    </div>
  </div>
</div>

<!-- ═══════════════ APPOINTMENTS PAGE ═══════════════ -->
<div id="page-appointments" class="page">
  <div class="page-header-bg appt-header">
    <div class="container">
      <h1><i class="fas fa-calendar-check"></i> My Appointments</h1>
      <p>Manage your scheduled appointments</p>
    </div>
  </div>
  <div class="container">
    <div id="appointmentsContent">
      <div class="auth-required-card">
        <i class="fas fa-lock"></i>
        <h3>Login Required</h3>
        <p>Please login to view and manage your appointments</p>
        <button class="btn-primary" onclick="openModal('loginModal')"><i class="fas fa-sign-in-alt"></i> Login Now</button>
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════ DASHBOARD ═══════════════ -->
<div id="page-dashboard" class="page">
  <div class="page-header-bg dashboard-header">
    <div class="container">
      <h1 id="dashboardTitle"><i class="fas fa-tachometer-alt"></i> Dashboard</h1>
      <p id="dashboardSubtitle">Welcome back!</p>
    </div>
  </div>
  <div class="container" id="dashboardContent"></div>
</div>

<!-- ═══════════════ PROFILE PAGE ═══════════════ -->
<div id="page-profile" class="page">
  <div class="page-header-bg profile-header">
    <div class="container">
      <h1><i class="fas fa-user-edit"></i> My Profile</h1>
      <p>Manage your personal information</p>
    </div>
  </div>
  <div class="container" id="profileContent"></div>
</div>

<!-- ═══════════════ DOCTOR DETAIL PAGE ═══════════════ -->
<div id="page-doctorDetail" class="page">
  <div class="container" id="doctorDetailContent"></div>
</div>

<!-- ═══════════════ MODALS ═══════════════ -->
<!-- Login Modal -->
<div class="modal-overlay" id="loginModal" onclick="closeModalOnBg(event,'loginModal')">
  <div class="modal-box">
    <div class="modal-header">
      <div class="modal-logo"><i class="fas fa-sign-in-alt"></i></div>
      <h2>Welcome Back</h2>
      <p>Sign in to your account</p>
      <button class="modal-close" onclick="closeModal('loginModal')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="user-type-toggle">
        <button class="type-btn active" id="login-type-patient" onclick="setLoginType('patient')"><i class="fas fa-user"></i> Patient</button>
        <button class="type-btn" id="login-type-doctor" onclick="setLoginType('doctor')"><i class="fas fa-user-md"></i> Doctor</button>
      </div>
      <div class="form-group">
        <label><i class="fas fa-envelope"></i> Email</label>
        <input type="email" id="loginEmail" placeholder="Enter your email" class="form-input">
      </div>
      <div class="form-group">
        <label><i class="fas fa-lock"></i> Password</label>
        <div class="password-input">
          <input type="password" id="loginPassword" placeholder="Enter your password" class="form-input">
          <button type="button" onclick="togglePasswordVisibility('loginPassword')"><i class="fas fa-eye"></i></button>
        </div>
      </div>
      <div id="loginError" class="form-error" style="display:none"></div>
      <button class="btn-modal-primary" onclick="login()" id="loginBtn">
        <span class="btn-text"><i class="fas fa-sign-in-alt"></i> Sign In</span>
        <span class="btn-loading" style="display:none"><i class="fas fa-spinner fa-spin"></i> Signing in...</span>
      </button>
      <div class="modal-footer-text">
        Don't have an account? <a onclick="switchToRegister()" href="#">Register here</a>
      </div>
    </div>
  </div>
</div>

<!-- Register Modal -->
<div class="modal-overlay" id="registerModal" onclick="closeModalOnBg(event,'registerModal')">
  <div class="modal-box modal-wide">
    <div class="modal-header">
      <div class="modal-logo"><i class="fas fa-user-plus"></i></div>
      <h2>Create Account</h2>
      <p>Join the MyDoctor's community</p>
      <button class="modal-close" onclick="closeModal('registerModal')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="user-type-toggle">
        <button class="type-btn active" id="reg-type-patient" onclick="setRegisterType('patient')"><i class="fas fa-user"></i> I'm a Patient</button>
        <button class="type-btn" id="reg-type-doctor" onclick="setRegisterType('doctor')"><i class="fas fa-user-md"></i> I'm a Doctor</button>
      </div>

      <!-- Patient Registration Form -->
      <div id="patientRegForm">
        <div class="form-grid-2">
          <div class="form-group"><label>Full Name *</label><input type="text" id="pat_name" placeholder="Your full name" class="form-input"></div>
          <div class="form-group"><label>Email *</label><input type="email" id="pat_email" placeholder="your@email.com" class="form-input"></div>
          <div class="form-group"><label>Password *</label>
            <div class="password-input"><input type="password" id="pat_password" placeholder="Create password" class="form-input"><button type="button" onclick="togglePasswordVisibility('pat_password')"><i class="fas fa-eye"></i></button></div></div>
          <div class="form-group"><label>Phone</label><input type="tel" id="pat_phone" placeholder="+91 XXXXX XXXXX" class="form-input"></div>
          <div class="form-group"><label>Date of Birth</label><input type="date" id="pat_dob" class="form-input"></div>
          <div class="form-group"><label>Gender</label>
            <select id="pat_gender" class="form-input"><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div>
          <div class="form-group"><label>Blood Group</label>
            <select id="pat_blood" class="form-input"><option value="">Select</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option></select></div>
          <div class="form-group"><label>City</label><input type="text" id="pat_city" placeholder="Your city" class="form-input"></div>
          <div class="form-group"><label>State</label><input type="text" id="pat_state" placeholder="Your state" class="form-input"></div>
          <div class="form-group"><label>Pincode</label><input type="text" id="pat_pincode" placeholder="Pincode" class="form-input"></div>
        </div>
      </div>

      <!-- Doctor Registration Form -->
      <div id="doctorRegForm" style="display:none">
        <div class="form-grid-2">
          <div class="form-group"><label>Full Name *</label><input type="text" id="doc_name" placeholder="Dr. Full Name" class="form-input"></div>
          <div class="form-group"><label>Email *</label><input type="email" id="doc_email" placeholder="doctor@email.com" class="form-input"></div>
          <div class="form-group"><label>Password *</label>
            <div class="password-input"><input type="password" id="doc_password" placeholder="Create password" class="form-input"><button type="button" onclick="togglePasswordVisibility('doc_password')"><i class="fas fa-eye"></i></button></div></div>
          <div class="form-group"><label>Phone</label><input type="tel" id="doc_phone" placeholder="+91 XXXXX XXXXX" class="form-input"></div>
          <div class="form-group"><label>Specialization *</label>
            <select id="doc_spec" class="form-input">
              <option value="">Select Specialization</option>
              <option>Cardiologist</option><option>Neurologist</option><option>Orthopedic</option>
              <option>Dermatologist</option><option>Gynecologist</option><option>Pulmonologist</option>
              <option>Endocrinologist</option><option>Gastroenterologist</option><option>General Physician</option>
              <option>Pediatrician</option><option>Psychiatrist</option><option>Ophthalmologist</option>
              <option>ENT Specialist</option><option>Urologist</option><option>Oncologist</option>
            </select>
          </div>
          <div class="form-group"><label>Years of Experience</label><input type="number" id="doc_exp" placeholder="e.g. 10" class="form-input"></div>
          <div class="form-group"><label>Qualification</label><input type="text" id="doc_qual" placeholder="e.g. MD, MBBS, MS" class="form-input"></div>
          <div class="form-group"><label>Consultation Fee (₹)</label><input type="number" id="doc_fee" placeholder="e.g. 500" class="form-input"></div>
          <div class="form-group"><label>Hospital/Clinic Name *</label><input type="text" id="doc_hospital" placeholder="Hospital name" class="form-input"></div>
          <div class="form-group"><label>Hospital Address</label><input type="text" id="doc_address" placeholder="Full address" class="form-input"></div>
          <div class="form-group"><label>City *</label><input type="text" id="doc_city" placeholder="City" class="form-input"></div>
          <div class="form-group"><label>State</label><input type="text" id="doc_state" placeholder="State" class="form-input"></div>
        </div>
        <div class="form-group"><label>Bio / About</label><textarea id="doc_bio" placeholder="Brief description about yourself and expertise..." class="form-input form-textarea" rows="3"></textarea></div>
      </div>

      <div id="registerError" class="form-error" style="display:none"></div>
      <button class="btn-modal-primary" onclick="register()" id="registerBtn">
        <span class="btn-text"><i class="fas fa-user-plus"></i> Create Account</span>
        <span class="btn-loading" style="display:none"><i class="fas fa-spinner fa-spin"></i> Creating...</span>
      </button>
      <div class="modal-footer-text">Already have an account? <a onclick="switchToLogin()" href="#">Login here</a></div>
    </div>
  </div>
</div>

<!-- Booking Modal -->
<div class="modal-overlay" id="bookingModal" onclick="closeModalOnBg(event,'bookingModal')">
  <div class="modal-box modal-wide">
    <div class="modal-header">
      <div class="modal-logo green"><i class="fas fa-calendar-plus"></i></div>
      <h2>Book Appointment</h2>
      <p id="bookingDoctorName">Select date & time</p>
      <button class="modal-close" onclick="closeModal('bookingModal')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="booking-doctor-info" id="bookingDoctorInfo"></div>
      <div class="form-grid-2">
        <div class="form-group">
          <label><i class="fas fa-calendar"></i> Appointment Date *</label>
          <input type="date" id="bookingDate" class="form-input" onchange="loadTimeSlots()">
        </div>
        <div class="form-group">
          <label><i class="fas fa-clock"></i> Available Time Slots</label>
          <div class="time-slots-grid" id="timeSlots"></div>
        </div>
      </div>
      <div class="form-group">
        <label><i class="fas fa-comment-medical"></i> Reason for Visit</label>
        <input type="text" id="bookingReason" placeholder="Brief reason for appointment..." class="form-input">
      </div>
      <div class="form-group">
        <label><i class="fas fa-list-ul"></i> Symptoms (optional)</label>
        <input type="text" id="bookingSymptoms" placeholder="Describe your symptoms..." class="form-input">
      </div>
      <div id="bookingError" class="form-error" style="display:none"></div>
      <button class="btn-modal-primary" onclick="confirmBooking()" id="bookingBtn">
        <span class="btn-text"><i class="fas fa-check-circle"></i> Confirm Appointment</span>
        <span class="btn-loading" style="display:none"><i class="fas fa-spinner fa-spin"></i> Booking...</span>
      </button>
    </div>
  </div>
</div>

<!-- Toast Notification -->
<div id="toast" class="toast"></div>

<!-- Footer -->
<footer class="footer">
  <div class="footer-container">
    <div class="footer-grid">
      <div class="footer-brand">
        <div class="footer-logo"><i class="fas fa-heartbeat"></i> MyDoctor's</div>
        <p>Your trusted healthcare companion. Find the best doctors, book appointments and access medical services near you.</p>
        <div class="social-links">
          <a href="#"><i class="fab fa-facebook"></i></a>
          <a href="#"><i class="fab fa-twitter"></i></a>
          <a href="#"><i class="fab fa-instagram"></i></a>
          <a href="#"><i class="fab fa-linkedin"></i></a>
        </div>
      </div>
      <div class="footer-links">
        <h4>For Patients</h4>
        <a onclick="showPage('findDoctors')" href="#">Find Doctors</a>
        <a onclick="showPage('aiChecker')" href="#">AI Symptom Checker</a>
        <a onclick="showPage('nearby')" href="#">Nearby Services</a>
        <a onclick="showPage('appointments')" href="#">My Appointments</a>
      </div>
      <div class="footer-links">
        <h4>For Doctors</h4>
        <a onclick="openModal('registerModal')" href="#">Join as Doctor</a>
        <a onclick="showPage('dashboard')" href="#">Doctor Dashboard</a>
        <a href="#">Doctor App</a>
      </div>
      <div class="footer-links">
        <h4>Specializations</h4>
        <a onclick="filterBySpec('Cardiologist')" href="#">Cardiology</a>
        <a onclick="filterBySpec('Neurologist')" href="#">Neurology</a>
        <a onclick="filterBySpec('Orthopedic')" href="#">Orthopedics</a>
        <a onclick="filterBySpec('Dermatologist')" href="#">Dermatology</a>
        <a onclick="filterBySpec('Gynecologist')" href="#">Gynecology</a>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2025 MyDoctor's. All rights reserved. | Built with ❤️ for better healthcare</p>
      <div class="footer-badge"><i class="fas fa-shield-alt"></i> SSL Secured <i class="fas fa-lock"></i> Data Protected</div>
    </div>
  </div>
</footer>

<script src="/static/app.js"></script>
</body>
</html>`)
})

export default app
