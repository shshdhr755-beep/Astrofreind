import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const experts = [
  { name: "Pandit Deepak Sharma", level: "Senior" },
  { name: "Madhuri Charan", level: "Senior" },
  { name: "Ram Raheem Sharma", level: "Senior" },
  { name: "Nita Kulkarni", level: "Senior" },
  { name: "Naina Sharma", level: "Senior" },
  { name: "Mahira Desai", level: "Senior" },
  { name: "Mohan Lal", level: "Other" },
  { name: "Sh. Rameshwar Datt Sharma", level: "Senior" },
  { name: "Sh. Mast Ram", level: "Senior" },
  { name: "Sh. Bhajna Nand", level: "Other" },
  { name: "Sh. Ganesh Dutt", level: "Senior" },
  { name: "Sh. Vidya Sagar Sharma", level: "Other" },
  { name: "Sh. T. Narayanan Namboodri", level: "Senior" },
  { name: "Shri M. Raghavan Achari", level: "Senior" },
  { name: "Smt. A.K. Vaisalakshy", level: "Other" },
  { name: "Sh. K.V. Pokkan Panicker", level: "Other" },
  { name: "Smt. T.R. Meenakshi", level: "Other" },
  { name: "Smt. R. Mangalam", level: "Other" },
  { name: "Smt. N. Meenakshi Ammal", level: "Other" },
  { name: "Smt. K.S. Rugmani Ammal", level: "Other" },
  { name: "Smt. K.R. Thangammal", level: "Other" },
  { name: "Sh. K.R. Thiruvenkatanatha Sarma", level: "Other" },
  { name: "Smt. N.S. Muthu Lakshmi", level: "Other" },
  { name: "Sh. Pappukuttan Ali’s Appukuttan Panicker", level: "Other" },
  { name: "Sh. K.M. Parameswaran Namboodri", level: "Senior" },
  { name: "Sh. Haridathan Namboothiri", level: "Senior" },
  { name: "Sh. A.K. Vasu", level: "Other" },
  { name: "Smt. P.V. Narayani Ammal", level: "Other" },
  { name: "Smt. A. Sreedevi Antharjanam", level: "Senior" },
];

const services = [
  { name: "Basic Kundli", senior: 49, other: 39 },
  { name: "Daily Horoscope", senior: 0, other: 0 },
  { name: "Kundli Matching", senior: 99, other: 79 },
  { name: "Chat – 5 Minutes", senior: 25, other: 20 },
  { name: "Chat – 30 Minutes", senior: 99, other: 79 },
  { name: "Detailed Kundli", senior: 199, other: 149 },
  { name: "Personal Consultation – 30 Minutes", senior: 199, other: 149 },
];

const getPrice = (expert, service) => {
  if (!expert || !service) return 0;
  return expert.level === "Senior" ? service.senior : service.other;
};

