import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "./supabase";
import { experts, services, getPrice } from "./data/catalog";

function AppShell() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error("Session check:", error.message);
      if (!alive) return;
      const sessionUser = data?.session?.user ?? null;
      setUser(sessionUser?.email_confirmed_at ? sessionUser : null);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      // Unconfirmed sessions must never unlock customer-only pages.
      setUser(sessionUser?.email_confirmed_at ? sessionUser : null);
    });
    return () => { alive = false; listener?.subscription?.unsubscribe(); };
  }, []);

  useEffect(() => { setMobileMenu(false); window.scrollTo(0, 0); }, [location.pathname]);

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) window.alert(error.message);
    else setUser(null);
  };

  if (!authReady) return <div className="loading-screen">✦ AstroFriend</div>;
  return <div className="app-shell">
    <header className="navbar">
      <Link className="brand" to="/"><span className="brand-icon">✦</span><span>Astro<span>Friend</span></span></Link>
      <button className="menu-toggle" onClick={() => setMobileMenu(v => !v)} aria-label="Toggle navigation">☰</button>
      <nav className={mobileMenu ? "nav-links open" : "nav-links"}>
        <NavLink to="/">Home</NavLink><NavLink to="/services">Services</NavLink><NavLink to="/experts">Experts</NavLink>
        {user && <><NavLink to="/account">My Account</NavLink><NavLink to="/wallet">Wallet</NavLink><NavLink to="/chat">Expert Chat</NavLink><NavLink to="/inbox">Inbox</NavLink><NavLink to="/astro-ai">AI Astrologer</NavLink></>}
      </nav>
      <div className="nav-actions">
        {user ? <><span className="user-chip">{user.user_metadata?.full_name || user.email}</span><button className="nav-button ghost-button" onClick={logout}>Logout</button></> : <><Link className="nav-button ghost-button" to="/login">Login</Link><Link className="nav-button" to="/signup">Sign Up</Link></>}
      </div>
    </header>
    <main><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/experts" element={<Protected user={user}><ExpertsPage /></Protected>} />
      <Route path="/booking" element={<BookingPage user={user} />} />
      <Route path="/login" element={<LoginPage user={user} />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-email" element={<VerifyPage />} />
      <Route path="/account" element={<Protected user={user}><AccountPage user={user} /></Protected>} />
      <Route path="/wallet" element={<Protected user={user}><WalletPage user={user} /></Protected>} />
      <Route path="/chat" element={<Protected user={user}><ChatPage user={user} /></Protected>} />
      <Route path="/inbox" element={<Protected user={user}><InboxPage user={user} /></Protected>} />
      <Route path="/astro-ai" element={<Protected user={user}><AstroAIPage user={user} /></Protected>} />
      <Route path="/admin" element={<Protected user={user}><AdminPage user={user} /></Protected>} />
      <Route path="*" element={<NotFound />} />
    </Routes></main>
    <footer className="footer"><Link className="brand footer-brand" to="/"><span className="brand-icon">✦</span><span>Astro<span>Friend</span></span></Link><p>Connect with astrology experts for guidance and consultations.</p><small>© {new Date().getFullYear()} AstroFriend. All rights reserved.</small></footer>
  </div>;
}

