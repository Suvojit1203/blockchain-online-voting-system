import { useMemo, useState } from "react";
import {
  Building2,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  UserCircle2,
  UserPlus
} from "lucide-react";
import {
  findAdminForLogin,
  findVoterForLogin,
  getAdmins,
  normalizeAdminId,
  normalizeVoterCard,
  registerAdminRecord,
  registerVoterRecord
} from "../utils/localRegistry";
import EGovLogo from "./EGovLogo";

function createCaptcha() {
  const left = Math.floor(Math.random() * 8) + 2;
  const right = Math.floor(Math.random() * 8) + 2;

  return {
    question: `${left} + ${right}`,
    answer: String(left + right)
  };
}

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read uploaded photo."));
    reader.readAsDataURL(file);
  });
}

const blankForm = {
  name: "",
  voterCard: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  photo: "",
  username: "",
  password: "",
  recovery: "",
  captchaAnswer: ""
};

const quickLinkGroups = [
  [
    { label: "About ECI", href: "https://www.eci.gov.in/" },
    { label: "Directory", href: "https://www.eci.gov.in/" },
    { label: "Contact Us", href: "https://www.eci.gov.in/" },
    { label: "Public Grievance", href: "https://www.eci.gov.in/" },
    { label: "RTI Online", href: "https://rtionline.gov.in/" },
    { label: "eOffice", href: "https://eoffice.gov.in/" },
    { label: "Help", href: "https://www.eci.gov.in/" }
  ],
  [
    { label: "Apply for Voter Card", href: "https://voters.eci.gov.in/" },
    { label: "SVEEP", href: "https://ecisveep.nic.in/" },
    { label: "Service Voter Portal", href: "https://voters.eci.gov.in/" },
    { label: "Download cVIGIL", href: "https://cvigil.eci.gov.in/" },
    { label: "Candidate Affidavits", href: "https://affidavit.eci.gov.in/" },
    { label: "APAR", href: "https://www.eci.gov.in/" },
    { label: "Web Information Manager", href: "https://www.eci.gov.in/" }
  ],
  [
    { label: "International Cooperation", href: "https://www.eci.gov.in/" },
    { label: "India A-WEB Centre", href: "https://indiaawebcentre.org/" },
    { label: "VoiceNet", href: "https://www.eci.gov.in/" },
    { label: "MCC Cases", href: "https://www.eci.gov.in/" },
    { label: "Political Parties Registration", href: "https://www.eci.gov.in/" },
    { label: "Terms and Conditions", href: "https://www.eci.gov.in/" },
    { label: "Site Map", href: "https://www.eci.gov.in/" },
    { label: "Feedback / Complaints", href: "https://www.eci.gov.in/" }
  ]
];

const socialLinks = [
  { label: "Facebook", short: "f", href: "https://www.facebook.com/ECI/" },
  { label: "Instagram", short: "ig", href: "https://www.instagram.com/ecisveep/" },
  { label: "X", short: "x", href: "https://x.com/ECISVEEP" },
  { label: "YouTube", short: "yt", href: "https://www.youtube.com/@ECIVoterEducation" }
];

