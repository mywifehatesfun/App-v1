import { useState, useEffect } from "react";

// ── DESIGN TOKENS — Whiskey Theme ─────────────────────────────────────────────
const T = {
  bg:       "#1A1108",   // deep bourbon dark
  surface:  "#231A0E",   // card background
  surface2: "#2E2010",   // elevated surface
  border:   "#3D2C15",   // warm dark border
  amber:    "#F59E0B",   // primary amber
  gold:     "#D97706",   // darker gold
  orange:   "#EA580C",   // burnt orange accent
  cream:    "#FEF3C7",   // light cream text
  muted:    "#92784A",   // muted warm text
  dim:      "#5C4A2A",   // dimmed text
  green:    "#16A34A",
  red:      "#DC2626",
  purple:   "#7C3AED",
  grad:     "linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)",
  gradSoft: "linear-gradient(135deg, #F59E0B22 0%, #EA580C11 100%)",
};

// ── Storage (local fallback — replaced by Supabase in production) ─────────────
const SK = "brr_v3";
const DEF = {
  currentUser: null,
  users: [],
  bets: [], reminders: [], games: [], oddsApiKey: ""
};
function load() { try { const r = localStorage.getItem(SK); return r ? { ...DEF, ...JSON.parse(r) } : DEF; } catch { return DEF; } }
function save(d) { localStorage.setItem(SK, JSON.stringify(d)); }

