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
        {user && <><NavLink to="/account">My Account</NavLink><NavLink to="/chat">Chat</NavLink></>}
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
      <Route path="/chat" element={<Protected user={user}><ChatPage user={user} /></Protected>} />
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
  const [expertName,setExpertName]=useState(params.get("expert")||""); const [serviceName,setServiceName]=useState(services[0].name); const [name,setName]=useState(user?.user_metadata?.full_name||""); const [phone,setPhone]=useState(""); const [message,setMessage]=useState(""); const [notice,setNotice]=useState("");
  const expert=experts.find(e=>e.name===expertName); const service=services.find(s=>s.name===serviceName)||services[0];
  const submit=e=>{e.preventDefault();if(!user){navigate("/login?next=/booking");return;}if(!expert){setNotice("Please select an expert.");return;}setNotice("Your booking form is ready, but booking is not connected to the database yet. No request has been saved.");};
  return <section className="page-section narrow-page"><SectionHeading title="Book a Consultation" text="Select an expert and service to view the consultation price."/><form className="form-card" onSubmit={submit}><label>Choose Expert<select required value={expertName} onChange={e=>setExpertName(e.target.value)}><option value="">Select an expert</option>{experts.map(e=><option key={e.name}>{e.name}</option>)}</select></label><label>Select Service<select value={serviceName} onChange={e=>setServiceName(e.target.value)}>{services.map(s=><option key={s.name}>{s.name}</option>)}</select></label>{expert&&<div className="price-preview">Consultation price <strong>{getPrice(expert,service)===0?"FREE":`₹${getPrice(expert,service)}`}</strong></div>}<label>Your Name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></label><label>Mobile Number (optional)<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Mobile number"/></label><label>Message (optional)<textarea rows="4" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell us what you need help with"/></label><button className="primary-btn full-btn">{user?"Submit Booking Request":"Login to Continue"}</button>{notice&&<p className="notice-inline">{notice}</p>}<p className="form-footnote">Booking is currently a demo form and is not saved to a database.</p></form></section>;
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
function AccountPage({user}) { return <section className="page-section narrow-page"><SectionHeading title="My Account" text="Your AstroFriend customer account."/><div className="info-card"><div className="account-avatar">{(user.user_metadata?.full_name||user.email||"A").charAt(0).toUpperCase()}</div><h2>{user.user_metadata?.full_name||"AstroFriend Customer"}</h2><p>{user.email}</p><span className="verified-pill">✓ Email verified</span><div className="account-links"><Link className="secondary-btn" to="/booking">Book a Consultation</Link><Link className="secondary-btn" to="/chat">Open Chat</Link></div></div><p className="form-footnote centered">Booking history and saved profile details will appear here after database integration.</p></section>; }
function ChatPage() { return <section className="page-section narrow-page"><SectionHeading title="Customer Chat" text="Your private AstroFriend conversation area."/><div className="info-card"><div className="chat-icon">☏</div><h2>Chat is coming next</h2><p>The chat tables exist in your Supabase project, but customer messaging and the private admin inbox are not connected yet. No messages can be sent or received from this page today.</p></div></section>; }
function AdminPage({user}) { const adminEmail=import.meta.env.VITE_ADMIN_EMAIL; if(!adminEmail||user.email?.toLowerCase()!==adminEmail.toLowerCase())return <section className="page-section narrow-page"><div className="info-card"><h2>Admin access restricted</h2><p>This page is available only to the email configured in VITE_ADMIN_EMAIL. Set that variable in Netlify and your local .env to authorize the owner account.</p></div></section>; return <section className="page-section narrow-page"><SectionHeading title="Admin Panel" text="Owner workspace."/><div className="info-card"><h2>Admin panel foundation is ready</h2><p>Owner authentication is restricted to your configured admin email. Booking management and customer chat inbox still need database policies and UI integration.</p></div></section>; }
function NotFound(){return <section className="page-section narrow-page"><div className="info-card"><h2>Page not found</h2><Link className="text-link" to="/">Return Home →</Link></div></section>;}
export default function App(){return <BrowserRouter><AppShell/></BrowserRouter>;}