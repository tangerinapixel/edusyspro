/**
 * Utilitário centralizado para mapeamento e formatação de mensagens amigáveis de erro de IA
 * Garante que falhas de cota, chave inválida, instabilidade do Google ou rede sejam exibidas
 * de forma clara, acolhedora e orientadora ao professor.
 */

export function isAiAuthError(rawError) {
  if (!rawError) return false;
  const errStr = typeof rawError === 'object' 
    ? (rawError.message || rawError.error || JSON.stringify(rawError))
    : String(rawError);
  const lower = errStr.toLowerCase();
  return lower.includes("403") ||
         lower.includes("401") ||
         lower.includes("leaked") ||
         lower.includes("permission_denied") ||
         lower.includes("permission denied") ||
         lower.includes("forbidden") ||
         lower.includes("revogada") ||
         lower.includes("revoked") ||
         lower.includes("api_key_invalid") ||
         lower.includes("api key not valid") ||
         lower.includes("api key expired") ||
         lower.includes("unauthenticated") ||
         (lower.includes("chave de api") && (lower.includes("inválida") || lower.includes("revogada") || lower.includes("expirada")));
}

export function formatAiUserErrorMessage(rawError, defaultContext = 'gerar o conteúdo') {
  if (!rawError) {
    return `Ocorreu uma instabilidade ao ${defaultContext}. Por favor, tente novamente em instantes.`;
  }

  const errStr = typeof rawError === 'object' 
    ? (rawError.message || rawError.error || JSON.stringify(rawError))
    : String(rawError);

  // 1. Licença Institucional / Assinatura
  if (errStr.includes("Licença") || errStr.includes("licença") || errStr.includes("assinatura")) {
    return errStr;
  }

  // 2. Erros de Chave Inválida, Revogada ou Bloqueada (403 / Leaked / Permission Denied)
  if (isAiAuthError(errStr)) {
    return "A chave de API do Google Gemini é inválida, expirou ou foi revogada (Erro 403 / Permissão Negada). Acesse as Configurações do Professor para cadastrar ou atualizar sua chave gratuita do Google AI Studio.";
  }

  // 3. Pico de Demanda / Servidores do Google Ocupados (503 / 500 / Overloaded)
  if (errStr.includes("503") || errStr.includes("high demand") || errStr.includes("overloaded") || errStr.includes("UNAVAILABLE") || errStr.includes("alta demanda")) {
    return "Os servidores do Google Gemini estão passando por um pico temporário de demanda mundial (Erro 503). Por favor, aguarde cerca de 15 a 30 segundos e clique em gerar novamente.";
  }

  // 4. Limite de Cota Gratuita / Too Many Requests (429 / RESOURCE_EXHAUSTED)
  if (errStr.includes("429") || errStr.includes("quota") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("Too Many Requests") || errStr.includes("Limite de Cota")) {
    return "O limite temporário de requisições por minuto do Google Gemini foi atingido (Erro 429 - Cota). Aguarde cerca de 30 segundos para nova tentativa ou cadastre sua chave própria do Google AI Studio nas Configurações para prioridade total.";
  }

  // 5. Modelo não encontrado ou descontinuado (404 / NOT_FOUND)
  if (errStr.includes("404") || errStr.includes("NOT_FOUND") || errStr.includes("not found") || errStr.includes("no longer available")) {
    return "O modelo de inteligência artificial passou por uma atualização na Google Cloud. Por favor, tente gerar novamente para que o sistema utilize a versão mais recente.";
  }

  // 6. Conexão com a Internet / Rede Offline
  if (errStr.includes("fetch failed") || errStr.includes("ENOTFOUND") || errStr.includes("ECONNRESET") || errStr.includes("Failed to fetch") || errStr.includes("Sem conexão")) {
    return "Não foi possível estabelecer contato com a nuvem do Google Gemini. Verifique se o seu dispositivo está conectado à internet e tente novamente.";
  }

  // 7. Timeout / Tempo Limite Excedido
  if (errStr.includes("Tempo limite") || errStr.includes("timeout") || errStr.includes("demorou mais")) {
    return "O motor de inteligência artificial demorou além do esperado para responder devido ao tamanho do conteúdo. Tente novamente selecionando um escopo menor ou aguarde alguns segundos.";
  }

  // Se a mensagem do backend já é explicativa e tratada (sem stack trace ou JSON cru)
  if (errStr.length <= 220 && !errStr.includes("stack") && !errStr.includes("Error:") && !errStr.includes("{") && !errStr.includes("http")) {
    return errStr;
  }

  return `Não foi possível ${defaultContext} no momento devido a uma oscilação na resposta do serviço de IA. Por favor, tente novamente em instantes.`;
}

