import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
  GEMINI_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Session-Token']
}))

// ─── UTILITY FUNCTIONS ───────────────────────────────────────────────────────
function safeJson(val: any, fallback: any): any {
  if (!val) return fallback
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return fallback }
}

// ─── SYMPTOM / DISEASE → SPECIALIZATION MAP ──────────────────────────────────
// Maps common layperson search terms to doctor specializations stored in the DB.
// Used by /api/doctors to expand a search term into relevant specializations.
// Keys use DB-exact specialization strings so LIKE '%value%' matches correctly.
const SYMPTOM_SPEC_MAP: Record<string, string[]> = {
  // ── Cardiac / Heart ──────────────────────────────────────────────
  'heart':              ['Cardiologist','Cardiovascular Surgeon'],
  'cardiac':            ['Cardiologist','Cardiovascular Surgeon'],
  'chest pain':         ['Cardiologist','General Medicine'],
  'chest':              ['Cardiologist','General Medicine'],
  'palpitation':        ['Cardiologist'],
  'blood pressure':     ['Cardiologist','General Medicine','Nephrologist'],
  'hypertension':       ['Cardiologist','General Medicine','Nephrologist'],
  'cholesterol':        ['Cardiologist','General Medicine'],
  'cardiolog':          ['Cardiologist'],
  'cardiovascular':     ['Cardiologist','Cardiovascular Surgeon'],
  'interventional':     ['Cardiologist'],
  // ── Orthopaedic ─────────────────────────────────────────────────
  'bone':               ['Orthopaedic','Orthopedic'],
  'joint':              ['Orthopaedic','Orthopedic','General Medicine'],
  'knee':               ['Orthopaedic','Orthopedic'],
  'back pain':          ['Orthopaedic','Orthopedic','Neurosurgeon'],
  'spine':              ['Orthopaedic','Orthopedic','Neurosurgeon'],
  'fracture':           ['Orthopaedic','Orthopedic'],
  'shoulder':           ['Orthopaedic','Orthopedic'],
  'hip':                ['Orthopaedic','Orthopedic'],
  'sports':             ['Orthopaedic','Orthopedic'],
  'arthritis':          ['Orthopaedic','Orthopedic','General Medicine'],
  'ligament':           ['Orthopaedic','Orthopedic'],
  'ortho':              ['Orthopaedic','Orthopedic'],
  'joint replacement':  ['Orthopaedic','Orthopedic'],
  // ── OBG / Women ─────────────────────────────────────────────────
  'pregnancy':          ['Gynecologist'],
  'gynecolog':          ['Gynecologist'],
  'obstetrics':         ['Gynecologist'],
  'gynae':              ['Gynecologist'],
  'obg':                ['Gynecologist'],
  'women':              ['Gynecologist'],
  'menstrual':          ['Gynecologist'],
  'uterus':             ['Gynecologist'],
  'fetal':              ['Gynecologist'],
  'delivery':           ['Gynecologist'],
  'gynaecolog':         ['Gynecologist'],
  // ── Paediatrics ─────────────────────────────────────────────────
  'child':              ['Pediatrician','Pediatric Surgeon','Pediatric Cardiologist'],
  'baby':               ['Pediatrician','Pediatric Surgeon'],
  'infant':             ['Pediatrician','Pediatric Surgeon'],
  'kids':               ['Pediatrician','Pediatric Surgeon'],
  'newborn':            ['Pediatrician'],
  'paediatr':           ['Pediatrician','Pediatric Surgeon','Pediatric Cardiologist'],
  'pediatr':            ['Pediatrician','Pediatric Surgeon','Pediatric Cardiologist'],
  // ── Neuro ────────────────────────────────────────────────────────
  'brain':              ['Neurosurgeon','Neurologist'],
  'headache':           ['Neurologist','Neurosurgeon','General Medicine'],
  'stroke':             ['Neurologist','Neurosurgeon'],
  'seizure':            ['Neurologist','Neurosurgeon'],
  'epilepsy':           ['Neurologist','Neurosurgeon'],
  'nerve':              ['Neurologist','Neurosurgeon'],
  'paralysis':          ['Neurologist','Neurosurgeon'],
  'neuro':              ['Neurologist','Neurosurgeon'],
  'neurosurg':          ['Neurosurgeon'],
  'neurolog':           ['Neurologist'],
  'migraine':           ['Neurologist','General Medicine'],
  'parkinson':          ['Neurologist'],
  'dementia':           ['Neurologist'],
  'neuropathy':         ['Neurologist'],
  'multiple sclerosis': ['Neurologist'],
  'vertigo':            ['Neurologist','ENT'],
  // ── Kidney / Nephrology ──────────────────────────────────────────
  'kidney':             ['Nephrologist','Urologist'],
  'renal':              ['Nephrologist'],
  'dialysis':           ['Nephrologist'],
  'nephr':              ['Nephrologist'],
  // ── Urology ──────────────────────────────────────────────────────
  'urine':              ['Urologist','Nephrologist'],
  'prostate':           ['Urologist'],
  'bladder':            ['Urologist'],
  'urolog':             ['Urologist','Nephrologist'],
  'kidney stone':       ['Urologist','Nephrologist'],
  // ── Gastroenterology ─────────────────────────────────────────────
  'stomach':            ['Gastroenterologist','General Medicine'],
  'liver':              ['Gastroenterologist','General Medicine'],
  'digestion':          ['Gastroenterologist','General Medicine'],
  'gastro':             ['Gastroenterologist'],
  'abdom':              ['Gastroenterologist','General Surgeon'],
  'gut':                ['Gastroenterologist'],
  'acidity':            ['Gastroenterologist','General Medicine'],
  'gastroenterolog':    ['Gastroenterologist'],
  // ── Cancer / Oncology ────────────────────────────────────────────
  'cancer':             ['Oncologist'],
  'tumor':              ['Oncologist'],
  'oncolog':            ['Oncologist'],
  // ── General / Fever ──────────────────────────────────────────────
  'fever':              ['General Medicine'],
  'cold':               ['General Medicine'],
  'flu':                ['General Medicine'],
  'fatigue':            ['General Medicine'],
  'diabetes':           ['General Medicine'],
  'thyroid':            ['General Medicine'],
  'hormone':            ['General Medicine'],
  'general medicine':   ['General Medicine'],
  'diabetolog':         ['General Medicine'],
  // ── Skin / Dermatology ───────────────────────────────────────────
  'skin':               ['Dermatologist'],
  'rash':               ['Dermatologist','General Medicine'],
  'acne':               ['Dermatologist'],
  'eczema':             ['Dermatologist'],
  'psoriasis':          ['Dermatologist'],
  'dermatolog':         ['Dermatologist'],
  // ── Eye / Ophthalmology ──────────────────────────────────────────
  'eye':                ['Ophthalmologist'],
  'vision':             ['Ophthalmologist'],
  'cataract':           ['Ophthalmologist'],
  'glaucoma':           ['Ophthalmologist'],
  'ophthal':            ['Ophthalmologist'],
  // ── ENT ──────────────────────────────────────────────────────────
  'ear':                ['ENT'],
  'nose':               ['ENT'],
  'throat':             ['ENT','General Medicine'],
  'hearing':            ['ENT'],
  'tonsil':             ['ENT'],
  'ent':                ['ENT'],
  // ── Surgery ──────────────────────────────────────────────────────
  'surgery':            ['General Surgeon','Plastic Surgeon','Neurosurgeon'],
  'hernia':             ['General Surgeon'],
  'appendix':           ['General Surgeon'],
  'gallstone':          ['General Surgeon'],
  'plastic':            ['Plastic Surgeon'],
  // ── Dental ───────────────────────────────────────────────────────
  'dental':             ['Dentist'],
  'tooth':              ['Dentist'],
  'teeth':              ['Dentist'],
  'gum':                ['Dentist'],
  // ── Radiology ────────────────────────────────────────────────────
  'radiology':          ['Interventional Radiologist'],
  'scan':               ['Interventional Radiologist'],
  'mri':                ['Interventional Radiologist'],
  // ── Psychiatry / Mental Health ────────────────────────────────────
  'mental':             ['Psychiatrist'],
  'depression':         ['Psychiatrist'],
  'anxiety':            ['Psychiatrist'],
  'psychiatr':          ['Psychiatrist'],
  // ── Respiratory ──────────────────────────────────────────────────
  'lung':               ['Pulmonologist'],
  'breath':             ['Pulmonologist','General Medicine'],
  'asthma':             ['Pulmonologist','General Medicine'],
  'respiratory':        ['Pulmonologist'],
  'pulmonolog':         ['Pulmonologist'],
  // ── Anaesthesia ──────────────────────────────────────────────────
  'anaesthesia':        ['Anaesthesiologist'],
}

