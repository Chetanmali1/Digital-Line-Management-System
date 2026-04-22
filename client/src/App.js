import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';

const API = 'http://localhost:5000/api';
const ThemeCtx = createContext();
const AuthCtx = createContext();

async function api(endpoint, options = {}) {
  const token = localStorage.getItem('qms_token');
  const res = await fetch(`${API}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const SVC_COLORS = {
  billing: '#0ea5e9', registration: '#8b5cf6', consultation: '#f59e0b',
  support: '#10b981', general: '#64748b', express: '#ef4444', premium: '#f97316',
};

const SVC_ICONS = {
  billing: '💳', registration: '📋', consultation: '🩺',
  support: '🎧', general: '🏢', express: '⚡', premium: '👑',
};

function GlobalStyles({ dark }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root {
        --bg: ${dark ? '#0a0f1e' : '#f0f4f8'};
        --bg2: ${dark ? '#0f1629' : '#e8edf5'};
        --card: ${dark ? '#131d35' : '#ffffff'};
        --card2: ${dark ? '#1a2540' : '#f8fafc'};
        --border: ${dark ? '#1e2d4a' : '#e2e8f0'};
        --border2: ${dark ? '#243354' : '#cbd5e1'};
        --text: ${dark ? '#f1f5f9' : '#0f172a'};
        --text2: ${dark ? '#94a3b8' : '#475569'};
        --text3: ${dark ? '#64748b' : '#94a3b8'};
        --accent: #2563eb;
        --accent2: #1d4ed8;
        --accent-bg: ${dark ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)'};
        --success: #10b981;
        --warning: #f59e0b;
        --danger: #ef4444;
        --shadow: ${dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)'};
        --shadow-lg: ${dark ? '0 8px 48px rgba(0,0,0,0.6)' : '0 8px 48px rgba(0,0,0,0.12)'};
        --radius: 12px;
        --radius-lg: 20px;
      }
      html, body { height: 100%; font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); transition: background 0.3s, color 0.3s; }
      button { font-family: inherit; cursor: pointer; }
      input, select, textarea { font-family: inherit; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: var(--bg2); }
      ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      @keyframes slideIn { from { transform:translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }
      @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      .fade-in { animation: fadeIn 0.4s ease forwards; }
      .btn { display:inline-flex; align-items:center; gap:8px; padding:10px 20px; border-radius:8px; font-size:14px; font-weight:600; border:none; transition:all 0.2s; }
      .btn-primary { background:var(--accent); color:white; }
      .btn-primary:hover:not(:disabled) { background:var(--accent2); transform:translateY(-1px); box-shadow:0 4px 12px rgba(37,99,235,0.4); }
      .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
      .btn-ghost { background:transparent; color:var(--text2); border:1px solid var(--border2); }
      .btn-ghost:hover { background:var(--card2); color:var(--text); }
      .btn-danger { background:#fef2f2; color:var(--danger); border:1px solid #fecaca; }
      .btn-danger:hover { background:#fee2e2; }
      .btn-success { background:#f0fdf4; color:var(--success); border:1px solid #bbf7d0; }
      .btn-success:hover { background:#dcfce7; }
      .btn-warning { background:#fffbeb; color:#92400e; border:1px solid #fcd34d; }
      .card { background:var(--card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; }
      input[type=text], input[type=email], input[type=password], input[type=number], select {
        width:100%; padding:11px 14px; background:var(--bg2); border:1px solid var(--border2);
        border-radius:8px; color:var(--text); font-size:14px; outline:none; transition:border 0.2s;
      }
      input:focus, select:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(37,99,235,0.1); }
      label { display:block; font-size:13px; font-weight:600; color:var(--text2); margin-bottom:6px; }
      .badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
      .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
      .grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
      .grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
      @media(max-width:768px) { .grid-2,.grid-3,.grid-4 { grid-template-columns:1fr; } }
      table { width:100%; border-collapse:collapse; }
      th { text-align:left; font-size:11px; font-weight:700; color:var(--text3); text-transform:uppercase; letter-spacing:0.5px; padding:8px 12px; border-bottom:1px solid var(--border); }
      td { padding:10px 12px; font-size:13px; color:var(--text); border-bottom:1px solid var(--border); }
      tr:last-child td { border-bottom:none; }
      tr:hover td { background:var(--bg2); }
    `}</style>
  );
}

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('qms_theme') !== 'light');
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('qms_user')); } catch { return null; } });
  const [page, setPage] = useState('queue');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const toggleDark = useCallback(() => {
    setDark(prev => {
      const next = !prev;
      localStorage.setItem('qms_theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('qms_token', token);
    localStorage.setItem('qms_user', JSON.stringify(userData));
    setUser(userData);
    setPage(userData.role === 'admin' ? 'admin' : 'queue');
  };

  const logout = () => {
    localStorage.removeItem('qms_token');
    localStorage.removeItem('qms_user');
    setUser(null);
    setPage('queue');
  };

  return (
    <ThemeCtx.Provider value={{ dark, toggleDark }}>
      <AuthCtx.Provider value={{ user, login, logout, showToast }}>
        <GlobalStyles dark={dark} />
        {toast && <Toast toast={toast} />}
        {!user ? <AuthPage /> : (
          <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <Sidebar page={page} setPage={setPage} />
            <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
              <TopBar page={page} />
              <div style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }} key={page}>
                {page === 'queue'     && <QueuePage />}
                {page === 'live'      && <LiveBoardPage />}
                {page === 'admin'     && user?.role === 'admin' && <AdminPage />}
                {page === 'counters'  && user?.role === 'admin' && <CountersPage />}
                {page === 'analytics' && user?.role === 'admin' && <AnalyticsPage />}
                {page === 'users'     && user?.role === 'admin' && <UsersPage />}
              </div>
            </main>
          </div>
        )}
      </AuthCtx.Provider>
    </ThemeCtx.Provider>
  );
}

function Toast({ toast }) {
  const colors = {
    success: { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
    error:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    info:    { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' },
  };
  const c = colors[toast.type] || colors.info;
  return (
    <div style={{ position:'fixed', top:24, right:24, zIndex:9999, background:c.bg, color:c.color, border:`1px solid ${c.border}`, borderRadius:12, padding:'14px 20px', fontSize:14, fontWeight:600, boxShadow:'0 8px 32px rgba(0,0,0,0.15)', maxWidth:380, animation:'slideIn 0.3s ease', display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ fontSize:18 }}>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
      {toast.msg}
    </div>
  );
}

function Sidebar({ page, setPage }) {
  const { user, logout } = useContext(AuthCtx);
  const { dark, toggleDark } = useContext(ThemeCtx);
  const userNav = [
    { id: 'queue', icon: '🎫', label: 'My Queue' },
    { id: 'live',  icon: '📺', label: 'Live Board' },
  ];
  const adminNav = [
    { id: 'admin',     icon: '⚡', label: 'Dashboard' },
    { id: 'counters',  icon: '🪟', label: 'Counters' },
    { id: 'analytics', icon: '📊', label: 'Analytics' },
    { id: 'live',      icon: '📺', label: 'Live Board' },
    { id: 'queue',     icon: '🎫', label: 'Queue View' },
    { id: 'users',     icon: '👥', label: 'Users' },
  ];
  const nav = user?.role === 'admin' ? adminNav : userNav;
  return (
    <aside style={{ width:240, background:'var(--card)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0 }}>
      <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, background:'linear-gradient(135deg, #2563eb, #7c3aed)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🎯</div>
          <div>
            <div style={{ fontWeight:800, fontSize:16, color:'var(--text)', letterSpacing:-0.5 }}>QueueFlow</div>
            <div style={{ fontSize:10, color:'var(--text3)', fontWeight:500, textTransform:'uppercase', letterSpacing:1 }}>Enterprise</div>
          </div>
        </div>
      </div>
      <nav style={{ flex:1, padding:'12px 10px', display:'flex', flexDirection:'column', gap:2 }}>
        {nav.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, border:'none', background:page===item.id?'var(--accent-bg)':'transparent', color:page===item.id?'var(--accent)':'var(--text2)', fontWeight:page===item.id?700:500, fontSize:14, transition:'all 0.15s', textAlign:'left', width:'100%' }}>
            <span style={{ fontSize:16, width:20, textAlign:'center' }}>{item.icon}</span>
            {item.label}
            {page === item.id && <div style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:'var(--accent)' }} />}
          </button>
        ))}
      </nav>
      <div style={{ padding:'12px 10px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background:'var(--bg2)', borderRadius:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg, #2563eb, #7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white', flexShrink:0 }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow:'hidden' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize:11, color:user?.role==='admin'?'var(--accent)':'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{user?.role}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={toggleDark} className="btn btn-ghost" style={{ flex:1, padding:'8px', justifyContent:'center', fontSize:16 }}>{dark ? '☀️' : '🌙'}</button>
          <button onClick={logout} className="btn btn-danger" style={{ flex:1, padding:'8px', justifyContent:'center', fontSize:12 }}>Logout</button>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ page }) {
  const titles    = { queue:'My Queue', live:'Live Board', admin:'Dashboard', counters:'Counter Management', analytics:'Analytics', users:'User Management' };
  const subtitles = { queue:'Join a service queue and track your position', live:'Real-time display of all active counters', admin:"Today's overview and AI insights", counters:'Manage service counters and call customers', analytics:'Historical trends and performance metrics', users:'Manage users and roles' };
  const now = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  return (
    <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', background:'var(--card)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:-0.5 }}>{titles[page]}</h1>
        <p style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>{subtitles[page]}</p>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:12, color:'var(--text3)' }}>{now}</div>
          <LiveClock />
        </div>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--success)', animation:'pulse 2s infinite' }} title="System Online" />
      </div>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', fontFamily:'JetBrains Mono, monospace' }}>{time}</div>;
}

