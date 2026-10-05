const { GoogleGenerativeAI } = require("@google/generative-ai");
const crypto = require('crypto');
const { dbAPI } = require('../database');

// --- MOTOR SISTÊMICO DE IA (ULTRA RESILIENTE & OTIMIZADO) ---

// --- MOTOR SISTÊMICO DE IA (CIRCUIT BREAKER, STICKY KEY & FAILOVER RÁPIDO) ---

let lastSuccessfulKey = null;
const keyQuarantineMap = new Map(); // key -> expiration timestamp
const KEY_QUARANTINE_MS = 60 * 1000; // 60 segundos de quarentena

function isKeyQuarantined(key) {
    const expire = keyQuarantineMap.get(key);
    if (!expire) return false;
    if (Date.now() > expire) {
        keyQuarantineMap.delete(key);
        return false;
    }
    return true;
}

function quarantineKey(key, reason = "", permanent = false) {
    console.warn(`[Elite-AI CircuitBreaker] Chave em quarentena (${reason}): ${key.substring(0, 10)}...`);
    const duration = permanent ? (24 * 60 * 60 * 1000) : KEY_QUARANTINE_MS;
    keyQuarantineMap.set(key, Date.now() + duration);
    if (lastSuccessfulKey === key) {
        lastSuccessfulKey = null;
    }
}

function isKeyAuthError(msg) {
    if (!msg || typeof msg !== "string") return false;
    const lower = msg.toLowerCase();
    return lower.includes("403") ||
           lower.includes("401") ||
           lower.includes("permission_denied") ||
           lower.includes("permission denied") ||
           lower.includes("leaked") ||
           lower.includes("reported as leaked") ||
           lower.includes("api_key_invalid") ||
           lower.includes("api key not valid") ||
           lower.includes("api key expired") ||
           lower.includes("revoked") ||
           lower.includes("revogada") ||
           lower.includes("forbidden") ||
           lower.includes("unauthenticated");
}

function markKeySuccess(key) {
    keyQuarantineMap.delete(key);
    lastSuccessfulKey = key;
}

const VAULT_CIPHER_SECRET = "EduSysPro_Gemini_Vault_Entropy_v5_2026";
const ENCRYPTED_FALLBACK_KEYS = [
    {
        iv: "37c155a9e9cf4d312880b10e686d6224",
        data: "ef351fbb93adf1e515fc48d3ef9f51386a3216a48f70ebe919ba9de9001d10d15fa25503587efa7ee1629e649750d1bb7eeb0a82fbf31a51e9b9cbed7b77cc96"
    },
    {
        iv: "141ff1ce8438585021f17dbd4b9aa2d7",
        data: "9b1dc8752b6ee53d799ab31eef66d9f5f702ecba817d744fb0b91c6836564bebe23595895a2e09de0304f59dbbb3bc47327cf3f1738db234e5c39b29494330db"
    },
    {
        iv: "108a114ffef10d78ccc8dd8105c4add4",
        data: "9bfd72922aa047400932ff87cb759dc886c663c284385656b45b72d59bac3653315f74fbd58bffd3c3ca8446777d5f82851783bd59043ef73f7af4349874029b"
    }
];

function getDecryptedFallbackKeys() {
    try {
        const derived = crypto.createHash('sha256').update(VAULT_CIPHER_SECRET).digest();
        return ENCRYPTED_FALLBACK_KEYS.map(item => {
            const decipher = crypto.createDecipheriv('aes-256-cbc', derived, Buffer.from(item.iv, 'hex'));
            let d = decipher.update(Buffer.from(item.data, 'hex'), null, 'utf8');
            d += decipher.final('utf8');
            return d;
        });
    } catch (err) {
        console.error('[Elite-AI Vault] Falha ao decifrar chaves de contingência:', err.message);
        return [];
    }
}