// ── Helpers ───────────────────────────────────────────────────────────────────
const PAY_APPS = ["venmo", "cashapp", "zelle", "paypal"];
function payLink(app, handle) {
  if (!handle) return null;
  const h = handle.replace("@", "");
  if (app === "venmo") return `https://venmo.com/${h}`;
  if (app === "cashapp") return `https://cash.app/$${h}`;
  if (app === "zelle") return `https://enroll.zellepay.com/`;
  if (app === "paypal") return `https://paypal.me/${h}`;
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
function fmt$(n) { return `$${parseFloat(n||0).toFixed(2).replace(/\.00$/,"")}`; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : ""; }
function fmtTime(d) { return d ? new Date(d).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}) : ""; }

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(load);
  const [tab, setTab] = useState("home");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [authScreen, setAuthScreen] = useState(!load().currentUser);

  const cu = data.currentUser;
  const me = data.users.find(u => u.id === cu);

  useEffect(() => { save(data); }, [data]);

  function showToast(msg, type="ok") { setToast({msg,type}); setTimeout(()=>setToast(null),3200); }
  const upd = fn => setData(d => { const n = fn({...d}); save(n); return n; });

  // ── Auth ──
  function handleAuth(provider) {
    // PRODUCTION: replace this block with Supabase OAuth
    // import { supabase } from './supabaseClient'
    // await supabase.auth.signInWithOAuth({ provider: 'google' | 'facebook' })
    const mockUser = {
      id: uid(),
      name: provider === "google" ? "Google User" : "Meta User",
      avatar: provider === "google" ? "🔵" : "🔷",
      provider,
      venmo:"", cashapp:"", zelle:"", paypal:""
    };
    upd(d => { d.users = [...d.users.filter(u=>u.id!==mockUser.id), mockUser]; d.currentUser = mockUser.id; return d; });
    setAuthScreen(false);
    showToast(`Welcome! You're in. 🥃`);
  }

  function handleGuestLogin(name) {
    if (!name.trim()) return;
    const guestUser = { id: uid(), name: name.trim(), avatar: "🎲", provider: "guest", venmo:"", cashapp:"", zelle:"", paypal:"" };
    upd(d => { d.users = [...d.users, guestUser]; d.currentUser = guestUser.id; return d; });
    setAuthScreen(false);
    showToast(`Let's go, ${name.trim()}! 🥃`);
  }

  function handleSignOut() {
    upd(d => { d.currentUser = null; return d; });
    setAuthScreen(true);
  }

  // ── Bet actions ──
  function addBet(b) { upd(d => { d.bets=[{...b,id:uid(),createdBy:cu,createdAt:new Date().toISOString(),status:b.type==="lastlonger"?"open":"active",suggestions:[],participants:b.participants||[],eliminations:[]},...d.bets]; return d; }); showToast("Bet locked in 🎲"); setModal(null); }
  function setBetStatus(id,status) { upd(d=>{d.bets=d.bets.map(b=>b.id===id?{...b,status}:b);return d;}); showToast(status==="won"?"💰 Collect!":status==="lost"?"😬 Pay up.":"Updated."); }
  function joinBet(id) { upd(d=>{d.bets=d.bets.map(b=>b.id===id&&!b.participants.includes(cu)?{...b,participants:[...b.participants,cu]}:b);return d;}); showToast("You're in! No backing out. 🤝"); }
  function eliminatePlayer(betId,userId) { upd(d=>{d.bets=d.bets.map(b=>b.id===betId?{...b,eliminations:[...(b.eliminations||[]),{userId,at:new Date().toISOString()}]}:b);return d;}); showToast("Busted out! 💀"); }
  function addSuggestion(betId,text) { upd(d=>{d.bets=d.bets.map(b=>b.id===betId?{...b,suggestions:[...(b.suggestions||[]),{text,by:cu,at:new Date().toISOString()}]}:b);return d;}); showToast("Edit sent to creator!"); }

  // ── Reminder actions ──
  function addReminder(r) { upd(d=>{d.reminders=[{...r,id:uid(),createdBy:cu,createdAt:new Date().toISOString(),paid:false},...d.reminders];return d;}); showToast("Reminder set 💸"); setModal(null); }
  function markPaid(id) { upd(d=>{d.reminders=d.reminders.map(r=>r.id===id?{...r,paid:true,paidAt:new Date().toISOString()}:r);return d;}); showToast("Settled! 🙏"); }

  // ── Game actions ──
  function addGame(g) { upd(d=>{d.games=[{...g,id:uid(),createdBy:cu,createdAt:new Date().toISOString(),rsvps:[{userId:cu,status:"in"}]},...d.games];return d;}); showToast("Game posted! 🃏"); setModal(null); }
  function rsvpGame(gid,status) { upd(d=>{d.games=d.games.map(g=>g.id===gid?{...g,rsvps:[...g.rsvps.filter(r=>r.userId!==cu),{userId:cu,status}]}:g);return d;}); showToast(status==="in"?"You're in! 🃏":status==="maybe"?"Maybe… classic 🤷":"Bailed 👻"); }
  function updateUser(u) { upd(d=>{d.users=d.users.map(x=>x.id===u.id?u:x);return d;}); showToast("Profile saved!"); }
  function setOddsKey(key) { upd(d=>{d.oddsApiKey=key;return d;}); }

  if (authScreen) return <AuthScreen onAuth={handleAuth} onGuest={handleGuestLogin} />;

  const activeBets = data.bets.filter(b=>["active","open"].includes(b.status)).length;
  const unpaid = data.reminders.filter(r=>!r.paid).length;
  const upcoming = data.games.filter(g=>new Date(g.date)>=new Date()-86400000).length;

  const TABS = [
    ["home","🏠","Home"],
    ["bets","🎲","Bets"],
    ["games","🃏","Games"],
    ["reminders","💸","Collect"],
    ["crew","👥","Crew"],
    ["settings","⚙️","Settings"],
  ];

  return (
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",background:T.bg,minHeight:"100vh",color:T.cream,paddingBottom:90}}>

      {/* Header */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,backdropFilter:"blur(10px)"}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,background:T.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"-0.5px"}}>
            🃏 Bet. Regret. Repeat.
          </div>
          <div style={{fontSize:10,color:T.dim,marginTop:1,letterSpacing:"0.5px"}}>official ledger of terrible decisions</div>
        </div>
        <button onClick={handleSignOut} style={{background:T.surface2,border:`1px solid ${T.border}`,borderRadius:20,padding:"6px 12px",color:T.muted,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          <span>{me?.avatar||"🎲"}</span>
          <span style={{maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{me?.name||"You"}</span>
        </button>
      </div>

      {/* Body */}
      <div style={{padding:"16px",maxWidth:680,margin:"0 auto"}}>
        {tab==="home" && <HomeTab data={data} cu={cu} activeBets={activeBets} unpaid={unpaid} upcoming={upcoming} onTab={setTab} onModal={setModal} />}
        {tab==="bets" && <BetsTab data={data} cu={cu} onAdd={()=>setModal("bet")} onStatus={setBetStatus} onJoin={joinBet} onEliminate={eliminatePlayer} onSuggest={addSuggestion} />}
        {tab==="games" && <GamesTab data={data} cu={cu} onAdd={()=>setModal("game")} onRsvp={rsvpGame} />}
        {tab==="reminders" && <RemindersTab data={data} cu={cu} onAdd={()=>setModal("reminder")} onMarkPaid={markPaid} />}
        {tab==="crew" && <CrewTab data={data} cu={cu} onAdd={()=>setModal("user")} onUpdate={updateUser} />}
        {tab==="settings" && <SettingsTab data={data} cu={cu} onSaveKey={setOddsKey} onUpdate={updateUser} />}
      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:T.surface,borderTop:`1px solid ${T.border}`,display:"flex",zIndex:50,padding:"6px 0 10px"}}>
        {TABS.map(([k,icon,label])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"transparent",border:"none",cursor:"pointer",padding:"6px 2px"}}>
            <span style={{fontSize:18,filter:tab===k?"none":"grayscale(1) opacity(0.5)",transition:"all 0.2s"}}>{icon}</span>
            <span style={{fontSize:9,color:tab===k?T.amber:T.dim,fontWeight:tab===k?700:400,letterSpacing:"0.3px"}}>{label}</span>
            {tab===k && <div style={{width:20,height:3,borderRadius:2,background:T.grad,marginTop:1}}/>}
          </button>
        ))}
      </div>

      {/* FAB */}
      {["bets","games","reminders"].includes(tab) && (
        <button onClick={()=>setModal(tab==="bets"?"bet":tab==="games"?"game":"reminder")}
          style={{position:"fixed",bottom:80,right:18,width:52,height:52,borderRadius:"50%",background:T.grad,border:"none",color:"#fff",fontSize:24,cursor:"pointer",fontWeight:900,boxShadow:"0 4px 24px #F59E0B55",zIndex:99,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      )}

      {/* Modals */}
      {modal==="bet" && <BetModal data={data} cu={cu} onClose={()=>setModal(null)} onSave={addBet} />}
      {modal==="game" && <GameModal data={data} cu={cu} onClose={()=>setModal(null)} onSave={addGame} />}
      {modal==="reminder" && <ReminderModal data={data} cu={cu} onClose={()=>setModal(null)} onSave={addReminder} />}
      {modal==="user" && <UserModal onClose={()=>setModal(null)} onSave={(u)=>{upd(d=>{d.users=[...d.users,{...u,id:uid()}];return d;});showToast(`${u.name} added!`);setModal(null);}} />}

      {toast && (
        <div style={{position:"fixed",bottom:100,left:"50%",transform:"translateX(-50%)",background:T.surface2,border:`1px solid ${T.border}`,color:T.cream,padding:"10px 20px",borderRadius:24,fontSize:13,fontWeight:600,zIndex:9999,whiteSpace:"nowrap",boxShadow:"0 8px 32px #00000088"}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({ onAuth, onGuest }) {
  const [guestName, setGuestName] = useState("");
  const [showGuest, setShowGuest] = useState(false);

  return (
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",background:T.bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{fontSize:64,marginBottom:12}}>🃏</div>
        <div style={{fontSize:32,fontWeight:900,background:T.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1}}>Bet. Regret.<br/>Repeat.</div>
        <div style={{fontSize:13,color:T.muted,marginTop:10}}>The official ledger of terrible decisions</div>
      </div>

      <div style={{width:"100%",maxWidth:340}}>
        {/* Google */}
        <button onClick={()=>onAuth("google")} style={{width:"100%",padding:"14px 20px",borderRadius:16,border:`1px solid ${T.border}`,background:T.surface,color:T.cream,fontSize:15,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:12,transition:"all 0.2s"}}>
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        {/* Meta */}
        <button onClick={()=>onAuth("meta")} style={{width:"100%",padding:"14px 20px",borderRadius:16,border:`1px solid ${T.border}`,background:T.surface,color:T.cream,fontSize:15,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:12}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          Continue with Meta
        </button>

        <div style={{textAlign:"center",color:T.dim,fontSize:12,margin:"16px 0"}}>— or —</div>

        {!showGuest ? (
          <button onClick={()=>setShowGuest(true)} style={{width:"100%",padding:"13px 20px",borderRadius:16,border:`1px dashed ${T.border}`,background:"transparent",color:T.muted,fontSize:14,cursor:"pointer"}}>
            Join as Guest 👻
          </button>
        ) : (
          <div>
            <input value={guestName} onChange={e=>setGuestName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onGuest(guestName)} placeholder="What do your friends call you?" style={{...iS,marginBottom:10,fontSize:14,padding:"13px 16px",borderRadius:16}} autoFocus />
            <button onClick={()=>onGuest(guestName)} style={{width:"100%",padding:"13px",borderRadius:16,background:T.grad,border:"none",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>Let's Go 🥃</button>
          </div>
        )}

        <div style={{textAlign:"center",fontSize:10,color:T.dim,marginTop:20,lineHeight:1.6}}>
          By signing in you agree to remember your bets,<br/>pay your debts, and not cry when you lose.
        </div>
      </div>
    </div>
  );
}

// ── Home Tab ──────────────────────────────────────────────────────────────────
function HomeTab({ data, cu, activeBets, unpaid, upcoming, onTab, onModal }) {
  const myBets = data.bets.filter(b=>b.createdBy===cu||b.participants?.includes(cu));
  const myOwed = data.reminders.filter(r=>!r.paid&&r.owedTo===cu);
  const myDue = data.reminders.filter(r=>!r.paid&&r.owedBy===cu);
  const totalOwed = myOwed.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const totalDue = myDue.reduce((s,r)=>s+parseFloat(r.amount||0),0);

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:22,fontWeight:800,color:T.cream}}>Hey {data.users.find(u=>u.id===cu)?.name?.split(" ")[0]||"friend"} 👋</div>
        <div style={{fontSize:13,color:T.muted,marginTop:2}}>Here's where things stand.</div>
      </div>

      {/* Money cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        <div style={{background:"linear-gradient(135deg,#16A34A22,#16A34A11)",border:"1px solid #16A34A44",borderRadius:20,padding:"16px"}}>
          <div style={{fontSize:10,color:"#16A34A",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Collecting</div>
          <div style={{fontSize:28,fontWeight:900,color:"#16A34A"}}>{fmt$(totalOwed)}</div>
          <div style={{fontSize:11,color:T.muted,marginTop:4}}>{myOwed.length} reminder{myOwed.length!==1?"s":""}</div>
        </div>
        <div style={{background:"linear-gradient(135deg,#DC262622,#DC262611)",border:"1px solid #DC262644",borderRadius:20,padding:"16px"}}>
          <div style={{fontSize:10,color:"#DC2626",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>You Owe</div>
          <div style={{fontSize:28,fontWeight:900,color:"#DC2626"}}>{fmt$(totalDue)}</div>
          <div style={{fontSize:11,color:T.muted,marginTop:4}}>{myDue.length} reminder{myDue.length!==1?"s":""}</div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:24}}>
        {[[activeBets,"Active Bets","🎲",T.amber],[upcoming,"Games","🃏",T.purple],[data.users.length,"Crew","👥",T.orange]].map(([v,l,icon,c])=>(
          <div key={l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:"14px 10px",textAlign:"center"}}>
            <div style={{fontSize:20}}>{icon}</div>
            <div style={{fontSize:22,fontWeight:900,color:c,marginTop:4}}>{v}</div>
            <div style={{fontSize:10,color:T.dim,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:12,color:T.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Quick Add</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["🎲 Log a Bet","bet"],["🃏 Schedule Game","game"],["💸 Add Reminder","reminder"],["👥 Add Friend","user"]].map(([label,m])=>(
            <button key={m} onClick={()=>onModal(m)} style={{padding:"14px",borderRadius:16,background:T.surface,border:`1px solid ${T.border}`,color:T.cream,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent bets */}
      {myBets.length>0 && (
        <div>
          <div style={{fontSize:12,color:T.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Your Recent Bets</div>
          {myBets.slice(0,3).map(b=>(
            <MiniCard key={b.id} b={b} />
          ))}
          {myBets.length>3 && <button onClick={()=>onTab("bets")} style={{width:"100%",padding:"12px",borderRadius:14,background:"transparent",border:`1px solid ${T.border}`,color:T.amber,fontSize:13,cursor:"pointer",marginTop:4}}>See all {myBets.length} bets →</button>}
        </div>
      )}
    </div>
  );
}

function MiniCard({ b }) {
  const statusColor = {active:T.amber,open:T.purple,won:T.green,lost:T.red,cancelled:T.dim}[b.status]||T.muted;
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderLeft:`3px solid ${statusColor}`,borderRadius:14,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{flex:1,marginRight:10}}>
        <div style={{fontSize:13,fontWeight:600,color:T.cream,lineHeight:1.3}}>{b.description}</div>
        <div style={{fontSize:10,color:T.dim,marginTop:3}}>{b.type==="lastlonger"?"🏆 Last Longer · ":""}{fmtDate(b.createdAt)}</div>
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontSize:16,fontWeight:800,color:T.amber}}>{fmt$(b.amount)}</div>
        <div style={{fontSize:9,color:statusColor,fontWeight:700,textTransform:"uppercase",marginTop:2}}>{b.status}</div>
      </div>
    </div>
  );
}

// ── Bets Tab ──────────────────────────────────────────────────────────────────
function BetsTab({ data, cu, onAdd, onStatus, onJoin, onEliminate, onSuggest }) {
  const [filter, setFilter] = useState("all");
  const [expand, setExpand] = useState(null);
  const [suggestText, setSuggestText] = useState("");

  const filtered = data.bets.filter(b=>{
    if(filter==="mine") return b.createdBy===cu;
    if(filter==="involved") return b.participants?.includes(cu);
    if(filter==="open") return b.status==="open";
    if(filter==="active") return b.status==="active";
    if(filter==="settled") return ["won","lost","cancelled"].includes(b.status);
    return true;
  });

  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {["all","mine","involved","open","active","settled"].map(f=>(
          <Chip key={f} active={filter===f} onClick={()=>setFilter(f)}>{f}</Chip>
        ))}
      </div>

      {filtered.length===0
        ? <Empty icon="🎲" msg="No bets here. Is everyone sober?" action="Log a Bet" onAction={onAdd}/>
        : filtered.map(bet=>{
          const creator = data.users.find(u=>u.id===bet.createdBy);
          const isCreator = bet.createdBy===cu;
          const isIn = bet.participants?.includes(cu);
          const expanded = expand===bet.id;
          const isLL = bet.type==="lastlonger";
          const eliminated = bet.eliminations||[];
          const stillIn = (bet.participants||[]).filter(p=>!eliminated.find(e=>e.userId===p));
          const pot = isLL?(bet.participants?.length||0)*(bet.amount||0):null;

          return (
            <div key={bet.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderLeft:`3px solid ${{active:T.amber,open:T.purple,won:T.green,lost:T.red,cancelled:T.dim}[bet.status]||T.border}`,borderRadius:18,marginBottom:10,overflow:"hidden",transition:"all 0.2s"}}>
              <div onClick={()=>setExpand(expanded?null:bet.id)} style={{padding:"14px 16px",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1}}>
                    {isLL && <div style={{fontSize:9,color:T.purple,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>🏆 Last Longer</div>}
                    <div style={{fontSize:14,fontWeight:700,color:T.cream,lineHeight:1.4}}>{bet.description}</div>
                    <div style={{fontSize:10,color:T.dim,marginTop:4}}>{creator?.name} · {fmtDate(bet.createdAt)}{bet.dueDate&&` · Settles ${fmtDate(bet.dueDate)}`}</div>
                    {isLL && <div style={{fontSize:10,color:T.purple,marginTop:3}}>{bet.participants?.length||0} players · Pot {fmt$(pot)}</div>}
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:900,color:T.amber}}>{isLL?`${fmt$(bet.amount)}/ea`:fmt$(bet.amount)}</div>
                    {bet.odds&&<div style={{fontSize:10,color:T.muted}}>{bet.odds}</div>}
                    <div style={{fontSize:9,color:{active:T.amber,open:T.purple,won:T.green,lost:T.red,cancelled:T.dim}[bet.status]||T.muted,fontWeight:700,textTransform:"uppercase",marginTop:2}}>{bet.status}</div>
                  </div>
                </div>
              </div>

              {expanded && (
                <div style={{padding:"0 16px 14px",borderTop:`1px solid ${T.border}`}}>
                  {bet.sport&&<div style={{fontSize:11,color:T.muted,marginTop:10}}>🏈 {bet.sport}</div>}
                  {bet.notes&&<div style={{fontSize:11,color:T.muted,marginTop:6,fontStyle:"italic"}}>"{bet.notes}"</div>}

                  {isLL&&bet.participants?.length>0&&(
                    <div style={{marginTop:12}}>
                      <div style={{fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Player Status</div>
                      {bet.participants.map(pid=>{
                        const player=data.users.find(u=>u.id===pid);
                        const elim=eliminated.find(e=>e.userId===pid);
                        const elimPos=eliminated.indexOf(elim)+1;
                        const canElim=(isCreator||pid===cu)&&!elim&&bet.status==="active";
                        return(
                          <div key={pid} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
                            <div style={{fontSize:13,color:elim?T.dim:T.cream,textDecoration:elim?"line-through":"none"}}>{elim?"💀":"🟢"} {player?.name||"Unknown"}</div>
                            <div style={{display:"flex",gap:6,alignItems:"center"}}>
                              {elim&&<span style={{fontSize:10,color:T.red}}>Out #{elimPos}</span>}
                              {canElim&&<button onClick={()=>onEliminate(bet.id,pid)} style={aBtn(T.red,"small")}>Bust Out</button>}
                            </div>
                          </div>
                        );
                      })}
                      {stillIn.length===1&&bet.status==="active"&&(
                        <div style={{marginTop:10,padding:"10px 12px",background:"#16A34A22",borderRadius:12,fontSize:13,color:T.green,fontWeight:700}}>
                          🏆 Winner: {data.users.find(u=>u.id===stillIn[0])?.name} — collects {fmt$(pot)}!
                        </div>
                      )}
                    </div>
                  )}

                  {bet.status==="open"&&!isIn&&(
                    <button onClick={()=>onJoin(bet.id)} style={{...aBtn(T.purple),marginTop:12,width:"100%",padding:"12px",borderRadius:14,fontSize:14}}>
                      🤝 I'm In — {fmt$(bet.amount)}
                    </button>
                  )}

                  {isCreator&&bet.status==="active"&&!isLL&&(
                    <div style={{display:"flex",gap:8,marginTop:12}}>
                      <button onClick={()=>onStatus(bet.id,"won")} style={{...aBtn(T.green),flex:1,padding:"10px",borderRadius:12,fontSize:13}}>✅ Won</button>
                      <button onClick={()=>onStatus(bet.id,"lost")} style={{...aBtn(T.red),flex:1,padding:"10px",borderRadius:12,fontSize:13}}>❌ Lost</button>
                      <button onClick={()=>onStatus(bet.id,"cancelled")} style={{...aBtn(T.dim),flex:1,padding:"10px",borderRadius:12,fontSize:13}}>🚫 Cancel</button>
                    </div>
                  )}
                  {isCreator&&bet.status==="open"&&(
                    <button onClick={()=>onStatus(bet.id,"active")} style={{...aBtn(T.amber),marginTop:12,width:"100%",padding:"12px",borderRadius:14,fontSize:13}}>🔒 Lock Bets — Game On</button>
                  )}

                  {!isCreator&&["active","open"].includes(bet.status)&&(
                    <div style={{marginTop:12}}>
                      <div style={{fontSize:10,color:T.muted,marginBottom:6}}>Suggest a correction:</div>
                      <div style={{display:"flex",gap:8}}>
                        <input value={suggestText} onChange={e=>setSuggestText(e.target.value)} placeholder="Odds were 3:1, not 5:1..." style={{...iS,flex:1}}/>
                        <button onClick={()=>{if(suggestText.trim()){onSuggest(bet.id,suggestText);setSuggestText("");}}} style={aBtn(T.purple)}>Send</button>
                      </div>
                    </div>
                  )}

                  {bet.suggestions?.length>0&&(
                    <div style={{marginTop:10}}>
                      {bet.suggestions.map((s,i)=>(
                        <div key={i} style={{fontSize:11,color:T.muted,background:T.surface2,padding:"8px 12px",borderRadius:10,marginBottom:6}}>
                          💬 {s.text} — {data.users.find(u=>u.id===s.by)?.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

// ── Games Tab ─────────────────────────────────────────────────────────────────
function GamesTab({ data, cu, onAdd, onRsvp }) {
  const [expand, setExpand] = useState(null);
  const upcoming = data.games.filter(g=>new Date(g.date)>=new Date()-86400000);
  const past = data.games.filter(g=>new Date(g.date)<new Date()-86400000);

  function GameCard({ g }) {
    const expanded = expand===g.id;
    const myRsvp = g.rsvps?.find(r=>r.userId===cu)?.status;
    const ins = (g.rsvps||[]).filter(r=>r.status==="in");
    const maybes = (g.rsvps||[]).filter(r=>r.status==="maybe");

    return (
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderLeft:`3px solid ${T.purple}`,borderRadius:18,marginBottom:10,overflow:"hidden"}}>
        <div onClick={()=>setExpand(expanded?null:g.id)} style={{padding:"14px 16px",cursor:"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:T.cream}}>🃏 {g.gameType} Night</div>
              <div style={{fontSize:12,color:T.purple,marginTop:3,fontWeight:600}}>{fmtDate(g.date)}{g.time&&` · ${g.time}`}</div>
              <div style={{fontSize:11,color:T.muted,marginTop:2}}>{g.address}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:18,fontWeight:900,color:T.amber}}>{fmt$(g.buyin)}</div>
              <div style={{fontSize:9,color:T.muted}}>buy-in</div>
              <div style={{fontSize:11,color:T.green,marginTop:4,fontWeight:600}}>✅ {ins.length}{g.maxPlayers?`/${g.maxPlayers}`:""} in</div>
            </div>
          </div>
        </div>

        {expanded && (
          <div style={{padding:"0 16px 14px",borderTop:`1px solid ${T.border}`}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
              {[["Buy-in",fmt$(g.buyin)],["Rebuys",g.rebuys?`Yes · ${fmt$(g.rebuyAmount)}${g.rebuyPeriod?` til ${g.rebuyPeriod}`:""}` : "No"],["Max Players",g.maxPlayers||"Open"],["Game",g.gameType]].map(([l,v])=>(
                <div key={l} style={{background:T.surface2,borderRadius:12,padding:"10px 12px"}}>
                  <div style={{fontSize:9,color:T.dim,textTransform:"uppercase",letterSpacing:0.8,marginBottom:3}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:700,color:T.cream}}>{v}</div>
                </div>
              ))}
            </div>
            {g.payouts&&<div style={{marginTop:10,background:T.surface2,borderRadius:12,padding:"10px 12px"}}><div style={{fontSize:9,color:T.dim,textTransform:"uppercase",marginBottom:4}}>Est. Payouts</div><div style={{fontSize:12,color:T.amber,fontWeight:600}}>{g.payouts}</div></div>}
            {g.notes&&<div style={{fontSize:11,color:T.muted,marginTop:8,fontStyle:"italic"}}>📝 {g.notes}</div>}

            <div style={{marginTop:14}}>
              <div style={{fontSize:10,color:T.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Your RSVP</div>
              <div style={{display:"flex",gap:8}}>
                {[["in","✅ In"],["maybe","🤷 Maybe"],["out","👻 Out"]].map(([s,l])=>(
                  <button key={s} onClick={()=>onRsvp(g.id,s)} style={{flex:1,padding:"10px 4px",borderRadius:12,border:`1px solid ${myRsvp===s?T.amber:T.border}`,background:myRsvp===s?`${T.amber}22`:"transparent",color:myRsvp===s?T.amber:T.muted,cursor:"pointer",fontSize:12,fontWeight:myRsvp===s?700:400}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginTop:10,fontSize:11}}>
              {ins.length>0&&<div style={{color:T.green,marginBottom:4}}>✅ {ins.map(r=>data.users.find(u=>u.id===r.userId)?.name).filter(Boolean).join(", ")}</div>}
              {maybes.length>0&&<div style={{color:T.amber}}>🤷 {maybes.map(r=>data.users.find(u=>u.id===r.userId)?.name).filter(Boolean).join(", ")}</div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {data.games.length===0
        ? <Empty icon="🃏" msg="No games scheduled. Someone pick a night." action="Schedule a Game" onAction={onAdd}/>
        : <>
          {upcoming.length>0&&<><SectionLabel>Upcoming 🗓️</SectionLabel>{upcoming.map(g=><GameCard key={g.id} g={g}/>)}</>}
          {past.length>0&&<><SectionLabel style={{marginTop:16}}>Past Games</SectionLabel>{past.map(g=><GameCard key={g.id} g={g}/>)}</>}
        </>}
    </div>
  );
}

// ── Reminders Tab ─────────────────────────────────────────────────────────────
function RemindersTab({ data, cu, onAdd, onMarkPaid }) {
  const unpaid = data.reminders.filter(r=>!r.paid);
  const paid = data.reminders.filter(r=>r.paid);

  function Card({ r }) {
    const owedBy=data.users.find(u=>u.id===r.owedBy);
    const owedTo=data.users.find(u=>u.id===r.owedTo);
    const overdue=r.dueDate&&!r.paid&&new Date(r.dueDate)<new Date();
    return(
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderLeft:`3px solid ${r.paid?T.green:overdue?T.red:T.purple}`,borderRadius:18,padding:"14px 16px",marginBottom:8,opacity:r.paid?0.55:1}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:T.cream}}>{r.description}</div>
            <div style={{fontSize:10,color:T.dim,marginTop:4}}>{owedBy?.name} → {owedTo?.name}{r.dueDate&&` · Due ${fmtDate(r.dueDate)}`}</div>
            {overdue&&<div style={{fontSize:9,color:T.red,fontWeight:700,marginTop:3}}>⚠️ OVERDUE</div>}
          </div>
          <div style={{fontSize:20,fontWeight:900,color:r.paid?T.green:T.amber,flexShrink:0,marginLeft:12}}>{fmt$(r.amount)}</div>
        </div>
        {!r.paid&&(
          <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            {owedTo&&PAY_APPS.map(app=>{
              const link=payLink(app,owedTo[app]);
              return link?<a key={app} href={link} target="_blank" rel="noopener noreferrer" style={{padding:"6px 12px",background:T.surface2,color:T.purple,border:`1px solid ${T.border}`,borderRadius:20,fontSize:11,textDecoration:"none",fontWeight:600}}>Pay {app}</a>:null;
            })}
            {(r.owedTo===cu||r.owedBy===cu)&&<button onClick={()=>onMarkPaid(r.id)} style={{padding:"6px 12px",background:"#16A34A22",color:T.green,border:`1px solid #16A34A44`,borderRadius:20,fontSize:11,cursor:"pointer",fontWeight:600}}>✅ Mark Paid</button>}
          </div>
        )}
      </div>
    );
  }

  return(
    <div>
      {data.reminders.length===0
        ? <Empty icon="💸" msg="No debts. Everyone's square… for now." action="Add Reminder" onAction={onAdd}/>
        : <>
          {unpaid.length>0&&<><SectionLabel>Outstanding 🔥</SectionLabel>{unpaid.map(r=><Card key={r.id} r={r}/>)}</>}
          {paid.length>0&&<><SectionLabel style={{marginTop:16}}>Settled ✅</SectionLabel>{paid.map(r=><Card key={r.id} r={r}/>)}</>}
        </>}
    </div>
  );
}

// ── Crew Tab ──────────────────────────────────────────────────────────────────
function CrewTab({ data, cu, onAdd, onUpdate }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  return(
    <div>
      <div style={{fontSize:12,color:T.muted,marginBottom:14}}>Add payment handles so the crew can pay each other back directly.</div>
      {data.users.map(u=>(
        <div key={u.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:"14px 16px",marginBottom:8}}>
          {editing===u.id?(
            <div>
              <div style={{fontSize:13,fontWeight:700,color:T.amber,marginBottom:12}}>Editing {u.name}</div>
              {PAY_APPS.map(app=>(
                <div key={app} style={{marginBottom:10}}>
                  <div style={{fontSize:10,color:T.muted,marginBottom:4,textTransform:"capitalize"}}>{app}</div>
                  <input value={form[app]||""} onChange={e=>setForm(f=>({...f,[app]:e.target.value}))} placeholder="@handle" style={iS}/>
                </div>
              ))}
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button onClick={()=>{onUpdate(form);setEditing(null);}} style={{...aBtn(T.green),flex:1,padding:"10px",borderRadius:12}}>Save</button>
                <button onClick={()=>setEditing(null)} style={{...aBtn(T.dim),flex:1,padding:"10px",borderRadius:12}}>Cancel</button>
              </div>
            </div>
          ):(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:38,height:38,borderRadius:"50%",background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,border:`1px solid ${T.border}`}}>{u.avatar||"🎲"}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:T.cream}}>{u.name} {u.id===cu&&<span style={{fontSize:9,color:T.amber,background:`${T.amber}22`,padding:"2px 6px",borderRadius:8}}>you</span>}</div>
                  <div style={{fontSize:10,color:T.dim,marginTop:2}}>{PAY_APPS.filter(a=>u[a]).map(a=>`${a}: ${u[a]}`).join(" · ")||"No payment handles"}</div>
                </div>
              </div>
              <button onClick={()=>{setEditing(u.id);setForm({...u});}} style={{background:T.surface2,border:`1px solid ${T.border}`,color:T.muted,padding:"6px 14px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:600}}>Edit</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ data, cu, onSaveKey, onUpdate }) {
  const [key, setKey] = useState(data.oddsApiKey||"");
  const [odds, setOdds] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sport, setSport] = useState("americanfootball_nfl");

  async function fetchOdds() {
    if(!key) return;
    setLoading(true); setOdds(null);
    try {
      const res = await fetch(`https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${key}&regions=us&markets=h2h,spreads&oddsFormat=american`);
      const json = await res.json();
      setOdds(Array.isArray(json)?json.slice(0,8):null);
    } catch { setOdds([]); }
    setLoading(false);
  }

  const SPORTS=[["americanfootball_nfl","🏈 NFL"],["basketball_nba","🏀 NBA"],["baseball_mlb","⚾ MLB"],["icehockey_nhl","🏒 NHL"],["tennis_atp_queens_club_champ","🎾 Tennis"],["mma_mixed_martial_arts","🥊 MMA"]];

  return(
    <div>
      <SectionLabel>Live Odds API 📡</SectionLabel>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:"16px",marginBottom:16}}>
        <div style={{fontSize:12,color:T.muted,marginBottom:10}}>Get a free key at <a href="https://the-odds-api.com" target="_blank" rel="noopener noreferrer" style={{color:T.amber}}>the-odds-api.com</a> — 500 free requests/month.</div>
        <input value={key} onChange={e=>setKey(e.target.value)} placeholder="Paste your Odds API key..." style={{...iS,marginBottom:10}} type="password"/>
        <button onClick={()=>onSaveKey(key)} style={{...aBtn(T.green),width:"100%",padding:"11px",borderRadius:14,fontSize:13}}>Save Key ✓</button>
      </div>

      {data.oddsApiKey&&(
        <>
          <SectionLabel>Browse Lines 🎯</SectionLabel>
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            {SPORTS.map(([val,label])=><Chip key={val} active={sport===val} onClick={()=>setSport(val)}>{label}</Chip>)}
          </div>
          <button onClick={fetchOdds} style={{...aBtn(T.amber),marginBottom:14,padding:"10px 20px",borderRadius:14,fontSize:13,width:"100%"}}>
            {loading?"⏳ Loading…":"🔄 Fetch Live Lines"}
          </button>

          {odds&&odds.length===0&&<div style={{fontSize:12,color:T.muted,textAlign:"center",padding:20}}>No games found or API key invalid.</div>}
          {odds&&odds.map((game,i)=>{
            const teams=[game.home_team,game.away_team];
            const bestH2H={};
            const bestSpread={};
            game.bookmakers?.forEach(bk=>{
              bk.markets?.find(m=>m.key==="h2h")?.outcomes?.forEach(o=>{if(!bestH2H[o.name]||o.price>bestH2H[o.name].price)bestH2H[o.name]={price:o.price,book:bk.title};});
              bk.markets?.find(m=>m.key==="spreads")?.outcomes?.forEach(o=>{if(!bestSpread[o.name]||o.price>bestSpread[o.name].price)bestSpread[o.name]={price:o.price,point:o.point,book:bk.title};});
            });
            const bookCount=game.bookmakers?.length||0;
            const hasH2H=Object.keys(bestH2H).length>0;
            const hasSpread=Object.keys(bestSpread).length>0;

            return(
              <div key={i} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.cream,flex:1,marginRight:8}}>{game.home_team} vs {game.away_team}</div>
                  <div style={{fontSize:9,color:T.dim,whiteSpace:"nowrap"}}>{bookCount} books</div>
                </div>
                <div style={{fontSize:10,color:T.dim,marginBottom:10}}>{fmtDate(game.commence_time)}</div>

                {hasH2H&&(
                  <>
                    <div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Best Moneyline</div>
                    <div style={{display:"flex",gap:8,marginBottom:10}}>
                      {teams.map(team=>{
                        const b=bestH2H[team];
                        if(!b)return null;
                        return(
                          <div key={team} style={{flex:1,background:T.surface2,borderRadius:12,padding:"10px 12px"}}>
                            <div style={{fontSize:10,color:T.muted,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{team}</div>
                            <div style={{fontSize:18,fontWeight:900,color:b.price>0?T.green:T.amber}}>{b.price>0?"+":""}{b.price}</div>
                            <div style={{fontSize:9,color:T.dim,marginTop:2}}>via {b.book}</div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {hasSpread&&(
                  <>
                    <div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Best Spread</div>
                    <div style={{display:"flex",gap:8}}>
                      {teams.map(team=>{
                        const b=bestSpread[team];
                        if(!b)return null;
                        return(
                          <div key={team} style={{flex:1,background:T.surface2,borderRadius:12,padding:"10px 12px"}}>
                            <div style={{fontSize:10,color:T.muted,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{team}</div>
                            <div style={{fontSize:16,fontWeight:900,color:T.purple}}>{b.point>0?"+":""}{b.point}</div>
                            <div style={{fontSize:10,color:T.muted}}>{b.price>0?"+":""}{b.price} · {b.book}</div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </>
      )}

      <SectionLabel style={{marginTop:20}}>Deploy This App 🚀</SectionLabel>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:"16px"}}>
        <div style={{fontSize:12,color:T.muted,lineHeight:1.8}}>
          <div style={{color:T.cream,fontWeight:700,marginBottom:8}}>To make this real for your whole crew:</div>
          <div>1. Create a free <span style={{color:T.amber}}>Supabase</span> account at supabase.com</div>
          <div>2. Create a free <span style={{color:T.amber}}>Vercel</span> account at vercel.com</div>
          <div>3. Share the code with a developer — it's ready to deploy</div>
          <div>4. Enable Google & Meta OAuth in Supabase dashboard</div>
          <div style={{marginTop:10,color:T.dim,fontSize:11}}>Estimated cost: $0–20/month. Setup time: ~1 hour with a developer.</div>
        </div>
      </div>
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────
function BetModal({ data, cu, onClose, onSave }) {
  const [form, setForm] = useState({type:"standard",description:"",amount:"",odds:"",dueDate:"",notes:"",sport:"",participants:[]});
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const toggleP=id=>f("participants",form.participants.includes(id)?form.participants.filter(x=>x!==id):[...form.participants,id]);
  const isLL=form.type==="lastlonger";
  function submit(){if(!form.description||!form.amount)return;onSave({...form,amount:parseFloat(form.amount),status:isLL?"open":"active"});}

  return(
    <Modal title="🎲 Log a Bet" onClose={onClose} onSave={submit}>
      <Field label="Bet Type">
        <div style={{display:"flex",gap:8}}>
          {[["standard","🎲 Standard"],["lastlonger","🏆 Last Longer"],["prop","🎰 Prop"]].map(([v,l])=>(
            <button key={v} onClick={()=>f("type",v)} style={{flex:1,padding:"9px 4px",borderRadius:14,border:`1px solid ${form.type===v?T.amber:T.border}`,background:form.type===v?`${T.amber}22`:"transparent",color:form.type===v?T.amber:T.muted,cursor:"pointer",fontSize:11,fontWeight:form.type===v?700:400}}>{l}</button>
          ))}
        </div>
      </Field>
      <Field label={isLL?"Description":"What's the bet?"} required>
        <textarea value={form.description} onChange={e=>f("description",e.target.value)} placeholder={isLL?"Last Longer — $20/person, winner takes the pot":"Cowboys win the Super Bowl at 5:1..."} rows={3} style={{...iS,resize:"vertical"}}/>
      </Field>
      <div style={{display:"flex",gap:10}}>
        <Field label={isLL?"Buy-in/person ($)":"Amount ($)"} required style={{flex:1}}><input type="number" value={form.amount} onChange={e=>f("amount",e.target.value)} placeholder="20" style={iS}/></Field>
        {!isLL&&<Field label="Odds" style={{flex:1}}><input value={form.odds} onChange={e=>f("odds",e.target.value)} placeholder="5:1" style={iS}/></Field>}
      </div>
      {!isLL&&<Field label="Sport / League"><input value={form.sport} onChange={e=>f("sport",e.target.value)} placeholder="NFL, NBA, poker..." style={iS}/></Field>}
      <Field label="Settlement Date"><input type="date" value={form.dueDate} onChange={e=>f("dueDate",e.target.value)} style={iS}/></Field>
      <Field label="Who's involved?">
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {data.users.filter(u=>u.id!==cu).map(u=><Chip key={u.id} active={form.participants.includes(u.id)} onClick={()=>toggleP(u.id)}>{u.name}</Chip>)}
        </div>
      </Field>
      <Field label="Notes"><input value={form.notes} onChange={e=>f("notes",e.target.value)} placeholder="He was very confident for someone on their 8th beer..." style={iS}/></Field>
    </Modal>
  );
}

function GameModal({ data, cu, onClose, onSave }) {
  const [form, setForm] = useState({gameType:"No-Limit Hold'em",date:"",time:"",address:"",buyin:"",maxPlayers:"",rebuys:false,rebuyAmount:"",rebuyPeriod:"",payouts:"",notes:""});
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  function submit(){if(!form.date||!form.address||!form.buyin)return;onSave({...form,buyin:parseFloat(form.buyin),rebuyAmount:parseFloat(form.rebuyAmount||0)});}

  return(
    <Modal title="🃏 Schedule a Game" onClose={onClose} onSave={submit}>
      <Field label="Game Type">
        <select value={form.gameType} onChange={e=>f("gameType",e.target.value)} style={{...iS,cursor:"pointer"}}>
          {["No-Limit Hold'em","Pot-Limit Omaha","Mixed Games","Dealer's Choice","Tournament","Cash Game"].map(g=><option key={g}>{g}</option>)}
        </select>
      </Field>
      <div style={{display:"flex",gap:10}}>
        <Field label="Date" required style={{flex:1}}><input type="date" value={form.date} onChange={e=>f("date",e.target.value)} style={iS}/></Field>
        <Field label="Time" style={{flex:1}}><input type="time" value={form.time} onChange={e=>f("time",e.target.value)} style={iS}/></Field>
      </div>
      <Field label="Address" required><input value={form.address} onChange={e=>f("address",e.target.value)} placeholder="123 Main St or 'Big Dave's basement'" style={iS}/></Field>
      <div style={{display:"flex",gap:10}}>
        <Field label="Buy-in ($)" required style={{flex:1}}><input type="number" value={form.buyin} onChange={e=>f("buyin",e.target.value)} placeholder="100" style={iS}/></Field>
        <Field label="Max Players" style={{flex:1}}><input type="number" value={form.maxPlayers} onChange={e=>f("maxPlayers",e.target.value)} placeholder="9" style={iS}/></Field>
      </div>
      <Field label="Rebuys?">
        <div style={{display:"flex",gap:8}}>
          {[[true,"✅ Yes"],[false,"🚫 No"]].map(([v,l])=>(
            <button key={String(v)} onClick={()=>f("rebuys",v)} style={{flex:1,padding:"10px",borderRadius:14,border:`1px solid ${form.rebuys===v?T.amber:T.border}`,background:form.rebuys===v?`${T.amber}22`:"transparent",color:form.rebuys===v?T.amber:T.muted,cursor:"pointer",fontSize:13,fontWeight:form.rebuys===v?700:400}}>{l}</button>
          ))}
        </div>
      </Field>
      {form.rebuys&&(
        <div style={{display:"flex",gap:10}}>
          <Field label="Rebuy Amount ($)" style={{flex:1}}><input type="number" value={form.rebuyAmount} onChange={e=>f("rebuyAmount",e.target.value)} placeholder="50" style={iS}/></Field>
          <Field label="Until" style={{flex:1}}><input value={form.rebuyPeriod} onChange={e=>f("rebuyPeriod",e.target.value)} placeholder="Level 6 / 2hrs" style={iS}/></Field>
        </div>
      )}
      <Field label="Est. Payouts"><input value={form.payouts} onChange={e=>f("payouts",e.target.value)} placeholder="1st: $400 · 2nd: $200 · 3rd: $100" style={iS}/></Field>
      <Field label="Notes"><input value={form.notes} onChange={e=>f("notes",e.target.value)} placeholder="BYOB, no slow rolling, wear pants..." style={iS}/></Field>
    </Modal>
  );
}

function ReminderModal({ data, cu, onClose, onSave }) {
  const [form, setForm] = useState({description:"",amount:"",owedBy:"",owedTo:cu,dueDate:""});
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  function submit(){if(!form.description||!form.amount||!form.owedBy)return;onSave({...form,amount:parseFloat(form.amount)});}

  return(
    <Modal title="💸 Payment Reminder" onClose={onClose} onSave={submit}>
      <Field label="What's it for?" required><input value={form.description} onChange={e=>f("description",e.target.value)} placeholder="Cowboys bet, poker pot, drink tab..." style={iS}/></Field>
      <Field label="Amount ($)" required><input type="number" value={form.amount} onChange={e=>f("amount",e.target.value)} placeholder="100" style={iS}/></Field>
      <div style={{display:"flex",gap:10}}>
        <Field label="Who owes?" required style={{flex:1}}>
          <select value={form.owedBy} onChange={e=>f("owedBy",e.target.value)} style={{...iS,cursor:"pointer"}}>
            <option value="">Select...</option>
            {data.users.filter(u=>u.id!==form.owedTo).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label="Owes who?" style={{flex:1}}>
          <select value={form.owedTo} onChange={e=>f("owedTo",e.target.value)} style={{...iS,cursor:"pointer"}}>
            {data.users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Due Date"><input type="date" value={form.dueDate} onChange={e=>f("dueDate",e.target.value)} style={iS}/></Field>
    </Modal>
  );
}

function UserModal({ onClose, onSave }) {
  const [form, setForm] = useState({name:"",venmo:"",cashapp:"",zelle:"",paypal:"",avatar:"🎲"});
  return(
    <Modal title="🍺 Add Crew Member" onClose={onClose} onSave={()=>{if(form.name)onSave(form);}}>
      <Field label="Name" required><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Big Dave" style={iS}/></Field>
      {PAY_APPS.map(app=><Field key={app} label={`${app.charAt(0).toUpperCase()+app.slice(1)} (optional)`}><input value={form[app]} onChange={e=>setForm(f=>({...f,[app]:e.target.value}))} placeholder="@handle" style={iS}/></Field>)}
    </Modal>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Modal({ title, onClose, onSave, children }) {
  return(
    <div style={{position:"fixed",inset:0,background:"#000000BB",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:T.surface,width:"100%",maxWidth:600,borderRadius:"24px 24px 0 0",padding:"20px 18px",maxHeight:"90vh",overflowY:"auto",border:`1px solid ${T.border}`,borderBottom:"none"}}>
        <div style={{width:36,height:4,background:T.border,borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div style={{fontSize:17,fontWeight:800,color:T.cream}}>{title}</div>
          <button onClick={onClose} style={{background:T.surface2,border:`1px solid ${T.border}`,color:T.muted,width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        {children}
        <button onClick={onSave} style={{width:"100%",marginTop:16,padding:"15px",background:T.grad,color:"#fff",border:"none",borderRadius:16,cursor:"pointer",fontSize:15,fontWeight:800,letterSpacing:"0.3px"}}>
          Lock It In 🔒
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, required, style }) {
  return(
    <div style={{marginBottom:12,...style}}>
      <div style={{fontSize:11,color:T.muted,marginBottom:5,fontWeight:600}}>{label}{required&&<span style={{color:T.red}}> *</span>}</div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return(
    <button onClick={onClick} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${active?T.amber:T.border}`,background:active?`${T.amber}22`:"transparent",color:active?T.amber:T.muted,cursor:"pointer",fontSize:12,fontWeight:active?700:400,transition:"all 0.15s"}}>
      {children}
    </button>
  );
}

function Empty({ icon, msg, action, onAction }) {
  return(
    <div style={{textAlign:"center",padding:"50px 20px"}}>
      <div style={{fontSize:44}}>{icon}</div>
      <div style={{fontSize:14,color:T.muted,marginTop:10}}>{msg}</div>
      <button onClick={onAction} style={{marginTop:16,padding:"12px 28px",background:T.grad,color:"#fff",border:"none",borderRadius:20,cursor:"pointer",fontWeight:700,fontSize:14}}>
        {action}
      </button>
    </div>
  );
}

function SectionLabel({ children, style }) {
  return <div style={{fontSize:11,color:T.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:10,fontWeight:600,...style}}>{children}</div>;
}

const iS = {
  width:"100%",background:T.surface2,border:`1px solid ${T.border}`,borderRadius:12,
  color:T.cream,padding:"11px 14px",fontSize:13,boxSizing:"border-box",outline:"none",
  fontFamily:"system-ui,-apple-system,sans-serif"
};

function aBtn(c, size) {
  return {
    padding: size==="small" ? "5px 10px" : "8px 16px",
    background:`${c}22`,color:c,border:`1px solid ${c}44`,
    borderRadius: size==="small" ? 10 : 12,
    cursor:"pointer",fontSize: size==="small" ? 11 : 13,fontWeight:700
  };
}