// Returns an array of specialization substrings that match the search term
function resolveSpecializations(term: string): string[] {
  const lower = term.toLowerCase().trim()
  if (!lower) return []
  const specs = new Set<string>()
  for (const [key, vals] of Object.entries(SYMPTOM_SPEC_MAP)) {
    if (lower.includes(key) || key.includes(lower)) {
      vals.forEach(v => specs.add(v))
    }
  }
  return Array.from(specs)
}

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
  },
  "Typhoid": {
    symptoms: ["prolonged fever", "abdominal pain", "headache", "fatigue", "loss of appetite", "rose spots", "constipation", "diarrhea", "weakness"],
    specialization: "General Physician", description: "Bacterial infection caused by Salmonella typhi", urgency: "high", bodyPart: "abdomen"
  },
  "Malaria": {
    symptoms: ["cyclical fever", "chills", "sweating", "headache", "nausea", "vomiting", "muscle pain", "fatigue", "anemia"],
    specialization: "General Physician", description: "Mosquito-borne parasitic infection", urgency: "high", bodyPart: "general"
  },
  "Kidney Stones": {
    symptoms: ["severe flank pain", "pain radiating to groin", "blood in urine", "nausea", "vomiting", "frequent urination", "burning urination"],
    specialization: "General Physician", description: "Solid mineral deposits in kidneys causing pain", urgency: "high", bodyPart: "abdomen"
  },
  "Appendicitis": {
    symptoms: ["right lower abdominal pain", "nausea", "vomiting", "fever", "loss of appetite", "tenderness", "rebound tenderness"],
    specialization: "General Physician", description: "Inflammation of the appendix — requires emergency surgery", urgency: "emergency", bodyPart: "abdomen"
  },
  "Glaucoma": {
    symptoms: ["eye pain", "blurred vision", "headache", "nausea", "rainbow halos", "vision loss", "eye redness"],
    specialization: "Ophthalmologist", description: "Eye condition damaging the optic nerve", urgency: "high", bodyPart: "head"
  },
  "Cataracts": {
    symptoms: ["blurred vision", "faded colors", "glare sensitivity", "double vision", "frequent prescription changes", "night vision difficulty"],
    specialization: "Ophthalmologist", description: "Clouding of the eye's natural lens", urgency: "low", bodyPart: "head"
  },
  "Anemia": {
    symptoms: ["fatigue", "weakness", "pale skin", "shortness of breath", "dizziness", "cold hands", "chest pain", "headache", "brittle nails"],
    specialization: "General Physician", description: "Low red blood cell count reducing oxygen delivery", urgency: "moderate", bodyPart: "general"
  },
  "Anxiety Disorder": {
    symptoms: ["excessive worry", "restlessness", "fatigue", "difficulty concentrating", "muscle tension", "sleep problems", "palpitations", "sweating"],
    specialization: "Psychiatrist", description: "Mental health condition causing excessive anxiety", urgency: "moderate", bodyPart: "general"
  },
  "Depression": {
    symptoms: ["persistent sadness", "loss of interest", "fatigue", "sleep changes", "appetite changes", "difficulty concentrating", "feelings of worthlessness", "hopelessness"],
    specialization: "Psychiatrist", description: "Mental health condition affecting mood and daily function", urgency: "moderate", bodyPart: "general"
  },
  "Sleep Apnea": {
    symptoms: ["loud snoring", "gasping during sleep", "morning headache", "excessive daytime sleepiness", "dry mouth", "difficulty concentrating", "mood changes"],
    specialization: "Pulmonologist", description: "Sleep disorder causing repeated breathing interruptions", urgency: "moderate", bodyPart: "chest"
  },
  "Gallstones": {
    symptoms: ["upper right abdominal pain", "pain after fatty meal", "nausea", "vomiting", "back pain between shoulders", "jaundice", "fever"],
    specialization: "Gastroenterologist", description: "Hard deposits in the gallbladder", urgency: "moderate", bodyPart: "abdomen"
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
    let exactMatches = 0
    let partialMatches = 0

    for (const symptom of normalizedSymptoms) {
      for (const ds of diseaseSymptoms) {
        if (ds === symptom) {
          score += 4; exactMatches++  // exact match — strongest signal
        } else if (ds.includes(symptom) || symptom.includes(ds)) {
          score += 2.5; exactMatches++  // substring match — strong
        } else {
          // Word-level partial match
          const sWords = symptom.split(' ').filter(w => w.length > 3)
          const dsWords = ds.split(' ').filter(w => w.length > 3)
          const wordOverlap = sWords.filter(w => dsWords.some(dw => dw.includes(w) || w.includes(dw))).length
          if (wordOverlap > 0) {
            score += wordOverlap * 1.2; partialMatches++
          }
        }
      }
    }

    // Penalize if very few symptoms match (avoid false positives)
    const matchRatio = exactMatches / Math.max(normalizedSymptoms.length, 1)
    if (matchRatio < 0.2 && partialMatches === 0) {
      score = 0  // Too few matches — discard
    }

    // Body part bonus — significant boost when body part matches
    if (bodyPart && data.bodyPart) {
      const bodyPartMap: Record<string, string[]> = {
        'head': ['head', 'brain', 'face', 'eye', 'ear'],
        'neck': ['neck', 'throat', 'thyroid'],
        'chest': ['chest', 'heart', 'lungs', 'breast'],
        'abdomen': ['abdomen', 'stomach', 'liver', 'pelvis', 'kidney'],
        'back': ['back', 'spine', 'lumbar'],
        'arm': ['arm', 'limbs', 'elbow', 'wrist', 'shoulder'],
        'leg': ['leg', 'limbs', 'knee', 'ankle', 'foot'],
        'pelvis': ['pelvis', 'abdomen', 'reproductive'],
        'skin': ['skin', 'general'],
        'general': ['general']
      }
      const bpLower = bodyPart.toLowerCase()
      for (const [bpKey, bpAliases] of Object.entries(bodyPartMap)) {
        if (bpAliases.some(a => bpLower.includes(a) || a.includes(bpLower))) {
          if (data.bodyPart === bpKey || bpAliases.some(a => data.bodyPart?.includes(a))) {
            score += 5  // Strong body-part boost
          }
        }
      }
    }

    if (score > 0) {
      const maxPossible = Math.min(normalizedSymptoms.length, data.symptoms.length) * 4
      const rawPercent = Math.min(97, Math.round((score / Math.max(maxPossible, 4)) * 110))
      scores[disease] = Math.max(20, rawPercent)  // Floor at 20 if there's any match
    }
  }

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .filter(([, score]) => score >= 25)

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
    const { specialization, city, disease, search, hospital, limit = '50', offset = '0' } = c.req.query()

    // Build base query with hospital join
    const baseSelect = `SELECT d.*, h.name as hospital_name_db, h.area as hospital_area, h.city as hospital_city
      FROM doctors d
      LEFT JOIN hospitals h ON d.hospital_id = h.id
      WHERE d.is_active = 1`

    let conditions = ''
    const params: any[] = []

    // Explicit specialization filter (from dropdown)
    if (specialization) {
      conditions += ' AND d.specialization LIKE ?'
      params.push(`%${specialization}%`)
    }

    // City filter
    if (city) {
      conditions += ' AND (h.city LIKE ? OR d.city LIKE ?)'
      params.push(`%${city}%`, `%${city}%`)
    }

    // Hospital name filter
    if (hospital) {
      conditions += ' AND (h.name LIKE ? OR d.hospital_name LIKE ?)'
      params.push(`%${hospital}%`, `%${hospital}%`)
    }

    // Smart search: resolves symptoms/diseases to specializations
    if (search) {
      const resolvedSpecs = resolveSpecializations(search)
      if (resolvedSpecs.length > 0) {
        // When symptom/disease resolved → match name OR resolved specializations only
        // Do NOT match h.name here — would pull unrelated doctors from "Heart Hospital"
        const specConditions = resolvedSpecs.map(() => 'd.specialization LIKE ?').join(' OR ')
        conditions += ` AND (d.name LIKE ? OR ${specConditions})`
        params.push(`%${search}%`)
        resolvedSpecs.forEach(s => params.push(`%${s}%`))
      } else {
        // Fallback: text search on name, hospital, specialization, diseases_treated
        conditions += ' AND (d.name LIKE ? OR d.hospital_name LIKE ? OR d.specialization LIKE ? OR d.diseases_treated LIKE ? OR h.name LIKE ?)'
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
      }
    }

    // Disease filter (from legacy disease param)
    if (disease) {
      const resolvedSpecs = resolveSpecializations(disease)
      if (resolvedSpecs.length > 0) {
        const specConditions = resolvedSpecs.map(() => 'd.specialization LIKE ?').join(' OR ')
        conditions += ` AND (d.diseases_treated LIKE ? OR ${specConditions})`
        params.push(`%${disease}%`)
        resolvedSpecs.forEach(s => params.push(`%${s}%`))
      } else {
        conditions += ' AND (d.diseases_treated LIKE ? OR d.specialization LIKE ?)'
        params.push(`%${disease}%`, `%${disease}%`)
      }
    }

    const query = baseSelect + conditions +
      ' ORDER BY d.is_verified DESC, d.rating DESC, d.total_ratings DESC' +
      ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`

    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    const doctors = results.map((d: any) => ({
      ...d,
      // Use joined hospital name if available, fall back to stored hospital_name
      hospital_name: d.hospital_name_db || d.hospital_name || 'Private Clinic',
      city: d.hospital_city || d.city || '',
      area: d.hospital_area || d.area || '',
      sub_specializations: safeJson(d.sub_specializations, []),
      available_days: safeJson(d.available_days, []),
      available_times: safeJson(d.available_times, []),
      languages: safeJson(d.languages, []),
      diseases_treated: safeJson(d.diseases_treated, []),
      opd_schedule: safeJson(d.opd_schedule, []),
      awards: safeJson(d.awards, []),
      publications: safeJson(d.publications, []),
      user_id: undefined,
      hospital_name_db: undefined,
      hospital_area: undefined,
      hospital_city: undefined
    }))

    return c.json({ success: true, doctors, total: doctors.length })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.get('/api/doctors/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const doctor = await c.env.DB.prepare(`
      SELECT d.*, h.name as hospital_name_db, h.area as hospital_area, h.city as hospital_city,
             h.address as hospital_address, h.phone as hospital_phone, h.website as hospital_website,
             h.google_maps_url as hospital_maps_url, h.emergency as hospital_emergency
      FROM doctors d
      LEFT JOIN hospitals h ON d.hospital_id = h.id
      WHERE d.id = ? AND d.is_active = 1
    `).bind(id).first() as any
    if (!doctor) return c.json({ success: false, error: 'Doctor not found' }, 404)

    // Get all hospital links for this doctor
    const links = await c.env.DB.prepare(`
      SELECT dhl.*, h.name as h_name, h.area as h_area, h.city as h_city, h.address as h_address,
             h.phone as h_phone, h.google_maps_url as h_maps_url
      FROM doctor_hospital_links dhl
      JOIN hospitals h ON dhl.hospital_id = h.id
      WHERE dhl.doctor_id = ? AND dhl.is_active = 1
    `).bind(id).all()

    const reviews = await c.env.DB.prepare(
      'SELECT r.*, p.name as patient_name FROM reviews r JOIN patients p ON r.patient_id = p.id WHERE r.doctor_id = ? ORDER BY r.created_at DESC LIMIT 10'
    ).bind(id).all()

    return c.json({
      success: true,
      doctor: {
        ...doctor,
        hospital_name: doctor.hospital_name_db || doctor.hospital_name || 'Private Clinic',
        city: doctor.hospital_city || doctor.city || '',
        area: doctor.hospital_area || '',
        sub_specializations: safeJson(doctor.sub_specializations, []),
        available_days: safeJson(doctor.available_days, []),
        available_times: safeJson(doctor.available_times, []),
        languages: safeJson(doctor.languages, []),
        diseases_treated: safeJson(doctor.diseases_treated, []),
        opd_schedule: safeJson(doctor.opd_schedule, []),
        awards: safeJson(doctor.awards, []),
        publications: safeJson(doctor.publications, []),
        hospital_links: (links.results || []).map((l: any) => ({
          ...l,
          opd_days: safeJson(l.opd_days, [])
        })),
        user_id: undefined,
        hospital_name_db: undefined,
        hospital_area: undefined,
        hospital_city: undefined
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
// ─── HOSPITALS API ────────────────────────────────────────────────────────────
app.get('/api/hospitals', async (c) => {
  try {
    const { city, type, emergency, specialty, search, limit = '50', offset = '0' } = c.req.query()
    let query = 'SELECT * FROM hospitals WHERE is_active = 1'
    const params: any[] = []

    if (city) { query += ' AND city LIKE ?'; params.push(`%${city}%`) }
    if (type) { query += ' AND type = ?'; params.push(type) }
    if (emergency === '1') { query += ' AND emergency = 1' }
    if (specialty) { query += ' AND specialties LIKE ?'; params.push(`%${specialty}%`) }
    if (search) {
      query += ' AND (name LIKE ? OR area LIKE ? OR specialties LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY emergency DESC, rating DESC, name ASC'
    query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`

    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    const hospitals = results.map((h: any) => ({
      ...h,
      specialties: safeJson(h.specialties, []),
      departments: safeJson(h.departments, []),
      facilities: safeJson(h.facilities, []),
      opd_details: safeJson(h.opd_details, null),
      emergency: !!h.emergency,
      icu_available: !!h.icu_available,
      blood_bank: !!h.blood_bank,
      ambulance: !!h.ambulance
    }))

    return c.json({ success: true, hospitals, total: hospitals.length })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.get('/api/hospitals/:id', async (c) => {
  try {
    const id = c.req.param('id')
    // Support lookup by numeric id or hospital_id slug
    const hospital = await c.env.DB.prepare(
      'SELECT * FROM hospitals WHERE (id = ? OR hospital_id = ?) AND is_active = 1'
    ).bind(id, id).first() as any
    if (!hospital) return c.json({ success: false, error: 'Hospital not found' }, 404)

    // Get connected doctors for this hospital
    const doctorsQ = await c.env.DB.prepare(`
      SELECT d.id, d.name, d.specialization, d.qualification, d.experience_years,
             d.consultation_fee, d.is_verified, d.rating, d.total_ratings,
             dhl.department, dhl.opd_days, dhl.opd_times, dhl.designation
      FROM doctors d
      JOIN doctor_hospital_links dhl ON dhl.doctor_id = d.id
      WHERE dhl.hospital_id = ? AND d.is_active = 1 AND dhl.is_active = 1
      ORDER BY d.specialization, d.name
    `).bind(hospital.id).all()

    return c.json({
      success: true,
      hospital: {
        ...hospital,
        specialties: safeJson(hospital.specialties, []),
        departments: safeJson(hospital.departments, []),
        facilities: safeJson(hospital.facilities, []),
        opd_details: safeJson(hospital.opd_details, null),
        emergency: !!hospital.emergency,
        icu_available: !!hospital.icu_available,
        blood_bank: !!hospital.blood_bank,
        ambulance: !!hospital.ambulance
      },
      doctors: (doctorsQ.results || []).map((d: any) => ({
        ...d,
        opd_days: safeJson(d.opd_days, [])
      }))
    })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// Legacy nearby endpoint — now powered by real D1 hospitals table
app.get('/api/nearby/hospitals', async (c) => {
  try {
    const { city } = c.req.query()
    let query = 'SELECT * FROM hospitals WHERE is_active = 1'
    const params: any[] = []
    if (city) { query += ' AND city LIKE ?'; params.push(`%${city}%`) }
    query += ' ORDER BY emergency DESC, rating DESC LIMIT 30'

    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    const hospitals = results.map((h: any) => ({
      ...h,
      specialties: safeJson(h.specialties, []),
      facilities: safeJson(h.facilities, []),
      emergency: !!h.emergency
    }))

    // Keep backward-compat shape: scanCentres and pharmacies remain empty for now
    return c.json({ success: true, hospitals, scanCentres: [], pharmacies: [], total: hospitals.length })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ─── MEDICAL REPORTS ROUTES ──────────────────────────────────────────────────
app.get('/api/reports', async (c) => {
  try {
    const token = c.req.header('X-Session-Token')
    const session = await getSession(c.env.DB, token || '')
    if (!session) return c.json({ success: false, error: 'Unauthorized' }, 401)

    let results
    if (session.user_type === 'patient') {
      const q = await c.env.DB.prepare(`
        SELECT r.*, d.name as doctor_name, d.specialization
        FROM medical_reports r
        LEFT JOIN doctors d ON r.doctor_id = d.id
        WHERE r.patient_id = ?
        ORDER BY r.report_date DESC
      `).bind(session.user_id).all()
      results = q.results
    } else {
      const q = await c.env.DB.prepare(`
        SELECT r.*, p.name as patient_name, p.phone as patient_phone
        FROM medical_reports r
        JOIN patients p ON r.patient_id = p.id
        WHERE r.doctor_id = ?
        ORDER BY r.created_at DESC
      `).bind(session.user_id).all()
      results = q.results
    }

    const reports = results.map((r: any) => ({
      ...r,
      tags: JSON.parse(r.tags || '[]')
    }))

    return c.json({ success: true, reports })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.post('/api/reports', async (c) => {
  try {
    const token = c.req.header('X-Session-Token')
    const session = await getSession(c.env.DB, token || '')
    if (!session) return c.json({ success: false, error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const { report_type, report_title, report_date, description, findings,
            file_url, file_name, lab_name, patient_id, appointment_id, is_critical, tags } = body

    if (!report_title || !report_type) return c.json({ success: false, error: 'Title and type required' }, 400)

    const reportId = generateId('RPT').toUpperCase().substring(0, 14)
    const pId = session.user_type === 'patient' ? session.user_id : (patient_id || '')
    const dId = session.user_type === 'doctor' ? session.user_id : null

    if (!pId) return c.json({ success: false, error: 'Patient ID required' }, 400)

    await c.env.DB.prepare(`
      INSERT INTO medical_reports
        (report_id, patient_id, doctor_id, appointment_id, report_type, report_title, report_date,
         description, findings, file_url, file_name, lab_name, is_critical, tags, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
    `).bind(
      reportId, pId, dId, appointment_id || null,
      report_type, report_title, report_date || new Date().toISOString().split('T')[0],
      description || '', findings || '', file_url || '', file_name || '',
      lab_name || '', is_critical ? 1 : 0, JSON.stringify(tags || [])
    ).run()

    return c.json({ success: true, report_id: reportId, message: 'Report saved successfully' })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.delete('/api/reports/:id', async (c) => {
  try {
    const token = c.req.header('X-Session-Token')
    const session = await getSession(c.env.DB, token || '')
    if (!session) return c.json({ success: false, error: 'Unauthorized' }, 401)
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM medical_reports WHERE id = ? AND patient_id = ?').bind(id, session.user_id).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ─── PRESCRIPTION ROUTES ──────────────────────────────────────────────────────
app.get('/api/prescriptions', async (c) => {
  try {
    const token = c.req.header('X-Session-Token')
    const session = await getSession(c.env.DB, token || '')
    if (!session) return c.json({ success: false, error: 'Unauthorized' }, 401)

    let results
    if (session.user_type === 'patient') {
      const q = await c.env.DB.prepare(`
        SELECT p.*, d.name as doctor_name, d.specialization, d.hospital_name
        FROM prescriptions p
        JOIN doctors d ON p.doctor_id = d.id
        WHERE p.patient_id = ? AND p.is_active = 1
        ORDER BY p.created_at DESC
      `).bind(session.user_id).all()
      results = q.results
    } else {
      const q = await c.env.DB.prepare(`
        SELECT p.*, pt.name as patient_name, pt.phone as patient_phone
        FROM prescriptions p
        JOIN patients pt ON p.patient_id = pt.id
        WHERE p.doctor_id = ?
        ORDER BY p.created_at DESC
      `).bind(session.user_id).all()
      results = q.results
    }

    const prescriptions = results.map((p: any) => ({
      ...p,
      medicines: JSON.parse(p.medicines || '[]')
    }))

    return c.json({ success: true, prescriptions })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.post('/api/prescriptions', async (c) => {
  try {
    const token = c.req.header('X-Session-Token')
    const session = await getSession(c.env.DB, token || '')
    if (!session || session.user_type !== 'doctor') return c.json({ success: false, error: 'Unauthorized - Doctor only' }, 401)

    const body = await c.req.json()
    const { patient_id, appointment_id, diagnosis, medicines, instructions, valid_till, notes } = body

    if (!patient_id || !medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return c.json({ success: false, error: 'Patient ID and medicines required' }, 400)
    }

    const prescriptionId = generateId('RX').toUpperCase().substring(0, 12)

    await c.env.DB.prepare(`
      INSERT INTO prescriptions
        (prescription_id, patient_id, doctor_id, appointment_id, diagnosis, medicines, instructions, valid_till, notes, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      prescriptionId, patient_id, session.user_id, appointment_id || null,
      diagnosis || '', JSON.stringify(medicines),
      instructions || '', valid_till || '', notes || ''
    ).run()

    const prescription = await c.env.DB.prepare('SELECT * FROM prescriptions WHERE prescription_id = ?').bind(prescriptionId).first() as any

    // Create reminders for each medicine
    for (const med of medicines) {
      const reminderId = generateId('REM').substring(0, 16)
      const times = med.timing === 'morning' ? ['08:00'] :
                    med.timing === 'evening' ? ['18:00'] :
                    med.timing === 'night' ? ['21:00'] :
                    med.timing === 'twice' ? ['08:00', '20:00'] :
                    ['08:00', '14:00', '21:00']

      await c.env.DB.prepare(`
        INSERT INTO medication_reminders
          (reminder_id, patient_id, prescription_id, medicine_name, dosage, frequency, times, start_date, end_date, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, date('now'), ?, 1)
      `).bind(
        reminderId, patient_id, prescription.id, med.name, med.dosage || '',
        med.frequency || 'daily', JSON.stringify(times),
        valid_till || ''
      ).run()
    }

    return c.json({ success: true, prescription_id: prescriptionId, message: 'Prescription created and reminders set' })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ─── REMINDER ROUTES ──────────────────────────────────────────────────────────
app.get('/api/reminders', async (c) => {
  try {
    const token = c.req.header('X-Session-Token')
    const session = await getSession(c.env.DB, token || '')
    if (!session || session.user_type !== 'patient') return c.json({ success: false, error: 'Unauthorized' }, 401)

    const { results } = await c.env.DB.prepare(`
      SELECT r.*, p.prescription_id, p.diagnosis, d.name as doctor_name
      FROM medication_reminders r
      JOIN prescriptions p ON r.prescription_id = p.id
      JOIN doctors d ON p.doctor_id = d.id
      WHERE r.patient_id = ? AND r.is_active = 1
      ORDER BY r.created_at DESC
    `).bind(session.user_id).all()

    const reminders = results.map((r: any) => ({
      ...r,
      times: JSON.parse(r.times || '[]')
    }))

    return c.json({ success: true, reminders })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.put('/api/reminders/:id/toggle', async (c) => {
  try {
    const token = c.req.header('X-Session-Token')
    const session = await getSession(c.env.DB, token || '')
    if (!session) return c.json({ success: false, error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const { is_active } = await c.req.json()

    await c.env.DB.prepare('UPDATE medication_reminders SET is_active = ? WHERE id = ? AND patient_id = ?')
      .bind(is_active ? 1 : 0, id, session.user_id).run()

    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ─── AI CHATBOT (Google Gemini) ───────────────────────────────────────────────

const GEMINI_SYSTEM_PROMPT = `You are MedBot, a knowledgeable and caring AI health assistant for MyDoctor's — a medical platform in India. You help patients with medical questions, medicine information, symptoms, diseases, health advice, and platform features.

YOUR PERSONALITY:
- Warm, empathetic, clear, and genuinely helpful
- Use simple language non-medical users can understand
- Add relevant emojis (🩺💊🏥💙⚠️🌡️) to make responses friendly
- Give complete, useful answers — not vague deflections
- Always end with a helpful follow-up question or suggestion

WHAT YOU MUST DO:

1. MEDICINE & TREATMENT QUESTIONS — Answer fully and helpfully:
   - When asked about medicines for common conditions (cold, fever, cough, headache, acidity, etc.), name the common over-the-counter medicines used in India
   - Examples of common OTC medicines you can mention:
     • Cold/Flu: Sinarest, D-Cold Total, Nasivion nasal drops, Vicks Action 500
     • Fever: Paracetamol (Crocin, Dolo 650), Ibuprofen (Brufen, Combiflam)
     • Cough: Benadryl, Honitus, Alex syrup, Ascoril
     • Headache: Paracetamol, Saridon, Combiflam
     • Acidity/Gas: Digene, Gelusil, Pantoprazole, Rantac
     • Allergies: Cetirizine (Alerid, CTZ), Loratadine (Lorfast)
     • Diarrhea: ORS (Electral), Loperamide (Eldoper), Norflox-TZ
     • Constipation: Isabgol (Psyllium husk), Dulcolax
     • Body pain/Muscle ache: Combiflam, Volini gel (topical), Moov
     • Eye infection: Moxifloxacin eye drops, Tobramycin
   - Always mention the STANDARD adult dosage where relevant (e.g., Paracetamol 500mg every 6-8 hours)
   - Always add: "These are general OTC medicines. For prescription drugs or if symptoms persist >3 days, please consult a doctor."

2. SYMPTOM ANALYSIS — Be specific:
   - Describe what the symptom could indicate with possible conditions
   - Suggest which type of doctor to see (General Physician, ENT, Cardiologist, etc.)
   - Give home remedies alongside medicine advice

3. DISEASE INFORMATION — Explain clearly:
   - Causes, symptoms, treatment approach, prevention
   - Which specialist to consult
   - Duration and what to expect

4. HOME REMEDIES — Always include alongside medicines:
   - For cold: warm water with honey+ginger, steam inhalation, rest
   - For fever: cool compress, hydration, rest
   - For acidity: cold milk, avoid spicy food, eat smaller meals

5. MyDoctor's PLATFORM FEATURES:
   - Find Doctors: search by specialization, city, name
   - AI Symptom Checker: body diagram + symptom input → disease prediction
   - Book Appointments: select doctor → choose date/time → confirm
   - Nearby Services: hospitals, diagnostic centres, pharmacies
   - Dashboard: reports, medications, prescriptions, reminders

SAFETY RULES (only these are absolute):
- For EMERGENCY symptoms (chest pain, stroke signs, severe bleeding, difficulty breathing, unconsciousness) → ALWAYS say call 102/112 immediately first
- For serious prescription medicines (antibiotics, steroids, blood thinners, insulin) → always say "requires doctor's prescription"
- Never diagnose cancer, HIV, or serious psychiatric conditions — refer to specialist
- If someone seems suicidal or in crisis → iCall helpline: 9152987821, Vandrevala Foundation: 1860-2662-345

FORMATTING:
- Use bullet points (•) for lists
- Bold medicine names with **MedicineName**
- Use ⚠️ for warnings, 💊 for medicines, 🌡️ for fever/temperature topics
- For emergencies always start with ⚠️ EMERGENCY
- Give structured answers: Medicines → Dosage → Home Remedies → When to see a doctor`

// Model priority list — tries each in order until one succeeds
const GEMINI_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite'
]

async function callGeminiModel(apiKey: string, model: string, requestBody: any): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  )

  if (!response.ok) {
    const errText = await response.text()
    // If 404 (deprecated) or 429 (quota) → signal caller to try next model
    if (response.status === 404 || response.status === 429 || response.status === 503) {
      throw new Error(`RETRY:${response.status}:${errText.substring(0, 100)}`)
    }
    throw new Error(`Gemini API error ${response.status}: ${errText.substring(0, 200)}`)
  }

  const data = await response.json() as any

  // Log full response in dev for debugging
  if (!data.candidates && data.promptFeedback) {
    const blockReason = data.promptFeedback?.blockReason || 'UNKNOWN'
    console.error('Prompt blocked by Gemini safety:', blockReason)
    throw new Error(`RETRY:SAFETY_BLOCK:${blockReason}`)
  }

  const candidate = data.candidates?.[0]
  if (!candidate) throw new Error('No response from Gemini')

  const finishReason = candidate.finishReason || 'STOP'

  if (finishReason === 'SAFETY') {
    // Safety block — try with a reworded request via next model
    throw new Error('RETRY:SAFETY:content_filtered')
  }

  const text = candidate.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Gemini')

  // If MAX_TOKENS hit, return whatever was generated (it's still useful)
  return text.trim()
}

async function callGeminiAPI(apiKey: string, messages: Array<{role: string; content: string}>, userMessage: string): Promise<string> {
  // Build conversation history for Gemini
  const contents: Array<{role: string; parts: Array<{text: string}>}> = []

  // Add chat history (last 8 messages for context)
  for (const msg of messages.slice(-8)) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })
  }

  // Add current user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  })

  const requestBody = {
    system_instruction: {
      parts: [{ text: GEMINI_SYSTEM_PROMPT }]
    },
    contents,
    generationConfig: {
      temperature: 0.4,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1200,
      stopSequences: []
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ]
  }

  // Try each model in order until one succeeds
  let lastError = ''
  for (const model of GEMINI_MODELS) {
    try {
      return await callGeminiModel(apiKey, model, requestBody)
    } catch (err: any) {
      lastError = err.message || ''
      // Continue to next model on RETRY signal (deprecated/quota/safety/blocked)
      if (lastError.startsWith('RETRY:')) {
        console.log(`Model ${model} skipped (${lastError}), trying next...`)
        continue
      }
      // Any other error — throw immediately
      throw err
    }
  }

  throw new Error(`All Gemini models exhausted. Last error: ${lastError}`)
}

app.post('/api/chat', async (c) => {
  try {
    const body = await c.req.json()
    const { message, session_id, history } = body

    if (!message || !message.trim()) {
      return c.json({ success: false, error: 'Message required' }, 400)
    }

    const token = c.req.header('X-Session-Token')
    const authSession = token ? await getSession(c.env.DB, token) : null
    const chatSessionId = session_id || generateId('chat')
    const apiKey = c.env.GEMINI_API_KEY

    if (!apiKey) {
      return c.json({ success: false, error: 'AI service not configured' }, 503)
    }

    // Fetch recent conversation history from DB for context
    let dbHistory: Array<{role: string; content: string}> = []
    try {
      const { results } = await c.env.DB.prepare(
        'SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 20'
      ).bind(chatSessionId).all()
      dbHistory = results as Array<{role: string; content: string}>
    } catch (e) { /* non-critical */ }

    // Also merge any history sent from the frontend
    const clientHistory: Array<{role: string; content: string}> = history || []
    const combinedHistory = dbHistory.length > 0 ? dbHistory : clientHistory

    // Store user message first
    try {
      await c.env.DB.prepare(
        'INSERT INTO chat_messages (session_id, user_id, role, content) VALUES (?, ?, ?, ?)'
      ).bind(
        chatSessionId,
        authSession ? String(authSession.user_id) : 'anonymous',
        'user',
        message
      ).run()
    } catch (e) { /* non-critical */ }

    // Call Gemini API
    let reply: string
    try {
      reply = await callGeminiAPI(apiKey, combinedHistory, message)
    } catch (geminiErr: any) {
      console.error('Gemini error:', geminiErr.message)
      // Helpful fallback — gives basic info even when AI is down
      const lowerMsg = message.toLowerCase()
      if (lowerMsg.includes('cold') || lowerMsg.includes('runny nose') || lowerMsg.includes('sneezing')) {
        reply = "💊 For **common cold**, common OTC medicines include:\n• **Sinarest** or **D-Cold Total** (decongestant + antihistamine)\n• **Paracetamol (Crocin 500mg)** if you have mild fever — every 6-8 hours\n• **Benadryl** or **Honitus** syrup for cough\n• **Nasivion nasal drops** for blocked nose\n\n🏠 Home remedies: Steam inhalation, warm water with honey + ginger, rest well, stay hydrated.\n\n⚕️ If symptoms persist beyond 5-7 days or you develop high fever, consult a doctor. For now, try visiting our **Find Doctors** section to book a General Physician."
      } else if (lowerMsg.includes('fever') || lowerMsg.includes('temperature')) {
        reply = "🌡️ For **fever**, the primary medicine is:\n• **Paracetamol (Dolo 650 / Crocin)** — 500mg-650mg every 6 hours (adults)\n• **Ibuprofen (Brufen/Combiflam)** if fever is above 101°F with body pain\n\n🏠 Home remedies: Cool wet cloth on forehead, drink plenty of fluids, rest.\n\n⚠️ If fever exceeds 103°F or lasts more than 3 days, please see a doctor immediately."
      } else if (lowerMsg.includes('cough')) {
        reply = "💊 For **cough**, common medicines:\n• **Benadryl** or **Alex** syrup for dry cough\n• **Ascoril LS** for wet/productive cough\n• **Strepsils** lozenges for throat relief\n\n🏠 Home remedies: Warm water with turmeric (haldi milk), steam inhalation, honey.\n\nIf cough persists >2 weeks, consult a doctor — it could be an infection."
      } else if (lowerMsg.includes('headache')) {
        reply = "💊 For **headache**, common medicines:\n• **Paracetamol (Crocin 500mg)** — mildest and safest\n• **Combiflam** (Ibuprofen + Paracetamol) for stronger relief\n• **Saridon** for tension headaches\n\n🏠 Rest in a quiet dark room, stay hydrated, apply cold/warm compress.\n\nIf headaches are frequent or very severe, please consult a Neurologist."
      } else {
        reply = "I'm having trouble connecting to the AI service right now. Please try again in a moment. For urgent medical concerns, please call **102** (emergency) or visit your nearest hospital. 🏥"
      }
    }

    // Store bot reply
    try {
      await c.env.DB.prepare(
        'INSERT INTO chat_messages (session_id, user_id, role, content) VALUES (?, ?, ?, ?)'
      ).bind(chatSessionId, 'medbot', 'assistant', reply).run()
    } catch (e) { /* non-critical */ }

    return c.json({ success: true, reply, session_id: chatSessionId })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ─── STATIC FILES ─────────────────────────────────────────────────────────────
// All static assets (/static/*, /icons/*, /manifest.json, /sw.js, /favicon.ico)
// are served directly by Cloudflare Pages CDN as static files.
// They are excluded from the Worker via _routes.json (in public/).
// serveStatic for /static/* handles the local wrangler pages dev fallback.
app.use('/static/*', serveStatic({ root: './public' }))

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover">
<title>MyDoctor's - Find the Right Doctor Near You</title>
<meta name="description" content="Find and book the best doctors near you. AI-powered disease prediction, symptom checker, nearby hospitals and medical services.">

<!-- PWA Meta Tags -->
<meta name="application-name" content="MyDoctor's">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="MyDoctor's">
<meta name="mobile-web-app-capable" content="yes">
<meta name="msapplication-TileColor" content="#0052CC">
<meta name="msapplication-TileImage" content="/icons/icon-144x144.png">
<meta name="theme-color" content="#0052CC" id="themeColorMeta">

<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json">

<!-- App Icons -->
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">
<link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png">
<link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144x144.png">
<link rel="apple-touch-icon" sizes="120x120" href="/icons/icon-128x128.png">

<!-- Apple Splash Screens -->
<link rel="apple-touch-startup-image" href="/icons/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)">
<link rel="apple-touch-startup-image" href="/icons/splash-1242x2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)">
<link rel="apple-touch-startup-image" href="/icons/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)">
<link rel="apple-touch-startup-image" href="/icons/splash-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)">
<link rel="apple-touch-startup-image" href="/icons/splash-828x1792.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)">

<!-- Open Graph for sharing -->
<meta property="og:title" content="MyDoctor's - Find the Right Doctor">
<meta property="og:description" content="AI-powered medical platform. Find doctors, book appointments, AI symptom checker.">
<meta property="og:type" content="website">
<meta property="og:image" content="/icons/icon-512x512.png">

<!-- Anti-FOUC: apply saved theme BEFORE any CSS loads -->
<script>
(function(){
  try {
    var saved = localStorage.getItem('md-theme');
    var preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var theme = saved || preferred;
    document.documentElement.setAttribute('data-theme', theme);
    // Update theme-color meta
    var meta = document.getElementById('themeColorMeta');
    if (meta) meta.content = theme === 'dark' ? '#0D1B2E' : '#0052CC';
  } catch(e) {}
})();
</script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
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
      <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" title="Switch Dark/Light Mode" aria-label="Toggle dark mode">
        <i class="fas fa-moon" id="themeIcon"></i>
      </button>
    </div>
  </div>
</nav>

<!-- ═══════════════ HOME PAGE ═══════════════ -->
<div id="page-home" class="page active">

  <!-- WELCOME STRIP (shown when logged in) -->
  <div id="welcomeStrip" style="display:none" class="welcome-strip">
    <div class="container welcome-strip-inner">
      <div class="welcome-left">
        <div class="welcome-avatar" id="welcomeAvatar"><i class="fas fa-user-circle"></i></div>
        <div>
          <div class="welcome-greeting" id="welcomeGreeting">Welcome back!</div>
          <div class="welcome-sub">Your health dashboard is ready</div>
        </div>
      </div>
      <div class="welcome-actions">
        <button class="btn-welcome-action" onclick="showPage('appointments')"><i class="fas fa-calendar-check"></i> My Appointments</button>
        <button class="btn-welcome-action" onclick="showPage('aiChecker')"><i class="fas fa-robot"></i> AI Check</button>
        <button class="btn-welcome-action secondary" onclick="showPage('dashboard')"><i class="fas fa-tachometer-alt"></i> Dashboard</button>
      </div>
    </div>
  </div>

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

  <!-- QUICK FEATURE CARDS — patient-friendly dashboard shortcuts -->
  <section class="quick-features-section">
    <div class="container">
      <div class="section-header">
        <div class="section-badge"><i class="fas fa-th-large"></i> Your Health Hub</div>
        <h2>Everything You Need, <span class="gradient-text">In One Place</span></h2>
        <p>All your healthcare tools — doctors, hospitals, AI, and records — right here.</p>
      </div>
      <div class="hub-cards-grid">

        <div class="hub-card" onclick="showPage('findDoctors'); setBottomNav('bnDoctors')">
          <div class="hub-card-icon" style="background:linear-gradient(135deg,#0066FF,#4D8FFF)">
            <i class="fas fa-user-md"></i>
          </div>
          <div class="hub-card-body">
            <div class="hub-card-title">Find a Doctor</div>
            <div class="hub-card-desc">Search verified specialists in Hubballi–Dharwad by name, specialty, or symptom</div>
          </div>
          <div class="hub-card-cta">Find Now <i class="fas fa-arrow-right"></i></div>
        </div>

        <div class="hub-card" onclick="showPage('nearby')">
          <div class="hub-card-icon" style="background:linear-gradient(135deg,#00B09B,#00C9A7)">
            <i class="fas fa-hospital-alt"></i>
          </div>
          <div class="hub-card-body">
            <div class="hub-card-title">Nearby Hospitals</div>
            <div class="hub-card-desc">Discover hospitals with emergency care, ICU, and specialist departments near you</div>
          </div>
          <div class="hub-card-cta">View Hospitals <i class="fas fa-arrow-right"></i></div>
        </div>

        <div class="hub-card" onclick="showPage('aiChecker'); setBottomNav('bnAI')">
          <div class="hub-card-icon" style="background:linear-gradient(135deg,#7C3AED,#A855F7)">
            <i class="fas fa-robot"></i>
          </div>
          <div class="hub-card-body">
            <div class="hub-card-title">AI Symptom Check</div>
            <div class="hub-card-desc">Describe your symptoms and get instant AI-powered medical insights and guidance</div>
          </div>
          <div class="hub-card-cta">Check Now <i class="fas fa-arrow-right"></i></div>
        </div>

        <div class="hub-card" onclick="showPage('chat'); setBottomNav('bnChat')">
          <div class="hub-card-icon" style="background:linear-gradient(135deg,#0052CC,#06B6D4)">
            <i class="fas fa-comment-medical"></i>
          </div>
          <div class="hub-card-body">
            <div class="hub-card-title">MedBot Chat</div>
            <div class="hub-card-desc">Ask any health, medicine, or wellness question to our intelligent AI assistant</div>
          </div>
          <div class="hub-card-cta">Ask MedBot <i class="fas fa-arrow-right"></i></div>
        </div>

        <div class="hub-card" onclick="showPage('appointments'); setBottomNav('bnAppts')">
          <div class="hub-card-icon" style="background:linear-gradient(135deg,#EA580C,#F59E0B)">
            <i class="fas fa-calendar-check"></i>
          </div>
          <div class="hub-card-body">
            <div class="hub-card-title">My Appointments</div>
            <div class="hub-card-desc">Book, view and manage your upcoming doctor appointments in one place</div>
          </div>
          <div class="hub-card-cta">View All <i class="fas fa-arrow-right"></i></div>
        </div>

        <div class="hub-card" onclick="showPage('reports')">
          <div class="hub-card-icon" style="background:linear-gradient(135deg,#059669,#10B981)">
            <i class="fas fa-file-medical-alt"></i>
          </div>
          <div class="hub-card-body">
            <div class="hub-card-title">Health Records</div>
            <div class="hub-card-desc">Securely store, access and share your prescriptions, lab reports and medical history</div>
          </div>
          <div class="hub-card-cta">View Records <i class="fas fa-arrow-right"></i></div>
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
        <p>Tap a specialty to see verified doctors in Hubballi–Dharwad</p>
      </div>
      <div class="spec-grid">
        <div class="spec-card" onclick="filterBySpec('Cardiology')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#ff6b6b,#ee5a24)"><i class="fas fa-heart"></i></div>
          <div class="spec-name">Cardiology</div>
          <div class="spec-count">Heart &amp; Vascular</div>
        </div>
        <div class="spec-card" onclick="filterBySpec('Orthopaedics')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#74b9ff,#0984e3)"><i class="fas fa-bone"></i></div>
          <div class="spec-name">Orthopaedics</div>
          <div class="spec-count">Bones &amp; Joints</div>
        </div>
        <div class="spec-card" onclick="filterBySpec('Obstetrics')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#fdcb6e,#e17055)"><i class="fas fa-baby"></i></div>
          <div class="spec-name">OBG</div>
          <div class="spec-count">Women's Health</div>
        </div>
        <div class="spec-card" onclick="filterBySpec('Paediatrics')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#55efc4,#00b894)"><i class="fas fa-child"></i></div>
          <div class="spec-name">Paediatrics</div>
          <div class="spec-count">Child Health</div>
        </div>
        <div class="spec-card" onclick="filterBySpec('Neuro')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#a29bfe,#6c5ce7)"><i class="fas fa-brain"></i></div>
          <div class="spec-name">Neuro Surgery</div>
          <div class="spec-count">Brain &amp; Spine</div>
        </div>
        <div class="spec-card" onclick="filterBySpec('Nephrology')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#81ecec,#00cec9)"><i class="fas fa-kidneys"></i></div>
          <div class="spec-name">Nephrology</div>
          <div class="spec-count">Kidney &amp; Transplant</div>
        </div>
        <div class="spec-card" onclick="filterBySpec('Urology')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#ffeaa7,#fdcb6e)"><i class="fas fa-procedures"></i></div>
          <div class="spec-name">Urology</div>
          <div class="spec-count">Urological Surgery</div>
        </div>
        <div class="spec-card" onclick="filterBySpec('Oncology')">
          <div class="spec-icon" style="background:linear-gradient(135deg,#fd79a8,#e84393)"><i class="fas fa-ribbon"></i></div>
          <div class="spec-name">Oncology</div>
          <div class="spec-count">Cancer Care</div>
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
      <p>Verified specialists in Hubballi–Dharwad — SDM, Vihaan, SeCURE &amp; more</p>
    </div>
  </div>
  <div class="container">
    <!-- Quick city tabs -->
    <div class="city-tabs" id="doctorCityTabs" style="display:flex;gap:8px;margin:16px 0 0">
      <button class="city-tab-btn active" onclick="setDoctorCity('')" id="dcAll">All Cities</button>
      <button class="city-tab-btn" onclick="setDoctorCity('Hubballi')" id="dcHubballi">Hubballi</button>
      <button class="city-tab-btn" onclick="setDoctorCity('Dharwad')" id="dcDharwad">Dharwad</button>
    </div>
    <!-- Filters -->
    <div class="filter-bar" style="margin-top:10px">
      <div class="filter-search">
        <i class="fas fa-search"></i>
        <input type="text" id="doctorSearch" placeholder="Search doctor name, specialty, hospital..." oninput="searchDoctors()">
      </div>
      <select class="filter-select" id="specFilter" onchange="searchDoctors()">
        <option value="">All Specialties</option>
        <option>Orthopaedics</option><option>Cardiology</option><option>Interventional Cardiology</option>
        <option>Cardiovascular &amp; Thoracic Surgery</option><option>General Medicine</option>
        <option>Obstetrics &amp; Gynaecology</option><option>Paediatrics</option>
        <option>Paediatric Cardiology</option><option>Plastic Surgery</option>
        <option>Paediatric Surgery</option><option>Interventional Radiology</option>
        <option>Anaesthesiology</option><option>Sports Medicine</option>
        <option>Surgical Gastroenterology</option><option>Neuro &amp; Spine Surgery</option>
        <option>Nephrology</option><option>Urology</option><option>Surgical Oncology</option>
        <option>Intensivist</option><option>General Surgery</option>
        <option>Fetal Medicine</option><option>Dentistry</option>
      </select>
      <select class="filter-select" id="hospitalFilter" onchange="searchDoctors()">
        <option value="">All Hospitals</option>
        <option>SDM College of Medical Sciences</option>
        <option>Vihaan Heart &amp; Super Speciality Hospital</option>
        <option>SeCURE Hospital</option>
        <option>KIMS</option><option>HCG Suchirayu</option><option>HCG NMR</option>
      </select>
      <select class="filter-select" id="sortFilter" onchange="loadDoctors()">
        <option value="verified">Verified First</option>
        <option value="experience">By Experience</option>
        <option value="fee_low">Fee: Low to High</option>
        <option value="fee_high">Fee: High to Low</option>
      </select>
      <button class="btn-filter-clear" onclick="clearFilters()"><i class="fas fa-times"></i> Clear</button>
    </div>
    <div class="results-info" id="resultsInfo" style="margin:8px 0;font-size:0.85rem;color:var(--light)"></div>
    <div class="doctors-list" id="doctorsList">
      <div class="loading-state"><div class="spinner"></div><p>Finding doctors near you...</p></div>
    </div>
  </div>

  <!-- Doctor Profile Modal -->
  <div class="modal-overlay" id="doctorProfileModal" onclick="closeModalOnBg(event,'doctorProfileModal')" style="z-index:3000">
    <div class="modal-box" style="max-width:600px;max-height:90vh;overflow-y:auto">
      <button class="modal-close" onclick="closeModal('doctorProfileModal')" style="position:sticky;top:8px;float:right;z-index:1"><i class="fas fa-times"></i></button>
      <div id="doctorProfileContent"></div>
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
      <h1><i class="fas fa-hospital-alt"></i> Hospitals &amp; Medical Centres</h1>
      <p>Verified hospitals in Hubballi–Dharwad — government, private &amp; specialty</p>
    </div>
  </div>
  <div class="container">
    <!-- City tabs -->
    <div class="city-tabs" style="margin:16px 0 8px">
      <button class="city-tab-btn active" onclick="loadNearbyServices('')" id="ncAll">All</button>
      <button class="city-tab-btn" onclick="loadNearbyServices('Hubballi')" id="ncHubballi">Hubballi</button>
      <button class="city-tab-btn" onclick="loadNearbyServices('Dharwad')" id="ncDharwad">Dharwad</button>
    </div>
    <!-- Filter bar -->
    <div class="filter-bar" style="margin-bottom:12px">
      <div class="filter-search">
        <i class="fas fa-search"></i>
        <input type="text" id="hospitalSearch" placeholder="Search hospital name or specialty..." oninput="searchHospitals()">
      </div>
      <select class="filter-select" id="hospitalTypeFilter" onchange="searchHospitals()">
        <option value="">All Types</option>
        <option>Government</option><option>Private</option><option>Trust</option><option>Charitable</option>
      </select>
      <label class="filter-emergency-toggle" style="display:flex;align-items:center;gap:6px;font-size:0.85rem;cursor:pointer">
        <input type="checkbox" id="emergencyFilter" onchange="searchHospitals()" style="cursor:pointer">
        <span>24/7 Emergency Only</span>
      </label>
    </div>
    <div class="results-info" id="hospitalResultsInfo" style="font-size:0.85rem;color:var(--light);margin-bottom:10px"></div>
    <div id="hospitalsList" class="nearby-grid">
      <div class="loading-state"><div class="spinner"></div><p>Loading hospitals...</p></div>
    </div>
  </div>

  <!-- Hospital Profile Modal -->
  <div class="modal-overlay" id="hospitalProfileModal" onclick="closeModalOnBg(event,'hospitalProfileModal')" style="z-index:3000">
    <div class="modal-box" style="max-width:620px;max-height:90vh;overflow-y:auto">
      <button class="modal-close" onclick="closeModal('hospitalProfileModal')" style="position:sticky;top:8px;float:right;z-index:1"><i class="fas fa-times"></i></button>
      <div id="hospitalProfileContent"></div>
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

<!-- ═══ MedBot Chat Page ═══ -->
<div id="page-chat" class="page">
  <div class="container" style="max-width:700px;padding-top:24px;padding-bottom:24px">
    <div class="section-header" style="margin-bottom:20px">
      <div class="section-badge"><i class="fas fa-comment-medical"></i> MedBot</div>
      <h2>AI Health Assistant</h2>
      <p>Ask any health, medicine, or wellness question</p>
    </div>
    <!-- Chat messages area (mirrors chatbot widget) -->
    <div class="medbot-page-chat-wrap">
      <div class="medbot-page-messages" id="medbotPageMessages">
        <div class="chat-bubble bot">
          <div class="chat-avatar"><i class="fas fa-robot"></i></div>
          <div class="chat-text">
            <strong>Hi! I'm MedBot 👋</strong><br>
            I'm your AI health assistant for MyDoctor's. Ask me about symptoms, medicines, health conditions, or doctors in Hubballi–Dharwad.<br><br>
            <em>Note: I provide general health information only — not a substitute for professional medical advice.</em>
          </div>
        </div>
      </div>
      <div class="medbot-page-quick-replies">
        <button class="quick-reply-btn" onclick="medbotPageSend('What are common symptoms of diabetes?')">Diabetes symptoms</button>
        <button class="quick-reply-btn" onclick="medbotPageSend('Which doctor should I see for chest pain?')">Chest pain</button>
        <button class="quick-reply-btn" onclick="medbotPageSend('How to manage high blood pressure?')">Blood pressure</button>
        <button class="quick-reply-btn" onclick="medbotPageSend('What is the normal range for blood sugar?')">Blood sugar</button>
      </div>
      <div class="medbot-page-input-row">
        <input type="text" id="medbotPageInput" class="medbot-page-input" placeholder="Type your health question..." onkeydown="if(event.key==='Enter')medbotPageSend()">
        <button class="medbot-page-send-btn" onclick="medbotPageSend()" aria-label="Send"><i class="fas fa-paper-plane"></i></button>
      </div>
    </div>
  </div>
</div>

<!-- ═══ Health Records Page ═══ -->
<div id="page-reports" class="page">
  <div class="container" id="reportsContent" style="padding-top:24px;padding-bottom:24px">
    <div class="section-header" style="margin-bottom:20px">
      <div class="section-badge"><i class="fas fa-file-medical-alt"></i> Health Records</div>
      <h2>My Medical Records</h2>
      <p>Securely store and access your health documents</p>
    </div>
    <div class="auth-gate-msg" id="reportsAuthGate" style="display:none">
      <div class="empty-state">
        <i class="fas fa-lock"></i>
        <h3>Sign In Required</h3>
        <p>Please sign in to view and manage your health records.</p>
        <button class="btn-primary" onclick="openModal('loginModal')"><i class="fas fa-sign-in-alt"></i> Sign In</button>
      </div>
    </div>
    <div id="reportsListWrap"></div>
  </div>
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

<!-- ═══════════════ AI CHATBOT WIDGET ═══════════════ -->
<div id="chatbotWidget" class="chatbot-widget">
  <!-- Floating Button -->
  <button class="chatbot-toggle" id="chatbotToggle" onclick="toggleChatbot()" title="Chat with MedBot — AI Health Assistant">
    <i class="fas fa-robot chatbot-open-icon"></i>
    <i class="fas fa-times chatbot-close-icon" style="display:none"></i>
    <span class="chatbot-badge" id="chatBadge" style="display:none">1</span>
  </button>

  <!-- Chat Window -->
  <div class="chatbot-window" id="chatbotWindow">
    <div class="chatbot-header">
      <div class="chatbot-avatar">
        <i class="fas fa-robot"></i>
        <span class="chatbot-status-dot"></span>
      </div>
      <div class="chatbot-info">
        <h4>MedBot</h4>
        <span>AI Health Assistant • Always Online</span>
      </div>
      <button class="chatbot-minimize" onclick="toggleChatbot()"><i class="fas fa-chevron-down"></i></button>
    </div>

    <div class="chatbot-messages" id="chatbotMessages">
      <div class="chat-msg bot">
        <div class="chat-avatar"><i class="fas fa-robot"></i></div>
        <div class="chat-bubble">
          👋 Hi! I'm <strong>MedBot</strong>, your personal AI health assistant.<br><br>
          I can help you with:<br>
          • 💊 <strong>Medicines</strong> for cold, fever, cough, headache &amp; more<br>
          • 🩺 Symptom analysis &amp; specialist guidance<br>
          • 🏠 Home remedies &amp; health tips<br>
          • 📅 Booking &amp; managing appointments<br>
          • 🏥 Finding nearby hospitals &amp; doctors<br><br>
          Just ask me anything — like <em>"tablet for cold"</em> or <em>"fever medicine"</em>! 💬
        </div>
      </div>
      <div class="chat-quick-replies" id="quickReplies">
        <button onclick="sendQuickReply('What medicine should I take for common cold?')">🤧 Cold medicine</button>
        <button onclick="sendQuickReply('Which tablet is best for fever?')">🌡️ Fever tablet</button>
        <button onclick="sendQuickReply('What to take for cough and sore throat?')">😮 Cough remedy</button>
        <button onclick="sendQuickReply('Medicine for headache and body pain?')">🤕 Headache relief</button>
        <button onclick="sendQuickReply('Which specialist should I see for back pain?')">👨‍⚕️ Find specialist</button>
        <button onclick="sendQuickReply('I have chest pain and shortness of breath')">🚨 Emergency help</button>
      </div>
    </div>

    <div class="chatbot-input-area">
      <div class="chatbot-input-wrap">
        <input type="text" id="chatInput" placeholder="e.g. tablet for cold, fever medicine, headache..." 
               onkeydown="if(event.key==='Enter' && !event.shiftKey) { event.preventDefault(); sendChatMessage(); }">
        <button onclick="sendChatMessage()" class="chat-send-btn" id="chatSendBtn">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
      <p class="chat-disclaimer">🤖 AI Health Assistant &nbsp;|&nbsp; 🚨 Emergencies: Call 102</p>
    </div>
  </div>
</div>

<!-- ═══════════════ PWA INSTALL BANNER ═══════════════ -->
<!-- On mobile: fixed at top below header. On desktop: fixed bottom-right corner. -->
<div id="pwaInstallBanner" class="pwa-install-banner" style="display:none">
  <div class="pwa-banner-icon">
    <img src="/icons/icon-72x72.png" alt="MyDoctor's">
  </div>
  <div class="pwa-banner-text">
    <strong>Install MyDoctor's</strong>
    <span>Quick access from your home screen</span>
  </div>
  <div class="pwa-banner-actions">
    <button class="pwa-install-btn" id="pwaInstallBtn" onclick="triggerPWAInstall()">Install</button>
    <button class="pwa-dismiss-btn" onclick="dismissInstallBanner()" aria-label="Dismiss"><i class="fas fa-times"></i></button>
  </div>
</div>

<!-- ═══════════════ BOTTOM NAVIGATION (Mobile App) ═══════════════ -->
<nav class="bottom-nav" id="bottomNav">
  <button class="bottom-nav-item active" id="bnHome" onclick="showPage('home'); setBottomNav('bnHome')" aria-label="Home">
    <i class="fas fa-home"></i>
    <span>Home</span>
  </button>
  <button class="bottom-nav-item" id="bnDoctors" onclick="showPage('findDoctors'); setBottomNav('bnDoctors')" aria-label="Doctors">
    <i class="fas fa-stethoscope"></i>
    <span>Doctors</span>
  </button>
  <button class="bottom-nav-item bottom-nav-center" id="bnAI" onclick="showPage('aiChecker'); setBottomNav('bnAI')" aria-label="AI Check">
    <div class="bottom-nav-fab"><i class="fas fa-robot"></i></div>
    <span>AI Check</span>
  </button>
  <button class="bottom-nav-item" id="bnAppts" onclick="showPage('appointments'); setBottomNav('bnAppts')" aria-label="Appointments">
    <i class="fas fa-calendar-check"></i>
    <span>Appts</span>
    <span class="bottom-nav-badge" id="apptBadge" style="display:none">0</span>
  </button>
  <button class="bottom-nav-item" id="bnChat" onclick="showPage('chat'); setBottomNav('bnChat')" aria-label="MedBot">
    <i class="fas fa-comment-medical"></i>
    <span>MedBot</span>
  </button>
</nav>

<!-- TOAST NOTIFICATION -->
<div id="toast" class="toast"></div>

<script src="/static/app.js"></script>
</body>
</html>`)
})

export default app