function getPrioritizedKeys(userKey = "") {
    const settings = dbAPI.getSettings();
    const fallbackKeys = getDecryptedFallbackKeys();
    const rawKeys = [
        userKey,
        settings.gemini_api_key,
        process.env.GEMINI_API_KEY,
        ...fallbackKeys
    ];
    const uniqueKeys = Array.from(new Set(rawKeys.map(k => k ? k.trim() : "").filter(k => k.length > 0)));

    if (uniqueKeys.length === 0) {
        throw new Error("Nenhuma chave de API configurada.");
    }

    // Separa chaves saudáveis de chaves em quarentena temporária
    const healthyKeys = uniqueKeys.filter(k => !isKeyQuarantined(k));
    const quarantinedKeys = uniqueKeys.filter(k => isKeyQuarantined(k));

    // Se temos uma chave que respondeu com sucesso recentemente, coloca no topo absoluto
    if (lastSuccessfulKey && healthyKeys.includes(lastSuccessfulKey)) {
        const idx = healthyKeys.indexOf(lastSuccessfulKey);
        healthyKeys.splice(idx, 1);
        healthyKeys.unshift(lastSuccessfulKey);
    }

    // Se todas estiverem em quarentena, tenta as em quarentena ordenadas
    return healthyKeys.length > 0 ? [...healthyKeys, ...quarantinedKeys] : uniqueKeys;
}

function withTimeout(promise, ms, errorMsg = "Tempo limite da requisição excedido") {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            const err = new Error(errorMsg);
            err.isTimeout = true;
            reject(err);
        }, ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timeoutId);
    });
}

const MODELS_PRIORITY = [
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
];

async function executeAIRotation(prompt, userKey = "", systemInstruction = null, timeoutMs = 60000) {
    const keysToTry = getPrioritizedKeys(userKey);
    let lastError = null;
    const revokedKeys = new Set();

    for (const modelName of MODELS_PRIORITY) {
        for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
            const currentKey = keysToTry[kIdx];
            if (revokedKeys.has(currentKey)) {
                continue;
            }

            try {
                console.log(`[Elite-AI Otimizado] Executando: ${modelName} | Chave #${kIdx + 1}...`);
                const genAI = new GoogleGenerativeAI(currentKey);
                
                const modelConfig = { 
                    model: modelName,
                    generationConfig: { 
                    temperature: 0.7, 
                    topP: 0.95, 
                    topK: 40,
                    maxOutputTokens: 8192
                }
            };

            if (systemInstruction) {
                modelConfig.systemInstruction = systemInstruction;
                if (systemInstruction.includes("JSON")) {
                    modelConfig.generationConfig.responseMimeType = "application/json";
                }
            }

            const model = genAI.getGenerativeModel(modelConfig);

            // Timeout generoso de 60s para geração densa de documentos pedagógicos complexos (estilo v5.0.5)
            const result = await withTimeout(
                model.generateContent(prompt),
                timeoutMs,
                `Tempo limite (${Math.round(timeoutMs / 1000)}s) excedido na chave #${kIdx + 1} (${modelName})`
            );

            const response = await result.response;
            const text = response.text();
            if (text && text.trim().length > 0) {
                markKeySuccess(currentKey);
                return text;
            }
        } catch (err) {
            lastError = err;
            const msg = err.message || "";
            console.warn(`[Elite-AI] Falha no ${modelName} (Chave #${kIdx + 1}): ${msg.substring(0, 120)}`);
            
            const isServerOrModelDemand = msg.includes("503") || msg.includes("500") || msg.includes("high demand") || msg.includes("overloaded") || msg.includes("UNAVAILABLE");
            const isModelNotFound = msg.includes("404") || msg.includes("not found") || msg.includes("NOT_FOUND");
            const isAuthError = isKeyAuthError(msg);

            if (isAuthError) {
                quarantineKey(currentKey, "Auth / Revoked / 403", true);
                revokedKeys.add(currentKey);

                // Short-circuit: Se todas as chaves disponíveis falharem por autenticação/revogação,
                // interrompe imediatamente todos os loops (sem perder tempo com outros modelos)
                if (revokedKeys.size >= keysToTry.length) {
                    console.error("[Elite-AI CircuitBreaker] Todas as chaves falharam por autenticação/revogação. Interrompendo rotação imediatamente.");
                    throw new Error("A chave de API do Google Gemini é inválida ou foi revogada (Erro 403 / Permissão Negada). Por favor, configure uma nova chave de API válida nas Configurações para continuar utilizando os recursos de IA.");
                }
                continue;
            }

            // Se o modelo for descontinuado ou não encontrado na conta (404), troca de modelo imediatamente sem queimar chave
            if (isModelNotFound) {
                console.warn(`[Elite-AI Failover] Modelo ${modelName} indisponível (404). Acionando próximo modelo da lista...`);
                break;
            }

            // Só coloca chave em quarentena se a falha for na chave (cota/inválida), nunca por pico do modelo na Google Cloud
            if (!isServerOrModelDemand) {
                quarantineKey(currentKey, msg.substring(0, 50));
            }

            // Se o modelo estiver sofrendo alta demanda (503), faz failover imediato para o próximo modelo de contingência
            if (isServerOrModelDemand) {
                console.warn(`[Elite-AI Failover] Modelo ${modelName} sob alta demanda na Google Cloud (503). Acionando próximo modelo da lista...`);
                break;
            }

            if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || err.isTimeout) {
                await new Promise(r => setTimeout(r, 150));
                continue; 
            }
        }
    }

        if (revokedKeys.size >= keysToTry.length) {
            break;
        }
    }

    if (lastError && isKeyAuthError(lastError.message)) {
        throw new Error("A chave de API do Google Gemini é inválida ou foi revogada (Erro 403 / Permissão Negada). Por favor, configure uma nova chave de API válida nas Configurações para continuar utilizando os recursos de IA.");
    }
    if (lastError && (lastError.message.includes("503") || lastError.message.includes("high demand") || lastError.message.includes("overloaded") || lastError.message.includes("UNAVAILABLE"))) {
        throw new Error("Os servidores do Google Gemini estão passando por um pico temporário de alta demanda (Erro 503). Por favor, aguarde cerca de 10 a 20 segundos e tente gerar novamente.");
    }
    if (lastError && (lastError.message.includes("429") || lastError.message.includes("quota") || lastError.message.includes("RESOURCE_EXHAUSTED"))) {
        throw new Error("O limite de requisições gratuitas do Google Gemini foi atingido temporariamente (Erro 429 - Limite de Cota). Por favor, aguarde cerca de 30 segundos para tentar novamente, ou cadastre sua própria chave de API gratuita do Google Gemini nas Configurações para acesso prioritário.");
    }
    throw lastError || new Error("Falha na rotação de IA. Verifique sua conexão e chave de API.");
}

