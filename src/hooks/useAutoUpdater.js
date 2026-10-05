import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';

const SNOOZE_SESSION_KEY = 'edusys_updater_snoozed_session_version';

// Estado global compartilhado (Singleton Store)
let globalUpdaterState = {
  state: 'IDLE', // 'IDLE' | 'CHECKING' | 'AVAILABLE' | 'DOWNLOADING' | 'DOWNLOADED' | 'ERROR'
  currentVersion: '5.5.2',
  newVersion: null,
  releaseName: null,
  releaseNotes: null,
  releaseDate: null,
  progress: 0,
  error: null,
  isFloatingVisible: false,
  isChangelogModalOpen: false,
  isSnoozed: false,
  hasPendingUpdate: false
};

const listeners = new Set();

function emitChange() {
  listeners.forEach(listener => listener());
}

function updateGlobalState(updater) {
  const next = typeof updater === 'function' ? updater(globalUpdaterState) : { ...globalUpdaterState, ...updater };
  globalUpdaterState = next;
  emitChange();
}

function isVersionSnoozed(version) {
  if (!version) return false;
  try {
    const snoozedVersion = sessionStorage.getItem(SNOOZE_SESSION_KEY);
    return snoozedVersion === version;
  } catch (e) {
    return false;
  }
}

// Inicializador de escuta e temporizador defensivo (roda uma única vez)
let isInitialized = false;

function initUpdaterStore() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // Purga proativamente qualquer bloqueio antigo herdado do localStorage
  try {
    localStorage.removeItem('edusys_updater_snoozed_version');
    localStorage.removeItem('edusys_updater_snoozed_at');
  } catch (e) {}

  // 1. Obtém o estado inicial do backend Electron
  if (window.electronAPI?.updaterGetStatus) {
    window.electronAPI.updaterGetStatus().then(status => {
      if (status) {
        const hasPending = status.state === 'DOWNLOADED' || 
                           status.state === 'DOWNLOADING' || 
                           (status.state === 'AVAILABLE' && Boolean(status.newVersion));
        const snoozed = isVersionSnoozed(status.newVersion);

        updateGlobalState(prev => ({
          ...prev,
          ...status,
          currentVersion: status.currentVersion || status.version || prev.currentVersion,
          hasPendingUpdate: hasPending,
          isSnoozed: snoozed,
          // Se já está pronto (DOWNLOADED), ou se não está adiado, agenda a exibição
          isFloatingVisible: status.state === 'DOWNLOADED' ? true : (hasPending && !snoozed)
        }));
      }
    }).catch(() => {});
  }

  // 2. Escuta eventos em tempo real do AutoUpdater
  if (window.electronAPI?.onUpdaterStatus) {
    window.electronAPI.onUpdaterStatus(status => {
      if (!status) return;

      const hasPending = status.state === 'DOWNLOADED' || 
                         status.state === 'DOWNLOADING' || 
                         (status.state === 'AVAILABLE' && Boolean(status.newVersion));
      const snoozed = isVersionSnoozed(status.newVersion);

      updateGlobalState(prev => ({
        ...prev,
        ...status,
        currentVersion: status.currentVersion || status.version || prev.currentVersion,
        hasPendingUpdate: hasPending,
        isSnoozed: snoozed,
        isFloatingVisible: status.state === 'DOWNLOADED' 
          ? true 
          : status.state === 'DOWNLOADING'
            ? true
            : (hasPending && !snoozed ? true : prev.isFloatingVisible)
      }));
    });
  }

  // 3. Temporizador inteligente: 12s após a inicialização, reavalia se há atualização pendente para reengajar
  setTimeout(() => {
    if (globalUpdaterState.hasPendingUpdate && !isVersionSnoozed(globalUpdaterState.newVersion)) {
      updateGlobalState({ isFloatingVisible: true });
    }
  }, 12000);
}

/**
 * Hook modular para controle elegante do ciclo de vida das atualizações do EduSys Pro.
 */
export function useAutoUpdater() {
  // Garante a inicialização única do listener
  useEffect(() => {
    initUpdaterStore();
  }, []);

  const state = useSyncExternalStore(
    onStoreChange => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => globalUpdaterState
  );

  const startDownload = useCallback(async () => {
    try {
      try {
        sessionStorage.removeItem(SNOOZE_SESSION_KEY);
      } catch (e) {}

      updateGlobalState({
        state: 'DOWNLOADING',
        progress: 0,
        isSnoozed: false,
        hasPendingUpdate: true,
        isFloatingVisible: true
      });

      if (window.electronAPI?.updaterDownload) {
        return await window.electronAPI.updaterDownload();
      }
    } catch (err) {
      console.error('[useAutoUpdater] Erro ao iniciar download da atualização:', err);
      updateGlobalState({ state: 'ERROR', error: err.message });
      return { success: false, error: err.message };
    }
  }, []);

  const installUpdate = useCallback(async () => {
    try {
      if (window.electronAPI?.updaterInstall) {
        await window.electronAPI.updaterInstall();
      }
    } catch (err) {
      console.error('[useAutoUpdater] Erro ao instalar atualização:', err);
    }
  }, []);

  const checkNow = useCallback(async () => {
    try {
      if (window.electronAPI?.updaterCheck) {
        return await window.electronAPI.updaterCheck();
      }
    } catch (err) {
      console.error('[useAutoUpdater] Erro ao verificar atualizações:', err);
      return { success: false, error: err.message };
    }
  }, []);

  const snoozeForSession = useCallback(() => {
    try {
      const version = globalUpdaterState.newVersion;
      if (version) {
        sessionStorage.setItem(SNOOZE_SESSION_KEY, version);
      }
    } catch (e) {}

    updateGlobalState({
      isSnoozed: true,
      isFloatingVisible: false
    });
  }, []);

  const dismissFloating = useCallback(() => {
    updateGlobalState({ isFloatingVisible: false });
  }, []);

  const openFloating = useCallback(() => {
    try {
      sessionStorage.removeItem(SNOOZE_SESSION_KEY);
    } catch (e) {}
    updateGlobalState({
      isSnoozed: false,
      isFloatingVisible: true
    });
  }, []);

  const openChangelog = useCallback(() => {
    updateGlobalState({ isChangelogModalOpen: true });
  }, []);

  const closeChangelog = useCallback(() => {
    updateGlobalState({ isChangelogModalOpen: false });
  }, []);

  const isDownloaded = state.state === 'DOWNLOADED';
  const isDownloading = state.state === 'DOWNLOADING';
  const isAvailableToDownload = state.state === 'AVAILABLE';

  return {
    ...state,
    isDownloaded,
    isDownloading,
    isAvailableToDownload,
    startDownload,
    installUpdate,
    checkNow,
    snoozeForSession,
    dismissFloating,
    openFloating,
    openChangelog,
    closeChangelog
  };
}

export default useAutoUpdater;