export default function LoginGateway({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(blankForm);
  const [captcha, setCaptcha] = useState(createCaptcha);
  const [notice, setNotice] = useState("");
  const [photoName, setPhotoName] = useState("");

  const roleMeta = useMemo(
    () => ({
      user: {
        title: "Voter Login",
        eyebrow: "Public Access",
        description: "Register with voter card, date of birth, and current photograph before voting.",
        button: "Access Voter Portal",
        icon: UserCircle2,
        accent: "text-orange-700",
        border: "border-orange-300"
      },
      admin: {
        title: "Election Officer Login",
        eyebrow: "Restricted Access",
        description: "For authorised administrators managing voter records and election operations.",
        button: "Access Admin Portal",
        icon: Building2,
        accent: "text-sky-900",
        border: "border-sky-300"
      }
    }),
    []
  );

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm(nextMode = "login") {
    setMode(nextMode);
    setNotice("");
    setCaptcha(createCaptcha());
    setPhotoName("");
    setForm(blankForm);
  }

  function openRole(role) {
    setSelectedRole(role);
    resetForm("login");
  }

  function refreshCaptcha() {
    setCaptcha(createCaptcha());
    updateForm("captchaAnswer", "");
  }

  function validateCaptcha() {
    if (form.captchaAnswer.trim() !== captcha.answer) {
      setNotice("Incorrect CAPTCHA answer. Please try again.");
      refreshCaptcha();
      return false;
    }

    return true;
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const photo = await readPhoto(file);
      updateForm("photo", photo);
      setPhotoName(file.name);
    } catch (error) {
      setNotice(error.message);
    }
  }

  function handleForgot() {
    if (selectedRole === "admin") {
      const admins = getAdmins();
      const admin = admins.find(
        (item) =>
          item.username === normalizeAdminId(form.username) ||
          item.email.toLowerCase() === form.recovery.toLowerCase()
      );

      setNotice(
        admin
          ? `Recovery sent to ${admin.email}. Demo password: ${admin.password}`
          : "No administrator record found for this username or email."
      );
      return;
    }

    setNotice("Voter login does not use a password. Enter your registered name and voter card number.");
  }

  function handleRegister() {
    if (!validateCaptcha()) return;

    try {
      if (selectedRole === "user") {
        const voter = registerVoterRecord({
          name: form.name,
          voterCard: form.voterCard,
          dateOfBirth: form.dateOfBirth,
          phone: form.phone,
          email: form.email,
          photo: form.photo
        });

        setNotice(`Voter registered successfully for ${voter.name}. You can login now.`);
        setMode("login");
        setCaptcha(createCaptcha());
        setForm({ ...blankForm, name: voter.name, voterCard: voter.voterCard });
        return;
      }

      const admin = registerAdminRecord({
        username: form.username,
        phone: form.phone,
        email: form.email
      });

      setNotice(
        `Administrator ID ${admin.username} registered. Temporary demo password: ${admin.password}`
      );
      setMode("login");
      setCaptcha(createCaptcha());
      setForm({ ...blankForm, username: admin.username });
    } catch (error) {
      setNotice(error.message);
    }
  }

  function handleLogin() {
    if (!validateCaptcha()) return;

    if (selectedRole === "user") {
      const voter = findVoterForLogin(form.name, form.voterCard);

      if (!voter) {
        setNotice("No voter found with this name and voter card number.");
        return;
      }

      onLogin({
        role: "user",
        id: voter.voterCard,
        voterCard: voter.voterCard,
        dateOfBirth: voter.dateOfBirth,
        phone: voter.phone,
        email: voter.email,
        displayName: voter.name,
        photo: voter.photo
      });
      return;
    }

    const admin = findAdminForLogin(form.username, form.password);
    if (!admin) {
      setNotice("Invalid administrator username or password.");
      return;
    }

    onLogin({
      role: "admin",
      id: admin.username,
      username: admin.username,
      displayName: "Administrator"
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (mode === "forgot") {
      handleForgot();
      return;
    }

    if (mode === "register") {
      handleRegister();
      return;
    }

    handleLogin();
  }

  const selected = selectedRole ? roleMeta[selectedRole] : null;
  const isVoter = selectedRole === "user";
  const submitLabel =
    mode === "register" ? "Register" : mode === "forgot" ? "Recover Access" : "Login";

  return (
    <main className="portal-bg min-h-screen">
      <header className="border-b border-orange-200 bg-white/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-5 px-6 py-5">
          <div className="grid h-20 w-20 place-items-center rounded-full border border-slate-200 bg-white">
            <EGovLogo />
          </div>
          <div>
            <p className="text-xl font-bold uppercase tracking-wide text-slate-700">
              Government of India
            </p>
            <p className="text-3xl font-bold uppercase text-orange-700 md:text-4xl">
              E-Election of India
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-2">
        {Object.entries(roleMeta).map(([role, meta]) => {
          const Icon = meta.icon;

          return (
            <article
              className={`portal-card grid min-h-96 gap-7 rounded-lg border ${meta.border} p-8 shadow-2xl`}
              key={role}
            >
              <div className="grid h-20 w-20 place-items-center rounded-lg border border-slate-300 bg-white/60">
                <Icon className={meta.accent} size={38} />
              </div>
              <div>
                <p className={`text-sm font-bold uppercase tracking-wide ${meta.accent}`}>
                  {meta.eyebrow}
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-950">{meta.title}</h1>
              </div>
              <p className="text-xl leading-relaxed text-slate-800">{meta.description}</p>
              <button
                className="focus-ring mt-auto rounded-lg bg-white/90 px-5 py-4 text-lg font-bold text-slate-900 shadow-sm hover:bg-white"
                type="button"
                onClick={() => openRole(role)}
              >
                {meta.button}
              </button>
            </article>
          );
        })}
      </section>

      <footer className="bg-sky-950 text-sky-50">
        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1.1fr_2fr_0.9fr]">
          <article className="rounded-lg bg-sky-900/70 p-5">
            <h2 className="text-2xl font-bold">Election Commission of India</h2>
            <div className="mt-3 h-0.5 w-14 bg-cyan-300" />
            <p className="mt-5 text-sm leading-7 text-cyan-50">
              The Election Commission of India is an autonomous constitutional authority
              responsible for administering election processes in India. This portal is an
              academic E-Election interface inspired by public digital election services.
            </p>
            <p className="mt-5 text-sm font-semibold text-cyan-100">
              Location: Nirvachan Sadan, Ashoka Road, New Delhi 110001
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">Quick Links</h2>
            <div className="mt-3 h-0.5 w-14 bg-cyan-300" />
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {quickLinkGroups.map((group, index) => (
                <ul className="grid gap-2 text-sm" key={index}>
                  {group.map((link) => (
                    <li key={link.label}>
                      <a
                        className="text-cyan-100 hover:text-white"
                        href={link.href}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span className="text-cyan-300">-</span> {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </article>

          <article>
            <h2 className="text-2xl font-bold">E-Election Services</h2>
            <div className="mt-3 h-0.5 w-14 bg-cyan-300" />
            <p className="mt-5 text-sm leading-7 text-cyan-50">
              Access voter services, election officer dashboard, result declaration,
              helpdesk support, and digital election information from this project portal.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {socialLinks.map((link) => (
                <a
                  className="grid h-10 w-10 place-items-center rounded-full bg-sky-800 text-sm font-bold uppercase text-white hover:bg-cyan-700"
                  href={link.href}
                  key={link.label}
                  rel="noreferrer"
                  target="_blank"
                  title={link.label}
                >
                  {link.short}
                </a>
              ))}
            </div>
          </article>
        </section>

        <div className="border-t border-sky-800 bg-sky-950 px-6 py-4 text-center text-sm text-cyan-50">
          Content Curated and Maintained by E-Election of India Project Team | Academic
          Demonstration 2026 | Website Designed and Developed for Digital Election Services
          Project | Last Updated: June 08, 2026
        </div>
      </footer>

      {selected ? (
        <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-slate-950/50 px-4 py-6">
          <section className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className={`text-sm font-bold uppercase ${selected.accent}`}>{selected.eyebrow}</p>
                <h2 className="text-2xl font-bold text-slate-950">
                  {mode === "register" ? "Registration" : mode === "forgot" ? "Access Recovery" : selected.title}
                </h2>
              </div>
              <button
                className="rounded-md border border-line px-3 py-1 text-sm font-semibold"
                type="button"
                onClick={() => setSelectedRole(null)}
              >
                Close
              </button>
            </div>

            <form className="grid gap-3" onSubmit={handleSubmit}>
              {isVoter ? (
                <>
                  {mode !== "forgot" ? (
                    <>
                      <label className="text-sm font-bold" htmlFor="voter-name">
                        Voter Name
                      </label>
                      <input
                        className="focus-ring rounded-md border border-line px-3 py-3"
                        id="voter-name"
                        placeholder="Enter registered voter name"
                        value={form.name}
                        onChange={(event) => updateForm("name", event.target.value)}
                        required
                      />
                      <label className="text-sm font-bold" htmlFor="voter-card">
                        Voter Card Number
                      </label>
                      <input
                        className="focus-ring rounded-md border border-line px-3 py-3 uppercase"
                        id="voter-card"
                        maxLength={10}
                        placeholder="ABC1234567"
                        value={form.voterCard}
                        onChange={(event) =>
                          updateForm("voterCard", normalizeVoterCard(event.target.value))
                        }
                        required
                      />
                      <p className="text-xs text-slate-500">
                        Format: three capital letters followed by seven digits.
                      </p>
                    </>
                  ) : null}

                  {mode === "register" ? (
                    <>
                      <label className="text-sm font-bold" htmlFor="date-of-birth">
                        Date of Birth
                      </label>
                      <input
                        className="focus-ring rounded-md border border-line px-3 py-3"
                        id="date-of-birth"
                        max={new Date().toISOString().slice(0, 10)}
                        type="date"
                        value={form.dateOfBirth}
                        onChange={(event) => updateForm("dateOfBirth", event.target.value)}
                        required
                      />
                      <label className="text-sm font-bold" htmlFor="phone">
                        Phone Number
                      </label>
                      <input
                        className="focus-ring rounded-md border border-line px-3 py-3"
                        id="phone"
                        placeholder="Mobile number"
                        value={form.phone}
                        onChange={(event) => updateForm("phone", event.target.value)}
                      />
                      <label className="text-sm font-bold" htmlFor="email">
                        Email ID
                      </label>
                      <input
                        className="focus-ring rounded-md border border-line px-3 py-3"
                        id="email"
                        placeholder="name@example.com"
                        type="email"
                        value={form.email}
                        onChange={(event) => updateForm("email", event.target.value)}
                      />
                      <label className="text-sm font-bold" htmlFor="photo">
                        Current Photograph
                      </label>
                      <input
                        className="focus-ring rounded-md border border-line px-3 py-3"
                        id="photo"
                        accept="image/*"
                        type="file"
                        onChange={handlePhotoChange}
                        required
                      />
                      {photoName ? <p className="text-xs text-slate-500">Selected: {photoName}</p> : null}
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <label className="text-sm font-bold" htmlFor="admin-id">
                    Administrator Unique ID
                  </label>
                  <input
                    className="focus-ring rounded-md border border-line px-3 py-3 uppercase"
                    id="admin-id"
                    maxLength={7}
                    placeholder="ADM2026"
                    value={form.username}
                    onChange={(event) =>
                      updateForm("username", normalizeAdminId(event.target.value))
                    }
                    required={mode !== "forgot"}
                  />
                  {mode === "login" ? (
                    <>
                      <label className="text-sm font-bold" htmlFor="admin-password">
                        Password
                      </label>
                      <input
                        className="focus-ring rounded-md border border-line px-3 py-3"
                        id="admin-password"
                        placeholder="Enter password"
                        type="password"
                        value={form.password}
                        onChange={(event) => updateForm("password", event.target.value)}
                        required
                      />
                    </>
                  ) : null}
                  {mode === "register" || mode === "forgot" ? (
                    <>
                      <label className="text-sm font-bold" htmlFor="admin-phone">
                        Mobile Number
                      </label>
                      <input
                        className="focus-ring rounded-md border border-line px-3 py-3"
                        id="admin-phone"
                        placeholder="Mobile number"
                        value={form.phone}
                        onChange={(event) => updateForm("phone", event.target.value)}
                        required={mode === "register"}
                      />
                      <label className="text-sm font-bold" htmlFor="admin-email">
                        Email ID
                      </label>
                      <input
                        className="focus-ring rounded-md border border-line px-3 py-3"
                        id="admin-email"
                        placeholder="official@example.com"
                        type="email"
                        value={form.email || form.recovery}
                        onChange={(event) => {
                          updateForm("email", event.target.value);
                          updateForm("recovery", event.target.value);
                        }}
                        required={mode === "register"}
                      />
                    </>
                  ) : null}
                </>
              )}

              {mode !== "forgot" ? (
                <>
                  <label className="text-sm font-bold" htmlFor="captcha">
                    CAPTCHA Authentication
                  </label>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="rounded-md border border-dashed border-slate-400 bg-slate-50 px-3 py-3 text-center font-bold">
                      Solve: {captcha.question}
                    </div>
                    <button
                      className="focus-ring rounded-md border border-line px-3"
                      type="button"
                      onClick={refreshCaptcha}
                      aria-label="Refresh CAPTCHA"
                    >
                      <RefreshCw size={17} />
                    </button>
                  </div>
                  <input
                    className="focus-ring rounded-md border border-line px-3 py-3"
                    id="captcha"
                    inputMode="numeric"
                    placeholder="Enter CAPTCHA answer"
                    value={form.captchaAnswer}
                    onChange={(event) => updateForm("captchaAnswer", event.target.value)}
                    required
                  />
                </>
              ) : null}

              {notice ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {notice}
                </div>
              ) : null}

              <button
                className="focus-ring mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 font-bold text-white"
                type="submit"
              >
                {mode === "register" ? (
                  <UserPlus size={18} />
                ) : mode === "forgot" ? (
                  <KeyRound size={18} />
                ) : (
                  <LockKeyhole size={18} />
                )}
                {submitLabel}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <button className="font-semibold text-brand" type="button" onClick={() => resetForm("login")}>
                Login
              </button>
              <button
                className="font-semibold text-brand"
                type="button"
                onClick={() => resetForm("register")}
              >
                {isVoter ? "Voter Registration" : "Administrator Registration"}
              </button>
              <button
                className="font-semibold text-brand"
                type="button"
                onClick={() => resetForm("forgot")}
              >
                {isVoter ? "Login Help" : "Forgot Password"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