async function executeAIRotationStream(prompt, userKey = "", systemInstruction = null, onChunk = null) {
    const keysToTry = getPrioritizedKeys(userKey);
    let lastError = null;
    const revokedKeys = new Set();

    for (const modelName of MODELS_PRIORITY) {
        for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
            const currentKey = keysToTry[kIdx];
            if (revokedKeys.has(currentKey)) {
                continue;
            }

            try {
                console.log(`[Elite-AI Stream] Executando: ${modelName} | Chave #${kIdx + 1}...`);
                const genAI = new GoogleGenerativeAI(currentKey);
                
                const modelConfig = { 
                    model: modelName,
                    generationConfig: { 
                        temperature: 0.7, 
                        topP: 0.95, 
                        topK: 40,
                        maxOutputTokens: 8192
                    }
                };

                if (systemInstruction) {
                    modelConfig.systemInstruction = systemInstruction;
                }

                const model = genAI.getGenerativeModel(modelConfig);

                // Timeout de 8s para o primeiro chunk; se a chave travar, roda a próxima rapidamente
                const streamPromise = model.generateContentStream(prompt);
                const result = await withTimeout(
                    streamPromise,
                    8000,
                    `Timeout de conexão na chave #${kIdx + 1} (${modelName})`
                );

                let fullText = "";
                let firstChunkReceived = false;

                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    if (chunkText) {
                        if (!firstChunkReceived) {
                            firstChunkReceived = true;
                            markKeySuccess(currentKey);
                        }
                        fullText += chunkText;
                        if (onChunk) onChunk(chunkText);
                    }
                }

                if (fullText && fullText.trim().length > 0) {
                    markKeySuccess(currentKey);
                    return fullText;
                }
            } catch (err) {
                lastError = err;
                const msg = err.message || "";
                console.warn(`[Elite-AI Stream] Falha no ${modelName} (Chave #${kIdx + 1}): ${msg.substring(0, 120)}`);
                
                const isServerOrModelDemand = msg.includes("503") || msg.includes("500") || msg.includes("high demand") || msg.includes("overloaded") || msg.includes("UNAVAILABLE");
                const isModelNotFound = msg.includes("404") || msg.includes("not found") || msg.includes("NOT_FOUND");
                const isAuthError = isKeyAuthError(msg);

                if (isAuthError) {
                    quarantineKey(currentKey, "Auth / Revoked / 403", true);
                    revokedKeys.add(currentKey);

                    if (revokedKeys.size >= keysToTry.length) {
                        console.error("[Elite-AI Stream CircuitBreaker] Todas as chaves falharam por autenticação/revogação. Interrompendo streaming imediatamente.");
                        throw new Error("A chave de API do Google Gemini é inválida ou foi revogada (Erro 403 / Permissão Negada). Por favor, configure uma nova chave de API válida nas Configurações para continuar utilizando os recursos de IA.");
                    }
                    continue;
                }

                if (isModelNotFound) {
                    console.warn(`[Elite-AI Stream Failover] Modelo ${modelName} indisponível (404). Acionando próximo modelo da lista...`);
                    break;
                }

                if (!isServerOrModelDemand && !isModelNotFound) {
                    quarantineKey(currentKey, msg.substring(0, 50));
                }

                if (isServerOrModelDemand) {
                    console.warn(`[Elite-AI Stream Failover] Modelo ${modelName} sob alta demanda na Google Cloud (503). Acionando próximo modelo da lista...`);
                    break;
                }
                if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || err.isTimeout) {
                    await new Promise(r => setTimeout(r, 150));
                    continue; 
                }
            }
        }

        if (revokedKeys.size >= keysToTry.length) {
            break;
        }
    }

    if (lastError && isKeyAuthError(lastError.message)) {
        throw new Error("A chave de API do Google Gemini é inválida ou foi revogada (Erro 403 / Permissão Negada). Por favor, configure uma nova chave de API válida nas Configurações para continuar utilizando os recursos de IA.");
    }
    if (lastError && (lastError.message.includes("503") || lastError.message.includes("high demand") || lastError.message.includes("overloaded") || lastError.message.includes("UNAVAILABLE"))) {
        throw new Error("Os servidores do Google Gemini estão passando por um pico temporário de alta demanda (Erro 503). Por favor, aguarde cerca de 10 a 20 segundos e tente gerar novamente.");
    }
    if (lastError && (lastError.message.includes("429") || lastError.message.includes("quota") || lastError.message.includes("RESOURCE_EXHAUSTED"))) {
        throw new Error("O limite de requisições gratuitas do Google Gemini foi atingido temporariamente (Erro 429 - Limite de Cota). Por favor, aguarde cerca de 30 segundos para tentar novamente, ou cadastre sua própria chave de API gratuita do Google Gemini nas Configurações para acesso prioritário.");
    }
    
    return executeAIRotation(prompt, userKey, systemInstruction);
}

