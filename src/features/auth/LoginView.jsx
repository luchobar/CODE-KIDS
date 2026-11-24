import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Flame,
  Lock,
  RocketLaunch,
  Star,
} from '@phosphor-icons/react';
import {
  authenticateUser,
  registerUser,
  requestPasswordReset,
  updatePasswordForEmail,
} from '../../data/authRepository.js';
import { isSupabaseConfigured } from '../../data/supabaseClient.js';
import AuthCurriculumPreview from './AuthCurriculumPreview.jsx';
import RegisterFields from './RegisterFields.jsx';

const AUTH_TABS = [
  { id: 'login', label: 'Iniciar sesión' },
  { id: 'register', label: 'Crear cuenta' },
  { id: 'reset', label: 'Recuperar clave' },
];

/**
 * Pantalla de inicio de sesión, creación de cuentas y recuperación de contraseña.
 */
export default function LoginView({ onEnter, onBackToLanding }) {
  const [authMode, setAuthMode] = useState('login');
  const [role, setRole] = useState('student');
  const [selectedAvatar, setSelectedAvatar] = useState('dragon');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [previewEmailUrl, setPreviewEmailUrl] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordValid = password.length >= 8;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('resetToken');
    if (tokenFromUrl) {
      setAuthMode('reset');
      setResetToken(tokenFromUrl);
      setStatusMessage('Ingresa tu nueva contraseña para completar la recuperación.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const applyPasswordReset = async () => {
    const updateRes = await updatePasswordForEmail(email, password);
    if (!updateRes.ok) {
      setErrorMessage(updateRes.error || 'No se pudo actualizar la contraseña.');
      return;
    }
    setStatusMessage(updateRes.message || 'Contraseña actualizada. Ya puedes iniciar sesión.');
    setAuthMode('login');
    setPassword('');
    setResetToken('');
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    setPreviewEmailUrl('');
    setSubmitting(true);

    try {
      if (authMode === 'register') {
        if (!isEmailValid) {
          setErrorMessage('Por favor ingresa un correo institucional o válido.');
          return;
        }
        if (!isPasswordValid) {
          setErrorMessage('La contraseña debe tener mínimo 8 caracteres.');
          return;
        }
        const regResult = await registerUser({
          name: name.trim() || (role === 'teacher' ? 'Docente' : 'Explorador'),
          email,
          password,
          role,
          avatar: selectedAvatar,
        });
        if (!regResult.ok) {
          setErrorMessage(regResult.error || 'No se pudo crear la cuenta.');
          return;
        }
        onEnter(regResult.user);
      } else if (authMode === 'login') {
        const authResult = await authenticateUser(email, password);
        if (!authResult.ok) {
          setErrorMessage(authResult.error || 'Credenciales inválidas.');
          return;
        }
        onEnter(authResult.user);
      } else if (authMode === 'reset') {
        if (!isEmailValid) {
          setErrorMessage('Por favor ingresa el correo electrónico de tu cuenta.');
          return;
        }
        if (password.trim().length >= 8 || resetToken.trim()) {
          await applyPasswordReset();
          return;
        }
        const resetReq = await requestPasswordReset(email);
        if (resetReq.ok) {
          setStatusMessage(
            resetReq.data?.message ||
              'Si el correo está registrado, escribe tu nueva contraseña abajo para actualizarla.',
          );
          if (resetReq.data?.devPreviewUrl) {
            setPreviewEmailUrl(resetReq.data.devPreviewUrl);
          }
        } else {
          setResetToken('direct-reset');
          setStatusMessage(
            'Ingresa tu nueva contraseña (mínimo 8 caracteres) para actualizarla en tu cuenta.',
          );
        }
      }
    } catch {
      setErrorMessage('Error de conexión con el servidor de autenticación.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="top" className="apple-page">
      <section className="product-tile-light login-hero-tile cosmic-auth-stage">
        <div className="cosmic-orb orb-cyan" aria-hidden="true" />
        <div className="cosmic-orb orb-violet" aria-hidden="true" />
        <div className="cosmic-orb orb-lime" aria-hidden="true" />

        <div className="tile-container split-hero-grid">
          <div className="split-hero-copy">
            <span className="hero-eyebrow">⚡ TEMPORADA DE EXPLORADORES · EDICIÓN GAMIFICADA</span>
            <h1 className="hero-display">Domina el código jugando y creando.</h1>
            <p className="hero-lead">
              Programa al robot Pipo con bloques magnéticos, desbloquea mundos sci-fi y conquista el Laboratorio de Python.
            </p>

            {onBackToLanding && (
              <button type="button" className="text-link auth-back-link" onClick={onBackToLanding}>
                <ArrowLeft size={16} weight="bold" />
                <span>Volver a la página de presentación</span>
              </button>
            )}

            <form className="apple-login-form glass-auth-card" onSubmit={handleAuthSubmit} noValidate>
              <div className="auth-brand-badge-container">
                <img
                  src="/images/logo_vertical.jpg"
                  alt="CodeKids Robot Pipo"
                  className="auth-brand-logo-vertical"
                />
                <div className="auth-brand-badge-text">
                  <span className="auth-brand-eyebrow">Aventura Oficial</span>
                  <span className="auth-brand-subtitle">¡Bienvenido a CodeKids!</span>
                </div>
              </div>

              <div className="auth-connection-bar">
                {isSupabaseConfigured ? (
                  <span className="auth-status-chip online" title="Base de datos Supabase conectada en vivo">
                    🟢 Supabase Conectado
                  </span>
                ) : (
                  <span className="auth-status-chip offline" title="Faltan las variables de entorno en Vercel">
                    🔴 Sin conexión a Supabase (Falta Redeploy en Vercel)
                  </span>
                )}
              </div>

              <div className="configurator-group">
                <div className="course-selector-group auth-tabs-bar" role="tablist" aria-label="Modo de acceso">
                  {AUTH_TABS.map((tab) => (
                    <button
                      type="button"
                      key={tab.id}
                      role="tab"
                      aria-selected={authMode === tab.id}
                      className={authMode === tab.id ? 'configurator-option-chip selected' : 'configurator-option-chip'}
                      onClick={() => {
                        setAuthMode(tab.id);
                        setErrorMessage('');
                        setStatusMessage('');
                      }}
                    >
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {authMode === 'register' && (
                <RegisterFields
                  role={role}
                  onRoleChange={setRole}
                  name={name}
                  onNameChange={setName}
                  selectedAvatar={selectedAvatar}
                  onSelectAvatar={setSelectedAvatar}
                />
              )}

              <div className="form-field-block">
                <div className="field-label-row">
                  <label className="field-label" htmlFor="auth-email">
                    Correo electrónico
                  </label>
                  {email.length > 0 && (
                    <span className={`validation-pill ${isEmailValid ? 'valid' : 'pending'}`}>
                      {isEmailValid ? '✓ Formato válido' : 'Ingresa un correo válido'}
                    </span>
                  )}
                </div>
                <div className="input-with-icon">
                  <span className="input-leading-icon">
                    <Compass size={18} weight="duotone" />
                  </span>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    className={`search-input has-icon${email.length > 0 ? (isEmailValid ? ' input-valid' : ' input-warning') : ''}`}
                    placeholder="tu.correo@gmail.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              <div className="form-field-block">
                <div className="field-label-row">
                  <label className="field-label" htmlFor="auth-password">
                    {authMode === 'reset' ? 'Nueva contraseña (mín. 8 caracteres)' : 'Contraseña secreta'}
                  </label>
                  {password.length > 0 && (
                    <span className={`validation-pill ${isPasswordValid ? 'valid' : 'pending'}`}>
                      {isPasswordValid ? '✓ Escudo activo (8+)' : `${password.length}/8 caracteres`}
                    </span>
                  )}
                </div>
                <div className="input-with-icon">
                  <span className="input-leading-icon">
                    <Lock size={18} weight="duotone" />
                  </span>
                  <input
                    id="auth-password"
                    type="password"
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength={8}
                    maxLength={128}
                    className={`search-input has-icon${password.length > 0 ? (isPasswordValid ? ' input-valid' : ' input-warning') : ''}`}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <small className="field-helper">
                  Tu contraseña queda enlazada directamente a tu correo en la base de datos.
                </small>
              </div>

              {errorMessage && (
                <p role="alert" className="auth-alert-box error">
                  {errorMessage}
                </p>
              )}

              {statusMessage && (
                <p role="status" className="auth-alert-box success">
                  {statusMessage}{' '}
                  {previewEmailUrl && (
                    <a
                      href={previewEmailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="auth-inline-link"
                    >
                      Abrir correo de prueba (Ethereal)
                    </a>
                  )}
                </p>
              )}

              <div className="hero-cta-row">
                <button className="button-store-hero cta-3d-lime full-width-cta" type="submit" disabled={submitting}>
                  <RocketLaunch size={18} weight="fill" />
                  <span>
                    {submitting
                      ? 'Validando credenciales...'
                      : authMode === 'register'
                        ? 'Crear cuenta y comenzar'
                        : authMode === 'reset'
                          ? 'Actualizar contraseña'
                          : 'Iniciar sesión en CODEKIDS'}
                  </span>
                  <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            </form>
          </div>

          <div className="split-hero-visual">
            <div className="hero-showcase-frame">
              <div className="floating-achievement-badge top-badge">
                <Flame size={18} weight="fill" />
                <span>¡Racha de 5 días activa!</span>
              </div>
              <img
                className="product-render-shadow hero-product-image"
                src="/images/hero-codekids.png"
                alt="Robot Pipo junto a bloques de programación y tablero de estrellas en CodeKids"
                width="1000"
                height="800"
              />
              <div className="floating-achievement-badge bottom-badge">
                <Star size={18} weight="fill" />
                <span>+120 XP · Desbloquea misiones sci-fi</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AuthCurriculumPreview />
    </div>
  );
}