function SectionHeading({ eyebrow = "ASTROFRIEND", title, text }) { return <div className="section-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{text && <p>{text}</p>}</div>; }
function HomePage() {
  return <>
    <section className="hero"><div className="hero-content"><span className="eyebrow">WELCOME TO ASTROFRIEND</span><h1>Discover Your <span>Cosmic Path</span></h1><p>Connect with astrology experts for Kundli, horoscope, compatibility and personal consultations.</p><div className="hero-actions"><Link className="primary-btn" to="/experts">Explore Experts</Link><Link className="secondary-btn" to="/services">View Services</Link></div><div className="hero-stats"><div><strong>29</strong><small>ASTROLOGY EXPERTS</small></div><div><strong>7</strong><small>CONSULTATION SERVICES</small></div><div><strong>24/7</strong><small>EXPLORE ANYTIME</small></div></div></div><div className="hero-art"><div className="orbit"/><div className="orbit orbit-two"/><div className="cosmic-circle"><span className="sun">☼</span><span className="moon">☾</span><span className="stars">✧　·　✦</span></div><div className="floating-card card-top">✦ Your cosmic journey</div><div className="floating-card card-bottom">Guidance • Clarity • Balance</div></div></section>
    <div className="trust-strip"><span>✧ Personal Guidance</span><span>☾ Kundli & Horoscope</span><span>✦ Experienced Experts</span><span>♧ Easy Booking</span></div>
    <section className="section"><SectionHeading title="Guidance for every journey" text="Explore astrology services designed to help you find clarity."/><div className="service-grid">{services.slice(0,3).map((s,i)=><ServiceCard key={s.name} service={s} icon={["☼","☾","✧"][i]}/>)}</div><div className="center-action"><Link className="text-link" to="/services">Explore all services →</Link></div></section>
    <section className="cta-section"><div className="cta-symbol">✦</div><span className="eyebrow">YOUR NEXT STEP</span><h2>Find the guidance you’re looking for</h2><p>Browse our expert directory and choose a consultation that fits your needs.</p><Link className="primary-btn" to="/experts">Meet Our Experts</Link></section>
  </>;
}
function ServiceCard({ service, icon = "✦" }) { return <article className="service-card"><span className="service-icon">{icon}</span><h3>{service.name}</h3><p>{service.senior === 0 ? "Complimentary daily guidance." : "Choose an expert and view the applicable consultation charge."}</p><strong className="service-price">{service.senior === 0 ? "FREE" : `₹${service.other} – ₹${service.senior}`}</strong><small className="service-caption">{service.senior === 0 ? "No charge" : "Price depends on expert category"}</small></article>; }
function ServicesPage() { return <section className="page-section"><SectionHeading title="Our Services" text="Choose the service you need. Final price depends on the selected expert."/><div className="service-grid">{services.map((s,i)=><ServiceCard key={s.name} service={s} icon={["☼","☾","✧","◉","◉","✦","♧"][i]}/>)}</div></section>; }

function ExpertsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = useMemo(
    () =>
      experts.filter(
        e =>
          e.name.toLowerCase().includes(search.toLowerCase()) &&
          (filter === "All" || e.level === filter)
      ),
    [search, filter]
  );

  return (
    <section className="page-section">
      <SectionHeading
        title="Meet Our Experts"
        text="Browse our 29 listed experts and compare consultation rates."
      />

      <div className="expert-tools">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search expert name..."
        />
        <span className="result-count">
          {filtered.length} experts
        </span>
      </div>

      <div className="filter-list">
        {["All", "Senior", "Other"].map(f => (
          <button
            key={f}
            className={filter === f ? "filter active" : "filter"}
            onClick={() => setFilter(f)}
          >
            {f === "All"
              ? "All Experts"
              : f === "Senior"
              ? "Senior Experts"
              : "Other Experts"}
          </button>
        ))}
      </div>

      <div className="expert-grid">
        {filtered.map(expert => (
          <article className="expert-card" key={expert.name}>
            <div className="expert-top">
              <div className="avatar">
                <img src={expert.photo} alt={expert.name} />
              </div>
              <span className="status offline">Listed Expert</span>
            </div>

            <div className="expert-info">
              <span className="rating">
                ⭐ {expert.rating} / 5
              </span>

              <h3>{expert.name}</h3>

              <p className="expert-category">
                {expert.level === "Senior"
                  ? "Senior Expert"
                  : "Expert"}
              </p>

              <p className="experience">
                {expert.experience} Years of Experience
              </p>

              <div className="expert-bottom">
                <span className="price">
                  From ₹
                  {Math.min(
                    ...services
                      .filter(s => s.senior > 0)
                      .map(s =>
                        expert.level === "Senior"
                          ? s.senior
                          : s.other
                      )
                  )}
                  <small> / service</small>
                </span>

                <Link
                  className="view-btn"
                  to={`/booking?expert=${encodeURIComponent(expert.name)}`}
                >
                  View & Book
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          No experts found. Try another name.
        </div>
      )}
    </section>
  );
}

function BookingPage({user}) {
  const [params] = useSearchParams(); const navigate=useNavigate();
  const expertName = params.get("expert") || "";
  const [serviceName,setServiceName]=useState(services[0].name);
  const [name,setName]=useState(user?.user_metadata?.full_name||"");
  const [phone,setPhone]=useState("");
  const [birthDate,setBirthDate]=useState("");
  const [birthPlace,setBirthPlace]=useState("");
  const [birthTime,setBirthTime]=useState("");
  const [message,setMessage]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const expert=experts.find(e=>e.name===expertName);
  const service=services.find(s=>s.name===serviceName)||services[0];
  const submit=async e=>{
    e.preventDefault();
    if(!user){navigate("/login?next=/booking");return;}
    if(!expert){setNotice("Expert select nahi hua. Experts page se dobara Book Now karein.");return;}
    if(!birthDate||!birthPlace.trim()||!birthTime){setNotice("Date of Birth, Birth Place aur Birth Time bharna zaroori hai.");return;}
    setBusy(true);setNotice("");
    const {error}=await supabase.from("af_bookings").insert({
      customer_id:user.id, expert_name:expertName, service_name:serviceName,
      customer_name:name.trim(), customer_phone:phone.trim()||null,
      birth_date:birthDate, birth_place:birthPlace.trim(), birth_time:birthTime,
      message:message.trim()||null, consultation_price:getPrice(expert,service)
    });
    if(error)setNotice(error.message);
    else setNotice("Booking request successfully submit ho gayi. AstroFriend team aapse contact karegi.");
    setBusy(false);
  };
  return <section className="page-section narrow-page"><SectionHeading title="Book a Consultation" text="Confirm your selected expert, choose a service and share your birth details."/><form className="form-card" onSubmit={submit}>
    <div className="selected-expert"><span>Selected Expert</span><strong>{expertName||"No expert selected"}</strong></div>
    <label>Select Service<select value={serviceName} onChange={e=>setServiceName(e.target.value)}>{services.map(s=><option key={s.name}>{s.name}</option>)}</select></label>
    {expert&&<div className="price-preview">Consultation price <strong>{getPrice(expert,service)===0?"FREE":`₹${getPrice(expert,service)}`}</strong></div>}
    <label>Your Name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></label>
    <label>Mobile Number<input required value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" placeholder="10-digit mobile number"/></label>
    <div className="birth-details-title">Birth Details</div>
    <label>Date of Birth<input required type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)} max={new Date().toISOString().slice(0,10)}/></label>
    <label>Place of Birth<input required value={birthPlace} onChange={e=>setBirthPlace(e.target.value)} placeholder="City, State, Country"/></label>
    <label>Time of Birth<input required type="time" value={birthTime} onChange={e=>setBirthTime(e.target.value)}/></label>
    <label>Message (optional)<textarea rows="4" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell us what you need help with"/></label>
    <button className="primary-btn full-btn" disabled={busy||!expert}>{busy?"Submitting...":"Submit Booking Request"}</button>
    {notice&&<p className="notice-inline">{notice}</p>}
    <p className="form-footnote">Your birth details will be saved securely with this booking request and used only to provide the requested astrology service.</p>
  </form></section>;
}
function LoginPage({user}) {
  const navigate=useNavigate(); const [params]=useSearchParams(); const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
  if(user)return <Navigate to="/account" replace/>;
  const submit=async e=>{e.preventDefault();setBusy(true);setNotice("");try{const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;if(!data.user?.email_confirmed_at){await supabase.auth.signOut();throw new Error("Email verify nahi hua hai. Pehle 6-digit OTP verify karein.");}navigate(params.get("next")||"/account");}catch(err){setNotice(err.message||"Login nahi ho paya.");}finally{setBusy(false);}};
  return <section className="page-section auth-page"><div className="form-card"><SectionHeading title="Welcome Back" text="Login with your verified email address."/><form onSubmit={submit}><label>Email Address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></label><button className="primary-btn full-btn" disabled={busy}>{busy?"Please wait...":"Login"}</button></form>{notice&&<p className="notice-inline">{notice}</p>}<p className="form-footnote">New to AstroFriend? <Link className="text-link" to="/signup">Create an account</Link></p></div></section>;
}
function SignupPage() {
  const navigate=useNavigate();const [name,setName]=useState("");const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
  const submit=async e=>{e.preventDefault();setNotice("");if(password.length<6)return setNotice("Password कम से कम 6 characters का होना चाहिए।");if(password!==confirm)return setNotice("दोनों password एक जैसे नहीं हैं।");setBusy(true);try{const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{full_name:name.trim()}}});if(error)throw error;if(data.session){await supabase.auth.signOut();throw new Error("Supabase में email confirmation बंद है। OTP के बिना account access रोक दिया गया है। Supabase Dashboard → Authentication → Providers → Email में Confirm email चालू करें, फिर दोबारा प्रयास करें।");}sessionStorage.setItem("astrofriend_pending_email",email.trim());navigate("/verify-email");}catch(err){setNotice(err.message||"Signup nahi ho paya.");}finally{setBusy(false);}};
  return <section className="page-section auth-page"><div className="form-card"><SectionHeading title="Create Account" text="Create your AstroFriend account. Email verification is required."/><form onSubmit={submit}><label>Full Name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></label><label>Email Address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input required minLength="6" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label><label>Confirm Password<input required type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Enter password again"/></label><button className="primary-btn full-btn" disabled={busy}>{busy?"Creating account...":"Create Account"}</button></form>{notice&&<p className="notice-inline">{notice}</p>}<p className="form-footnote">Already registered? <Link className="text-link" to="/login">Login</Link></p></div></section>;
}
function VerifyPage() {
  const navigate=useNavigate();const [email,setEmail]=useState(sessionStorage.getItem("astrofriend_pending_email")||"");const [otp,setOtp]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
  const submit=async e=>{e.preventDefault();if(!/^\d{6}$/.test(otp))return setNotice("कृपया 6 अंकों का OTP दर्ज करें।");setBusy(true);setNotice("");try{const {data,error}=await supabase.auth.verifyOtp({email:email.trim(),token:otp,type:"signup"});if(error)throw error;if(!data.user?.email_confirmed_at)throw new Error("Email verification confirm nahi hua. OTP dobara check karein.");sessionStorage.removeItem("astrofriend_pending_email");navigate("/account");}catch(err){setNotice(err.message||"OTP verify nahi hua.");}finally{setBusy(false);}};
  return <section className="page-section auth-page"><div className="form-card"><SectionHeading title="Verify Your Email" text="Enter the 6-digit code sent to your email address."/><form onSubmit={submit}><label>Email Address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>6-Digit OTP<input required inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="123456"/></label><button className="primary-btn full-btn" disabled={busy}>{busy?"Verifying...":"Verify Email"}</button></form>{notice&&<p className="notice-inline">{notice}</p>}<p className="form-footnote"><Link className="text-link" to="/signup">Back to signup</Link></p></div></section>;
}
function Protected({user,children}) { return user?children:<Navigate to="/login" replace/>; }

