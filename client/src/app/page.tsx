'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';
import { LogOut, LayoutDashboard, User, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DASHBOARD_ROLES } from '@/lib/role-config';

const BRAND = '#2A276C';

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Portfolio', href: '#portfolio' },
  { label: 'Why Us', href: '#why-us' },
  { label: 'Contact', href: '#contact' },
];

const SERVICES = [
  { icon: '👩‍💼', title: 'Domestic Workers', desc: 'Trained housemaids, nannies, and caregivers deployed to families across the Gulf region.' },
  { icon: '📋', title: 'Document Processing', desc: 'Complete visa, COC, medical, and contract documentation handled end-to-end.' },
  { icon: '✈️', title: 'Gulf Deployment', desc: 'Reliable deployment to Saudi Arabia, UAE, Kuwait, Bahrain, Jordan, Oman, Qatar, Lebanon and beyond.' },
  { icon: '🎓', title: 'Pre-Departure Training', desc: 'Language, cultural orientation, and professional skill training programs.' },
  { icon: '🤝', title: 'Partner Coordination', desc: 'Seamless collaboration with recruitment partners and agencies abroad.' },
  { icon: '🛡️', title: 'Post-Deployment Support', desc: 'Ongoing support and follow-up for workers and employers after placement.' },
];

const STATS = [
  { value: '2000+', label: 'Candidates Deployed' },
  { value: '50+', label: 'Partner Agencies' },
  { value: '5+', label: 'Gulf Countries' },
  { value: '10+', label: 'Years Experience' },
];

const WHY_US = [
  { num: '01', title: 'Verified & Trained Candidates', desc: 'Every candidate undergoes thorough background checks and professional training before deployment.' },
  { num: '02', title: 'Ethical & Compliant Recruitment', desc: 'We strictly follow all Ethiopian and international labor recruitment regulations.' },
  { num: '03', title: 'Fast Processing & Clear Updates', desc: 'Streamlined documentation process with real-time status updates for all partners.' },
  { num: '04', title: 'After Deployment Support', desc: 'Continued assistance and follow-up for both workers and employers post-placement.' },
];