export default function App() {
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [selectedService, setSelectedService] = useState(services[0]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [booking, setBooking] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [notice, setNotice] = useState("");

  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error("Session check:", error.message);
      setUser(data?.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const filteredExperts = useMemo(() => {
    return experts.filter((expert) => {
      const matchesSearch = expert.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" || expert.level === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const price = getPrice(selectedExpert, selectedService);

  const openAuth = (mode = "login") => {
    setAuthMode(mode);
    setAuthNotice("");
    setOtp("");
    setAuthOpen(true);
  };

  const closeAuth = () => {
    setAuthOpen(false);
    setAuthNotice("");
    setOtp("");
  };

  const openBooking = (expert, service = services[0]) => {
    setSelectedExpert(expert);
    setSelectedService(service);
    setBooking(true);
    setNotice("");
  };

  const submitBooking = (e) => {
    e.preventDefault();
    if (!selectedExpert) return;
    if (!user) {
      setBooking(false);
      openAuth("login");
      setAuthNotice("Booking request bhejne ke liye pehle login karein.");
      return;
    }
    setNotice("आप login हैं। Booking को database से जोड़ना अगला चरण है; यह request अभी save नहीं हुई है।");
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthNotice("");

    if (!authName.trim()) return setAuthNotice("अपना पूरा नाम दर्ज करें।");
    if (authPassword.length < 6) return setAuthNotice("Password कम से कम 6 characters का होना चाहिए।");
    if (authPassword !== confirmPassword) return setAuthNotice("दोनों password एक जैसे नहीं हैं।");

    setAuthBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: { data: { full_name: authName.trim() } },
      });
      if (error) throw error;

      if (data.session) {
        setUser(data.user);
        setAuthNotice("Account बन गया और आप login हो चुके हैं।");
      } else {
        setAuthMode("verify");
        setAuthNotice("Signup request भेज दी गई। अगर email template OTP पर सेट है, तो email में आया 6-digit code डालें। Inbox और Spam folder देखें।");
      }
    } catch (error) {
      setAuthNotice(error.message || "Signup नहीं हो पाया।");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setAuthNotice("");
    if (!/^\d{6}$/.test(otp)) {
      setAuthNotice("कृपया 6 अंकों का OTP दर्ज करें।");
      return;
    }

    setAuthBusy(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: authEmail.trim(),
        token: otp,
        type: "signup",
      });
      if (error) throw error;
      setUser(data.user);
      setAuthNotice("Email verify हो गया! आपका account तैयार है।");
    } catch (error) {
      setAuthNotice(error.message || "OTP verify नहीं हुआ।");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthNotice("");
    setAuthBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });
      if (error) throw error;
      setUser(data.user);
      setAuthNotice("Login successful!");
    } catch (error) {
      setAuthNotice(error.message || "Login नहीं हो पाया।");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.message);
      return;
    }
    setUser(null);
  };

  const styles = `
    * { box-sizing: border-box; }
    body { margin: 0; background: #100b20; color: #fff; font-family: Arial, sans-serif; }
    button, input, select, textarea { font: inherit; }
    button { cursor: pointer; }
    button:disabled { opacity: .6; cursor: wait; }
    .app { min-height: 100vh; background: radial-gradient(circle at top right, #392052 0, #100b20 42%); }
    .nav { display:flex; align-items:center; justify-content:space-between; padding:20px 7%; border-bottom:1px solid #ffffff18; gap:15px; }
    .logo { font-size:25px; font-weight:800; color:#f3c76b; letter-spacing:.5px; white-space:nowrap; }
    .nav-right { display:flex; align-items:center; gap:16px; flex-wrap:wrap; justify-content:flex-end; }
    .nav-link { color:#eee; text-decoration:none; font-size:14px; }
    .nav-btn { border:1px solid #e9c16b; color:#f1cb78; background:transparent; border-radius:20px; padding:9px 15px; }
    .user-label { color:#d8cfe2; font-size:13px; }
    .hero { padding:75px 8% 65px; text-align:center; }
    .eyebrow { color:#e9c16b; text-transform:uppercase; letter-spacing:3px; font-size:12px; font-weight:bold; }
    .hero h1 { font-size:clamp(36px,6vw,65px); margin:17px 0; line-height:1.1; }
    .hero h1 span { color:#efc66d; }
    .hero p { color:#c9c1d7; max-width:620px; margin:0 auto; line-height:1.8; }
    .primary { border:0; border-radius:30px; padding:14px 25px; background:linear-gradient(120deg,#e9bd61,#f5d88f); color:#21142d; font-weight:bold; margin-top:27px; }
    .section { padding:45px 7%; }
    .section-title { text-align:center; margin-bottom:30px; }
    .section-title h2 { font-size:30px; margin:0 0 10px; }
    .section-title p { color:#bdb3ce; margin:0; }
    .service-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:15px; }
    .service { background:#211832; border:1px solid #ffffff16; border-radius:16px; padding:22px; }
    .service h3 { margin:0 0 12px; font-size:17px; }
    .service-price { color:#efc66d; font-size:24px; font-weight:bold; }
    .service small { color:#bdb3ce; display:block; margin-top:8px; }
    .controls { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; margin:25px 0; }
    .controls input, .controls select { background:#211832; border:1px solid #ffffff2a; color:white; padding:12px 15px; border-radius:10px; }
    .expert-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:18px; }
    .expert { background:linear-gradient(145deg,#281d3d,#1b142a); border:1px solid #ffffff19; border-radius:17px; padding:22px; }
    .avatar { width:58px; height:58px; display:grid; place-items:center; border-radius:50%; background:#49315c; color:#f1cb78; font-size:24px; font-weight:bold; }
    .expert h3 { font-size:17px; margin:15px 0 8px; min-height:38px; }
    .tag { display:inline-block; background:#49351e; color:#f1cb78; border-radius:20px; padding:5px 10px; font-size:11px; }
    .expert p { color:#c5bbd3; font-size:13px; }
    .expert button { width:100%; padding:11px; border:1px solid #e9c16b; border-radius:9px; background:transparent; color:#f1cb78; margin-top:8px; }
    .expert button:hover { background:#e9c16b; color:#20142b; }
    .booking-panel, .auth-panel { position:fixed; inset:0; background:#000b; display:grid; place-items:center; padding:15px; z-index:10; }
    .auth-panel { z-index:20; background:#000c; }
    .booking-box, .auth-box { width:min(480px,100%); max-height:92vh; overflow:auto; background:#211832; border:1px solid #ffffff25; border-radius:18px; padding:25px; }
    .booking-box h2, .auth-box h2 { margin-top:0; color:#f1cb78; }
    .booking-box input, .booking-box select, .booking-box textarea, .auth-box input { display:block; width:100%; margin:12px 0; background:#120d20; border:1px solid #ffffff2b; color:white; border-radius:9px; padding:12px; }
    .booking-box label, .auth-box label { color:#d8cfe2; font-size:13px; }
    .booking-actions { display:flex; gap:10px; }
    .booking-actions button { flex:1; padding:12px; border-radius:9px; border:0; font-weight:bold; }
    .confirm, .auth-submit { background:#e9c16b; color:#21142d; }
    .cancel { background:#40334f; color:white; }
    .notice { color:#f1cb78; line-height:1.6; font-size:13px; overflow-wrap:anywhere; }
    .auth-box { width:min(440px,100%); }
    .auth-box .muted { color:#c5bbd3; font-size:13px; line-height:1.6; }
    .auth-submit { width:100%; border:0; border-radius:9px; padding:13px; font-weight:bold; margin-top:8px; }
    .auth-switch { color:#f1cb78; background:none; border:0; padding:12px 0 0; text-decoration:underline; }
    .footer { text-align:center; padding:35px 15px; border-top:1px solid #ffffff18; color:#a99dbb; font-size:13px; }
    @media(max-width:600px) {
      .nav { padding:17px 5%; align-items:flex-start; flex-direction:column; }
      .nav-right { justify-content:flex-start; gap:12px; }
      .nav-link { font-size:12px; }
      .hero { padding:60px 6%; }
      .section { padding:35px 5%; }
    }
  `;

  return (
    <div className="app">
      <style>{styles}</style>

      <nav className="nav">
        <div className="logo">✦ AstroFriend</div>
        <div className="nav-right">
          <a className="nav-link" href="#services">Services</a>
          <a className="nav-link" href="#experts">Experts</a>
          {user ? (
            <>
              <span className="user-label">{user.user_metadata?.full_name || user.email}</span>
              <button className="nav-btn" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <button className="nav-btn" onClick={() => openAuth("login")}>Login</button>
              <button className="nav-btn" onClick={() => openAuth("signup")}>Sign Up</button>
            </>
          )}
        </div>
      </nav>

      <header className="hero">
        <div className="eyebrow">Welcome to AstroFriend</div>
        <h1>Discover Your <span>Cosmic Path</span></h1>
        <p>
          Connect with astrology experts for Kundli, horoscope,
          compatibility and personal consultations.
        </p>
        <button className="primary" onClick={() =>
          document.getElementById("experts")?.scrollIntoView({ behavior: "smooth" })
        }>
          Explore Experts
        </button>
      </header>

      <section className="section" id="services">
        <div className="section-title">
          <h2>Our Services</h2>
          <p>Choose the service you need</p>
        </div>
        <div className="service-grid">
          {services.map((service) => (
            <div className="service" key={service.name}>
              <h3>{service.name}</h3>
              {service.senior === 0 ? (
                <div className="service-price">FREE</div>
              ) : (
                <>
                  <div className="service-price">₹{service.other} – ₹{service.senior}</div>
                  <small>Price depends on the selected expert</small>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="experts">
        <div className="section-title">
          <h2>Meet Our Experts</h2>
          <p>Choose an expert and view their consultation charges</p>
        </div>
        <div className="controls">
          <input type="text" placeholder="Search expert name..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="All">All Experts</option>
            <option value="Senior">Senior Experts</option>
            <option value="Other">Other Experts</option>
          </select>
        </div>
        <div className="expert-grid">
          {filteredExperts.map((expert) => (
            <div className="expert" key={expert.name}>
              <div className="avatar">{expert.name.charAt(0)}</div>
              <h3>{expert.name}</h3>
              <span className="tag">{expert.level === "Senior" ? "Senior Expert" : "Expert"}</span>
              <p>{expert.level === "Senior" ? "Senior category consultation rates" : "Affordable consultation rates"}</p>
              <button onClick={() => openBooking(expert)}>View Charges & Book</button>
            </div>
          ))}
        </div>
        {filteredExperts.length === 0 && <p style={{ textAlign: "center", color: "#c5bbd3" }}>No experts found.</p>}
      </section>

      {booking && selectedExpert && (
        <div className="booking-panel" onClick={() => setBooking(false)}>
          <div className="booking-box" onClick={(e) => e.stopPropagation()}>
            <h2>Book Consultation</h2>
            <p>{selectedExpert.name}</p>
            <span className="tag">{selectedExpert.level === "Senior" ? "Senior Expert" : "Expert"}</span>
            <form onSubmit={submitBooking}>
              <label>Select Service</label>
              <select
                value={selectedService.name}
                onChange={(e) => {
                  const service = services.find((item) => item.name === e.target.value);
                  setSelectedService(service);
                  setNotice("");
                }}
              >
                {services.map((service) => <option key={service.name} value={service.name}>{service.name}</option>)}
              </select>
              <p style={{ color: "#efc66d", fontSize: 23, fontWeight: "bold" }}>{price === 0 ? "FREE" : `₹${price}`}</p>
              <label>Your Name</label>
              <input required placeholder="Enter your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <label>Mobile Number (Optional)</label>
              <input type="tel" placeholder="Enter mobile number (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <label>Message (Optional)</label>
              <textarea rows="3" placeholder="Tell us what you need help with" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              {notice && <p className="notice">{notice}</p>}
              <div className="booking-actions">
                <button className="confirm" type="submit">Submit Request</button>
                <button className="cancel" type="button" onClick={() => setBooking(false)}>Close</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {authOpen && (
        <div className="auth-panel" onClick={closeAuth}>
          <div className="auth-box" onClick={(e) => e.stopPropagation()}>
            <h2>{authMode === "signup" ? "Create Account" : authMode === "verify" ? "Verify Email" : "Welcome Back"}</h2>
            <p className="muted">
              {authMode === "signup"
                ? "अपना नाम, email और password डालकर account बनाएं।"
                : authMode === "verify"
                ? `हमने ${authEmail} के लिए verification email भेजी है। Email template OTP पर configured होना चाहिए।`
                : "अपने email और password से login करें।"}
            </p>

            {authMode === "signup" && (
              <form onSubmit={handleSignup}>
                <label>Full Name</label>
                <input required value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Your full name" />
                <label>Email Address</label>
                <input required type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@example.com" />
                <label>Password</label>
                <input required type="password" minLength="6" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="At least 6 characters" />
                <label>Confirm Password</label>
                <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Enter password again" />
                <button className="auth-submit" disabled={authBusy}>{authBusy ? "Please wait..." : "Create Account"}</button>
              </form>
            )}

            {authMode === "verify" && (
              <form onSubmit={handleVerifyOtp}>
                <label>6-Digit Email OTP</label>
                <input
                  required inputMode="numeric" autoComplete="one-time-code" maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit code"
                />
                <button className="auth-submit" disabled={authBusy}>{authBusy ? "Verifying..." : "Verify Email"}</button>
              </form>
            )}

            {authMode === "login" && (
              <form onSubmit={handleLogin}>
                <label>Email Address</label>
                <input required type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@example.com" />
                <label>Password</label>
                <input required type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Your password" />
                <button className="auth-submit" disabled={authBusy}>{authBusy ? "Logging in..." : "Login"}</button>
              </form>
            )}

            {authNotice && <p className="notice">{authNotice}</p>}
            {authMode === "login" && <button className="auth-switch" onClick={() => { setAuthMode("signup"); setAuthNotice(""); }}>Create a new account</button>}
            {authMode === "signup" && <button className="auth-switch" onClick={() => { setAuthMode("login"); setAuthNotice(""); }}>Already have an account? Login</button>}
            {authMode === "verify" && <button className="auth-switch" onClick={() => { setAuthMode("signup"); setAuthNotice(""); }}>Back to signup</button>}
            <div><button className="auth-switch" onClick={closeAuth}>Close</button></div>
          </div>
        </div>
      )}

      <footer className="footer">
        ©️ {new Date().getFullYear()} AstroFriend. All rights reserved.
        <br />
        Consultation requests are subject to confirmation by the service team.
      </footer>
    </div>
  );
}
