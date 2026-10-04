import React, { useRef, useState, useEffect } from 'react';

const ScannerOMR = ({ onScanSuccess, onScanError, active }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null); // Singleton AudioContext — evita leak por criação repetida
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [stream, setStream] = useState(null);
  const [statusText, setStatusText] = useState('Inicializando câmera...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashSuccess, setFlashSuccess] = useState(false);
  const [flashError, setFlashError] = useState(false);
  const [isScanningPaused, setIsScanningPaused] = useState(false);
  const [omrErrorText, setOmrErrorText] = useState('');
  // Dados do último scan bem-sucedido para o overlay visual de diagnóstico de bolhas
  const [scanOverlay, setScanOverlay] = useState(null);

  // Singleton AudioContext reutilizado para evitar esgotamento do pool do navegador/Electron
  const getAudioCtx = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
    } catch (err) {
      console.warn('Web Audio init failure:', err);
      return null;
    }
  };

  // Synthesize Web Audio sounds offline
  const playSound = (success) => {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (success) {
        // High double beep for success (Elite feel)
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else {
        // Low single beep for error
        osc.frequency.setValueAtTime(220.00, ctx.currentTime); // A3
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (err) {
      console.warn('Web Audio failure:', err);
    }
  };

  // Enumerate camera devices with automatic listener and proper track release
  useEffect(() => {
    let isMounted = true;

    const getDevices = async () => {
      try {
        // Obter permissão temporária para listar nomes reais dos dispositivos
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Imediatamente liberar a track para NÃO bloquear o hardware da câmera USB no Windows
        tempStream.getTracks().forEach(t => t.stop());

        const list = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = list.filter(d => d.kind === 'videoinput');
        
        if (!isMounted) return;
        setDevices(videoInputs);
        
        // Se não há dispositivo selecionado ou o atual não está mais na lista, seleciona o primeiro
        setSelectedDevice(prev => {
          if (videoInputs.length === 0) return '';
          const exists = videoInputs.some(d => d.deviceId === prev);
          return exists && prev ? prev : videoInputs[0].deviceId;
        });
      } catch (err) {
        if (!isMounted) return;
        console.warn('Erro ao obter dispositivos de vídeo:', err);
        setStatusText('Permissão de câmera não concedida ou dispositivo ocupado.');
        if (onScanError) onScanError(err.message);
      }
    };

    getDevices();

    // Reagir a câmeras USB plugadas ou desplugadas em tempo real
    const handleDeviceChange = () => {
      getDevices();
    };
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }

    return () => {
      isMounted = false;
      if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
    };
  }, []);

  // Stop camera feed safely
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Start camera feed based on selected device
  useEffect(() => {
    if (!active || !selectedDevice) {
      stopCamera();
      return;
    }

    let isSubscribed = true;

    const startCamera = async () => {
      stopCamera();
      setStatusText('Iniciando feed da câmera...');
      try {
        // Câmeras USB em desktop/notebook: não utilizar facingMode com deviceId para evitar OverconstrainedError
        const constraints = {
          video: {
            deviceId: { exact: selectedDevice },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        let mediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (exactErr) {
          console.warn('Falha com restrição exata de deviceId, tentando fallback resiliente:', exactErr);
          // Fallback resiliente caso o deviceId tenha mudado ou driver rejeite restrições exatas
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: selectedDevice,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
        }

        if (!isSubscribed) {
          mediaStream.getTracks().forEach(t => t.stop());
          return;
        }

        setStream(mediaStream);
        setStatusText('Câmera conectada. Enquadre a folha.');
      } catch (err) {
        if (!isSubscribed) return;
        console.error('Error starting video stream:', err);
        setStatusText('Erro ao conectar com a câmera selecionada. Verifique se outro app está usando a câmera.');
      }
    };

    startCamera();

    return () => {
      isSubscribed = false;
      stopCamera();
    };
  }, [selectedDevice, active]);

  // BUG-02: Resetar pausa quando a câmera é reativada após fechamento de modal
  // Garante que isScanningPaused não fique travado em true quando active volta de false → true
  const prevActiveRef = useRef(active);
  useEffect(() => {
    if (active && !prevActiveRef.current) {
      setIsScanningPaused(false);
      setScanOverlay(null); // Limpa o overlay de diagnóstico junto com a retomada
    }
    prevActiveRef.current = active;
  }, [active]);

  // Sincronização direta e reativa entre stream e o elemento <video>
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      video.play().catch(err => {
        // Tratamento silencioso de restrição de autoplay
        console.warn('Vídeo play() pendente de interação:', err);
      });
    } else {
      video.srcObject = null;
    }
  }, [stream]);

  // Capture Frame and Process OMR com loop assíncrono encadeado e contínuo
  useEffect(() => {
    if (!active || !stream) return;

    let isCancelled = false;
    let timerId = null;
    let flashTimer = null;
    let pauseTimer = null;

    const processFrame = async () => {
      if (isCancelled) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        if (!isCancelled) timerId = setTimeout(processFrame, 250);
        return;
      }

      setIsProcessing(true);

      // Limitar resolução a 1280px máx para economizar IPC e memória sem perder acurácia
      let targetWidth = video.videoWidth;
      let targetHeight = video.videoHeight;
      const maxDim = 1280;
      if (targetWidth > maxDim) {
        const factor = maxDim / targetWidth;
        targetWidth = maxDim;
        targetHeight = Math.round(targetHeight * factor);
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

      // Convert canvas to jpeg base64 URL otimizado
      const base64Image = canvas.toDataURL('image/jpeg', 0.72);

      let isSuccessFrame = false;

      try {
        if (window.electronAPI && window.electronAPI.omrProcess) {
          const res = await window.electronAPI.omrProcess(base64Image);
          if (res.success && !isCancelled) {
            isSuccessFrame = true;
            setOmrErrorText('');
            setFlashSuccess(true);
            playSound(true);
            flashTimer = setTimeout(() => {
              if (!isCancelled) setFlashSuccess(false);
            }, 400);

            setIsScanningPaused(true);
            // Popula o overlay de diagnóstico com os dados retornados pelo engine
            if (res.bubbleCoords && res.imgWidth) {
              setScanOverlay({
                bubbles: res.bubbleCoords,
                answers: res.answers,
                centroids: res.centroids,
                imgW: res.imgWidth,
                imgH: res.imgHeight
              });
            }
            if (onScanSuccess) {
              onScanSuccess(res);
            }

            // Cooldown de 2.5s para troca física da folha antes de retomar a leitura contínua
            pauseTimer = setTimeout(() => {
              if (!isCancelled) {
                setScanOverlay(null); // Apaga o overlay antes de reativar o loop
                setIsScanningPaused(false);
                processFrame();
              }
            }, 2500);
          } else if (!isCancelled) {
            // BUG-03: Exibir flash vermelho de erro apenas quando há uma mensagem de orientação real
            // (exclui mensagens de alinhamento que são esperadas durante o enquadramento)
            const errorMsg = res.error || '';
            setOmrErrorText(errorMsg);
            if (errorMsg) {
              setFlashError(true);
              if (flashTimer) clearTimeout(flashTimer);
              flashTimer = setTimeout(() => {
                if (!isCancelled) setFlashError(false);
              }, 350);
            }
          }
        }
      } catch (e) {
        console.error('Error processing OMR frame:', e);
      } finally {
        setIsProcessing(false);
        // Se não foi uma leitura de sucesso, agenda a próxima tentativa em 280ms
        if (!isCancelled && !isSuccessFrame) {
          timerId = setTimeout(processFrame, 280);
        }
      }
    };

    // Inicia o loop
    timerId = setTimeout(processFrame, 250);

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
      if (flashTimer) clearTimeout(flashTimer);
      if (pauseTimer) clearTimeout(pauseTimer);
    };
  }, [stream, active]);

  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-inner flex flex-col items-center justify-center">
      
      {/* Hidden Canvas for Frame Capturing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video Feed - Sempre presente no DOM para evitar problemas de ref e montagem assíncrona */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.warn);
          }
        }}
        className={`w-full h-full object-contain bg-slate-950 relative z-0 ${active && stream ? 'block' : 'hidden'}`}
      />

      {(!active || !stream) && (
        <div className="text-slate-500 text-sm font-semibold p-8 text-center flex flex-col items-center gap-3">
          <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {!active ? "Câmera inativa. Preencha o gabarito oficial e clique em 'Ativar Câmera'." : statusText}
        </div>
      )}

      {/* Graphical Guidance Overlay */}
      {active && stream && (
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
          {/* Top Row: QR Target and Device selection */}
          <div className="flex justify-between items-start pointer-events-auto">
            {/* QR Guide Target */}
            <div className="w-24 h-24 border-2 border-dashed border-indigo-500/40 rounded-xl bg-indigo-500/5 flex items-center justify-center relative shadow-inner">
              <span className="text-[9px] font-black text-indigo-400/80 uppercase tracking-widest text-center px-1">QR Code Aluno</span>
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-indigo-400"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-indigo-400"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-indigo-400"></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-indigo-400"></div>
            </div>

            {/* Camera Select dropdown */}
            <div className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-1.5 flex items-center gap-2 pointer-events-auto max-w-xs shadow-lg">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="bg-transparent border-none text-slate-200 text-xs font-bold focus:outline-none cursor-pointer max-w-36"
              >
                {devices.map(d => (
                  <option key={d.deviceId} value={d.deviceId} className="bg-slate-950 text-slate-200 font-medium">
                    {d.label || `Câmera ${devices.indexOf(d) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Center alignment brackets - Geometria 1:1 com o A4 e com o motor OMR (72% de altura) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg viewBox="0 0 600 848" className={`h-[72%] w-auto aspect-[600/848] transition-all duration-300 ${flashSuccess ? 'stroke-emerald-400 text-emerald-400 opacity-100 scale-[1.02]' : 'stroke-indigo-500 text-indigo-500 opacity-75'}`}>
              {/* Contorno sutil da folha A4 */}
              <rect x="8" y="8" width="584" height="832" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" rx="10" opacity="0.35" />

              {/* Âncora Superior-Esquerda (Centro: 48, 48) */}
              <path d="M 28,48 L 28,28 L 48,28" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <rect x="25" y="25" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" rx="4" opacity="0.6" />
              <circle cx="48" cy="48" r="4" fill="currentColor" />

              {/* Âncora Superior-Direita (Centro: 552, 48) */}
              <path d="M 572,48 L 572,28 L 552,28" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <rect x="529" y="25" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" rx="4" opacity="0.6" />
              <circle cx="552" cy="48" r="4" fill="currentColor" />

              {/* Âncora Inferior-Esquerda (Centro: 48, 800) */}
              <path d="M 28,800 L 28,820 L 48,820" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <rect x="25" y="777" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" rx="4" opacity="0.6" />
              <circle cx="48" cy="800" r="4" fill="currentColor" />

              {/* Âncora Inferior-Direita (Centro: 552, 800) */}
              <path d="M 572,800 L 572,820 L 552,820" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <rect x="529" y="777" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" rx="4" opacity="0.6" />
              <circle cx="552" cy="800" r="4" fill="currentColor" />
            </svg>
          </div>

          {/* Bottom Bar: Status / Error messages */}
          <div className="w-full flex justify-center pointer-events-auto">
            {omrErrorText ? (
              <div className="bg-rose-500/90 backdrop-blur-sm border border-rose-400 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg animate-bounce">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {omrErrorText}
              </div>
            ) : isScanningPaused ? (
              <div className="bg-emerald-500/95 text-slate-950 font-black text-xs px-6 py-2.5 rounded-full flex items-center gap-2 shadow-lg animate-pulse">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                PROVA ESCANEADA! AGUARDE...
              </div>
            ) : (
              <div className="bg-slate-900/90 text-slate-300 font-semibold text-xs px-5 py-2.5 rounded-full flex items-center gap-2 border border-slate-800 shadow-md">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
                Aline os marcadores da folha com os alvos digitais
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screen Success Flash */}
      {flashSuccess && (
        <div className="absolute inset-0 bg-emerald-500/30 z-30 transition-opacity duration-300 pointer-events-none flex items-center justify-center border-4 border-emerald-400 animate-in fade-in" />
      )}

      {/* Bubble Diagnostic Overlay — visível durante os 2.5s de cooldown pós-scan */}
      {scanOverlay && isScanningPaused && (
        <svg
          viewBox={`0 0 ${scanOverlay.imgW} ${scanOverlay.imgH}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full z-20 pointer-events-none"
        >
          {/* Confirmação visual das 4 âncoras detectadas */}
          {scanOverlay.centroids && Object.values(scanOverlay.centroids).map((c, i) => (
            <rect
              key={`anchor-${i}`}
              x={c.x - 10} y={c.y - 10} width={20} height={20}
              fill="none" stroke="#818cf8" strokeWidth="2.5" opacity="0.9"
            />
          ))}

          {/* Bolhas de cada questão */}
          {scanOverlay.bubbles.map(b => {
            const answer = scanOverlay.answers[b.qNum];
            const isFilled = answer === b.option;
            const isMultiple = answer === 'MULTIPLE';
            const isBlank = answer === 'BLANK';

            if (isMultiple) {
              // Todas as 5 bolhas em âmbar para questoes com dupla marcação
              return (
                <circle key={`${b.qNum}-${b.option}`}
                  cx={b.x} cy={b.y} r={9}
                  fill="#f59e0b" fillOpacity="0.45"
                  stroke="#fbbf24" strokeWidth="1.5"
                />
              );
            }
            if (isFilled) {
              // Bolha detectada como preenchida — verde sólido com label da letra
              return (
                <g key={`${b.qNum}-${b.option}`}>
                  <circle cx={b.x} cy={b.y} r={10}
                    fill="#22c55e" fillOpacity="0.82"
                    stroke="#4ade80" strokeWidth="2"
                  />
                  <text x={b.x} y={b.y + 0.5}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="9" fontWeight="bold" fill="white" fillOpacity="0.95"
                  >
                    {b.option}
                  </text>
                </g>
              );
            }
            // Bolhas vazias ou de questões em branco: anel sutil
            return (
              <circle key={`${b.qNum}-${b.option}`}
                cx={b.x} cy={b.y} r={7}
                fill="none"
                stroke={isBlank ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.12)'}
                strokeWidth="1"
              />
            );
          })}
        </svg>
      )}

      {/* Screen Error Flash */}
      {flashError && (
        <div className="absolute inset-0 bg-rose-500/30 z-30 transition-opacity duration-300 pointer-events-none flex items-center justify-center border-4 border-rose-400 animate-in fade-in" />
      )}
    </div>
  );
};

export default ScannerOMR;
