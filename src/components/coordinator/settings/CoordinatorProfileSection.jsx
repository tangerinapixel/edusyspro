/* eslint-disable react/prop-types */
import { useState, useRef } from 'react';

/**
 * Seção de Perfil da Coordenação Pedagógica
 * Permite alteração de nome e upload/remoção de avatar fotográfico com compressão canvas.
 */
export default function CoordinatorProfileSection({ settings, onUpdateSuccess, onBack }) {
  const [name, setName] = useState(settings?.coordinatorName || '');
  const [avatar, setAvatar] = useState(settings?.avatar || null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  // Processa arquivo de imagem e converte para Base64 otimizado (256x256)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', text: 'Selecione um arquivo de imagem válido (PNG, JPG ou WebP).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatar(dataUrl);
        setFeedback({ type: 'info', text: 'Foto carregada! Clique em "Salvar Alterações" para confirmar.' });
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFeedback({ type: 'info', text: 'Avatar removido. Clique em "Salvar Alterações" para confirmar.' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({ type: 'error', text: 'O nome do gestor não pode ficar em branco.' });
      return;
    }

    setIsSaving(true);
    setFeedback({ type: '', text: '' });

    try {
      if (!window.electronAPI?.coordinatorUpdateProfile) {
        throw new Error('Canal de comunicação da coordenação indisponível.');
      }

      const res = await window.electronAPI.coordinatorUpdateProfile({
        name: name.trim(),
        avatar
      });

      if (res && res.success) {
        setFeedback({ type: 'success', text: 'Perfil institucional atualizado com sucesso!' });
        if (typeof onUpdateSuccess === 'function') {
          onUpdateSuccess({ coordinatorName: res.coordinatorName, avatar: res.avatar });
        }
      } else {
        setFeedback({ type: 'error', text: res?.error || 'Não foi possível salvar as alterações.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Erro inesperado ao salvar perfil.' });
    } finally {
      setIsSaving(false);
    }
  };

  const initialLetter = (name || 'G').charAt(0).toUpperCase();

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Barra de Retorno */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Voltar ao Hub de Configurações</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header do Card */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Perfil da Gestão & Identificação</h2>
              <p className="text-xs text-slate-500 font-medium">Nome do gestor e foto oficial para o cabeçalho e dossiês.</p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg">
            Perfil Ativo
          </span>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Feedback */}
          {feedback.text && (
            <div className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 animate-in fade-in ${
              feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              feedback.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
              'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              <span>{feedback.type === 'success' ? '✓' : feedback.type === 'error' ? '⚠️' : 'ℹ️'}</span>
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Área de Avatar */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-indigo-200/80 shadow-md shadow-indigo-500/10 flex items-center justify-center bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-3xl">
                {avatar ? (
                  <img src={avatar} alt="Avatar do Gestor" className="w-full h-full object-cover" />
                ) : (
                  <span>{initialLetter}</span>
                )}
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <h3 className="text-sm font-bold text-slate-800">Foto de Perfil do(a) Gestor(a)</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                Esta foto será exibida no cabeçalho do painel da coordenação e nos laudos institucionais emitidos.
              </p>

              <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start flex-wrap">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  id="coordinator-avatar-input"
                />
                <label
                  htmlFor="coordinator-avatar-input"
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Alterar Imagem</span>
                </label>

                {avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-bold transition-all cursor-pointer active:scale-95"
                  >
                    Remover Foto
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Campo de Nome */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Nome Completo do(a) Gestor(a)</span>
              <span className="text-[10px] text-slate-400 font-semibold">Exibição pública nos relatórios</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Genilson Freitas"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              required
            />
          </div>

          {/* Botão de Submissão */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs hover:shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando Perfil...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-indigo-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Salvar Alterações de Perfil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