// --- SISTEMA DE CACHE DE IA (RESPOSTAS INSTANTÂNEAS) ---
const aiResponseCache = new Map();
const CACHE_MAX_ENTRIES = 50;

function getAICache(key) {
    const item = aiResponseCache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > 2 * 60 * 60 * 1000) { // 2 horas
        aiResponseCache.delete(key);
        return null;
    }
    return item.text;
}

function setAICache(key, text) {
    if (aiResponseCache.size >= CACHE_MAX_ENTRIES) {
        const oldestKey = aiResponseCache.keys().next().value;
        aiResponseCache.delete(oldestKey);
    }
    aiResponseCache.set(key, { text, timestamp: Date.now() });
}

function generateHashKey(prefix, payload) {
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return `${prefix}:${crypto.createHash('md5').update(str).digest('hex')}`;
}

function parseJSONSafely(rawText) {
    if (!rawText) throw new Error("A IA não retornou nenhum conteúdo.");

    let str = (rawText || "").trim();
    // 0. Limpeza de blocos Markdown e normalização de aspas tipográficas
    str = str.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    str = str.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

    // Localizar primeiro delimitador JSON ({ ou [)
    const firstBrace = str.indexOf('{');
    const firstBracket = str.indexOf('[');
    let startIdx = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIdx = firstBrace;
    } else if (firstBracket !== -1) {
        startIdx = firstBracket;
    }

    if (startIdx !== -1) {
        let depth = 0;
        let inQuote = false;
        let escaped = false;
        let endIdx = -1;

        for (let i = startIdx; i < str.length; i++) {
            const char = str[i];
            if (char === '\\' && !escaped) {
                escaped = true;
                continue;
            }
            if (char === '"' && !escaped) {
                inQuote = !inQuote;
            }
            if (!inQuote) {
                if (char === '{' || char === '[') depth++;
                else if (char === '}' || char === ']') {
                    depth--;
                    if (depth === 0) {
                        endIdx = i;
                        break;
                    }
                }
            }
            escaped = false;
        }

        if (endIdx !== -1) {
            str = str.substring(startIdx, endIdx + 1);
        } else {
            str = str.substring(startIdx);
        }
    }

    // 1. Tentar parse direto
    try {
        return JSON.parse(str);
    } catch (e1) {
        // Parse direto falhou, prosseguir com reparos
    }

    // 2. Sanitização de aspas internas e quebras de linha brutas
    let inString = false;
    let escaped = false;
    let fixedStr = '';

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (char === '\\' && !escaped) {
            escaped = true;
            fixedStr += char;
            continue;
        }

        if (char === '"' && !escaped) {
            if (!inString) {
                inString = true;
                fixedStr += char;
            } else {
                // Verificar se é fechamento legítimo olhando o próximo caractere não-espaço
                let nextChar = '';
                for (let j = i + 1; j < str.length; j++) {
                    const c = str[j];
                    if (c !== ' ' && c !== '\t' && c !== '\r' && c !== '\n') {
                        nextChar = c;
                        break;
                    }
                }
                if (nextChar === ':' || nextChar === ',' || nextChar === '}' || nextChar === ']' || nextChar === '') {
                    inString = false;
                    fixedStr += char;
                } else {
                    // Aspa interna no meio da string: escapa com barra invertida
                    fixedStr += '\\"';
                }
            }
            escaped = false;
            continue;
        }

        if (inString) {
            if (char === '\n') {
                fixedStr += '\\n';
            } else if (char === '\r') {
                // ignora carriage return
            } else if (char === '\t') {
                fixedStr += '\\t';
            } else {
                fixedStr += char;
            }
        } else {
            fixedStr += char;
        }

        escaped = false;
    }

    // Remover vírgulas residuais no final de arrays/objetos
    fixedStr = fixedStr.replace(/,\s*([}\]])/g, '$1');

    try {
        return JSON.parse(fixedStr);
    } catch (e2) {
        // Tentar recuperação de JSON truncado
    }

    // 3. Reparo para respostas truncadas (fechamento automático de aspas e colchetes/chaves)
    let repairedStr = fixedStr;
    let inQuote = false;
    let isEscaped = false;
    const openBrackets = [];

    for (let i = 0; i < repairedStr.length; i++) {
        const ch = repairedStr[i];
        if (ch === '\\' && !isEscaped) {
            isEscaped = true;
            continue;
        }
        if (ch === '"' && !isEscaped) {
            inQuote = !inQuote;
        }
        if (!inQuote) {
            if (ch === '{') openBrackets.push('}');
            else if (ch === '[') openBrackets.push(']');
            else if (ch === '}' || ch === ']') openBrackets.pop();
        }
        isEscaped = false;
    }

    if (inQuote) {
        repairedStr += '"';
    }

    while (openBrackets.length > 0) {
        repairedStr += openBrackets.pop();
    }

    repairedStr = repairedStr.replace(/,\s*([}\]])/g, '$1');

    try {
        return JSON.parse(repairedStr);
    } catch (e3) {
        console.error("[JSON Repair] Erro fatal ao parsear JSON:", e3.message);
        throw new Error("A IA gerou um formato de resposta com inconsistência de formatação. Por favor, tente regerar o plano ou atividade.");
    }
}

module.exports = {
    executeAIRotation,
    executeAIRotationStream,
    aiResponseCache,
    getAICache,
    setAICache,
    generateHashKey,
    parseJSONSafely,
    getPrioritizedKeys,
    withTimeout,
    MODELS_PRIORITY,
    quarantineKey,
    markKeySuccess,
    cache: {
        get: getAICache,
        set: setAICache,
        map: aiResponseCache
    },
    hash: generateHashKey
};