const FAQ = [
  { q: 'How do you provide candidates to partners?', a: 'We source and shortlist screened candidates based on your requirements including skills, experience and availability.' },
  { q: 'What do you include in a candidate profile?', a: 'We prepare clean, organized profiles with passport data, photos, skills, work experience and all key details for fast review.' },
  { q: 'Do you verify documents before sharing profiles?', a: 'Yes we review essential documents and confirm key information before sending candidates to partners.' },
  { q: 'Which countries do you deploy to?', a: 'We primarily deploy to Saudi Arabia, UAE, Kuwait, Bahrain, and other Gulf countries.' },
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: session, isPending } = useSession();
  const router = useRouter();

  const role = (session?.user as any)?.role ?? 'user';
  const canAccessDashboard = DASHBOARD_ROLES.includes(role);

  useEffect(() => {
    if (!isPending && session) {
      if (role === 'agency') {
        router.push('/agency/contracts');
      } else if (role === 'video_uploader') {
        router.push('/video-uploads');
      } else if (canAccessDashboard) {
        router.push('/dashboard');
      }
    }
  }, [session, isPending, canAccessDashboard, role, router]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn);

    const clickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);

    return () => {
      window.removeEventListener('scroll', fn);
      document.removeEventListener('mousedown', clickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <div className="font-[Inter,sans-serif] bg-white text-gray-900 overflow-x-hidden">

      {/* ═══ NAVBAR ═══ */}
      <nav className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl transition-all duration-500 border",
        mobileMenu
          ? "rounded-[2.5rem] bg-[#2A276C] border-white/10 shadow-2xl py-5"
          : scrolled
            ? "bg-white/90 shadow-xl shadow-black/5 backdrop-blur-xl border-gray-100 rounded-full py-2"
            : "bg-white/60 backdrop-blur-md border-gray-200/50 rounded-full py-2",
        "px-3"
      )}>
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#home" className="flex items-center gap-2.5 pl-3" onClick={() => setMobileMenu(false)}>
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center font-black text-base transition-colors",
              mobileMenu ? "bg-white text-[#2A276C]" : "text-white"
            )} style={!mobileMenu ? { background: BRAND } : {}}>
              C
            </div>
            <div className="leading-none">
              <span className={cn(
                "font-black text-[17px] tracking-tight transition-colors",
                mobileMenu ? "text-white" : "text-[#2A276C]"
              )}>COOLSTAFF</span>
              <p className={cn(
                "text-[8px] font-bold uppercase tracking-[0.18em] mt-0.5 transition-colors",
                mobileMenu ? "text-white/40" : "text-gray-400"
              )}>Foreign Employment</p>
            </div>
          </a>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className="text-[13px] font-semibold text-gray-500 hover:text-[#2A276C] transition-colors">{l.label}</a>
            ))}
          </div>

          {/* Right */}
          <div className="hidden lg:flex items-center gap-2">
            {isPending ? (
              <div className="px-4 py-2"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : session ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                    {session.user.name?.charAt(0) || 'U'}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl shadow-black/10 border border-gray-100 py-2 z-50 animate-in fade-in zoom-in duration-200">
                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                      <p className="text-[13px] font-bold text-gray-900 truncate">{session.user.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{session.user.email}</p>
                    </div>
                    {canAccessDashboard && (
                      <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors">
                        <LayoutDashboard size={14} /> Dashboard
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="px-4 py-2 text-[13px] font-semibold text-gray-600 hover:text-[#2A276C] transition-colors">
                Sign In
              </Link>
            )}
            <Link href="#contact" className="px-5 py-2.5 text-[13px] font-bold text-white rounded-full shadow-lg hover:-translate-y-0.5 transition-all" style={{ background: BRAND, boxShadow: '0 8px 24px rgba(42,39,108,0.25)' }}>
              Contact Us
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-2.5 mr-1 outline-none">
            <div className="space-y-1.5">
              <div className={cn("w-5 h-0.5 transition-all duration-300", mobileMenu ? "bg-white rotate-45 translate-y-2" : "bg-gray-800")} />
              <div className={cn("w-5 h-0.5 transition-all duration-300", mobileMenu ? "opacity-0" : "bg-gray-800")} />
              <div className={cn("w-5 h-0.5 transition-all duration-300", mobileMenu ? "bg-white -rotate-45 -translate-y-2" : "bg-gray-800")} />
            </div>
          </button>
        </div>

        {/* Mobile Menu Content */}
        <div className={cn(
          "lg:hidden overflow-hidden transition-all duration-500 ease-in-out",
          mobileMenu ? "max-h-[500px] opacity-100 mt-6 pb-4" : "max-h-0 opacity-0"
        )}>
          <div className="px-3 space-y-1 border-t border-white/10 pt-6">
            {NAV_LINKS.map(l => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileMenu(false)}
                className="block text-lg font-bold text-white/70 py-3 px-4 rounded-2xl hover:bg-white/10 hover:text-white transition-all"
              >
                {l.label}
              </a>
            ))}

            <div className="h-px bg-white/10 my-4 mx-4" />

            {session ? (
              <div className="px-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                    {session.user.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{session.user.name}</p>
                    <p className="text-xs text-white/40">{session.user.email}</p>
                  </div>
                </div>
                {canAccessDashboard && (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenu(false)}
                    className="block w-full text-center py-3.5 bg-white/10 text-white rounded-2xl text-sm font-bold border border-white/10"
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-center py-3.5 text-red-400 text-sm font-bold rounded-2xl bg-red-400/10"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="px-4 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenu(false)}
                  className="block text-center py-4 bg-white text-[#2A276C] rounded-[1.5rem] text-sm font-black shadow-xl"
                >
                  Sign In to Portal
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section id="home" className="relative min-h-screen pt-32 pb-20 bg-gradient-to-b from-[#f8f7ff] via-white to-white overflow-hidden">
        {/* Subtle decorative blobs */}
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-[#2A276C]/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-100/40 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-8 lg:gap-4">
          {/* Left */}
          <div className="flex-1 max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2A276C]/[0.06] border border-[#2A276C]/10 rounded-full mb-8">
              <span className="w-2 h-2 rounded-full bg-[#2A276C] animate-pulse" />
              <span className="text-[#2A276C] text-[11px] font-bold uppercase tracking-wider">Licensed Ethiopian Agency</span>
            </div>

            <h1 className="text-[2.8rem] md:text-[3.5rem] lg:text-[3.8rem] font-black leading-[1.08] tracking-tight mb-6">
              <span className="text-gray-900">Connecting </span>
              <span style={{ color: BRAND }}>Ethiopian Talent</span>
              <span className="text-gray-900"> with Gulf Careers</span>
            </h1>

            <p className="text-[15px] text-gray-400 leading-relaxed max-w-md mb-10">
              We recruit and deploy verified candidates from Ethiopia to Gulf countries through a reliable, ethical and professional process.
            </p>

            <div className="flex flex-wrap gap-3">
              <a href="#contact" className="group px-7 py-4 text-white rounded-full text-sm font-bold flex items-center gap-2 hover:-translate-y-0.5 transition-all" style={{ background: BRAND, boxShadow: '0 12px 32px rgba(42,39,108,0.3)' }}>
                Get Started
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </a>
              <a href="#about" className="px-7 py-4 bg-gray-100 text-gray-700 rounded-full text-sm font-bold hover:bg-gray-200 transition-all">
                Learn More
              </a>
            </div>

            {/* Mini stats */}
            <div className="flex items-center gap-6 mt-14 pt-8 border-t border-gray-100">
              <div>
                <p className="text-2xl font-black" style={{ color: BRAND }}>2000+</p>
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Deployed</p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div>
                <p className="text-2xl font-black" style={{ color: BRAND }}>50+</p>
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Partners</p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-amber-400 text-sm">★</span>)}
                </div>
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">5.0 Rating</p>
              </div>
            </div>
          </div>

          {/* Right — Hero Image */}
          <div className="flex-1 flex justify-center lg:justify-end relative">
            <div className="relative w-full max-w-[580px]">
              {/* Glow behind image */}

              <img
                src="/HERO.png"
                alt="COOLSTAFF Hero"
                className="relative w-full h-auto rounded-3xl"
              />
              {/* Floating badge */}
              <div className="absolute -left-4 bottom-24 bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 px-4 py-3 flex items-center gap-3 animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg" style={{ background: BRAND }}>✈️</div>
                <div>
                  <p className="text-xs font-black text-gray-900">Gulf Deployment</p>
                  <p className="text-[10px] text-gray-400 font-semibold">SA · UAE · Kuwait · Bahrain</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 mt-20">
          <p className="text-center text-xs font-bold text-gray-300 uppercase tracking-[0.2em] mb-6">Trusted by <span className="text-gray-500">100+</span> partners for best candidates</p>
          <div className="flex items-center justify-center gap-10 md:gap-16 opacity-30 grayscale">
            {['Saudi Arabia', 'UAE', 'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Qatar', 'Lebanon'].map(c => (
              <span key={c} className="text-base md:text-lg font-black text-gray-900 tracking-tight whitespace-nowrap">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ABOUT ═══ */}
      <section id="about" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute -inset-3 bg-[#2A276C]/5 rounded-3xl" />
            <img src="/about-section.png" alt="COOLSTAFF Office" className="relative rounded-2xl shadow-lg w-full" />
            {/* Floating card */}
            <div className="absolute -right-4 -bottom-4 bg-white rounded-2xl shadow-xl border border-gray-100 px-5 py-4">
              <p className="text-3xl font-black" style={{ color: BRAND }}>10+</p>
              <p className="text-xs text-gray-400 font-bold">Years of Excellence</p>
            </div>
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: BRAND }}>About COOLSTAFF</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3 mb-6 leading-tight">Your Trusted Bridge to Gulf Employment</h2>
            <p className="text-gray-500 leading-relaxed mb-5 text-[15px]">
              COOLSTAFF Foreign Employment Agency is one of Ethiopia&apos;s leading recruitment agencies, dedicated to providing reliable and professional services. Since our founding, we have helped thousands of candidates secure employment across the Middle East.
            </p>
            <p className="text-gray-500 leading-relaxed mb-8 text-[15px]">
              We specialize in deploying domestic workers, caregivers, and skilled professionals to Saudi Arabia, UAE, Kuwait, Bahrain, and beyond. Our ethical approach ensures dignity for every candidate.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[['🇪🇹', 'Based in Addis Ababa'], ['📄', 'Fully Licensed'], ['⚡', 'Fast Processing'], ['❤️', 'Ethical Standards']].map(([icon, text]) => (
                <div key={text} className="flex items-center gap-3 bg-[#f8f7ff] rounded-xl px-4 py-3 border border-[#2A276C]/5">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm font-semibold text-gray-700">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SERVICES ═══ */}
      <section id="services" className="py-28 bg-[#fafaff]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: BRAND }}>What We Do</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3">Our Services</h2>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto text-[15px]">End-to-end recruitment solutions from candidate sourcing to post-deployment support.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map(s => (
              <div key={s.title} className="group p-7 bg-white rounded-2xl border border-gray-100 hover:border-[#2A276C]/20 hover:shadow-xl hover:shadow-[#2A276C]/5 hover:-translate-y-1 transition-all duration-300 cursor-default">
                <div className="w-14 h-14 rounded-2xl bg-[#2A276C]/[0.06] group-hover:bg-[#2A276C] flex items-center justify-center text-2xl group-hover:scale-110 transition-all duration-300">
                  <span className="group-hover:grayscale-0 group-hover:brightness-200">{s.icon}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mt-5 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PORTFOLIO ═══ */}
      <section id="portfolio" className="py-28 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: BRAND }}>Our Portfolio</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mt-3">SUCCESSFUL DEPLOYMENTS</h2>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto text-[15px]">Deploying qualified candidates to families and partners across the Gulf. We are trusted by thousands.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1 */}
            <div className="flex flex-col gap-6">
              {/* Card 1 */}
              <div className="relative h-[220px] rounded-2xl overflow-hidden group shadow-sm border border-gray-100">
                <img
                  src="/img-01.jpeg"
                  alt="Domestic Placements"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-5 left-6 text-white z-10">
                  <h3 className="text-lg font-bold tracking-tight">Domestic Placements</h3>
                  <p className="text-white/70 text-xs mt-1.5 font-medium">Over 1000+ candidates successfully deployed</p>
                </div>
              </div>

              {/* Row with Card 4 & 5 */}
              <div className="grid grid-cols-2 gap-6">
                {/* Card 4 */}
                <div className="relative h-[220px] rounded-2xl overflow-hidden group shadow-sm border border-gray-100">
                  <img
                    src="/img-04.jpeg"
                    alt="Certified Housekeepers"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute bottom-5 left-5 text-white z-10 pr-2">
                    <h3 className="text-base font-bold leading-snug tracking-tight">Certified Housekeepers</h3>
                    <p className="text-white/70 text-xs mt-1.5 font-medium">Experienced in modern home management</p>
                  </div>
                </div>

                {/* Card 5 */}
                <div className="relative h-[220px] rounded-2xl overflow-hidden group shadow-sm border border-gray-100">
                  <img
                    src="/img-05.jpeg"
                    alt="Home Care Assistants"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute bottom-5 left-5 text-white z-10 pr-2">
                    <h3 className="text-base font-bold leading-snug tracking-tight">Home Care Assistants</h3>
                    <p className="text-white/70 text-xs mt-1.5 font-medium">Dedicated child and elderly care</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div>
              {/* Card 2 */}
              <div className="relative h-[380px] lg:h-[464px] rounded-2xl overflow-hidden group shadow-sm border border-gray-100">
                <img
                  src="/img-06.jpeg"
                  alt="Trusted Nannies & Caregivers"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white z-10">
                  <h3 className="text-xl font-bold tracking-tight">Trusted Nannies & Caregivers</h3>
                  <p className="text-white/70 text-xs mt-1.5 font-medium">Screened and trained for family support</p>
                </div>
              </div>
            </div>

            {/* Column 3 */}
            <div className="flex flex-col gap-6">
              {/* Card 3 */}
              <div className="relative h-[220px] rounded-2xl overflow-hidden group shadow-sm border border-gray-100">
                <img
                  src="/img-03.jpeg"
                  alt="Pre-Deployment Training"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-5 left-6 text-white z-10">
                  <h3 className="text-lg font-bold tracking-tight">Pre-Deployment Training</h3>
                  <p className="text-white/70 text-xs mt-1.5 font-medium">Professional skills and language training before deployment</p>
                </div>
              </div>

              {/* Card 6 */}
              <div className="relative h-[220px] rounded-2xl overflow-hidden group shadow-sm border border-gray-100">
                <img
                  src="/img-02.jpeg"
                  alt="Verified Candidates"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-5 left-6 text-white z-10 pr-4">
                  <h3 className="text-lg font-bold tracking-tight">Verified Candidates</h3>
                  <p className="text-white/70 text-xs mt-1.5 font-medium">Selected through our ethical process</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHY US ═══ */}
      <section id="why-us" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: BRAND }}>Our Advantages</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3">Why Partners Choose COOLSTAFF</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHY_US.map(w => (
              <div key={w.num} className="p-7 rounded-2xl border border-gray-100 hover:border-[#2A276C]/20 bg-gradient-to-b from-[#fafaff] to-white hover:shadow-lg hover:shadow-[#2A276C]/5 transition-all group">
                <span className="text-5xl font-black" style={{ color: 'rgba(42,39,108,0.08)' }}>{w.num}</span>
                <h3 className="text-base font-bold text-gray-900 mt-4 mb-2 group-hover:text-[#2A276C] transition-colors">{w.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="py-28 bg-[#fafaff]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: BRAND }}>FAQ</span>
            <h2 className="text-3xl font-black text-gray-900 mt-3">Common Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-6 py-5 text-left">
                  <span className="font-bold text-gray-800 pr-4 text-[15px]">{f.q}</span>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 transition-all" style={{ background: openFaq === i ? BRAND : '#e5e7eb', color: openFaq === i ? '#fff' : '#9ca3af' }}>
                    {openFaq === i ? '−' : '+'}
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-6 pb-5 text-gray-500 text-sm leading-relaxed">{f.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CONTACT / CTA ═══ */}
      <section id="contact" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-3xl p-10 md:p-16 grid lg:grid-cols-2 gap-12" style={{ background: BRAND }}>
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/70 text-[11px] font-bold uppercase tracking-wider mb-6">Get In Touch</span>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">Ready to Partner<br />with COOLSTAFF?</h2>
              <p className="text-white/60 leading-relaxed mb-8 text-[15px]">Reach us by WhatsApp, phone or email. Our team is ready for partner inquiries.</p>
              <div className="space-y-3">
                {[
                  ['📍', 'Address', 'Girar, Ayer Tena, Addis Ababa, Ethiopia'],
                  ['📱', 'WhatsApp', '+251 960 178 117'],
                  ['📧', 'Email', 'info@coolstaffagency.com'],
                ].map(([icon, label, value]) => (
                  <div key={label} className="flex items-center gap-4 bg-white/[0.06] rounded-xl px-5 py-4 border border-white/10">
                    <span className="text-lg">{icon}</span>
                    <div>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{label}</p>
                      <p className="text-white font-semibold text-sm">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <a href="https://wa.me/251960178117" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-8 px-6 py-3.5 bg-white text-sm font-bold rounded-full hover:-translate-y-0.5 transition-all" style={{ color: BRAND, boxShadow: '0 12px 24px rgba(0,0,0,0.15)' }}>
                💬 WhatsApp Us
              </a>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden min-h-[350px]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d781.9992372336703!2d38.68614821111966!3d8.979909157719264!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b875becec277f%3A0xdd87a17f4f618474!2sGirar%20condominium%20juncture%20point!5e1!3m2!1sen!2set!4v1778801916061!5m2!1sen!2set"
                className="w-full h-full min-h-[350px] border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-[#0f0e1a] text-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-base" style={{ background: BRAND }}>C</div>
                <div><span className="font-black text-[17px]">COOLSTAFF</span><p className="text-[8px] text-purple-300 font-bold uppercase tracking-[0.18em] mt-0.5">Foreign Employment Agency</p></div>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm">COOLSTAFF connects Ethiopian talent with Gulf opportunities through ethical, reliable and professional recruitment services.</p>
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-5">Quick Links</h4>
              <ul className="space-y-3">{NAV_LINKS.map(l => (<li key={l.href}><a href={l.href} className="text-sm text-gray-500 hover:text-white transition-colors">{l.label}</a></li>))}</ul>
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-5">Connect</h4>
              <ul className="space-y-3">
                <li><a href="tel:+251960178117" className="text-sm text-gray-500 hover:text-white transition-colors">📞 +251 960178117</a></li>
                <li><a href="tel:+251960786160" className="text-sm text-gray-500 hover:text-white transition-colors">📞 +251 960786160</a></li>
                <li><a href="mailto:info@coolstaffagency.com" className="text-sm text-gray-500 hover:text-white transition-colors">📧 info@coolstaffagency.com</a></li>
                <li><span className="text-sm text-gray-500">📍 Girar, Ayer Tena, Addis Ababa, Ethiopia</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600">© {new Date().getFullYear()} COOLSTAFF Foreign Employment Agency. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
