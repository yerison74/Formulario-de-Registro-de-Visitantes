import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client ────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const APP_ORIGIN = import.meta.env.VITE_APP_ORIGIN ?? "https://sepri.vercel.app";

// ── Token QR: generado en Supabase (tabla contratista_access_tokens) ──────────
async function obtenerOCrearToken(solicitudId) {
  // 1. Buscar token activo existente
  const { data: existing } = await supabase
    .from("contratista_access_tokens")
    .select("token")
    .eq("solicitud_id", solicitudId)
    .eq("is_active", true)
    .maybeSingle();

  if (existing?.token) return existing.token;

  // 2. Crear uno nuevo (32 hex chars)
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

  const { data: inserted, error } = await supabase
    .from("contratista_access_tokens")
    .insert({ solicitud_id: solicitudId, token })
    .select("token")
    .single();

  if (error) throw new Error(error.message || "Error al crear token QR");
  return inserted.token;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const MOTIVOS = [
  "Adenda",
  "Contrato",
  "Equilibrio economico",
  "Linea de credito",
  "Pago de cubicación",
  "Mantenimiento Correctivo",
  "Aula movil",
  "Otras",
];

const PROVINCIAS = [
  "Azua", "Bahoruco", "Barahona", "Dajabón", "Distrito Nacional", "Duarte",
  "Elías Piña", "El Seibo", "Espaillat", "Hato Mayor", "Hermanas Mirabal",
  "Independencia", "La Altagracia", "La Romana", "La Vega",
  "María Trinidad Sánchez", "Monseñor Nouel", "Monte Cristi", "Monte Plata",
  "Pedernales", "Peravia", "Puerto Plata", "Samaná", "San Cristóbal",
  "San José de Ocoa", "San Juan", "San Pedro de Macorís", "Sánchez Ramírez",
  "Santiago", "Santiago Rodríguez", "Santo Domingo", "Valverde",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TODAY = new Date().toISOString().split("T")[0];

// ── Initial form state ─────────────────────────────────────────────────────────
const INITIAL = {
  fecha_visita: TODAY,
  nombres: "",
  apellidos: "",
  nombre_empresa: "",
  motivo_visita: "",
  nombre_obra: "",
  nombre_obra_inaugurada: "",
  provincia: "",
  numero_contrato: "",
  correo: "",
  nota: "",
};

// ── Validation rules ───────────────────────────────────────────────────────────
const RULES = {
  fecha_visita:   (v) => v.trim() !== "",
  nombres:        (v) => v.trim().length >= 2,
  apellidos:      (v) => v.trim().length >= 2,
  nombre_empresa: (v) => v.trim().length >= 2,
  motivo_visita:  (v) => v !== "",
  provincia:      (v) => v !== "",
  numero_contrato:(v) => v.trim().length >= 2,
  correo:         (v) => EMAIL_RE.test(v.trim()),
};

const ERROR_MSGS = {
  fecha_visita:    "Seleccione una fecha.",
  nombres:         "Ingrese el nombre.",
  apellidos:       "Ingrese los apellidos.",
  nombre_empresa:  "Ingrese el nombre de la empresa.",
  motivo_visita:   "Seleccione un motivo.",
  provincia:       "Seleccione una provincia.",
  numero_contrato: "Ingrese el número de contrato.",
  correo:          "Ingrese un correo válido.",
};

// ── Styles (CSS-in-JS via <style> tag — keeps it zero-dependency) ──────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink:         #1a1a2e;
    --ink-light:   #4a4a6a;
    --ink-muted:   #8888aa;
    --paper:       #f8f7f4;
    --surface:     #ffffff;
    --accent:      #c8401a;
    --accent-2:    #1a5c8a;
    --border:      #e0ddd6;
    --border-focus:#c8401a;
    --success:     #1a7a4a;
    --error:       #c8401a;
    --radius:      10px;
    --font-display:'DM Serif Display', Georgia, serif;
    --font-body:   'DM Sans', system-ui, sans-serif;
  }

  html { font-size: 16px; scroll-behavior: smooth; }

  body {
    font-family: var(--font-body);
    background: var(--paper);
    color: var(--ink);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Header */
  .cf-header {
    background: #fff;
    color: var(--ink);
    padding: 2rem 2rem 1.5rem;
    border-bottom: 3px solid var(--ink);
  }
  .cf-header-inner {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .cf-header-logo {
    height: 120px;
    width: auto;
    margin-bottom: 0.5rem;
    display: block;
  }
  .cf-header h1 {
    font-family: var(--font-body);
    font-size: clamp(1.2rem, 3vw, 1.55rem);
    font-weight: 700;
    line-height: 1.2;
    color: var(--ink);
    letter-spacing: 0.01em;
  }
  .cf-header-desc {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: var(--ink-light);
    font-weight: 400;
    max-width: 480px;
  }

  /* Main */
  .cf-main {
    flex: 1;
    max-width: 760px;
    width: 100%;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 4rem;
  }

  /* Card */
  .cf-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 1.5);
    padding: 2.5rem;
    box-shadow: 0 2px 12px rgba(26,26,46,0.07);
  }

  /* Section */
  .cf-section + .cf-section { margin-top: 2rem; }
  .cf-section-title {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: 1.2rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border);
  }

  /* Grid */
  .cf-grid { display: grid; gap: 1.2rem; }
  .cf-grid-2 { grid-template-columns: 1fr 1fr; }
  .cf-grid-3 { grid-template-columns: 1fr 1fr 1fr; }

  /* Field */
  .cf-field { display: flex; flex-direction: column; gap: 0.45rem; }
  .cf-label {
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--ink-light);
    letter-spacing: 0.01em;
  }
  .cf-req { color: var(--accent); margin-left: 2px; }
  .cf-opt { color: var(--ink-muted); font-weight: 400; }

  .cf-input, .cf-select, .cf-textarea {
    font-family: var(--font-body);
    font-size: 0.93rem;
    color: var(--ink);
    background: var(--paper);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 0.65rem 0.9rem;
    width: 100%;
    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }
  .cf-input:focus, .cf-select:focus, .cf-textarea:focus {
    border-color: var(--border-focus);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(200,64,26,0.1);
  }
  .cf-input::placeholder, .cf-textarea::placeholder { color: var(--ink-muted); }

  .cf-select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238888aa' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.85rem center;
    padding-right: 2.5rem;
    cursor: pointer;
  }

  .cf-textarea { resize: vertical; min-height: 100px; line-height: 1.6; }

  /* Invalid state */
  .cf-field--invalid .cf-input,
  .cf-field--invalid .cf-select,
  .cf-field--invalid .cf-textarea { border-color: var(--error); }
  .cf-field-error {
    font-size: 0.75rem;
    color: var(--error);
    display: none;
  }
  .cf-field--invalid .cf-field-error { display: block; }

  /* Divider */
  .cf-divider { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }

  /* Alert */
  .cf-alert {
    padding: 0.9rem 1.1rem;
    border-radius: var(--radius);
    font-size: 0.88rem;
    line-height: 1.5;
    margin-bottom: 1.5rem;
  }
  .cf-alert--error {
    background: #fef2f0;
    border: 1px solid #f5c2b8;
    color: #8a2000;
  }

  /* Submit row */
  .cf-submit-row {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
  }

  .cf-btn-submit {
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: #fff;
    background: var(--ink);
    border: none;
    border-radius: var(--radius);
    padding: 0.8rem 2.2rem;
    cursor: pointer;
    transition: background 0.18s, transform 0.1s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .cf-btn-submit:hover:not(:disabled) { background: var(--accent); }
  .cf-btn-submit:active:not(:disabled) { transform: scale(0.98); }
  .cf-btn-submit:disabled { opacity: 0.45; cursor: not-allowed; }

  /* Spinner */
  .cf-spinner {
    display: inline-block;
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: cf-spin 0.7s linear infinite;
  }
  @keyframes cf-spin { to { transform: rotate(360deg); } }

  /* Success screen */
  .cf-success {
    text-align: center;
    padding: 3rem 1rem;
  }
  .cf-success-icon {
    width: 64px; height: 64px;
    background: var(--success);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1.5rem;
  }
  .cf-success-icon svg { width: 32px; height: 32px; stroke: #fff; fill: none; }
  .cf-success h2 {
    font-family: var(--font-display);
    font-size: 1.8rem;
    font-weight: 400;
    color: var(--ink);
    margin-bottom: 0.75rem;
  }
  .cf-success p { color: var(--ink-light); font-size: 0.95rem; line-height: 1.65; }
  .cf-success-ref {
    display: inline-block;
    margin-top: 1.25rem;
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.6rem 1.4rem;
    font-size: 0.82rem;
    color: var(--ink-muted);
  }
  .cf-success-ref strong { color: var(--ink); }

  /* QR block */
  .cf-qr-block {
    margin: 2rem auto 0;
    max-width: 420px;
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 1.5);
    padding: 1.5rem;
    text-align: left;
  }
  .cf-qr-title {
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: 0.35rem;
  }
  .cf-qr-subtitle {
    font-size: 0.78rem;
    color: var(--ink-muted);
    margin-bottom: 1rem;
    line-height: 1.5;
  }
  .cf-qr-inner {
    display: flex;
    gap: 1.25rem;
    align-items: flex-start;
  }
  .cf-qr-img {
    width: 120px; height: 120px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: #fff;
    flex-shrink: 0;
  }
  .cf-qr-meta {
    font-size: 0.8rem;
    color: var(--ink-light);
    line-height: 1.9;
  }
  .cf-qr-meta a { color: var(--accent-2); word-break: break-all; }

  /* New request button */
  .cf-btn-new {
    margin-top: 2rem;
    font-family: var(--font-body);
    font-size: 0.88rem;
    font-weight: 500;
    color: var(--accent-2);
    background: none;
    border: 1.5px solid var(--accent-2);
    border-radius: var(--radius);
    padding: 0.6rem 1.6rem;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .cf-btn-new:hover { background: var(--accent-2); color: #fff; }

  /* Footer */
  .cf-footer {
    text-align: center;
    padding: 1.5rem;
    font-size: 0.75rem;
    color: var(--ink-muted);
    border-top: 1px solid var(--border);
  }

  /* Responsive */
  @media (max-width: 600px) {
    .cf-card { padding: 1.5rem 1.25rem; }
    .cf-grid-2, .cf-grid-3 { grid-template-columns: 1fr; }
    .cf-qr-inner { flex-direction: column; align-items: center; }
  }
`;

// ── Component ──────────────────────────────────────────────────────────────────
export default function FormularioContratista() {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [alertMsg, setAlertMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null); // { id, qrUrl, detailUrl, nombre, empresa, motivo, provincia }

  // Inject styles once
  useEffect(() => {
    if (!document.getElementById("cf-styles")) {
      const tag = document.createElement("style");
      tag.id = "cf-styles";
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear individual error on change
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  }

  function validate() {
    const newErrors = {};
    Object.entries(RULES).forEach(([field, rule]) => {
      if (!rule(form[field])) newErrors[field] = ERROR_MSGS[field];
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setAlertMsg("");

    if (!validate()) {
      setAlertMsg("Por favor complete todos los campos obligatorios correctamente.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);

    const payload = {
      fecha_visita:           form.fecha_visita,
      nombres:                form.nombres.trim(),
      apellidos:              form.apellidos.trim(),
      nombre_empresa:         form.nombre_empresa.trim(),
      motivo_visita:          form.motivo_visita,
      nombre_obra:            form.nombre_obra.trim() || null,
      nombre_obra_inaugurada: form.nombre_obra_inaugurada.trim() || null,
      provincia:              form.provincia,
      numero_contrato:        form.numero_contrato.trim(),
      correo:                 form.correo.trim(),
      nota:                   form.nota.trim() || null,
    };

    try {
      const { data, error } = await supabase
        .from("formulario_contratista")
        .insert([payload])
        .select("*")
        .single();

      if (error) throw error;

      const token = await obtenerOCrearToken(data.id);
      const detailUrl = `${APP_ORIGIN}/contratista/${token}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(detailUrl)}`;

      setSuccess({
        id:       data.id,
        qrUrl,
        detailUrl,
        nombre:   `${form.nombres.trim()} ${form.apellidos.trim()}`,
        empresa:  form.nombre_empresa.trim(),
        motivo:   form.motivo_visita,
        provincia:form.provincia,
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setAlertMsg(
        "Ocurrió un error al enviar el formulario. Por favor intente de nuevo." +
          (err?.message ? ` (${err.message})` : "")
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setForm(INITIAL);
    setErrors({});
    setAlertMsg("");
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function fieldClass(name) {
    return "cf-field" + (errors[name] ? " cf-field--invalid" : "");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <header className="cf-header">
        <div className="cf-header-inner">
          {/* Replace src with your actual logo path */}
          {<img src="Logo-Die-scaled.jpeg" alt="SEPRI" className="cf-header-logo" />}
          <h1>Formulario de Registro de Visitantes</h1>
          <p className="cf-header-desc">
            Complete el formulario para registrar su visita. Todos los campos marcados con * son obligatorios.
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="cf-main">
        <div className="cf-card">

          {/* ── Success screen ─────────────────────────────────────────── */}
          {success ? (
            <div className="cf-success">
              <div className="cf-success-icon">
                <svg viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2>¡Solicitud registrada!</h2>
              <p>
                Su solicitud fue enviada correctamente.<br />
                El equipo de SEPRI procesará su visita pronto.
              </p>
              <div className="cf-success-ref">
                Número de solicitud: <strong>{success.id}</strong>
              </div>

              {/* QR block */}
              <div className="cf-qr-block">
                <div className="cf-qr-title">QR de la solicitud {success.id}</div>
                <div className="cf-qr-subtitle">
                  Escanea el QR para abrir la vista de detalle de esta solicitud en el sistema (debes iniciar sesión si aplica).
                </div>
                <div className="cf-qr-inner">
                  <img src={success.qrUrl} alt={`QR solicitud ${success.id}`} className="cf-qr-img" />
                  <div className="cf-qr-meta">
                    <strong>Enlace:</strong>{" "}
                    <a href={success.detailUrl} target="_blank" rel="noreferrer">
                      {success.detailUrl}
                    </a>
                    <br /><strong>Nombre:</strong> {success.nombre}
                    <br /><strong>Empresa:</strong> {success.empresa}
                    <br /><strong>Motivo:</strong> {success.motivo}
                    <br /><strong>Provincia:</strong> {success.provincia}
                  </div>
                </div>
              </div>

              <br />
              <button className="cf-btn-new" onClick={handleReset}>
                Registrar otra solicitud
              </button>
            </div>

          ) : (
            /* ── Form ──────────────────────────────────────────────────── */
            <form onSubmit={handleSubmit} noValidate>

              {/* Alert */}
              {alertMsg && (
                <div className="cf-alert cf-alert--error" role="alert">
                  {alertMsg}
                </div>
              )}

              {/* Sección 1: Visitante */}
              <div className="cf-section">
                <div className="cf-section-title">Información del visitante</div>
                <div className="cf-grid cf-grid-3">

                  <div className={fieldClass("fecha_visita")}>
                    <label className="cf-label">
                      Fecha de visita <span className="cf-req">*</span>
                    </label>
                    <input
                      type="date"
                      name="fecha_visita"
                      value={form.fecha_visita}
                      onChange={handleChange}
                      className="cf-input"
                      required
                    />
                    <span className="cf-field-error">{ERROR_MSGS.fecha_visita}</span>
                  </div>

                  <div className={fieldClass("nombres")}>
                    <label className="cf-label">
                      Nombres <span className="cf-req">*</span>
                    </label>
                    <input
                      type="text"
                      name="nombres"
                      value={form.nombres}
                      onChange={handleChange}
                      placeholder="Ej: María José"
                      className="cf-input"
                      required
                    />
                    <span className="cf-field-error">{ERROR_MSGS.nombres}</span>
                  </div>

                  <div className={fieldClass("apellidos")}>
                    <label className="cf-label">
                      Apellidos <span className="cf-req">*</span>
                    </label>
                    <input
                      type="text"
                      name="apellidos"
                      value={form.apellidos}
                      onChange={handleChange}
                      placeholder="Ej: Rodríguez Pérez"
                      className="cf-input"
                      required
                    />
                    <span className="cf-field-error">{ERROR_MSGS.apellidos}</span>
                  </div>

                </div>
              </div>

              {/* Sección 2: Empresa y visita */}
              <div className="cf-section" style={{ marginTop: "1.75rem" }}>
                <div className="cf-section-title">Información de la empresa y visita</div>
                <div className="cf-grid cf-grid-2">

                  <div className={fieldClass("nombre_empresa")}>
                    <label className="cf-label">
                      Nombre empresa <span className="cf-req">*</span>
                    </label>
                    <input
                      type="text"
                      name="nombre_empresa"
                      value={form.nombre_empresa}
                      onChange={handleChange}
                      placeholder="Razón social"
                      className="cf-input"
                      required
                    />
                    <span className="cf-field-error">{ERROR_MSGS.nombre_empresa}</span>
                  </div>

                  <div className={fieldClass("motivo_visita")}>
                    <label className="cf-label">
                      Motivo de visita <span className="cf-req">*</span>
                    </label>
                    <select
                      name="motivo_visita"
                      value={form.motivo_visita}
                      onChange={handleChange}
                      className="cf-select"
                      required
                    >
                      <option value="">Seleccionar motivo…</option>
                      {MOTIVOS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                    <span className="cf-field-error">{ERROR_MSGS.motivo_visita}</span>
                  </div>

                  <div className="cf-field">
                    <label className="cf-label">
                      Nombre obra <span className="cf-opt">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      name="nombre_obra"
                      value={form.nombre_obra}
                      onChange={handleChange}
                      placeholder="Nombre del proyecto"
                      className="cf-input"
                    />
                  </div>

                  <div className="cf-field">
                    <label className="cf-label">
                      Nombre obra inaugurada <span className="cf-opt">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      name="nombre_obra_inaugurada"
                      value={form.nombre_obra_inaugurada}
                      onChange={handleChange}
                      placeholder="Si aplica"
                      className="cf-input"
                    />
                  </div>

                </div>
              </div>

              {/* Sección 3: Ubicación y contacto */}
              <div className="cf-section" style={{ marginTop: "1.75rem" }}>
                <div className="cf-section-title">Ubicación y contacto</div>
                <div className="cf-grid cf-grid-3">

                  <div className={fieldClass("provincia")}>
                    <label className="cf-label">
                      Provincia <span className="cf-req">*</span>
                    </label>
                    <select
                      name="provincia"
                      value={form.provincia}
                      onChange={handleChange}
                      className="cf-select"
                      required
                    >
                      <option value="">Seleccionar…</option>
                      {PROVINCIAS.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                    <span className="cf-field-error">{ERROR_MSGS.provincia}</span>
                  </div>

                  <div className={fieldClass("numero_contrato")}>
                    <label className="cf-label">
                      Número de contrato <span className="cf-req">*</span>
                    </label>
                    <input
                      type="text"
                      name="numero_contrato"
                      value={form.numero_contrato}
                      onChange={handleChange}
                      placeholder="Ej: CONT-2026-0001"
                      className="cf-input"
                      required
                    />
                    <span className="cf-field-error">{ERROR_MSGS.numero_contrato}</span>
                  </div>

                  <div className={fieldClass("correo")}>
                    <label className="cf-label">
                      Correo electrónico <span className="cf-req">*</span>
                    </label>
                    <input
                      type="email"
                      name="correo"
                      value={form.correo}
                      onChange={handleChange}
                      placeholder="correo@empresa.com"
                      className="cf-input"
                      required
                    />
                    <span className="cf-field-error">{ERROR_MSGS.correo}</span>
                  </div>

                </div>
              </div>

              {/* Sección 4: Nota */}
              <div className="cf-section" style={{ marginTop: "1.75rem" }}>
                <div className="cf-section-title">Información adicional</div>
                <div className="cf-field">
                  <label className="cf-label">
                    Nota <span className="cf-opt">(opcional)</span>
                  </label>
                  <textarea
                    name="nota"
                    value={form.nota}
                    onChange={handleChange}
                    placeholder="Agregue cualquier información adicional relevante para su visita…"
                    className="cf-textarea"
                  />
                </div>
              </div>

              <hr className="cf-divider" />

              <div className="cf-submit-row">
                <button type="submit" className="cf-btn-submit" disabled={loading}>
                  {loading && <span className="cf-spinner" />}
                  {loading ? "Enviando…" : "Enviar solicitud"}
                </button>
              </div>

            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="cf-footer">
        SEPRI — Formulario público para contratistas. Sus datos se almacenan de forma segura.
      </footer>
    </>
  );
}