function AuthPage() {
  const { dark } = useContext(ThemeCtx);
  const { login, showToast } = useContext(AuthCtx);
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name:'', email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const data = await api(isLogin ? '/auth/login' : '/auth/register', { method:'POST', body: isLogin ? { email:form.email, password:form.password } : form });
      login(data.user, data.token);
      showToast(`Welcome, ${data.user.name}!`);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };
  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'var(--bg)' }}>
      <div style={{ flex:1, background:dark?'linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)':'linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)', display:'flex', flexDirection:'column', justifyContent:'center', padding:'60px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize:'32px 32px' }} />
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:48 }}>
            <div style={{ width:48, height:48, background:'rgba(255,255,255,0.15)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, border:'1px solid rgba(255,255,255,0.2)' }}>🎯</div>
            <div>
              <div style={{ fontWeight:900, fontSize:22, color:'white', letterSpacing:-1 }}>QueueFlow</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontWeight:500, textTransform:'uppercase', letterSpacing:2 }}>Enterprise Edition</div>
            </div>
          </div>
          <h2 style={{ fontSize:40, fontWeight:900, color:'white', lineHeight:1.2, marginBottom:16, letterSpacing:-1.5 }}>Smart Queue<br />Management<br /><span style={{ color:'rgba(255,255,255,0.5)' }}>Powered by AI</span></h2>
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:15, lineHeight:1.7, maxWidth:360, marginBottom:40 }}>Eliminate waiting room chaos with real-time digital queuing, AI predictions, and enterprise analytics.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[['⚡','Real-time Socket.io updates'],['🤖','AI-powered wait time prediction'],['📊','Advanced analytics dashboard'],['📱','QR code token generation']].map(([icon,text]) => (
              <div key={text} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:32, height:32, background:'rgba(255,255,255,0.1)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, border:'1px solid rgba(255,255,255,0.15)' }}>{icon}</div>
                <span style={{ color:'rgba(255,255,255,0.8)', fontSize:14 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ width:480, display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
        <div style={{ width:'100%', maxWidth:380 }}>
          <div style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:28, fontWeight:800, color:'var(--text)', letterSpacing:-0.5, marginBottom:6 }}>{isLogin?'Sign in':'Create account'}</h2>
            <p style={{ color:'var(--text2)', fontSize:14 }}>{isLogin?'Enter your credentials to continue':'Register to access the queue system'}</p>
          </div>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {!isLogin && <div><label>Full Name</label><input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="John Smith" required /></div>}
            <div><label>Email Address</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="you@company.com" required /></div>
            <div><label>Password</label><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••" required minLength={6} /></div>
            {err && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', color:'#dc2626', fontSize:13, display:'flex', gap:8, alignItems:'center' }}>⚠️ {err}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:15, borderRadius:10, marginTop:4 }}>
              {loading?<><Spinner size={16} color="white" /> Please wait...</>:(isLogin?'→ Sign In':'✨ Create Account')}
            </button>
          </form>
          <div style={{ textAlign:'center', marginTop:24, fontSize:13, color:'var(--text2)' }}>
            {isLogin?"Don't have an account? ":"Already have an account? "}
            <button onClick={()=>{setIsLogin(!isLogin);setErr('');}} style={{ background:'none', border:'none', color:'var(--accent)', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              {isLogin?'Sign up':'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QueuePage() {
  const { showToast } = useContext(AuthCtx);
  const [counters, setCounters] = useState([]);
  const [myStatus, setMyStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const [filter, setFilter] = useState('all');
  const fetchData = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([api('/counters'), api('/queue/my-status')]);
      setCounters(c); setMyStatus(s);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); const t = setInterval(fetchData, 12000); return () => clearInterval(t); }, [fetchData]);
  const join = async (counterId) => {
    setJoining(counterId);
    try {
      const r = await api('/queue/join', { method:'POST', body:{ counterId } });
      showToast(`🎫 Token: ${r.token} — Position #${r.position}`);
      await fetchData();
    } catch (e) { showToast(e.message, 'error'); } finally { setJoining(null); }
  };
  const cancel = async (id) => {
    try { await api(`/queue/${id}/cancel`, { method:'POST' }); showToast('Queue entry cancelled'); fetchData(); }
    catch (e) { showToast(e.message, 'error'); }
  };
  const svcTypes = ['all', ...new Set(counters.map(c => c.serviceType))];
  const filtered = filter === 'all' ? counters : counters.filter(c => c.serviceType === filter);
  if (loading) return <Loader />;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {myStatus?.inQueue && myStatus.entries?.length > 0 && (
        <section>
          <SectionHeader title="🎫 Your Active Tokens" subtitle="Track your live queue position" />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:16 }}>
            {myStatus.entries.map(e => <ActiveTokenCard key={e._id} entry={e} onCancel={cancel} />)}
          </div>
        </section>
      )}
      <section>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
          <SectionHeader title="Available Counters" subtitle={`${counters.filter(c=>c.isActive).length} counters active`} noMargin />
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {svcTypes.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${filter===t?'var(--accent)':'var(--border2)'}`, background:filter===t?'var(--accent-bg)':'transparent', color:filter===t?'var(--accent)':'var(--text2)', fontSize:12, fontWeight:600, cursor:'pointer', textTransform:'capitalize', transition:'all 0.15s' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? <EmptyState icon="🏢" msg="No counters available right now" /> : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
            {filtered.map(c => <CounterCard key={c._id} counter={c} onJoin={join} joining={joining===c._id} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function CounterCard({ counter, onJoin, joining }) {
  const color = SVC_COLORS[counter.serviceType] || '#64748b';
  const icon  = SVC_ICONS[counter.serviceType]  || '🏢';
  const load  = Math.min(100, Math.round(((counter.currentCount||0)/counter.maxCapacity)*100));
  const wait  = Math.round((counter.currentCount||0)*(counter.avgServiceTime||10));
  const full  = (counter.currentCount||0) >= counter.maxCapacity;
  return (
    <div className="card" style={{ display:'flex', flexDirection:'column', gap:16, transition:'all 0.2s', position:'relative', overflow:'hidden' }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 32px ${color}20`;}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
      <div style={{ position:'absolute', top:0, right:0, width:100, height:100, background:`${color}08`, borderRadius:'0 20px 0 100px' }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:counter.isActive?'var(--success)':'var(--danger)', flexShrink:0 }} />
            <span style={{ fontSize:11, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{counter.isActive?'Active':'Inactive'}</span>
          </div>
          <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:4 }}>{counter.counterName}</h3>
          <span className="badge" style={{ background:`${color}15`, color }}>{icon} {counter.serviceType}</span>
        </div>
        <div style={{ textAlign:'right', position:'relative', zIndex:1 }}>
          <div style={{ fontSize:32, fontWeight:900, color, lineHeight:1 }}>{counter.currentCount||0}</div>
          <div style={{ fontSize:11, color:'var(--text3)' }}>waiting</div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <MiniStat label="Est. Wait" value={`~${wait}m`} />
        <MiniStat label="Avg Service" value={`${counter.avgServiceTime}m`} />
      </div>
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:12, color:'var(--text3)' }}>Queue load</span>
          <span style={{ fontSize:12, fontWeight:700, color:load>80?'var(--danger)':load>50?'var(--warning)':'var(--success)' }}>{load}% · {counter.currentCount||0}/{counter.maxCapacity}</span>
        </div>
        <div style={{ height:6, background:'var(--bg2)', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${load}%`, background:load>80?'var(--danger)':load>50?'var(--warning)':'var(--success)', borderRadius:3, transition:'width 0.6s ease' }} />
        </div>
      </div>
      <button className={`btn ${full||!counter.isActive?'btn-ghost':'btn-primary'}`} onClick={()=>onJoin(counter._id)} disabled={!counter.isActive||joining||full} style={{ width:'100%', justifyContent:'center', padding:'11px', fontSize:14 }}>
        {joining?<><Spinner size={14} color="white" /> Joining...</>:full?'⛔ Queue Full':!counter.isActive?'🔒 Inactive':'🎫 Join Queue'}
      </button>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ background:'var(--bg2)', borderRadius:8, padding:'8px 12px' }}>
      <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{value}</div>
    </div>
  );
}

function ActiveTokenCard({ entry, onCancel }) {
  const color = { waiting:'var(--warning)', serving:'var(--accent)', served:'var(--success)', cancelled:'var(--danger)' }[entry.status] || 'var(--text3)';
  const [showQR, setShowQR] = useState(false);
  return (
    <div className="card" style={{ border:`2px solid ${color}40`, boxShadow:`0 0 24px ${color}15`, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:color }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, marginTop:4 }}>
        <div>
          <span className="badge" style={{ background:`${color}15`, color, marginBottom:8, display:'inline-flex' }}>
            <span style={{ animation:entry.status==='serving'?'blink 1s infinite':'none' }}>●</span>
            {entry.status.toUpperCase()}
          </span>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:1 }}>{entry.tokenNumber}</div>
          <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>{entry.counterId?.counterName}</div>
        </div>
        <div style={{ textAlign:'center', background:'var(--bg2)', borderRadius:12, padding:'12px 16px' }}>
          <div style={{ fontSize:36, fontWeight:900, color, lineHeight:1 }}>{entry.livePosition||entry.position}</div>
          <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, marginTop:2 }}>Position</div>
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom:16 }}>
        <MiniStat label="Est. Wait" value={`~${entry.liveEstimatedWait||entry.estimatedWaitTime||0}m`} />
        <MiniStat label="Joined" value={new Date(entry.joinedAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})} />
      </div>
      {entry.qrCode ? (
        <div style={{ marginBottom:12 }}>
          <button onClick={()=>setShowQR(!showQR)} className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', marginBottom:showQR?10:0, fontSize:13 }}>
            {showQR?'🔼 Hide QR Code':'📱 Show QR Code'}
          </button>
          {showQR && (
            <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px', background:'var(--bg2)', borderRadius:12, animation:'fadeIn 0.3s ease' }}>
              <div style={{ background:'white', padding:8, borderRadius:10, flexShrink:0 }}>
                <img src={entry.qrCode} alt="QR Code" style={{ width:100, height:100, display:'block', borderRadius:4 }} />
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Your Queue Token</div>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:16, fontWeight:700, color:'var(--accent)', marginBottom:4 }}>{entry.tokenNumber}</div>
                <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.5 }}>Scan this QR code at the<br />counter to verify your token</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding:'10px 14px', background:'var(--bg2)', borderRadius:8, marginBottom:12, textAlign:'center', fontSize:12, color:'var(--text3)' }}>
          📱 QR code generating...
        </div>
      )}
      {entry.status === 'serving' && (
        <div style={{ padding:'12px 14px', background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.2)', borderRadius:10, textAlign:'center', color:'var(--accent)', fontWeight:700, fontSize:14, marginBottom:12, animation:'pulse 2s infinite' }}>
          🔔 You're being called! Proceed to counter now.
        </div>
      )}
      {entry.status === 'waiting' && (
        <button className="btn btn-danger" onClick={()=>onCancel(entry._id)} style={{ width:'100%', justifyContent:'center' }}>✕ Cancel Queue</button>
      )}
    </div>
  );
}

function LiveBoardPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchData = useCallback(async () => { try { setData(await api('/queue/live')); } catch (e) {} finally { setLoading(false); } }, []);
  useEffect(() => { fetchData(); const t = setInterval(fetchData, 5000); return () => clearInterval(t); }, [fetchData]);
  if (loading) return <Loader />;
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:24, padding:'10px 16px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:10, width:'fit-content' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--success)', animation:'pulse 1.5s infinite' }} />
        <span style={{ fontSize:13, fontWeight:600, color:'var(--success)' }}>Live — Refreshing every 5 seconds</span>
      </div>
      {data.length === 0 ? <EmptyState icon="📺" msg="No active counters — create counters in the admin panel" /> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20 }}>
          {data.map(c => {
            const color = SVC_COLORS[c.serviceType]||'#64748b';
            const icon  = SVC_ICONS[c.serviceType]||'🏢';
            const high  = c.loadPercentage > 70;
            return (
              <div key={c.counterId} className="card" style={{ border:`1px solid ${high?'rgba(239,68,68,0.3)':'var(--border)'}`, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${color}, ${color}80)` }} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, marginTop:4 }}>
                  <div>
                    <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Counter {c.counterNumber}</div>
                    <h3 style={{ fontSize:18, fontWeight:800, color:'var(--text)', marginBottom:4 }}>{c.counterName}</h3>
                    <span className="badge" style={{ background:`${color}15`, color }}>{icon} {c.serviceType}</span>
                  </div>
                  <div style={{ width:52, height:52, borderRadius:14, background:`${color}15`, border:`2px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{icon}</div>
                </div>
                <div className="grid-2" style={{ marginBottom:16 }}>
                  <div style={{ background:'var(--bg2)', borderRadius:10, padding:'12px', textAlign:'center' }}>
                    <div style={{ fontSize:28, fontWeight:900, color, lineHeight:1 }}>{c.waitingCount}</div>
                    <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, marginTop:2 }}>Waiting</div>
                  </div>
                  <div style={{ background:'var(--bg2)', borderRadius:10, padding:'12px', textAlign:'center' }}>
                    <div style={{ fontSize:20, fontWeight:800, color:'var(--text)', lineHeight:1 }}>{c.estimatedWait}m</div>
                    <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, marginTop:2 }}>Est. Wait</div>
                  </div>
                </div>
                {c.currentlyServing && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'rgba(37,99,235,0.08)', border:'1px solid rgba(37,99,235,0.15)', borderRadius:8, marginBottom:12 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)', animation:'pulse 1.5s infinite', flexShrink:0 }} />
                    <span style={{ fontSize:12, color:'var(--accent)', fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>NOW SERVING: {c.currentlyServing}</span>
                  </div>
                )}
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:11, color:'var(--text3)' }}>Load</span>
                    <span style={{ fontSize:11, fontWeight:700, color:high?'var(--danger)':'var(--success)' }}>{c.loadPercentage}%</span>
                  </div>
                  <div style={{ height:8, background:'var(--bg2)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${c.loadPercentage}%`, background:high?'var(--danger)':color, borderRadius:4, transition:'width 0.8s ease' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminPage() {
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const fetchDash = useCallback(async () => {
    try { setDash(await api('/analytics/dashboard')); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchDash(); const t = setInterval(fetchDash, 30000); return () => clearInterval(t); }, [fetchDash]);
  const runAI = async () => {
    setAiLoading(true);
    try { setAi(await api('/ai/analyze-trends', { method:'POST' })); }
    catch (e) { console.error(e); } finally { setAiLoading(false); }
  };
  if (loading) return <Loader />;
  const s = dash?.today;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16 }}>
        {[
          { label:'Total Today', value:s?.totalJoined||0, icon:'👥', color:'#2563eb', sub:'customers joined' },
          { label:'Served', value:s?.served||0, icon:'✅', color:'#10b981', sub:`${s?.servedRate||0}% completion` },
          { label:'Cancelled', value:s?.cancelled||0, icon:'❌', color:'#ef4444', sub:'cancelled today' },
          { label:'Waiting Now', value:s?.waitingNow||0, icon:'⏳', color:'#f59e0b', sub:'live count' },
          { label:'Avg Wait', value:`${s?.avgWaitTime||0}m`, icon:'⏱', color:'#8b5cf6', sub:'per customer' },
          { label:'Counters', value:dash?.counters?.length||0, icon:'🪟', color:'#0ea5e9', sub:'active counters' },
        ].map((k,i) => <KPICard key={i} {...k} />)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <TrendsChart />
        <PeakHoursChart />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div className="card">
          <SectionHeader title="Counter Load" subtitle="Real-time utilization" />
          {dash?.counters?.length ? dash.counters.map((c,i) => (
            <div key={i} style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{c.name}</span>
                <span style={{ fontSize:13, fontWeight:700, color:c.load>80?'var(--danger)':c.load>50?'var(--warning)':'var(--success)' }}>{c.load}%</span>
              </div>
              <div style={{ height:8, background:'var(--bg2)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${c.load}%`, background:c.load>80?'var(--danger)':c.load>50?'var(--warning)':'var(--success)', borderRadius:4, transition:'width 0.5s' }} />
              </div>
            </div>
          )) : <EmptyState icon="🪟" msg="No counters yet" />}
        </div>
        <div className="card">
          <SectionHeader title="🤖 AI Insights" subtitle="Powered by OpenAI GPT" />
          {!aiAnalysis ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, minHeight:160 }}>
              <div style={{ fontSize:40 }}>🤖</div>
              <p style={{ fontSize:13, color:'var(--text2)', textAlign:'center' }}>Generate AI-powered insights from your queue data</p>
              <button className="btn btn-primary" onClick={runAI} disabled={aiLoading}>
                {aiLoading?<><Spinner size={14} color="white" /> Analyzing...</>:'✨ Run AI Analysis'}
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ padding:'4px 12px', background:'rgba(16,185,129,0.1)', color:'var(--success)', borderRadius:20, fontSize:12, fontWeight:700, border:'1px solid rgba(16,185,129,0.2)' }}>Efficiency: {aiAnalysis.efficiencyScore}/100</div>
                {aiAnalysis.fallback && <span style={{ fontSize:11, color:'var(--text3)' }}>⚠️ Fallback mode</span>}
              </div>
              {aiAnalysis.summary && <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.6 }}>{aiAnalysis.summary}</p>}
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:160, overflowY:'auto' }}>
                {aiAnalysis.staffRecommendations?.map((r,i) => (
                  <div key={i} style={{ padding:'8px 12px', background:'var(--bg2)', borderRadius:8, fontSize:12, color:'var(--text)', borderLeft:'3px solid var(--accent)' }}>💡 {r}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <QueueListPerCounter />
    </div>
  );
}

function QueueListPerCounter() {
  const { showToast } = useContext(AuthCtx);
  const [counters, setCounters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [queueData, setQueueData] = useState([]);
  const [serving, setServing] = useState(null);
  const [loadingQ, setLoadingQ] = useState(false);
  useEffect(() => { api('/counters').then(setCounters).catch(()=>{}); }, []);
  const loadQueue = async (counterId) => {
    if (selected === counterId) { setSelected(null); setQueueData([]); return; }
    setSelected(counterId); setLoadingQ(true);
    try { const data = await api(`/counters/${counterId}`); setQueueData(data.queue||[]); }
    catch (e) {} finally { setLoadingQ(false); }
  };
  const serveNext = async (counterId) => {
    setServing(counterId);
    try {
      const r = await api(`/counters/${counterId}/serve-next`, { method:'POST' });
      showToast(r.next?`📢 Called: ${r.next.tokenNumber}`:'✅ Queue is empty');
      if (selected === counterId) { const data = await api(`/counters/${counterId}`); setQueueData(data.queue||[]); }
      setCounters(await api('/counters'));
    } catch (e) { showToast(e.message,'error'); } finally { setServing(null); }
  };
  return (
    <div className="card">
      <SectionHeader title="Live Queue List" subtitle="Click a counter to see who is waiting" />
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {counters.map(c => {
          const color  = SVC_COLORS[c.serviceType]||'#64748b';
          const isOpen = selected === c._id;
          return (
            <div key={c._id} style={{ border:`1px solid ${isOpen?color:'var(--border)'}`, borderRadius:12, overflow:'hidden', transition:'all 0.2s' }}>
              <div onClick={()=>loadQueue(c._id)} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', cursor:'pointer', background:isOpen?`${color}08`:'transparent', transition:'all 0.2s' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{SVC_ICONS[c.serviceType]||'🏢'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{c.counterName}</span>
                    <span className="badge" style={{ background:`${color}15`, color, fontSize:10 }}>{c.serviceType}</span>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:c.isActive?'var(--success)':'var(--danger)' }} />
                  </div>
                  <span style={{ fontSize:12, color:'var(--text3)' }}>{c.currentCount||0} waiting · avg {c.avgServiceTime}m · max {c.maxCapacity}</span>
                </div>
                <button className="btn btn-primary" onClick={e=>{e.stopPropagation();serveNext(c._id);}} disabled={serving===c._id||!c.isActive} style={{ padding:'7px 14px', fontSize:12, flexShrink:0 }}>
                  {serving===c._id?<Spinner size={12} color="white" />:'▶ Next'}
                </button>
                <span style={{ color:'var(--text3)', fontSize:16, marginLeft:4 }}>{isOpen?'▲':'▼'}</span>
              </div>
              {isOpen && (
                <div style={{ borderTop:`1px solid ${color}30`, padding:'14px 18px', background:'var(--bg2)', animation:'fadeIn 0.3s ease' }}>
                  {loadingQ ? (
                    <div style={{ display:'flex', justifyContent:'center', padding:16 }}><Spinner /></div>
                  ) : queueData.length === 0 ? (
                    <div style={{ textAlign:'center', color:'var(--text3)', fontSize:13, padding:16 }}>✅ Queue is empty</div>
                  ) : (
                    <table>
                      <thead><tr><th>#</th><th>Token</th><th>Customer</th><th>Joined At</th><th>Waited</th><th>Status</th></tr></thead>
                      <tbody>
                        {queueData.map((q,i) => {
                          const sc = { waiting:'var(--warning)', serving:'var(--accent)', served:'var(--success)', cancelled:'var(--danger)' }[q.status]||'var(--text3)';
                          const waitMins = Math.round((Date.now()-new Date(q.joinedAt))/60000);
                          return (
                            <tr key={q._id}>
                              <td style={{ fontWeight:700, color }}>{i+1}</td>
                              <td style={{ fontFamily:'JetBrains Mono, monospace', fontWeight:700, fontSize:12, color:'var(--accent)' }}>{q.tokenNumber}</td>
                              <td>{q.userId?.name||'Unknown'}</td>
                              <td style={{ color:'var(--text3)' }}>{new Date(q.joinedAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</td>
                              <td style={{ fontWeight:600 }}>{waitMins}m</td>
                              <td><span className="badge" style={{ background:`${sc}15`, color:sc, fontSize:10 }}>{q.status}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {counters.length === 0 && <EmptyState icon="🪟" msg="No counters created yet" />}
      </div>
    </div>
  );
}

function KPICard({ label, value, icon, color, sub }) {
  return (
    <div className="card" style={{ borderLeft:`4px solid ${color}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <span style={{ fontSize:11, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</span>
        <span style={{ fontSize:22 }}>{icon}</span>
      </div>
      <div style={{ fontSize:30, fontWeight:900, color:'var(--text)', letterSpacing:-1, lineHeight:1, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--text3)' }}>{sub}</div>
    </div>
  );
}

function TrendsChart() {
  const [data, setData] = useState([]);
  const [range, setRange] = useState(7);
  useEffect(() => { api(`/analytics/trends?range=${range}`).then(setData).catch(()=>{}); }, [range]);
  const max = Math.max(...data.map(d=>d.totalUsers), 1);
  return (
    <div className="card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <SectionHeader title="Queue Volume" subtitle="Daily customer count" noMargin />
        <div style={{ display:'flex', gap:4 }}>
          {[7,14,30].map(d => (
            <button key={d} onClick={()=>setRange(d)} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${range===d?'var(--accent)':'var(--border2)'}`, background:range===d?'var(--accent-bg)':'transparent', color:range===d?'var(--accent)':'var(--text2)', fontSize:11, fontWeight:600, cursor:'pointer' }}>{d}d</button>
          ))}
        </div>
      </div>
      <div style={{ height:160, display:'flex', alignItems:'flex-end', gap:3 }}>
        {data.map((d,i) => (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }} title={`${d.date}: ${d.totalUsers} customers`}>
            <div style={{ width:'100%', height:Math.max(4,(d.totalUsers/max)*140), background:`linear-gradient(180deg, var(--accent), rgba(37,99,235,0.4))`, borderRadius:'4px 4px 0 0', transition:'height 0.5s ease', minHeight:4 }} />
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
        {data.filter((_,i)=>i%Math.max(1,Math.floor(data.length/5))===0).map((d,i) => (
          <span key={i} style={{ fontSize:9, color:'var(--text3)' }}>{d.date?.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

function PeakHoursChart() {
  const [data, setData] = useState([]);
  useEffect(() => { api('/analytics/peak-hours').then(setData).catch(()=>{}); }, []);
  const max = Math.max(...data.map(d=>d.count), 1);
  return (
    <div className="card">
      <SectionHeader title="Peak Hours" subtitle="Traffic by hour of day" />
      <div style={{ height:140, display:'flex', alignItems:'flex-end', gap:2 }}>
        {data.map((h,i) => (
          <div key={i} title={`${h.label}: ${h.count}`} style={{ flex:1, height:Math.max(3,(h.count/max)*120), background:h.isPeak?'var(--danger)':h.count>0?'var(--accent)':'var(--border)', borderRadius:'3px 3px 0 0', transition:'height 0.5s', opacity:h.count===0?0.2:1, minHeight:3 }} />
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
        {['12a','6a','12p','6p','11p'].map((l,i) => <span key={i} style={{ fontSize:9, color:'var(--text3)' }}>{l}</span>)}
      </div>
      <div style={{ display:'flex', gap:12, marginTop:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:2, background:'var(--danger)' }} /><span style={{ fontSize:10, color:'var(--text3)' }}>Peak</span></div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:2, background:'var(--accent)' }} /><span style={{ fontSize:10, color:'var(--text3)' }}>Normal</span></div>
      </div>
    </div>
  );
}

function CountersPage() {
  const { showToast } = useContext(AuthCtx);
  const [counters, setCounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [serving, setServing] = useState(null);
  const [form, setForm] = useState({ counterName:'', serviceType:'general', avgServiceTime:10, maxCapacity:50, staffName:'' });
  const fetch_ = async () => { try { setCounters(await api('/counters')); } catch (e) {} finally { setLoading(false); } };
  useEffect(() => { fetch_(); const t = setInterval(fetch_, 10000); return () => clearInterval(t); }, []);
  const create = async () => {
    if (!form.counterName.trim()) { showToast('Counter name is required','error'); return; }
    try { await api('/counters',{method:'POST',body:form}); showToast('✅ Counter created!'); setShowForm(false); setForm({counterName:'',serviceType:'general',avgServiceTime:10,maxCapacity:50,staffName:''}); fetch_(); }
    catch (e) { showToast(e.message,'error'); }
  };
  const toggle = async (id, isActive) => {
    try { await api(`/counters/${id}`,{method:'PUT',body:{isActive:!isActive}}); showToast(isActive?'Counter paused':'Counter resumed'); fetch_(); }
    catch (e) { showToast(e.message,'error'); }
  };
  const del = async (id) => {
    if (!window.confirm('Delete this counter?')) return;
    try { await api(`/counters/${id}`,{method:'DELETE'}); showToast('Counter deleted'); fetch_(); }
    catch (e) { showToast(e.message,'error'); }
  };
  const serveNext = async (id) => {
    setServing(id);
    try { const r = await api(`/counters/${id}/serve-next`,{method:'POST'}); showToast(r.next?`📢 Now serving: ${r.next.tokenNumber}`:'✅ Queue is empty'); fetch_(); }
    catch (e) { showToast(e.message,'error'); } finally { setServing(null); }
  };
  if (loading) return <Loader />;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <SectionHeader title="Service Counters" subtitle={`${counters.length} total · ${counters.filter(c=>c.isActive).length} active`} noMargin />
        <button className="btn btn-primary" onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Cancel':'+ New Counter'}</button>
      </div>
      {showForm && (
        <div className="card" style={{ border:'1px solid rgba(37,99,235,0.3)', background:'var(--accent-bg)', animation:'fadeIn 0.3s ease' }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:16 }}>Create New Counter</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:16 }}>
            <div><label>Counter Name *</label><input type="text" value={form.counterName} onChange={e=>setForm(f=>({...f,counterName:e.target.value}))} placeholder="e.g. Billing Counter A" /></div>
            <div><label>Service Type</label><select value={form.serviceType} onChange={e=>setForm(f=>({...f,serviceType:e.target.value}))}>{['billing','registration','consultation','support','general','express','premium'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div><label>Avg Service Time (min)</label><input type="number" value={form.avgServiceTime} onChange={e=>setForm(f=>({...f,avgServiceTime:Number(e.target.value)}))} min={1} max={120} /></div>
            <div><label>Max Capacity</label><input type="number" value={form.maxCapacity} onChange={e=>setForm(f=>({...f,maxCapacity:Number(e.target.value)}))} min={1} /></div>
            <div><label>Staff Name (optional)</label><input type="text" value={form.staffName} onChange={e=>setForm(f=>({...f,staffName:e.target.value}))} placeholder="e.g. John Smith" /></div>
          </div>
          <button className="btn btn-primary" onClick={create}>✓ Create Counter</button>
        </div>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {counters.map(c => {
          const color = SVC_COLORS[c.serviceType]||'#64748b';
          return (
            <div key={c._id} className="card" style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', borderLeft:`4px solid ${color}` }}>
              <div style={{ width:44, height:44, borderRadius:12, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{SVC_ICONS[c.serviceType]||'🏢'}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>{c.counterName}</span>
                  <span className="badge" style={{ background:`${color}15`, color }}>{c.serviceType}</span>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:c.isActive?'var(--success)':'var(--danger)' }} />
                </div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>{c.currentCount||0} waiting · avg {c.avgServiceTime}m · max {c.maxCapacity}{c.staffName?` · ${c.staffName}`:''}</div>
              </div>
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                <button className="btn btn-primary" onClick={()=>serveNext(c._id)} disabled={serving===c._id||!c.isActive} style={{ padding:'8px 14px', fontSize:13 }}>{serving===c._id?<Spinner size={13} color="white" />:'▶ Next'}</button>
                <button className={`btn ${c.isActive?'btn-ghost':'btn-success'}`} onClick={()=>toggle(c._id,c.isActive)} style={{ padding:'8px 14px', fontSize:13 }}>{c.isActive?'⏸ Pause':'▶ Resume'}</button>
                <button className="btn btn-danger" onClick={()=>del(c._id)} style={{ padding:'8px 12px', fontSize:13 }}>🗑</button>
              </div>
            </div>
          );
        })}
        {counters.length === 0 && <EmptyState icon="🪟" msg="No counters yet. Create your first one above." />}
      </div>
    </div>
  );
}

function AnalyticsPage() {
  const [trends, setTrends] = useState([]);
  const [peaks, setPeaks] = useState([]);
  const [range, setRange] = useState(30);
  const loadData = useCallback(() => {
    Promise.all([api(`/analytics/trends?range=${range}`), api('/analytics/peak-hours')])
      .then(([t,p])=>{setTrends(t);setPeaks(p);}).catch(()=>{});
  }, [range]);
  useEffect(() => { loadData(); }, [loadData]);
  const maxUsers = Math.max(...trends.map(d=>d.totalUsers),1);
  const maxWait  = Math.max(...trends.map(d=>d.avgWaitTime),1);
  const totalCustomers = trends.reduce((s,d)=>s+d.totalUsers,0);
  const avgWait  = Math.round(trends.reduce((s,d)=>s+d.avgWaitTime,0)/(trends.filter(d=>d.avgWaitTime>0).length||1));
  const peakDay  = trends.reduce((a,b)=>a.totalUsers>b.totalUsers?a:b,{totalUsers:0,date:'-'});
  const peakHours = peaks.filter(h=>h.isPeak).map(h=>h.label).join(', ');
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <SectionHeader title="Analytics Overview" subtitle={`Last ${range} days performance`} noMargin />
        <div style={{ display:'flex', gap:8 }}>
          {[7,14,30,90].map(d => (
            <button key={d} onClick={()=>setRange(d)} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${range===d?'var(--accent)':'var(--border2)'}`, background:range===d?'var(--accent-bg)':'transparent', color:range===d?'var(--accent)':'var(--text2)', fontSize:12, fontWeight:600, cursor:'pointer' }}>{d}d</button>
          ))}
        </div>
      </div>
      {totalCustomers === 0 && (
        <div style={{ padding:'16px 20px', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:12, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:24 }}>📊</span>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--warning)', marginBottom:2 }}>No analytics data yet</div>
            <div style={{ fontSize:13, color:'var(--text2)' }}>Join queues as a user and serve them as admin to generate real analytics data.</div>
          </div>
        </div>
      )}
      <div className="grid-4">
        {[
          { label:'Total Customers', value:totalCustomers.toLocaleString(), icon:'👥', color:'var(--accent)' },
          { label:'Avg Wait Time', value:`${avgWait}m`, icon:'⏱', color:'var(--warning)' },
          { label:'Busiest Day', value:peakDay.date?.slice(5)||'-', icon:'📈', color:'var(--danger)' },
          { label:'Peak Hours', value:peakHours||'N/A', icon:'🔥', color:'var(--success)' },
        ].map((s,i) => <KPICard key={i} label={s.label} value={s.value} icon={s.icon} color={s.color} sub="" />)}
      </div>
      <div className="card">
        <SectionHeader title="Volume & Wait Time Trends" subtitle="Daily customers and average wait" />
        <div style={{ position:'relative', height:200 }}>
          <svg viewBox={`0 0 ${Math.max(trends.length,1)*20} 160`} style={{ width:'100%', height:'100%' }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" /><stop offset="100%" stopColor="#2563eb" stopOpacity="0" /></linearGradient>
              <linearGradient id="waitGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" /><stop offset="100%" stopColor="#f59e0b" stopOpacity="0" /></linearGradient>
            </defs>
            {trends.length > 1 && <>
              <path d={`M ${trends.map((d,i)=>`${i*20+10},${150-(d.totalUsers/maxUsers)*130}`).join(' L ')} L ${(trends.length-1)*20+10},150 L 10,150 Z`} fill="url(#volGrad)" />
              <polyline points={trends.map((d,i)=>`${i*20+10},${150-(d.totalUsers/maxUsers)*130}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
              <path d={`M ${trends.map((d,i)=>`${i*20+10},${150-(d.avgWaitTime/maxWait)*130}`).join(' L ')} L ${(trends.length-1)*20+10},150 L 10,150 Z`} fill="url(#waitGrad)" />
              <polyline points={trends.map((d,i)=>`${i*20+10},${150-(d.avgWaitTime/maxWait)*130}`).join(' ')} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4 2" />
            </>}
          </svg>
        </div>
        <div style={{ display:'flex', gap:20, marginTop:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}><div style={{ width:24, height:3, background:'#2563eb', borderRadius:2 }} /><span style={{ fontSize:11, color:'var(--text3)' }}>Queue Volume</span></div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}><div style={{ width:24, height:3, background:'#f59e0b', borderRadius:2 }} /><span style={{ fontSize:11, color:'var(--text3)' }}>Avg Wait Time</span></div>
        </div>
      </div>
      <div className="card">
        <SectionHeader title="Hourly Traffic Distribution" subtitle="All 24 hours — last 7 days" />
        <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:120 }}>
          {peaks.map((h,i) => {
            const maxP = Math.max(...peaks.map(p=>p.count),1);
            const ht = Math.max(4,(h.count/maxP)*100);
            return (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }} title={`${h.label}: ${h.count} customers`}>
                <div style={{ width:'100%', height:ht, borderRadius:'3px 3px 0 0', background:h.isPeak?'linear-gradient(180deg, #ef4444, #dc2626)':h.count>0?'linear-gradient(180deg, #2563eb, #1d4ed8)':'var(--border)', transition:'height 0.5s', opacity:h.count===0?0.15:1 }} />
                <span style={{ fontSize:8, color:'var(--text3)' }}>{i%3===0?h.label.slice(0,2):''}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UsersPage() {
  const { showToast } = useContext(AuthCtx);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const fetchUsers = async () => {
    try { const data = await api('/auth/users'); setUsers(data.users||[]); }
    catch (e) { setUsers([]); } finally { setLoading(false); }
  };
  useEffect(() => { fetchUsers(); }, []);
  const promoteUser = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change this user's role to ${newRole}?`)) return;
    try { await api(`/auth/users/${userId}/role`,{method:'PUT',body:{role:newRole}}); showToast(`✅ User role updated to ${newRole}`); fetchUsers(); }
    catch (e) { showToast(e.message,'error'); }
  };
  const filtered = users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
  if (loading) return <Loader />;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <SectionHeader title="User Management" subtitle={`${users.length} registered users`} noMargin />
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search users..." style={{ width:240, padding:'8px 14px', borderRadius:8 }} />
      </div>
      {users.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:40 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>👥</div>
          <p style={{ color:'var(--text2)', marginBottom:8, fontWeight:600 }}>User list endpoint not set up yet.</p>
          <p style={{ fontSize:13, color:'var(--text3)' }}>Add <code style={{ background:'var(--bg2)', padding:'2px 6px', borderRadius:4 }}>GET /api/auth/users</code> to your backend to enable this feature.</p>
        </div>
      ) : (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table>
            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg, #2563eb, #7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white', flexShrink:0 }}>{u.name?.charAt(0).toUpperCase()}</div>
                      <span style={{ fontWeight:600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ color:'var(--text2)' }}>{u.email}</td>
                  <td><span className="badge" style={{ background:u.role==='admin'?'rgba(37,99,235,0.1)':'rgba(100,116,139,0.1)', color:u.role==='admin'?'var(--accent)':'var(--text2)' }}>{u.role}</span></td>
                  <td style={{ color:'var(--text3)' }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                  <td><button className={`btn ${u.role==='admin'?'btn-warning':'btn-primary'}`} onClick={()=>promoteUser(u._id,u.role)} style={{ padding:'5px 12px', fontSize:12 }}>{u.role==='admin'?'⬇ Demote':'⬆ Make Admin'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle, noMargin }) {
  return (
    <div style={{ marginBottom:noMargin?0:16 }}>
      <h2 style={{ fontSize:16, fontWeight:700, color:'var(--text)', letterSpacing:-0.3 }}>{title}</h2>
      {subtitle && <p style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{subtitle}</p>}
    </div>
  );
}

function Loader() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, gap:16 }}>
      <Spinner size={32} />
      <span style={{ fontSize:13, color:'var(--text3)' }}>Loading...</span>
    </div>
  );
}

function Spinner({ size=20, color='var(--accent)' }) {
  return <div style={{ width:size, height:size, border:`2px solid ${color}30`, borderTop:`2px solid ${color}`, borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }} />;
}

function EmptyState({ icon, msg }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 20px', gap:10 }}>
      <span style={{ fontSize:40, opacity:0.4 }}>{icon}</span>
      <p style={{ fontSize:13, color:'var(--text3)' }}>{msg}</p>
    </div>
  );
}