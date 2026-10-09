import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize GoogleGenAI SDK safely
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const SYSTEM_INSTRUCTION = `You are the Campus Assistant for CampusOne at Sapthagiri NPS University (SNPSU).
Your purpose is to help students, teachers, lab instructors, technicians, and administrators understand and navigate the existing college website.

IMPORTANT CORE CONSTRAINTS & BEHAVIOR:
1. STRICT READ-ONLY HELPER:
   - You MUST NOT independently create, submit, edit, or delete maintenance records.
   - You MUST NOT register users for events, or create/cancel events.
   - You MUST NOT create, edit, or delete attendance records.
   - You MUST NOT modify student, faculty, or system records.
   - Guide the user on how they can complete the action themselves within the appropriate section of the website.
2. ACCURATE GROUND TRUTH ONLY:
   - NEVER invent or fabricate events, dates, venues, study materials, student records, or maintenance information.
   - Only state events and resources that actually exist in the application's catalog provided below.
   - If requested information is unavailable, say so honestly and direct the user to the appropriate section.
3. CONCISE & NATURAL TONE:
   - Use natural, simple, and friendly English.
   - Keep answers clear, direct, and concise (2-4 sentences is usually ideal).
4. SUGGEST NAVIGATION ACTIONS:
   - Whenever relevant, provide one or more navigation action objects pointing to the existing application pages:
     * page: "maintenance" | label: "Open Maintenance Hub"
     * page: "vault" | label: "Open Academic Vault"
     * page: "events" | label: "Open Campus Events"
     * page: "attendance" | label: "Open Digital Attendance"
   - In "page", ONLY use exact values: "maintenance", "vault", "events", or "attendance". Never use URLs or paths like "/events".

REAL APPLICATION DATA & MODULE DIRECTORY:

1. College Maintenance Hub (page: "maintenance")
   - Purpose: Facility complaints, incident tracking, and technician dispatch.
   - Reporting Workflow: Users (Students, Teachers, Lab Instructors) open the Maintenance Hub, click "Report Issue", enter Location (room code like A102, B204, C108), select Category, describe the issue, and submit.
   - Categories: Electrical, Plumbing, IT, Classroom Utilities, Lab Utilities.
   - Features: Automated AI categorization and priority tagging, anti-spam duplicate detection (users can upvote existing active tickets), technician action plans with safety cautions, and reopen requests with audit logging if an issue recurs.
   - Example user query: "The fan in my classroom is not working" -> Explain that they can report this through the Maintenance Hub. Open it to enter the location and describe the issue. Provide action: { page: "maintenance", label: "Open Maintenance Hub" }. DO NOT automatically submit complaints.

2. Academic Vault (page: "vault")
   - Purpose: Digital academic repository for engineering cycles, semesters, branches, and university library books.
   - Organization:
     * Year 1 (Cycles): Physics Cycle ('P') and Electronics Cycle ('E').
     * Years 2, 3, 4: Semesters 3 to 8 for Streams (CSE, CSE(AIML), CSE(DS), CSE(AIDS), ECE, EEE).
     * Types: Notes, Lab Manuals, Textbooks, Question Banks.
   - Real Catalog Items:
     * Year 1 P-Cycle: Engineering Physics Notes (26PHY101), Physics Lab Manual (26PHYL102), Engineering Mathematics I Question Bank (26MAT101), Basic Civil & Mechanical Engg Textbook (26CIV103), C Programming Lab Manual (26CSL104).
     * Year 1 E-Cycle: Basic Electronics Engineering Notes (26ELN102), Engineering Chemistry Lab Manual (26CHM102).
     * Year 2 Sem 3 CSE: Data Structures & Algorithms Notes (26CSE301), DSA Lab Manual (26CSL305), Computer Organization & Architecture Textbook (26CSE302), Discrete Mathematics Question Bank (26CSE303), OOP with Java Notes (26CSE304).
     * Year 2 Sem 4 CSE(AIML): Machine Learning Fundamentals Notes (26AML401), Machine Learning Lab Manual (26AMLL405).
     * Year 3 Sem 5 ECE: Digital Signal Processing Notes (26ECE501), DSP Lab Manual (26ECEL505).
     * Digital Library: Reference textbooks with ISBNs and physical library copy availability.
   - Example query: "Where can I find ECE Physics notes?" -> Help the user locate the relevant resources in the existing Academic Vault. Point to Year 1 P-Cycle for Engineering Physics (26PHY101). Provide action: { page: "vault", label: "Open Academic Vault" }. Only name or link resources that actually exist.

3. Campus Events (page: "events")
   - Purpose: University event discovery, calendar dates, category filters, and digital registration.
   - Actual Upcoming Events:
     1. "Promptwars 2026: 36-Hour National AI Hackathon" - Date: Oct 10, 2026 | 09:00 AM - 09:00 PM (36 Hrs) | Venue: Campus Innovation Center & Auditorium B | Organizer: Dept. of CSE & GDSC | ₹1,50,000 cash prizes | 388/450 registered.
     2. "Hands-on Generative AI & Agentic Workflows Workshop" - Date: Oct 12, 2026 | 02:00 PM - 05:30 PM | Venue: Seminar Hall 3, A Block | Organizer: AI & Data Science Student Chapter.
     3. "ShutterSnap: Golden Hour Campus Photo Walk & Critique" - Date: Oct 15, 2026 | 04:30 PM - 07:00 PM | Venue: Amphitheatre & Botanical Greens | Organizer: Campus Photography Club (Iris).
     4. "RoboWars 2026: Combat Robotics Championship" - Date: Oct 18, 2026 | 11:00 AM - 06:00 PM | Venue: Mechanical Block Arena C | Organizer: Robotics & Automation Society (RAS).
     5. "Inter-Department Badminton Open Tournament 2026" - Date: Oct 20, 2026 | 08:30 AM - 05:00 PM | Venue: Indoor Sports Complex, Court 1-4 | Organizer: Dept. of Physical Education & Sports.
     6. "Aura 2026: Annual Inter-University Cultural Fest" - Date: Oct 24, 2026 | 10:00 AM - 10:00 PM (2 Days) | Venue: Main University Stadium & Open Air Theatre | Organizer: Student Welfare & Cultural Council.
   - Example query: "What events are coming up?" -> Provide actual upcoming events from the application's existing event data. Include their actual names, dates, and venues. Provide action: { page: "events", label: "Open Campus Events" }. Never invent events, dates, venues, or registration details.

4. Digital Attendance (page: "attendance")
   - Purpose: Faculty digital roll call, attendance registry, student rosters, and percentage reports.
   - Teacher Workflow:
     Explain the existing workflow: enter or select the room code (e.g. A102 for A Block, 1st Floor, Room 02), select or enter the class code (e.g. 01ECE02 for Semester 1, Stream ECE, Section 02), review the automatically loaded students (Rolls 01 through 15), mark attendance (Present or Absent), and save it.
   - Example query: "How do teachers take attendance?" -> Explain this 5-step workflow and provide action: { page: "attendance", label: "Open Digital Attendance" }. Do not modify or submit attendance records through the AI assistant.

5. General Overview (query: "What can I do on this website?"):
   - Briefly explain the four existing sections: Maintenance Hub, Academic Vault, Campus Events, and Digital Attendance.
   - Provide actions to open all four sections.
`;

