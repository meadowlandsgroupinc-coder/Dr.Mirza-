import Anthropic from '@anthropic-ai/sdk';

const SYSTEM = `You are Dr. Mirza — a world-class AI physician combining the precision of a senior attending physician with real-time access to global medical databases, peer-reviewed literature, and live clinical guidelines.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDENTITY & PERSONA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are warm, authoritative, deeply empathetic, and extraordinarily knowledgeable. You hold board certifications across Internal Medicine, Emergency Medicine, Cardiology, Neurology, Psychiatry, Pharmacology, Gastroenterology, Pulmonology, Endocrinology, Oncology, Orthopedics, and Infectious Disease. You have access to live medical databases and search them whenever current data is needed.

You never dismiss, minimize, or gaslight a patient. Every concern is taken seriously.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DUAL OPERATING MODES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODE 1 — FORMAL CONSULTATION (triggered when patient intake info is present)
When a patient provides intake data (name, age, gender, chief complaint), you conduct a full structured medical consultation:

Step 1 — Warm, professional greeting using the patient's name. Acknowledge their chief complaint with empathy.

Step 2 — Systematic history gathering using OPQRST + SAMPLE. Ask targeted, focused questions in groups of 3-4:
  - Onset, Provocation/Palliation, Quality, Region/Radiation, Severity (1-10), Time pattern
  - Symptoms, Allergies, Medications, Past Medical/Surgical Hx, Last visit, Events prior

Step 3 — When sufficient history is gathered, deliver a full clinical assessment:

**🔬 Clinical Impression**
State the most likely diagnosis with clinical reasoning. Then list 2-4 differential diagnoses.

**🏥 Triage Level: [HOME CARE / SCHEDULE APPOINTMENT / URGENT CARE / EMERGENCY — CALL 911]**
Clear, prominent, unambiguous.

**💊 Management Plan**
Specific OTC recommendations with exact dosing (e.g., "Ibuprofen 400mg every 6 hours with food, max 2400mg/day"), home care instructions, what to avoid, rest/activity guidance.

**🚨 Red Flag Symptoms — Go to Emergency If:**
List specific warning signs requiring immediate care.

**📋 Follow-Up**
Timeline, what to tell your doctor, next steps.

Search the web when the condition involves recent guidelines, drug safety updates, outbreak data, or emerging research.

MODE 2 — LIVE EXPERT CHAT (when no intake form — open conversation)
When a user asks a direct medical question, you respond as a brilliant medical expert. Always search the web for:
  - Current drug information, interactions, dosing
  - Latest CDC/WHO advisories and guidelines
  - Recent clinical trial data or treatment updates
  - Outbreak or public health information
  - Any statistics or data that may have changed in the past year

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMATTING STANDARDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Bold** key terms, drug names, diagnosis names, critical information
- Emoji section headers to structure complex responses
- Triage levels: 🟢 HOME CARE | 🟡 SCHEDULE APPOINTMENT | 🟠 URGENT CARE | 🔴 EMERGENCY
- Cite sources inline: "According to the 2024 AHA guidelines..."
- Be specific with dosing — never vague

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Never fabricate drug names, statistics, or clinical data
- Never prescribe controlled substances
- Always recommend professional follow-up
- For any emergency symptoms — lead immediately with "CALL 911"
- Search web whenever current data matters

End all responses about personal symptoms/conditions with:
⚕️ *Dr. Mirza provides evidence-based medical information for educational purposes only. This does not replace examination by a licensed physician. Emergency? Call 911 immediately.*`;

export async function POST(req) {
  try {
    const { messages, patient, mode } = await req.json();
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let systemFull = SYSTEM;
    if (mode === 'consultation' && patient) {
      systemFull += `\n\nCURRENT PATIENT (FORMAL CONSULTATION)\nName: ${patient.name}\nAge: ${patient.age} years old\nBiological Sex: ${patient.gender}\nChief Complaint: ${patient.complaint}\n${patient.history ? `Medical History Notes: ${patient.history}` : ''}\n\nBegin the formal consultation now. Greet ${patient.name} by name and acknowledge their chief complaint with empathy before asking your first set of focused history questions.`;
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const apiMessages = messages
            .filter((m) => m.content && m.content.trim())
            .map((m) => ({ role: m.role, content: m.content }));

          let response;
          try {
            // Try with web search first
            response = await client.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 2000,
              system: systemFull,
              tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
              messages: apiMessages,
            });
          } catch (toolErr) {
            console.warn('Web search tool failed, retrying without:', toolErr?.message);
            // Fallback without web search
            response = await client.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 2000,
              system: systemFull,
              messages: apiMessages,
            });
          }

          let fullText = '';
          const sources = [];

          for (const block of response.content) {
            if (block.type === 'text') fullText += block.text;
            if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
              for (const entry of block.content) {
                if (entry.type === 'web_search_result' && entry.url && entry.title) {
                  sources.push({ url: entry.url, title: entry.title });
                }
              }
            }
          }

          for (let i = 0; i < fullText.length; i += 10) {
            controller.enqueue(encoder.encode(fullText.slice(i, i + 10)));
            await new Promise((r) => setTimeout(r, 6));
          }

          if (sources.length > 0) {
            controller.enqueue(encoder.encode(`\n\n__SOURCES__${JSON.stringify(sources)}__END_SOURCES__`));
          }

          controller.close();
        } catch (err) {
          console.error('Dr. Mirza API error:', err?.status, err?.message, JSON.stringify(err?.error || err || {}));
          const detail = err?.error?.error?.message || err?.message || '';
          const msg = err?.status === 401
            ? '⚠️ Invalid API key. Please check your ANTHROPIC_API_KEY environment variable.'
            : err?.status === 429
            ? '⚠️ Rate limit reached. Please wait a moment and try again.'
            : `⚠️ API error (${err?.status || 'network'}): ${detail || 'Please try again.'}`;
          controller.enqueue(encoder.encode(msg));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    console.error('Route error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
