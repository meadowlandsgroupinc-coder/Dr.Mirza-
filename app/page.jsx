'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/* ─── Markdown-lite renderer ─── */
function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4 style="margin:18px 0 8px;font-family:var(--font-display);font-size:1.1rem;font-weight:600">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:20px 0 10px;font-family:var(--font-display);font-size:1.25rem;font-weight:600">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin:24px 0 12px;font-family:var(--font-display);font-size:1.4rem;font-weight:600">$1</h2>')
    .replace(/^[-*] (.+)$/gm, '<div style="padding-left:1.2em;position:relative;margin:4px 0"><span style="position:absolute;left:0">•</span>$1</div>')
    .replace(/^\d+\. (.+)$/gm, '<div style="padding-left:1.5em;margin:4px 0">$1</div>')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

/* ─── Source pills ─── */
function SourcePills({ sources }) {
  if (!sources?.length) return null;
  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(139,115,85,0.15)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#8b7355', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Sources Referenced
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {sources.map((s, i) => (
          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'rgba(139,115,85,0.08)', borderRadius: 20, fontSize: 11, color: '#6b5a3e', textDecoration: 'none', border: '1px solid rgba(139,115,85,0.12)', transition: 'all 0.2s' }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(139,115,85,0.15)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(139,115,85,0.08)'; }}>
            🔗 {s.title?.slice(0, 50)}{s.title?.length > 50 ? '…' : ''}
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─── Chat message bubble ─── */
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  let content = msg.content;
  let sources = msg.sources || [];

  // Parse sources from content if embedded
  const srcMatch = content?.match?.(/\n?\n?__SOURCES__(.+?)__END_SOURCES__/);
  if (srcMatch) {
    try { sources = JSON.parse(srcMatch[1]); } catch {}
    content = content.replace(srcMatch[0], '');
  }

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 16, animation: 'fadeIn 0.3s ease' }}>
      {!isUser && (
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #8b7355, #6b5a3e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginRight: 10, flexShrink: 0, marginTop: 4 }}>
          🩺
        </div>
      )}
      <div style={{
        maxWidth: '78%',
        padding: '14px 18px',
        borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
        background: isUser ? 'linear-gradient(135deg, #8b7355, #6b5a3e)' : '#ffffff',
        color: isUser ? '#fff' : '#2d2418',
        fontSize: 14.5,
        lineHeight: 1.7,
        boxShadow: isUser ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
        border: isUser ? 'none' : '1px solid rgba(139,115,85,0.1)',
      }}>
        {isUser ? content : (
          <>
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
            <SourcePills sources={sources} />
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Typing indicator ─── */
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #8b7355, #6b5a3e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
        🩺
      </div>
      <div style={{ padding: '12px 20px', borderRadius: '20px 20px 20px 4px', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(139,115,85,0.1)', display: 'flex', gap: 5 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%', background: '#8b7355',
            animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Patient Intake Form ─── */
function IntakeForm({ onSubmit, onSwitchToChat }) {
  const [form, setForm] = useState({ name: '', age: '', gender: '', complaint: '', history: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.age || isNaN(form.age) || +form.age < 0 || +form.age > 150) e.age = 'Valid age required';
    if (!form.gender) e.gender = 'Required';
    if (!form.complaint.trim()) e.complaint = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  const inputStyle = (field) => ({
    width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14,
    border: `1.5px solid ${errors[field] ? '#d4453a' : 'rgba(139,115,85,0.2)'}`,
    background: '#fdfcfa', outline: 'none', transition: 'border 0.2s, box-shadow 0.2s',
    fontFamily: 'var(--font-body)',
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(170deg, #faf8f5 0%, #f0ebe4 50%, #e8e0d5 100%)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#ffffff', borderRadius: 24, padding: '40px 36px', boxShadow: '0 20px 60px rgba(107,90,62,0.1)', border: '1px solid rgba(139,115,85,0.08)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #8b7355, #6b5a3e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(107,90,62,0.2)' }}>
            🩺
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 500, color: '#2d2418', margin: 0, lineHeight: 1.2 }}>
            Dr. Mirza
          </h1>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#8b7355', margin: '6px 0 0', fontStyle: 'italic' }}>
            AI Medical Expert — Formal Consultation
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b5a3e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Full Name
            </label>
            <input style={inputStyle('name')} placeholder="Enter your full name"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              onFocus={e => { e.target.style.borderColor = '#8b7355'; e.target.style.boxShadow = '0 0 0 3px rgba(139,115,85,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = errors.name ? '#d4453a' : 'rgba(139,115,85,0.2)'; e.target.style.boxShadow = 'none'; }} />
            {errors.name && <div style={{ color: '#d4453a', fontSize: 12, marginTop: 4 }}>{errors.name}</div>}
          </div>

          {/* Age & Gender row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b5a3e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Age</label>
              <input type="number" style={inputStyle('age')} placeholder="Age"
                value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
                onFocus={e => { e.target.style.borderColor = '#8b7355'; e.target.style.boxShadow = '0 0 0 3px rgba(139,115,85,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = errors.age ? '#d4453a' : 'rgba(139,115,85,0.2)'; e.target.style.boxShadow = 'none'; }} />
              {errors.age && <div style={{ color: '#d4453a', fontSize: 12, marginTop: 4 }}>{errors.age}</div>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b5a3e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Biological Sex</label>
              <select style={{ ...inputStyle('gender'), cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath d=\'M2 4l4 4 4-4\' fill=\'none\' stroke=\'%238b7355\' stroke-width=\'1.5\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
                value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && <div style={{ color: '#d4453a', fontSize: 12, marginTop: 4 }}>{errors.gender}</div>}
            </div>
          </div>

          {/* Chief Complaint */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b5a3e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Chief Complaint
            </label>
            <textarea style={{ ...inputStyle('complaint'), minHeight: 80, resize: 'vertical' }}
              placeholder="What brings you in today? Describe your main concern..."
              value={form.complaint} onChange={e => setForm({ ...form, complaint: e.target.value })}
              onFocus={e => { e.target.style.borderColor = '#8b7355'; e.target.style.boxShadow = '0 0 0 3px rgba(139,115,85,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = errors.complaint ? '#d4453a' : 'rgba(139,115,85,0.2)'; e.target.style.boxShadow = 'none'; }} />
            {errors.complaint && <div style={{ color: '#d4453a', fontSize: 12, marginTop: 4 }}>{errors.complaint}</div>}
          </div>

          {/* Medical History (optional) */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b5a3e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Medical History <span style={{ fontWeight: 400, color: '#a09080' }}>(optional)</span>
            </label>
            <textarea style={{ ...inputStyle('history'), minHeight: 60, resize: 'vertical' }}
              placeholder="Known conditions, current medications, allergies..."
              value={form.history} onChange={e => setForm({ ...form, history: e.target.value })}
              onFocus={e => { e.target.style.borderColor = '#8b7355'; e.target.style.boxShadow = '0 0 0 3px rgba(139,115,85,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(139,115,85,0.2)'; e.target.style.boxShadow = 'none'; }} />
          </div>

          {/* Submit */}
          <button type="submit" style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 600,
            background: 'linear-gradient(135deg, #8b7355, #6b5a3e)', color: '#fff', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(107,90,62,0.25)', transition: 'all 0.2s', fontFamily: 'var(--font-body)',
          }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,90,62,0.3)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(107,90,62,0.25)'; }}>
            Begin Consultation
          </button>
        </form>

        {/* Switch to quick chat */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button onClick={onSwitchToChat} style={{
            background: 'none', border: 'none', color: '#8b7355', fontSize: 13, cursor: 'pointer',
            textDecoration: 'underline', fontFamily: 'var(--font-body)', padding: 4,
          }}>
            Skip intake — ask a quick medical question instead
          </button>
        </div>

        {/* Disclaimer */}
        <p style={{ textAlign: 'center', fontSize: 11, color: '#a09080', marginTop: 20, lineHeight: 1.5 }}>
          ⚕️ Dr. Mirza provides evidence-based medical information for educational purposes only.
          This does not replace examination by a licensed physician.
        </p>
      </div>
    </div>
  );
}

/* ─── Suggested quick questions ─── */
const SUGGESTIONS = [
  '💊 What are the side effects of ibuprofen?',
  '🫀 When should chest pain be an emergency?',
  '🧬 What does a CBC blood test measure?',
  '😷 What are the current flu symptoms to watch for?',
];

/* ─── Main App ─── */
export default function DrMirza() {
  const [view, setView] = useState('landing'); // 'landing' | 'consultation' | 'chat'
  const [patient, setPatient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(scrollToBottom, [messages, loading, scrollToBottom]);

  /* Start formal consultation */
  const startConsultation = (formData) => {
    setPatient(formData);
    setView('consultation');
    setMessages([]);
    // Auto-send first message
    setTimeout(() => {
      sendMessage(`My name is ${formData.name}, I'm ${formData.age} years old (${formData.gender}). My main concern is: ${formData.complaint}.${formData.history ? ` Medical history: ${formData.history}` : ''}`, formData, 'consultation');
    }, 300);
  };

  /* Switch to quick chat */
  const startChat = () => {
    setView('chat');
    setPatient(null);
    setMessages([{
      role: 'assistant',
      content: "Hello! I'm **Dr. Mirza**, your AI medical expert. I have access to live medical databases and current clinical guidelines.\n\nYou can ask me anything — medications, symptoms, conditions, lab results, treatment options, or general health questions.\n\n**How can I help you today?**"
    }]);
  };

  /* Send message */
  const sendMessage = async (text, patientData, mode) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput('');

    const p = patientData || patient;
    const m = mode || (p ? 'consultation' : 'chat');

    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(msg => ({ role: msg.role, content: msg.content })),
          patient: p,
          mode: m,
        }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      setMessages([...newMessages, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantText };
          return updated;
        });
      }
    } catch (err) {
      console.error('Send error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ─── Landing / Intake ─── */
  if (view === 'landing') {
    return <IntakeForm onSubmit={startConsultation} onSwitchToChat={startChat} />;
  }

  /* ─── Chat View ─── */
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(170deg, #faf8f5 0%, #f0ebe4 50%, #e8e0d5 100%)' }}>
      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(139,115,85,0.1)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #8b7355, #6b5a3e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            🩺
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 500, color: '#2d2418' }}>Dr. Mirza</div>
            <div style={{ fontSize: 11, color: '#8b7355' }}>
              {patient ? `Consulting with ${patient.name}` : 'AI Medical Expert — Live Chat'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {patient && (
            <button onClick={startChat} style={{
              padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(139,115,85,0.2)',
              background: 'transparent', color: '#6b5a3e', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
              Quick Chat
            </button>
          )}
          <button onClick={() => { setView('landing'); setMessages([]); setPatient(null); }} style={{
            padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(139,115,85,0.2)',
            background: 'transparent', color: '#6b5a3e', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            New Consultation
          </button>
        </div>
      </header>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {/* Suggestions if chat mode and no user messages yet */}
          {!patient && messages.length <= 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {SUGGESTIONS.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)} style={{
                  padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(139,115,85,0.15)',
                  background: 'rgba(255,255,255,0.7)', color: '#4a3f30', fontSize: 13, cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'var(--font-body)', transition: 'all 0.2s', lineHeight: 1.4,
                }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; e.currentTarget.style.borderColor = 'rgba(139,115,85,0.3)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(139,115,85,0.15)'; }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {loading && messages[messages.length - 1]?.role !== 'assistant' && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ── Input ── */}
      <div style={{
        padding: '14px 16px 20px', background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(139,115,85,0.1)',
      }}>
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            onKeyDown={handleKeyDown}
            placeholder={patient ? 'Describe your symptoms or answer Dr. Mirza...' : 'Ask any medical question...'}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 14, border: '1.5px solid rgba(139,115,85,0.2)',
              background: '#fdfcfa', fontSize: 14, resize: 'none', outline: 'none',
              fontFamily: 'var(--font-body)', lineHeight: 1.5, maxHeight: 120,
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={e => { e.target.style.borderColor = '#8b7355'; e.target.style.boxShadow = '0 0 0 3px rgba(139,115,85,0.1)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(139,115,85,0.2)'; e.target.style.boxShadow = 'none'; }}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading} style={{
            width: 46, height: 46, borderRadius: 14, border: 'none',
            background: input.trim() && !loading ? 'linear-gradient(135deg, #8b7355, #6b5a3e)' : 'rgba(139,115,85,0.15)',
            color: input.trim() && !loading ? '#fff' : '#a09080', fontSize: 20, cursor: input.trim() && !loading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transition: 'all 0.2s',
          }}>
            ↑
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 10, color: '#a09080', marginTop: 10 }}>
          ⚕️ AI medical information for educational purposes only. Not a substitute for professional medical advice.
        </p>
      </div>

      {/* ── Animations ── */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139,115,85,0.2); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,115,85,0.35); }
      `}</style>
    </div>
  );
}