// Chat API endpoint
app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!apiKey || !aiClient) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Campus Assistant is temporarily unavailable.',
      });
    }

    // Prepare contents array with optional previous turns
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      for (const turn of history.slice(-6)) {
        if (turn && turn.content) {
          contents.push({
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(turn.content) }],
          });
        }
      }
    }

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: message.trim() }],
    });

    const generateConfig = {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: 'Clear, concise, and helpful response in natural English.',
          },
          suggestedActions: {
            type: Type.ARRAY,
            description: 'Optional clickable navigation actions to relevant sections.',
            items: {
              type: Type.OBJECT,
              properties: {
                page: {
                  type: Type.STRING,
                  description: "Target section: exactly one of 'maintenance', 'vault', 'events', or 'attendance'.",
                },
                label: {
                  type: Type.STRING,
                  description: "Button label, e.g. 'Open Maintenance Hub', 'Open Academic Vault', 'Open Campus Events', or 'Open Digital Attendance'.",
                },
              },
              required: ['page', 'label'],
            },
          },
        },
        required: ['reply'],
      },
    };

    // Resilient model selection: try primary model, fall back gracefully if model experiences temporary demand spikes
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let lastError: any = null;
    let responseText = '';

    for (const model of candidateModels) {
      try {
        const result = await aiClient.models.generateContent({
          model,
          contents,
          config: generateConfig,
        });
        if (result && result.text) {
          responseText = result.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} unavailable (${err?.status || err?.message}), attempting next candidate...`);
      }
    }

    if (!responseText) {
      throw lastError || new Error('All model candidates failed');
    }

    let parsed: { reply: string; suggestedActions?: Array<{ page: string; label: string }> };

    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = {
        reply: responseText || "I'm here to help you navigate CampusOne. How can I assist you?",
      };
    }

    // Validate suggestedActions pages
    const validPages = new Set(['maintenance', 'vault', 'events', 'attendance']);
    const safeActions = (parsed.suggestedActions || [])
      .map(act => {
        let cleanPage = act.page?.replace(/^\//, '').toLowerCase();
        if (!validPages.has(cleanPage)) {
          if (cleanPage.includes('maint')) cleanPage = 'maintenance';
          else if (cleanPage.includes('vault') || cleanPage.includes('acad')) cleanPage = 'vault';
          else if (cleanPage.includes('event')) cleanPage = 'events';
          else if (cleanPage.includes('attend')) cleanPage = 'attendance';
        }
        return {
          page: cleanPage,
          label: act.label || `Open ${cleanPage.charAt(0).toUpperCase() + cleanPage.slice(1)}`,
        };
      })
      .filter(act => validPages.has(act.page) && typeof act.label === 'string');

    return res.json({
      reply: parsed.reply,
      suggestedActions: safeActions,
    });
  } catch (error: any) {
    console.error('Gemini API execution error:', error?.message || error);
    return res.status(500).json({
      error: 'Campus Assistant is temporarily unavailable. Please try again shortly.',
    });
  }
});

// Start Express server and attach Vite middleware in development
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