function AccountPage({user}) {
  return <section className="page-section narrow-page"><SectionHeading title="My Account" text="Your AstroFriend customer account."/><div className="info-card"><div className="account-avatar">{(user.user_metadata?.full_name||user.email||"A").charAt(0).toUpperCase()}</div><h2>{user.user_metadata?.full_name||"AstroFriend Customer"}</h2><p>{user.email}</p><span className="verified-pill">✓ Email verified</span><div className="account-links"><Link className="secondary-btn" to="/booking">Book a Consultation</Link><Link className="secondary-btn" to="/wallet">My Wallet</Link><Link className="secondary-btn" to="/chat">Expert Chat</Link><Link className="secondary-btn" to="/inbox">Chat Inbox</Link><Link className="secondary-btn" to="/astro-ai">AI Astrologer</Link></div></div></section>;
}
function WalletPage({user}) {
  const [wallet,setWallet]=useState(null),[transactions,setTransactions]=useState([]),[loading,setLoading]=useState(true),[amount,setAmount]=useState(""),[notice,setNotice]=useState("");
  const load=async()=>{setLoading(true);const [w,t]=await Promise.all([supabase.from("af_wallets").select("balance").eq("user_id",user.id).maybeSingle(),supabase.from("af_wallet_transactions").select("id,amount,kind,description,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50)]);if(w.error)setNotice(w.error.message);setWallet(w.data||{balance:0});setTransactions(t.data||[]);setLoading(false);};
  useEffect(()=>{load();},[user.id]);
  const requestTopup=()=>{const n=Number(amount);if(!Number.isInteger(n)||n<20||n>100000){setNotice("Amount ₹20 से ₹1,00,000 के बीच होना चाहिए।");return;}setNotice("Online payment अभी activate नहीं है। Razorpay account और secure payment verification setup होने के बाद Add Money चालू होगा।");};
  return <section className="page-section narrow-page"><SectionHeading title="My Wallet" text="Manage your consultation balance and transaction history."/>
    <div className="wallet-balance"><span>AVAILABLE BALANCE</span><strong>₹{Number(wallet?.balance||0).toFixed(2)}</strong><small>AstroFriend Wallet</small></div>
    <div className="form-card wallet-form"><h2>Add Money</h2><p className="muted-note">Minimum ₹20 · Maximum ₹1,00,000</p><label>Amount (₹)<input type="number" min="20" max="100000" step="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter amount"/></label><button className="primary-btn full-btn" onClick={requestTopup}>Add Money</button><p className="form-footnote">Payments are temporarily unavailable. Your wallet cannot be credited manually from this screen.</p></div>
    <div className="transaction-panel"><h2>Transaction History</h2>{loading?<p>Loading...</p>:transactions.length===0?<p className="muted-note">No transactions yet.</p>:<div className="transaction-list">{transactions.map(t=><div className="transaction-row" key={t.id}><div><strong>{t.description||t.kind}</strong><small>{new Date(t.created_at).toLocaleString("en-IN")}</small></div><b className={Number(t.amount)>=0?"credit":"debit"}>{Number(t.amount)>=0?"+":"−"}₹{Math.abs(Number(t.amount)).toFixed(2)}</b></div>)}</div>}</div>{notice&&<p className="notice-inline">{notice}</p>}
  </section>;
}
function ChatPage({user}) {
  const [expertName,setExpertName]=useState(experts[0]?.name||""),[rate,setRate]=useState(5),[session,setSession]=useState(null),[messages,setMessages]=useState([]),[message,setMessage]=useState(""),[balance,setBalance]=useState(0),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[seconds,setSeconds]=useState(0);
  const refresh=async()=>{const {data}=await supabase.from("af_wallets").select("balance").eq("user_id",user.id).maybeSingle();setBalance(Number(data?.balance||0));const {data:s}=await supabase.from("af_chat_sessions").select("*").eq("customer_id",user.id).in("status",["pending","active"]).order("created_at",{ascending:false}).limit(1).maybeSingle();if(s){setSession(s);const {data:m}=await supabase.from("af_chat_messages").select("*").eq("session_id",s.id).order("created_at");setMessages(m||[]);}else{setSession(null);setMessages([]);}};
  useEffect(()=>{refresh();const id=setInterval(refresh,5000);return()=>clearInterval(id);},[user.id]);
  useEffect(()=>{if(!session||session.status!=="active")return;const update=()=>setSeconds(Math.max(0,Math.floor((Date.now()-new Date(session.started_at).getTime())/1000)));update();const id=setInterval(update,1000);return()=>clearInterval(id);},[session?.id,session?.status,session?.started_at]);
  useEffect(()=>{if(!session||session.status!=="active")return;const id=setInterval(async()=>{const {data,error}=await supabase.rpc("af_charge_chat_minute",{p_session_id:session.id});if(error)setNotice(error.message);else if(data?.ended){setNotice("Wallet balance कम होने के कारण chat समाप्त हो गई।");refresh();}else if(data?.charged){setBalance(data.balance);}},5000);return()=>clearInterval(id);},[session?.id,session?.status]);
  const start=async()=>{setBusy(true);setNotice("");const chosen=experts.find(e=>e.name===expertName);const perMinute=chosen?.level==="Senior"?5:4;const {data,error}=await supabase.rpc("af_create_chat_request",{p_expert_name:expertName,p_rate_per_minute:perMinute});if(error)setNotice(error.message);else{setRate(perMinute);setNotice("Chat request भेज दी गई है। Expert के accept करने का इंतज़ार करें।");await refresh();}setBusy(false);};
  const send=async e=>{e.preventDefault();if(!message.trim()||!session)return;const text=message.trim();setMessage("");const {error}=await supabase.from("af_chat_messages").insert({session_id:session.id,sender:"customer",message:text});if(error)setNotice(error.message);else refresh();};
  const end=async()=>{if(!session)return;const {error}=await supabase.rpc("af_end_chat",{p_session_id:session.id});if(error)setNotice(error.message);await refresh();};
  return <section className="page-section narrow-page"><SectionHeading title="Talk to an Expert" text="Chat with an astrology expert. Charges are deducted from your wallet by the minute."/>
    {!session?<div className="form-card"><label>Select Expert<select value={expertName} onChange={e=>setExpertName(e.target.value)}>{experts.map(e=><option key={e.name}>{e.name}</option>)}</select></label><div className="price-preview"><span>Chat rate</span><strong>₹{experts.find(e=>e.name===expertName)?.level==="Senior"?5:4}/minute</strong></div><p className="muted-note">Current rate is based on your existing 5-minute chat prices. Senior: ₹5/min · Other: ₹4/min.</p><p className="muted-note">Wallet balance: ₹{balance.toFixed(2)}</p><button className="primary-btn full-btn" disabled={busy} onClick={start}>{busy?"Please wait...":"Request Chat"}</button></div>
    :<div className="chat-panel"><div className="chat-session-head"><div><strong>{session.expert_name}</strong><small>{session.status==="pending"?"Waiting for expert to accept":`₹${session.rate_per_minute}/minute · ${session.status}`}</small></div><div className="chat-clock">{String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")}</div></div><div className="chat-messages">{messages.map(m=><div key={m.id} className={`chat-bubble ${m.sender==="customer"?"mine":"theirs"}`}><small>{m.sender==="customer"?"You":"Expert"}</small><p>{m.message}</p></div>)}</div>{session.status==="active"&&<form className="chat-compose" onSubmit={send}><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Type your message..." maxLength={2000}/><button className="primary-btn">Send</button></form>}<div className="chat-actions"><span>Wallet: ₹{balance.toFixed(2)}</span><button className="secondary-btn" onClick={end}>End Chat</button></div></div>}
    {notice&&<p className="notice-inline">{notice}</p>}
  </section>;
}
function InboxPage({user}) {
  const [sessions,setSessions]=useState([]);
  const [selected,setSelected]=useState(null);
  const [messages,setMessages]=useState([]);
  const [notice,setNotice]=useState("");
  const load=async()=>{
    const {data,error}=await supabase.from("af_chat_sessions").select("*").eq("customer_id",user.id).order("created_at",{ascending:false});
    if(error){setNotice(error.message);return;}
    setSessions(data||[]);
    if(selected){
      const current=(data||[]).find(s=>s.id===selected.id);
      if(current)setSelected(current);
      const {data:m,error:me}=await supabase.from("af_chat_messages").select("*").eq("session_id",selected.id).order("created_at");
      if(me)setNotice(me.message);else setMessages(m||[]);
    }
  };
  useEffect(()=>{load();const id=setInterval(load,5000);return()=>clearInterval(id);},[user.id,selected?.id]);
  return <section className="page-section"><SectionHeading title="My Chat Inbox" text="Your expert chat requests and previous conversations."/>
    <div className="inbox-layout"><div className="inbox-list">{sessions.length===0?<p className="muted-note">Abhi koi chat nahi hai. Expert Chat page se request bhejein.</p>:sessions.map(s=><button key={s.id} className={`inbox-item ${selected?.id===s.id?"selected":""}`} onClick={()=>setSelected(s)}><strong>{s.expert_name}</strong><span>{s.status==="pending"?"Waiting":s.status==="active"?"Live chat":"Completed"}</span><small>{new Date(s.created_at).toLocaleString("en-IN")}</small><small>₹{s.rate_per_minute}/minute</small></button>)}</div>
    <div className="inbox-conversation">{selected?<><div className="chat-session-head"><div><strong>{selected.expert_name}</strong><small>{selected.status} · ₹{selected.rate_per_minute}/minute</small></div></div><div className="chat-messages">{messages.length===0?<p className="muted-note">No messages yet.</p>:messages.map(m=><div key={m.id} className={`chat-bubble ${m.sender==="customer"?"mine":"theirs"}`}><small>{m.sender==="customer"?"You":"Expert"}</small><p>{m.message}</p></div>)}</div></>:<p className="muted-note">Conversation dekhne ke liye left side se chat select karein.</p>}</div></div>
    {notice&&<p className="notice-inline">{notice}</p>}
  </section>;
}
function AstroAIPage() {
  const [question,setQuestion]=useState("");
  const [messages,setMessages]=useState([{role:"assistant",content:"Namaste! Main AstroFriend AI hoon. Main Kundli, astrology, numerology, rashifal, grah-gochar aur traditional future guidance se jude sawalon mein madad kar sakta hoon. Aap apna sawal poochhein."}]);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const send=async e=>{
    e.preventDefault();
    const prompt=question.trim();if(!prompt||busy)return;
    const next=[...messages,{role:"user",content:prompt}];
    setMessages(next);setQuestion("");setBusy(true);setNotice("");
    try{
      const response=await fetch("/.netlify/functions/astro-ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:next.slice(-12).map(m=>({role:m.role,content:m.content}))})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"AI service abhi available nahi hai.");
      setMessages(v=>[...v,{role:"assistant",content:data.reply}]);
    }catch(err){setNotice(err.message||"AI se response nahi mila.");}
    finally{setBusy(false);}
  };
  return <section className="page-section narrow-page"><SectionHeading title="AstroFriend AI Astrologer" text="Kundli, numerology, horoscope aur bhavishya se jude sawalon ke liye AI guidance."/>
    <div className="ai-chat-panel"><div className="ai-chat-head"><span className="ai-orb">✦</span><div><strong>AstroFriend AI</strong><small>Astrology & Numerology Assistant</small></div><span className="ai-online">Online</span></div>
    <div className="ai-chat-messages">{messages.map((m,i)=><div key={i} className={`ai-message ${m.role==="user"?"user":"assistant"}`}><small>{m.role==="user"?"You":"AstroFriend AI"}</small><p>{m.content}</p></div>)}{busy&&<div className="ai-message assistant"><small>AstroFriend AI</small><p>Soch raha hoon...</p></div>}</div>
    <form className="ai-compose" onSubmit={send}><textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Apna Kundli, rashifal ya numerology ka sawal likhein..." rows="2" maxLength="3000"/><button className="primary-btn" disabled={busy||!question.trim()}>{busy?"Please wait...":"Send"}</button></form>
    {notice&&<p className="notice-inline">{notice}</p>}
    <p className="form-footnote">AI guidance paramparik astrology/numerology par aadharit hai; ise guaranteed prediction ya professional advice na samjhein.</p></div>
  </section>;
}

function AdminPage({user}) {
  const adminEmail=import.meta.env.VITE_ADMIN_EMAIL;
  const [sessions,setSessions]=useState([]),[selected,setSelected]=useState(null),[messages,setMessages]=useState([]),[reply,setReply]=useState(""),[notice,setNotice]=useState("");
  const allowed=adminEmail&&user.email?.toLowerCase()===adminEmail.toLowerCase();
  const load=async()=>{if(!allowed)return;const {data,error}=await supabase.from("af_chat_sessions").select("*").in("status",["pending","active"]).order("created_at",{ascending:false});if(error)setNotice(error.message);else{setSessions(data||[]);if(selected){const {data:m}=await supabase.from("af_chat_messages").select("*").eq("session_id",selected.id).order("created_at");setMessages(m||[]);}}};
  useEffect(()=>{if(allowed){load();const id=setInterval(load,4000);return()=>clearInterval(id);}},[allowed,selected?.id]);
  if(!allowed)return <section className="page-section narrow-page"><div className="info-card"><h2>Admin access restricted</h2><p>Owner access is limited to VITE_ADMIN_EMAIL. Also add the same email to the af_admins table in Supabase.</p></div></section>;
  const accept=async s=>{const {error}=await supabase.rpc("af_start_chat",{p_session_id:s.id});if(error)setNotice(error.message);else{setSelected(s);load();}};
  const send=async e=>{e.preventDefault();if(!reply.trim()||!selected)return;const {error}=await supabase.from("af_chat_messages").insert({session_id:selected.id,sender:"admin",message:reply.trim()});if(error)setNotice(error.message);else{setReply("");load();}};
  return <section className="page-section"><SectionHeading title="Admin Chat Inbox" text="Accept customer chat requests and reply to active conversations."/><div className="admin-chat-layout"><div className="admin-session-list">{sessions.length===0?<p className="muted-note">No active or pending chats.</p>:sessions.map(s=><button key={s.id} className={`admin-session ${selected?.id===s.id?"selected":""}`} onClick={()=>setSelected(s)}><strong>{s.expert_name}</strong><small>{s.status} · ₹{s.rate_per_minute}/min</small><small>{new Date(s.created_at).toLocaleString("en-IN")}</small>{s.status==="pending"&&<span>New request</span>}</button>)}</div><div className="admin-chat-window">{selected?<><div className="chat-session-head"><strong>{selected.expert_name}</strong><span>{selected.status}</span></div><div className="chat-messages">{messages.map(m=><div key={m.id} className={`chat-bubble ${m.sender==="admin"?"mine":"theirs"}`}><small>{m.sender==="admin"?"You":"Customer"}</small><p>{m.message}</p></div>)}</div>{selected.status==="pending"&&<button className="primary-btn" onClick={()=>accept(selected)}>Accept Chat</button>}{selected.status==="active"&&<form className="chat-compose" onSubmit={send}><input value={reply} onChange={e=>setReply(e.target.value)} placeholder="Reply to customer..."/><button className="primary-btn">Send</button></form>}</>:<p className="muted-note">Select a chat request to view messages.</p>}</div></div>{notice&&<p className="notice-inline">{notice}</p>}</section>;
}
function NotFound(){return <section className="page-section narrow-page"><div className="info-card"><h2>Page not found</h2><Link className="text-link" to="/">Return Home →</Link></div></section>;}
export default function App(){return <BrowserRouter><AppShell/></BrowserRouter>;}