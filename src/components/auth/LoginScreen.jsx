/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import { Icons } from "../../assets/icons";

const LoginScreen = ({
  status,
  userName,
  error,
  recoveryKey,
  onLogin,
  onSetup,
  onReset,
  onBackToLogin,
  onGoToRecover,
  onFinishSetup,
  onCoordinatorLogin
}) => {
  // Controle de Perfil: 'teacher' ou 'coordinator'
  const [selectedRole, setSelectedRole] = useState("teacher");

  // Estados do Professor
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inputRecoveryKey, setInputRecoveryKey] = useState("");
  const [inputUserName, setInputUserName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  // Estados da Coordenação
  const [coordStep, setCoordStep] = useState("loading"); // 'loading' | 'auth' | 'setup'
  const [coordPin, setCoordPin] = useState("");
  const [coordConfirmPin, setCoordConfirmPin] = useState("");
  const [coordName, setCoordName] = useState("");
  const [showCoordPin, setShowCoordPin] = useState(false);
  const [coordLoading, setCoordLoading] = useState(false);
  const coordInputRef = useRef(null);

  // Limpa erros locais quando o status global do professor muda
  useEffect(() => {
    setLocalError("");
    setPassword("");
    setConfirmPassword("");
  }, [status]);

  // Consulta status do cofre da coordenação quando selecionada a aba
  const checkCoordinatorStatus = async () => {
    setCoordLoading(true);
    setLocalError("");
    try {
      if (!window.electronAPI?.coordinatorGetStatus) {
        setCoordStep("auth");
        return;
      }
      const res = await window.electronAPI.coordinatorGetStatus();
      if (res.success) {
        if (!res.isSetup) {
          setCoordStep("setup");
        } else {
          setCoordStep("auth");
          setCoordName(res.coordinatorName || "");
        }
      } else {
        setCoordStep("auth");
      }
    } catch (_) {
      setCoordStep("auth");
    } finally {
      setCoordLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRole === "coordinator") {
      checkCoordinatorStatus();
    }
  }, [selectedRole]);

  useEffect(() => {
    if (selectedRole === "coordinator" && (coordStep === "auth" || coordStep === "setup")) {
      const t = setTimeout(() => {
        if (coordInputRef.current) coordInputRef.current.focus();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [selectedRole, coordStep]);

  // Ações do Professor
  const validateAndSetupTeacher = () => {
    if (!inputUserName.trim()) {
      setLocalError("Por favor, informe seu nome de Professor(a).");
      return;
    }
    if (password.length < 4) {
      setLocalError("A senha deve ter pelo menos 4 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("As senhas digitadas não conferem.");
      return;
    }
    setLocalError("");
    onSetup(password, inputUserName.trim());
  };

  // Ações da Coordenação
  const handleCoordinatorAuth = async (e) => {
    if (e) e.preventDefault();
    if (!coordPin.trim()) {
      setLocalError("Por favor, informe o PIN de 4 a 8 dígitos da coordenação.");
      return;
    }

    setCoordLoading(true);
    setLocalError("");

    try {
      if (!window.electronAPI?.coordinatorAuthenticate) {
        throw new Error("Comunicação com o subsistema da coordenação indisponível.");
      }
      const res = await window.electronAPI.coordinatorAuthenticate({ pin: coordPin.trim() });
      if (res.success) {
        setCoordPin("");
        if (typeof onCoordinatorLogin === "function") {
          onCoordinatorLogin(res);
        }
      } else {
        setLocalError(res.error || "PIN incorreto. Acesso à coordenação negado.");
      }
    } catch (err) {
      setLocalError(err.message || "Erro ao autenticar coordenação.");
    } finally {
      setCoordLoading(false);
    }
  };

  const handleCoordinatorSetup = async (e) => {
    if (e) e.preventDefault();
    if (coordPin.length < 4) {
      setLocalError("O PIN deve conter no mínimo 4 dígitos.");
      return;
    }
    if (coordPin !== coordConfirmPin) {
      setLocalError("A confirmação do PIN não confere.");
      return;
    }

    setCoordLoading(true);
    setLocalError("");

    try {
      const setupRes = await window.electronAPI.coordinatorSetupPin({
        pin: coordPin.trim(),
        coordinatorName: coordName.trim() || "Coordenador Pedagógico"
      });

      if (!setupRes.success) {
        throw new Error(setupRes.error || "Falha ao registrar PIN inicial.");
      }

      // Autentica automaticamente após setup
      const authRes = await window.electronAPI.coordinatorAuthenticate({ pin: coordPin.trim() });
      if (authRes.success) {
        setCoordPin("");
        setCoordConfirmPin("");
        if (typeof onCoordinatorLogin === "function") {
          onCoordinatorLogin(authRes);
        }
      } else {
        setCoordStep("auth");
        setLocalError("PIN configurado! Digite-o para entrar.");
      }
    } catch (err) {
      setLocalError(err.message || "Erro durante o cadastro de PIN.");
    } finally {
      setCoordLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#020617] flex items-center justify-center p-4 overflow-y-auto font-[Inter,sans-serif] select-none">
      {/* Luz ambiente sutil de fundo */}
      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[100px] pointer-events-none transition-colors duration-500 ${
          selectedRole === "coordinator" ? "bg-amber-500/10" : "bg-indigo-600/10"
        }`}
      />

      <div className="w-full max-w-sm relative animate-in fade-in duration-300">
        {/* Cartão Central com Dark Glassmorphism */}
        <div className="relative z-10 bg-slate-900/70 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 shadow-2xl shadow-black/60">

          {/* Cabeçalho e Identidade Visual */}
          <div className="text-center mb-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2.5 shadow-md transform hover:scale-105 transition-all duration-300 ${
                selectedRole === "coordinator"
                  ? "bg-gradient-to-tr from-amber-500 to-orange-400 shadow-amber-500/25"
                  : "bg-gradient-to-tr from-orange-500 to-amber-400 shadow-orange-500/20"
              }`}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              EduSys <span className={selectedRole === "coordinator" ? "text-amber-400" : "text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400"}>Pro</span>
            </h1>
            <p className="text-slate-400 font-medium text-[11px] mt-0.5">Gestão Pedagógica • v5.5.1</p>
          </div>

          {/* SELETOR DE PERFIL BIFURCADO COM TRANSIÇÃO SUAVE (SLIDING PILL) */}
          <div className="relative p-1 bg-slate-950/80 rounded-xl border border-slate-800/90 mb-4 grid grid-cols-2">
            {/* Pílula Deslizante Fluida */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-all duration-300 ease-out pointer-events-none shadow-md ${
                selectedRole === "teacher"
                  ? "left-1 bg-indigo-600 shadow-indigo-600/30"
                  : "left-[calc(50%+0px)] bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/30"
              }`}
            />

            <button
              type="button"
              onClick={() => {
                setSelectedRole("teacher");
                setLocalError("");
              }}
              className={`relative z-10 py-2 px-2.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedRole === "teacher"
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg
                className={`w-4 h-4 shrink-0 transition-transform duration-300 ${
                  selectedRole === "teacher" ? "scale-105 text-white" : "scale-95 text-slate-400 opacity-75"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7" />
              </svg>
              <span className="transition-colors duration-300">Professor</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedRole("coordinator");
                setLocalError("");
                checkCoordinatorStatus();
              }}
              className={`relative z-10 py-2 px-2.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedRole === "coordinator"
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg
                className={`w-4 h-4 shrink-0 transition-transform duration-300 ${
                  selectedRole === "coordinator" ? "scale-105 text-white" : "scale-95 text-slate-400 opacity-75"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="transition-colors duration-300">Coordenação</span>
            </button>
          </div>

          {/* Mensagem de Erro / Alerta */}
          {(localError || error) && (
            <div className="mb-4 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-in fade-in slide-in-from-top-1">
              <p className="text-rose-400 text-xs font-bold text-center">
                {localError || error}
              </p>
            </div>
          )}

          {/* ======================================================== */}
          {/* FLUXO 1: COORDENAÇÃO PEDAGÓGICA (DIRETO NO WORKSPACE)    */}
          {/* ======================================================== */}
          {selectedRole === "coordinator" && (
            <div className="animate-in fade-in duration-300">
              {coordLoading && coordStep === "loading" ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2.5">
                  <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400">Verificando cofre da gestão...</p>
                </div>
              ) : coordStep === "setup" ? (
                <form onSubmit={handleCoordinatorSetup} className="animate-in slide-in-from-bottom-3 duration-300">
                  <div className="text-center mb-3">
                    <p className="text-amber-400 text-[10px] font-black uppercase tracking-wider mb-0.5">
                      Primeiro Acesso
                    </p>
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-300">
                      Cadastre o PIN da Coordenação
                    </h2>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <input
                        type="text"
                        placeholder="Nome do(a) Gestor(a) (Ex: Coord. Helena)"
                        value={coordName}
                        onChange={(e) => {
                          setLocalError("");
                          setCoordName(e.target.value);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-semibold text-xs placeholder:text-slate-600"
                      />
                    </div>

                    <div className="relative">
                      <input
                        ref={coordInputRef}
                        type={showCoordPin ? "text" : "password"}
                        maxLength={8}
                        placeholder="Novo PIN da Coordenação (mín. 4 dígitos)"
                        value={coordPin}
                        onChange={(e) => {
                          setLocalError("");
                          setCoordPin(e.target.value);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-semibold pr-10 text-xs placeholder:text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCoordPin(!showCoordPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        {showCoordPin ? Icons.EyeOff : Icons.Eye}
                      </button>
                    </div>

                    <input
                      type="password"
                      maxLength={8}
                      placeholder="Confirme o PIN"
                      value={coordConfirmPin}
                      onChange={(e) => {
                        setLocalError("");
                        setCoordConfirmPin(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-semibold text-xs placeholder:text-slate-600"
                    />

                    <button
                      type="submit"
                      disabled={coordLoading}
                      className="w-full mt-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-amber-500/25 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {coordLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Salvar PIN e Entrar na Coordenação"
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCoordinatorAuth} className="animate-in fade-in duration-300">
                  <div className="text-center mb-4">
                    <p className="text-amber-400 text-[10px] font-black uppercase tracking-wider mb-0.5">
                      Acesso da Gestão
                    </p>
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Coord. {coordName || "Gestor Escolar"}
                    </h2>
                  </div>

                  <div className="space-y-2.5">
                    <div className="relative">
                      <input
                        ref={coordInputRef}
                        type={showCoordPin ? "text" : "password"}
                        maxLength={8}
                        placeholder="Seu PIN de Acesso"
                        autoFocus
                        value={coordPin}
                        onKeyDown={(e) => e.key === "Enter" && handleCoordinatorAuth(e)}
                        onChange={(e) => {
                          setLocalError("");
                          setCoordPin(e.target.value);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-bold placeholder:text-slate-600 text-center tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCoordPin(!showCoordPin)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        {showCoordPin ? Icons.EyeOff : Icons.Eye}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={coordLoading || !coordPin}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-amber-500/25 hover:brightness-105 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {coordLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Acessar Coordenação</span>
                          <span className="w-3.5 h-3.5 flex items-center justify-center">{Icons.ChevronRight}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCoordStep("setup");
                        setCoordPin("");
                        setCoordConfirmPin("");
                        setLocalError("");
                      }}
                      className="w-full pt-1 text-slate-500 hover:text-amber-400 transition-colors text-[11px] font-semibold text-center cursor-pointer block"
                    >
                      Redefinir PIN da Coordenação
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* FLUXO 2: PORTAL DO DOCENTE (DIÁRIO DE CLASSE PADRÃO)    */}
          {/* ======================================================== */}
          {selectedRole === "teacher" && (
            <div>
              {/* ESTADO 1: Primeiro Acesso (Definir Dados) */}
              {status === "needs_setup" && (
                <div className="animate-in slide-in-from-bottom-3 duration-300">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-3 text-center">
                    Primeiro Acesso: Defina seus Dados
                  </h2>
                  <div className="space-y-2.5">
                    <div>
                      <input
                        type="text"
                        placeholder="Seu Nome (Ex: Prof. Silva)"
                        autoFocus
                        value={inputUserName}
                        onChange={(e) => {
                          setLocalError("");
                          setInputUserName(e.target.value);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-semibold text-xs placeholder:text-slate-600"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Nova Senha para o App"
                        value={password}
                        onChange={(e) => {
                          setLocalError("");
                          setPassword(e.target.value);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-semibold pr-10 text-xs placeholder:text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer"
                      >
                        {showPassword ? Icons.EyeOff : Icons.Eye}
                      </button>
                    </div>
                    <input
                      type="password"
                      placeholder="Confirme a Senha"
                      value={confirmPassword}
                      onChange={(e) => {
                        setLocalError("");
                        setConfirmPassword(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-semibold text-xs placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={validateAndSetupTeacher}
                      className="w-full mt-1 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer"
                    >
                      Criar Conta e Ativar Segurança
                    </button>
                  </div>
                </div>
              )}

              {/* ESTADO 2: Chave Mestra de Recuperação */}
              {status === "setup_complete" && (
                <div className="animate-in zoom-in-95 duration-300 text-center">
                  <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mx-auto mb-2.5 border border-emerald-500/30">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-white mb-1.5">Senha Configurada!</h2>
                  <p className="text-slate-400 text-[11px] mb-3.5 leading-relaxed">
                    Esta é sua <span className="text-white font-bold underline">Chave Mestra</span>. Guarde-a em local seguro para recuperar seu acesso caso esqueça a senha:
                  </p>
                  <div className="bg-slate-950 p-3 rounded-xl border border-indigo-500/30 mb-4 select-all cursor-[copy] active:scale-95 transition-transform">
                    <span className="text-indigo-400 font-mono font-black text-sm tracking-wider">{recoveryKey}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onFinishSetup}
                    className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Concluir e Entrar no App
                  </button>
                </div>
              )}

              {/* ESTADO 3: Login Diário Normal do Professor */}
              {status === "unauthenticated" && (
                <div className="animate-in fade-in duration-300">
                  <div className="text-center mb-4">
                    <p className="text-indigo-400 text-[10px] font-black uppercase tracking-wider mb-0.5">Bem-vindo de volta</p>
                    <h2 className="text-base font-bold text-white tracking-tight">Prof. {userName || "Educador"}</h2>
                  </div>
                  <div className="space-y-2.5">
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Sua Senha"
                        autoFocus
                        value={password}
                        onKeyDown={(e) => e.key === "Enter" && onLogin(password)}
                        onChange={(e) => {
                          setLocalError("");
                          setPassword(e.target.value);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-bold placeholder:text-slate-600 text-center tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer"
                      >
                        {showPassword ? Icons.EyeOff : Icons.Eye}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onLogin(password)}
                      className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/25 hover:brightness-105 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Acessar Sistema</span>
                      <span className="w-3.5 h-3.5 flex items-center justify-center">{Icons.ChevronRight}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onGoToRecover}
                      className="w-full pt-1 text-slate-500 hover:text-indigo-400 transition-colors text-[11px] font-semibold text-center cursor-pointer block"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                </div>
              )}

              {/* ESTADO 4: Recuperação de Emergência */}
              {status === "recovering" && (
                <div className="animate-in slide-in-from-right-3 duration-300">
                  <h2 className="text-sm font-bold text-rose-400 mb-1 text-center">Recuperação de Emergência</h2>
                  <p className="text-slate-400 text-[11px] text-center mb-3 font-medium">Insira sua chave mestra para resetar a senha</p>

                  <div className="space-y-2.5">
                    <input
                      type="text"
                      placeholder="CHAVE-DE-RECUPERACAO"
                      autoFocus
                      value={inputRecoveryKey}
                      onChange={(e) => setInputRecoveryKey(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-indigo-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono font-bold text-center tracking-wider text-xs"
                    />

                    <div className="h-px bg-slate-800/80 my-1" />

                    <input
                      type="password"
                      placeholder="Nova Senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-bold text-center text-xs placeholder:text-slate-600"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        if (!inputRecoveryKey || password.length < 4) {
                          setLocalError("Preencha a chave e uma senha de 4 dígitos.");
                          return;
                        }
                        onReset(inputRecoveryKey, password);
                      }}
                      className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-950 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      Redefinir e Voltar
                    </button>

                    <button
                      type="button"
                      onClick={onBackToLogin}
                      className="w-full pt-1 text-slate-500 hover:text-slate-300 font-semibold text-[11px] text-center transition-colors cursor-pointer block"
                    >
                      Voltar ao Login
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rodapé Institucional e de Privacidade */}
          <div className="mt-5 pt-4 border-t border-slate-800/60 text-center flex items-center justify-center gap-1.5 text-slate-500 text-[10px] font-semibold tracking-wider uppercase">
            <span className="opacity-60">{Icons.Lock}</span>
            <span>EduSys Security Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
