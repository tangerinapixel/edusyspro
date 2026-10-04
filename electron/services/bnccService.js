// Catálogo e Serviço Centralizador de Habilidades da BNCC no Backend (Electron)
// Garante consistência pedagógica e enriquece códigos com descrições oficiais

const BNCC_HABILIDADES = [
  // ==========================================
  // LÍNGUA PORTUGUESA - ANOS FINAIS (6º ao 9º)
  // ==========================================
  // 6º e 7º Anos
  {
    codigo: "EF67LP28",
    disciplina: "Língua Portuguesa",
    anos: [6, 7],
    descricao: "Ler, de forma autônoma, e compreender romances infanto-juvenis, contos populares, de terror, crônicas e narrativas de enigma, expressando avaliação sobre o texto lido."
  },
  {
    codigo: "EF67LP30",
    disciplina: "Língua Portuguesa",
    anos: [6, 7],
    descricao: "Criar narrativas ficcionais (contos, fábulas, mitos) utilizando cenários, personagens, enredo, foco narrativo e recursos expressivos da pontuação."
  },
  {
    codigo: "EF67LP32",
    disciplina: "Língua Portuguesa",
    anos: [6, 7],
    descricao: "Escrever palavras com correção ortográfica, obedecendo às convenções da língua padrão e às regras básicas de acentuação."
  },
  {
    codigo: "EF67LP33",
    disciplina: "Língua Portuguesa",
    anos: [6, 7],
    descricao: "Pontuar textos adequadamente para estruturar orações e períodos, empregando vírgula, ponto e vírgula, dois-pontos e travessão de diálogo."
  },
  {
    codigo: "EF67LP36",
    disciplina: "Língua Portuguesa",
    anos: [6, 7],
    descricao: "Utilizar recursos de coesão referencial (pronomes, sinônimos) e sequencial (conjunções e conectivos) para encadeamento de ideias."
  },
  {
    codigo: "EF67LP38",
    disciplina: "Língua Portuguesa",
    anos: [6, 7],
    descricao: "Analisar os efeitos de sentido do uso de figuras de linguagem (metáfora, comparação, metonímia, personificação, hipérbole)."
  },

  // 6º ao 9º Anos (Habilidades Gerais / Transversais)
  {
    codigo: "EF69LP44",
    disciplina: "Língua Portuguesa",
    anos: [6, 7, 8, 9],
    descricao: "Inferir a presença de valores sociais, culturais e humanos e a visão de mundo em textos literários de diferentes épocas e tradições."
  },
  {
    codigo: "EF69LP47",
    disciplina: "Língua Portuguesa",
    anos: [6, 7, 8, 9],
    descricao: "Analisar, em textos argumentativos e de opinião, a tese central, os argumentos de sustentação e a contra-argumentação."
  },
  {
    codigo: "EF69LP53",
    disciplina: "Língua Portuguesa",
    anos: [6, 7, 8, 9],
    descricao: "Ler em voz alta textos literários diversos, utilizando entonação, ritmo, postura e expressividade adequados ao gênero."
  },
  {
    codigo: "EF69LP55",
    disciplina: "Língua Portuguesa",
    anos: [6, 7, 8, 9],
    descricao: "Reconhecer em textos de diferentes gêneros as variedades da língua falada e o conceito de norma-padrão sem preconceito linguístico."
  },
  {
    codigo: "EF69LP56",
    disciplina: "Língua Portuguesa",
    anos: [6, 7, 8, 9],
    descricao: "Fazer uso consciente e reflexivo de regras gramaticais em situações de produção textual escrita e revisão de estilo."
  },

  // 8º e 9º Anos
  {
    codigo: "EF89LP33",
    disciplina: "Língua Portuguesa",
    anos: [8, 9],
    descricao: "Ler, de forma autônoma, e compreender textos de maior complexidade (crônicas reflexivas, contos contemporâneos, resenhas críticas)."
  },
  {
    codigo: "EF89LP35",
    disciplina: "Língua Portuguesa",
    anos: [8, 9],
    descricao: "Criar contos ou crônicas expressando posicionamentos críticos sobre temas sociais, com variedade estilística e coerência narrativa."
  },
  {
    codigo: "EF89LP37",
    disciplina: "Língua Portuguesa",
    anos: [8, 9],
    descricao: "Analisar os efeitos de sentido decorrentes da sintaxe de concordância verbal e nominal e da regência em textos dissertativos."
  },
  {
    codigo: "EF08LP04",
    disciplina: "Língua Portuguesa",
    anos: [8],
    descricao: "Utilizar conhecimentos linguísticos e gramaticais (orações coordenadas e subordinadas) na construção e articulação de períodos complexos."
  },
  {
    codigo: "EF09LP04",
    disciplina: "Língua Portuguesa",
    anos: [9],
    descricao: "Escrever textos argumentativos claros e fundamentados, defendendo pontos de vista sustentados por dados, fatos e evidências."
  },

  // ==========================================
  // MPV - MUNDO DO TRABALHO E PROJETO DE VIDA
  // ==========================================
  {
    codigo: "CG01-BNCC",
    disciplina: "MPV",
    anos: [6, 7, 8, 9],
    descricao: "Valorizar e utilizar os conhecimentos historicamente construídos sobre o mundo físico, social e cultural para entender e intervir na realidade."
  },
  {
    codigo: "CG06-BNCC",
    disciplina: "MPV",
    anos: [6, 7, 8, 9],
    descricao: "Valorizar a diversidade de saberes e vivências culturais para apropriar-se de conhecimentos que permitam entender o mundo do trabalho e fazer escolhas alinhadas ao projeto de vida."
  },
  {
    codigo: "CG08-BNCC",
    disciplina: "MPV",
    anos: [6, 7, 8, 9],
    descricao: "Conhecer-se, apreciar-se e cuidar de sua saúde física e emocional, compreendendo-se na diversidade humana e reconhecendo suas emoções e as dos outros."
  },
  {
    codigo: "CG09-BNCC",
    disciplina: "MPV",
    anos: [6, 7, 8, 9],
    descricao: "Exercitar a empatia, o diálogo, a resolução de conflitos e a cooperação, fazendo-se respeitar e promovendo o respeito ao outro e aos direitos humanos."
  },
  {
    codigo: "CG10-BNCC",
    disciplina: "MPV",
    anos: [6, 7, 8, 9],
    descricao: "Agir pessoal e coletivamente com autonomia, responsabilidade, flexibilidade, resiliência e determinação, tomando decisões com base em princípios éticos e solidários."
  },
  {
    codigo: "MPV-AUTO-01",
    disciplina: "MPV",
    anos: [6, 7],
    descricao: "Desenvolver o autoconhecimento, identificando potenciais, talentos individuais, desafios pessoais e estratégias de fortalecimento da autoestima."
  },
  {
    codigo: "MPV-METAS-02",
    disciplina: "MPV",
    anos: [7, 8],
    descricao: "Construir planos de metas de curto e médio prazo para organização dos estudos, gestão do tempo e rotinas de aprendizagem autônoma."
  },
  {
    codigo: "MPV-TRAB-03",
    disciplina: "MPV",
    anos: [8, 9],
    descricao: "Mapear áreas profissionais, tendências do mundo do trabalho contemporâneo, ética profissional e caminhos formativos para o Ensino Médio."
  },
  {
    codigo: "MPV-CIDAD-04",
    disciplina: "MPV",
    anos: [6, 7, 8, 9],
    descricao: "Planejar intervenções cidadãs na comunidade escolar, exercitando liderança colaborativa, escuta ativa e responsabilidade social."
  },

  // ==========================================
  // GEOGRAFIA - ANOS FINAIS (6º ao 9º)
  // ==========================================
  // 6º Ano
  {
    codigo: "EF06GE01",
    disciplina: "Geografia",
    anos: [6],
    descricao: "Comparar modificações dos padrões das relações entre sociedade e natureza em diferentes lugares e tempos."
  },
  {
    codigo: "EF06GE02",
    disciplina: "Geografia",
    anos: [6],
    descricao: "Analisar modificações de paisagens por diferentes sociedades, distinguindo aspectos culturais e naturais presentes no espaço geográfico."
  },
  {
    codigo: "EF06GE03",
    disciplina: "Geografia",
    anos: [6],
    descricao: "Descrever os movimentos do planeta Terra e sua relação com a circulação geral da atmosfera, o tempo atmosférico e os climas."
  },
  {
    codigo: "EF06GE04",
    disciplina: "Geografia",
    anos: [6],
    descricao: "Descrever o ciclo da água, comparando o escoamento superficial no meio urbano e rural e a morfologia das bacias hidrográficas."
  },
  {
    codigo: "EF06GE05",
    disciplina: "Geografia",
    anos: [6],
    descricao: "Relacionar padrões climáticos, tipos de solo, relevo e formações vegetais às bacias hidrográficas e à ocupação humana."
  },
  {
    codigo: "EF06GE06",
    disciplina: "Geografia",
    anos: [6],
    descricao: "Identificar as características das paisagens transformadas pela ação antrópica a partir dos processos de urbanização e industrialização."
  },
  {
    codigo: "EF06GE08",
    disciplina: "Geografia",
    anos: [6],
    descricao: "Medir distâncias na superfície pelas escalas gráficas e numéricas dos mapas e interpretar coordenadas geográficas."
  },
  {
    codigo: "EF06GE09",
    disciplina: "Geografia",
    anos: [6],
    descricao: "Elaborar modelos tridimensionais, blocos-diagramas e perfis topográficos e de vegetação para representar elementos do relevo."
  },
  {
    codigo: "EF06GE11",
    disciplina: "Geografia",
    anos: [6],
    descricao: "Caracterizar os elementos do relevo terrestre (planaltos, planícies, depressões e montanhas) e sua importância socioeconômica."
  },

  // 7º Ano
  {
    codigo: "EF07GE01",
    disciplina: "Geografia",
    anos: [7],
    descricao: "Avaliar, por meio de exemplos extraídos dos meios de comunicação, ideias e estereótipos associados às paisagens e à formação territorial e cultural do Brasil."
  },
  {
    codigo: "EF07GE02",
    disciplina: "Geografia",
    anos: [7],
    descricao: "Analisar a influência dos fluxos econômicos e populacionais na formação socioespacial e na divisão regional do Brasil."
  },
  {
    codigo: "EF07GE03",
    disciplina: "Geografia",
    anos: [7],
    descricao: "Selecionar argumentos que reconheçam as territorialidades e os direitos dos povos indígenas, quilombolas e ribeirinhos no Brasil."
  },
  {
    codigo: "EF07GE04",
    disciplina: "Geografia",
    anos: [7],
    descricao: "Avaliar o papel das redes de transporte e de comunicação no processo de integração e dinâmica do território brasileiro."
  },
  {
    codigo: "EF07GE05",
    disciplina: "Geografia",
    anos: [7],
    descricao: "Analisar fatos e situações representativos das alterações ocorridas entre o meio rural e o meio urbano no Brasil."
  },
  {
    codigo: "EF07GE06",
    disciplina: "Geografia",
    anos: [7],
    descricao: "Discutir em que medida a produção, a circulação e o consumo de mercadorias provocam impactos socioambientais nos biomas brasileiros."
  },
  {
    codigo: "EF07GE08",
    disciplina: "Geografia",
    anos: [7],
    descricao: "Estabelecer relações entre os processos de industrialização e inovação tecnológica com as transformações socioeconômicas no território brasileiro."
  },
  {
    codigo: "EF07GE09",
    disciplina: "Geografia",
    anos: [7],
    descricao: "Interpretar e elaborar mapas temáticos e históricos, croquis e representações para analisar a distribuição espacial da população brasileira."
  },
  {
    codigo: "EF07GE10",
    disciplina: "Geografia",
    anos: [7],
    descricao: "Elaborar e interpretar pirâmides etárias e gráficos para analisar a transição demográfica e o envelhecimento populacional no Brasil."
  },
  {
    codigo: "EF07GE11",
    disciplina: "Geografia",
    anos: [7],
    descricao: "Caracterizar dinâmicas dos componentes físico-naturais no território brasileiro e sua relação com a conservação da biodiversidade."
  },

  // 8º Ano
  {
    codigo: "EF08GE01",
    disciplina: "Geografia",
    anos: [8],
    descricao: "Descrever as rotas de dispersão da população humana pelo planeta e os principais fluxos migratórios na América Latina e no mundo."
  },
  {
    codigo: "EF08GE02",
    disciplina: "Geografia",
    anos: [8],
    descricao: "Relacionar fatos e situações marcantes do processo de globalização com a dinâmica populacional e os fluxos de capitais e mercadorias."
  },
  {
    codigo: "EF08GE03",
    disciplina: "Geografia",
    anos: [8],
    descricao: "Analisar aspectos da dinâmica demográfica, considerando indicadores sociais e nível de desenvolvimento humano em diferentes regiões."
  },
  {
    codigo: "EF08GE04",
    disciplina: "Geografia",
    anos: [8],
    descricao: "Compreender os fluxos migratórios na América Latina (movimentos voluntários e forçados) a partir de fatores econômicos e políticos."
  },
  {
    codigo: "EF08GE05",
    disciplina: "Geografia",
    anos: [8],
    descricao: "Aplicar os conceitos de Estado, nação, território, governo e país para o entendimento de conflitos e tensões geopolíticas contemporâneas."
  },
  {
    codigo: "EF08GE06",
    disciplina: "Geografia",
    anos: [8],
    descricao: "Analisar a atuação das organizações supranacionais (ONU, OEA, blocos econômicos) nos processos de integração e cooperação regional."
  },
  {
    codigo: "EF08GE08",
    disciplina: "Geografia",
    anos: [8],
    descricao: "Analisar a situação do Brasil e de outros países da América Latina e África quanto à exploração e exportação de commodities."
  },
  {
    codigo: "EF08GE13",
    disciplina: "Geografia",
    anos: [8],
    descricao: "Analisar a influência dos Estados Unidos da América na geopolítica e na economia mundial e latino-americana nos séculos XX e XXI."
  },
  {
    codigo: "EF08GE18",
    disciplina: "Geografia",
    anos: [8],
    descricao: "Analisar a relação entre o desenvolvimento das tecnologias da informação e comunicação e a dinâmica do mundo do trabalho."
  },
  {
    codigo: "EF08GE20",
    disciplina: "Geografia",
    anos: [8],
    descricao: "Analisar características de países da América e da África quanto a padrões de consumo e matrizes energéticas."
  },

  // 9º Ano
  {
    codigo: "EF09GE01",
    disciplina: "Geografia",
    anos: [9],
    descricao: "Analisar criticamente de que forma a hegemonia europeia e norte-americana foi exercida em várias partes do planeta por meio da colonização e globalização."
  },
  {
    codigo: "EF09GE02",
    disciplina: "Geografia",
    anos: [9],
    descricao: "Analisar a atuação das corporações internacionais e das organizações econômicas mundiais na vida da população em diferentes países."
  },
  {
    codigo: "EF09GE03",
    disciplina: "Geografia",
    anos: [9],
    descricao: "Identificar diferentes manifestações culturais de minorias étnicas na Europa e na Ásia em meio a processos de migração e conflitos."
  },
  {
    codigo: "EF09GE04",
    disciplina: "Geografia",
    anos: [9],
    descricao: "Relacionar as transformações técnicas e tecnológicas na agropecuária e na indústria com a dinâmica da urbanização global."
  },
  {
    codigo: "EF09GE05",
    disciplina: "Geografia",
    anos: [9],
    descricao: "Analisar fatos e situações para compreender a integração e a fragmentação do espaço geopolítico mundial na contemporaneidade."
  },
  {
    codigo: "EF09GE08",
    disciplina: "Geografia",
    anos: [9],
    descricao: "Associar os critérios de divisão do mundo em Ocidente e Oriente com a formação das zonas de influência geopolítica e cultural."
  },
  {
    codigo: "EF09GE10",
    disciplina: "Geografia",
    anos: [9],
    descricao: "Analisar os impactos do processo de industrialização e urbanização sobre os recursos hídricos e as mudanças climáticas globais."
  },
  {
    codigo: "EF09GE14",
    disciplina: "Geografia",
    anos: [9],
    descricao: "Caracterizar os países asiáticos (ênfase na China, Japão e Índia) em termos demográficos, econômicos e tecnológicos."
  },
  {
    codigo: "EF09GE15",
    disciplina: "Geografia",
    anos: [9],
    descricao: "Comparar e classificar diferentes regiões do mundo quanto ao Índice de Desenvolvimento Humano (IDH) e sustentabilidade socioambiental."
  },

  // ==========================================
  // HISTÓRIA - ANOS FINAIS (6º ao 9º)
  // ==========================================
  // 6º Ano
  {
    codigo: "EF06HI01",
    disciplina: "História",
    anos: [6],
    descricao: "Identificar diferentes formas de compreensão da noção de tempo e da periodização dos processos históricos."
  },
  {
    codigo: "EF06HI02",
    disciplina: "História",
    anos: [6],
    descricao: "Identificar a gênese da produção do saber histórico e analisar o significado das fontes que originaram determinadas formas de registro."
  },
  {
    codigo: "EF06HI03",
    disciplina: "História",
    anos: [6],
    descricao: "Identificar as hipóteses científicas sobre o surgimento da espécie humana e valorizar os primeiros povoamentos da Terra."
  },
  {
    codigo: "EF06HI04",
    disciplina: "História",
    anos: [6],
    descricao: "Conhecer as teorias sobre a chegada do homem à América e caracterizar os modos de vida dos povos originários antes da colonização."
  },
  {
    codigo: "EF06HI07",
    disciplina: "História",
    anos: [6],
    descricao: "Identificar aspectos e processos específicos das sociedades do Oriente Médio e da África, com ênfase em Egito e Mesopotâmia."
  },
  {
    codigo: "EF06HI08",
    disciplina: "História",
    anos: [6],
    descricao: "Caracterizar os processos de circulação de pessoas, produtos e culturas na Antiguidade e no Mediterrâneo (Grécia e Roma)."
  },
  {
    codigo: "EF06HI10",
    disciplina: "História",
    anos: [6],
    descricao: "Explicar a formação da Grécia Antiga, com ênfase na pólis e nos modelos de Atenas e Esparta."
  },
  {
    codigo: "EF06HI13",
    disciplina: "História",
    anos: [6],
    descricao: "Conceituar 'império' no mundo antigo, com ênfase nas características do Império Romano e nas interações culturais."
  },
  {
    codigo: "EF06HI16",
    disciplina: "História",
    anos: [6],
    descricao: "Caracterizar a dinâmica do feudalismo na Europa medieval, relações de servidão, vassalagem e o papel da Igreja."
  },

  // 7º Ano
  {
    codigo: "EF07HI01",
    disciplina: "História",
    anos: [7],
    descricao: "Explicar o significado de 'modernidade' e suas lógicas de inclusão e exclusão com base em concepções eurocêntricas."
  },
  {
    codigo: "EF07HI02",
    disciplina: "História",
    anos: [7],
    descricao: "Identificar conexões entre sociedades do Novo Mundo, Europa, África e Ásia no contexto das Grandes Navegações e Renascimento."
  },
  {
    codigo: "EF07HI04",
    disciplina: "História",
    anos: [7],
    descricao: "Identificar as conexões e interações entre as sociedades do Novo Mundo, da Europa e da África no contexto das Grandes Navegações."
  },
  {
    codigo: "EF07HI05",
    disciplina: "História",
    anos: [7],
    descricao: "Identificar as vinculações entre as reformas religiosas (Protestante e Contra-Reforma) e os processos culturais modernos."
  },
  {
    codigo: "EF07HI07",
    disciplina: "História",
    anos: [7],
    descricao: "Caracterizar os processos de formação e consolidação das monarquias absolutistas na Europa moderna."
  },
  {
    codigo: "EF07HI10",
    disciplina: "História",
    anos: [7],
    descricao: "Analisar as sociedades do açúcar e do ouro na América portuguesa, compreendendo as hierarquias sociais e o trabalho compulsório."
  },
  {
    codigo: "EF07HI13",
    disciplina: "História",
    anos: [7],
    descricao: "Caracterizar a ação dos europeus e suas relações com as populações indígenas e africanas na América colonial."
  },
  {
    codigo: "EF07HI15",
    disciplina: "História",
    anos: [7],
    descricao: "Discutir o conceito de escravidão moderna e suas diferenças em relação à escravidão antiga, analisando o tráfico transatlântico."
  },
  {
    codigo: "EF07HI16",
    disciplina: "História",
    anos: [7],
    descricao: "Analisar os mecanismos de resistência dos povos escravizados (quilombos, revoltas e preservação de identidades)."
  },

  // 8º Ano
  {
    codigo: "EF08HI01",
    disciplina: "História",
    anos: [8],
    descricao: "Identificar os principais aspectos conceituais do Iluminismo e do Liberalismo e discutir suas repercussões no mundo contemporâneo."
  },
  {
    codigo: "EF08HI03",
    disciplina: "História",
    anos: [8],
    descricao: "Analisar os impactos da Revolução Industrial na produção, circulação de mercadorias e na formação da classe operária."
  },
  {
    codigo: "EF08HI04",
    disciplina: "História",
    anos: [8],
    descricao: "Identificar e relacionar os processos da Revolução Francesa e seus desdobramentos na Europa e no mundo ocidental."
  },
  {
    codigo: "EF08HI06",
    disciplina: "História",
    anos: [8],
    descricao: "Aplicar os conceitos de Estado, nação, soberania e cidadania a partir das independências na América."
  },
  {
    codigo: "EF08HI11",
    disciplina: "História",
    anos: [8],
    descricao: "Identificar e confrontar correntes de pensamento sobre a independência do Brasil e a permanência da monarquia e da escravidão."
  },
  {
    codigo: "EF08HI14",
    disciplina: "História",
    anos: [8],
    descricao: "Caracterizar o Primeiro Reinado e o Período Regencial no Brasil, analisando as revoltas provinciais e os embates políticos."
  },
  {
    codigo: "EF08HI16",
    disciplina: "História",
    anos: [8],
    descricao: "Identificar e comparar os processos de independência e a consolidação do Estado nacional na América e no Brasil."
  },
  {
    codigo: "EF08HI18",
    disciplina: "História",
    anos: [8],
    descricao: "Analisar a sociedade do Segundo Reinado no Brasil, com foco no café, ferrovias e a transição do trabalho escravo para o assalariado."
  },
  {
    codigo: "EF08HI20",
    disciplina: "História",
    anos: [8],
    descricao: "Identificar e relacionar as causas da Guerra do Paraguai com a geopolítica do Prata e a afirmação das Forças Armadas."
  },
  {
    codigo: "EF08HI22",
    disciplina: "História",
    anos: [8],
    descricao: "Discutir o papel de mulheres, negros e indígenas no Brasil do século XIX e as lutas sociais pelo movimento abolicionista."
  },

  // 9º Ano
  {
    codigo: "EF09HI01",
    disciplina: "História",
    anos: [9],
    descricao: "Descrever e contextualizar os principais aspectos sociais, culturais, econômicos e políticos da emergência da República no Brasil."
  },
  {
    codigo: "EF09HI03",
    disciplina: "História",
    anos: [9],
    descricao: "Identificar os mecanismos de exclusão política e social na Primeira República (coronelismo, clientelismo e voto de cabresto)."
  },
  {
    codigo: "EF09HI05",
    disciplina: "História",
    anos: [9],
    descricao: "Analisar os processos de urbanização e revoltas populares no início da República brasileira (Canudos, Vacina, Chibata, Contestado)."
  },
  {
    codigo: "EF09HI10",
    disciplina: "História",
    anos: [9],
    descricao: "Identificar e analisar as causas e consequências da Primeira Guerra Mundial e da crise de 1929 no cenário global."
  },
  {
    codigo: "EF09HI13",
    disciplina: "História",
    anos: [9],
    descricao: "Caracterizar os regimes totalitários na Europa do entreguerras (Nazismo e Fascismo) e suas práticas de perseguição e violência."
  },
  {
    codigo: "EF09HI16",
    disciplina: "História",
    anos: [9],
    descricao: "Caracterizar os regimes ditatoriais e autoritários na América Latina e no Brasil a partir de meados do século XX (Ditadura Militar)."
  },
  {
    codigo: "EF09HI17",
    disciplina: "História",
    anos: [9],
    descricao: "Discutir os processos de descolonização na África e na Ásia e as disputas geopolíticas no contexto da Guerra Fria."
  },
  {
    codigo: "EF09HI22",
    disciplina: "História",
    anos: [9],
    descricao: "Analisar o processo de redemocratização no Brasil, a campanha das 'Diretas Já' e a promulgação da Constituição de 1988."
  },
  {
    codigo: "EF09HI26",
    disciplina: "História",
    anos: [9],
    descricao: "Discutir e analisar os direitos humanos e as políticas de inclusão e afirmação racial no Brasil contemporâneo."
  },

  // ==========================================
  // CIÊNCIAS DA NATUREZA - ANOS FINAIS (6º ao 9º)
  // ==========================================
  // 6º Ano
  {
    codigo: "EF06CI01",
    disciplina: "Ciências",
    anos: [6],
    descricao: "Classificar como homogênea ou heterogênea a mistura de dois ou mais materiais e propor métodos de separação adequados."
  },
  {
    codigo: "EF06CI02",
    disciplina: "Ciências",
    anos: [6],
    descricao: "Identificar evidências de transformações químicas a partir do resultado de misturas de materiais que originam produtos diferentes."
  },
  {
    codigo: "EF06CI03",
    disciplina: "Ciências",
    anos: [6],
    descricao: "Selecionar métodos mais adequados para a separação de sistemas heterogêneos com base em processos físicos."
  },
  {
    codigo: "EF06CI04",
    disciplina: "Ciências",
    anos: [6],
    descricao: "Associar a produção de medicamentos e materiais sintéticos ao desenvolvimento científico e tecnológico."
  },
  {
    codigo: "EF06CI05",
    disciplina: "Ciências",
    anos: [6],
    descricao: "Explicar a organização básica das células e sua função como unidade estrutural e fundamental de todos os seres vivos."
  },
  {
    codigo: "EF06CI06",
    disciplina: "Ciências",
    anos: [6],
    descricao: "Concluir que os organismos são formados por sistemas integrados (célula, tecido, órgão, sistema) que garantem a vida."
  },
  {
    codigo: "EF06CI07",
    disciplina: "Ciências",
    anos: [6],
    descricao: "Justificar o papel do sistema nervoso e dos órgãos dos sentidos na coordenação das ações do corpo e interação com o ambiente."
  },
  {
    codigo: "EF06CI11",
    disciplina: "Ciências",
    anos: [6],
    descricao: "Identificar as diferentes camadas que estruturam a Terra (crosta, manto e núcleo) e suas características físicas."
  },
  {
    codigo: "EF06CI12",
    disciplina: "Ciências",
    anos: [6],
    descricao: "Identificar diferentes tipos de rocha e relacioná-los com a formação do solo e os processos erosivos."
  },

  // 7º Ano
  {
    codigo: "EF07CI01",
    disciplina: "Ciências",
    anos: [7],
    descricao: "Discutir a aplicação, ao longo da história, das máquinas simples e propor soluções e invenções para tarefas cotidianas."
  },
  {
    codigo: "EF07CI02",
    disciplina: "Ciências",
    anos: [7],
    descricao: "Diferenciar temperatura, calor e sensação térmica nas diferentes situações de equilíbrio termodinâmico cotidianas."
  },
  {
    codigo: "EF07CI04",
    disciplina: "Ciências",
    anos: [7],
    descricao: "Avaliar o papel do equilíbrio termodinâmico para a manutenção da vida na Terra e funcionamento de máquinas térmicas."
  },
  {
    codigo: "EF07CI07",
    disciplina: "Ciências",
    anos: [7],
    descricao: "Caracterizar os principais ecossistemas e biomas brasileiros quanto à paisagem, água, solo e biodiversidade."
  },
  {
    codigo: "EF07CI08",
    disciplina: "Ciências",
    anos: [7],
    descricao: "Avaliar como catástrofes naturais ou ações humanas alteram as teias tróficas e a sustentabilidade dos biomas."
  },
  {
    codigo: "EF07CI09",
    disciplina: "Ciências",
    anos: [7],
    descricao: "Interpretar as condições de saúde da comunidade escolar com base em indicadores de saúde pública e saneamento básico."
  },
  {
    codigo: "EF07CI10",
    disciplina: "Ciências",
    anos: [7],
    descricao: "Argumentar sobre a importância do tratamento de água e esgoto para a prevenção de doenças de veiculação hídrica."
  },
  {
    codigo: "EF07CI14",
    disciplina: "Ciências",
    anos: [7],
    descricao: "Justificar o papel da vacinação na imunização individual e coletiva para a saúde pública e a erradicação de doenças infecciosas."
  },

  // 8º Ano
  {
    codigo: "EF08CI01",
    disciplina: "Ciências",
    anos: [8],
    descricao: "Identificar e classificar diferentes fontes de energia (renováveis e não renováveis) e comparar a eficácia de processos de geração elétrica."
  },
  {
    codigo: "EF08CI02",
    disciplina: "Ciências",
    anos: [8],
    descricao: "Construir circuitos elétricos com pilha/bateria, condutores e lâmpadas, comparando circuitos em série e paralelo."
  },
  {
    codigo: "EF08CI04",
    disciplina: "Ciências",
    anos: [8],
    descricao: "Calcular o consumo de eletrodomésticos a partir de potência e tempo médio de uso para propor hábitos sustentáveis."
  },
  {
    codigo: "EF08CI07",
    disciplina: "Ciências",
    anos: [8],
    descricao: "Comparar diferentes processos reprodutivos em plantas e animais em relação aos mecanismos de transmissão de características hereditárias."
  },
  {
    codigo: "EF08CI08",
    disciplina: "Ciências",
    anos: [8],
    descricao: "Analisar e explicar as transformações da puberdade a partir da atuação dos hormônios sexuais e do sistema endócrino."
  },
  {
    codigo: "EF08CI09",
    disciplina: "Ciências",
    anos: [8],
    descricao: "Comparar o modo de ação e eficácia dos diversos métodos contraceptivos e justificar a necessidade de prevenção de ISTs."
  },
  {
    codigo: "EF08CI11",
    disciplina: "Ciências",
    anos: [8],
    descricao: "Selecionar argumentos que evidenciem as múltiplas dimensões da sexualidade humana (biológica, sociocultural e afetiva)."
  },
  {
    codigo: "EF08CI14",
    disciplina: "Ciências",
    anos: [8],
    descricao: "Relacionar climas regionais aos padrões de circulação atmosférica e oceânica e ao aquecimento desigual da Terra."
  },

  // 9º Ano
  {
    codigo: "EF09CI01",
    disciplina: "Ciências",
    anos: [9],
    descricao: "Investigar as mudanças de estado físico da matéria e explicar essas transformações com base no modelo submicroscópico."
  },
  {
    codigo: "EF09CI02",
    disciplina: "Ciências",
    anos: [9],
    descricao: "Comparar quantidades de reagentes e produtos envolvidos em transformações químicas, estabelecendo a conservação da massa."
  },
  {
    codigo: "EF09CI03",
    disciplina: "Ciências",
    anos: [9],
    descricao: "Identificar modelos atômicos que descrevem a estrutura da matéria e a organização da Tabela Periódica."
  },
  {
    codigo: "EF09CI04",
    disciplina: "Ciências",
    anos: [9],
    descricao: "Planejar e executar experimentos que evidenciem que as cores de luz podem ser formadas pela composição das cores primárias."
  },
  {
    codigo: "EF09CI08",
    disciplina: "Ciências",
    anos: [9],
    descricao: "Associar os gametas à transmissão das características hereditárias, estabelecendo relações entre ancestrais e descendentes."
  },
  {
    codigo: "EF09CI10",
    disciplina: "Ciências",
    anos: [9],
    descricao: "Comparar as ideias evolucionistas de Lamarck e Darwin sobre a diversidade biológica e a seleção natural."
  },
  {
    codigo: "EF09CI11",
    disciplina: "Ciências",
    anos: [9],
    descricao: "Discutir a evolução e a diversidade das espécies com base em evidências fósseis e biogeográficas."
  },
  {
    codigo: "EF09CI14",
    disciplina: "Ciências",
    anos: [9],
    descricao: "Descrever a composição e a estrutura do Sistema Solar e a evolução das teorias sobre a origem e dinâmica do Universo."
  },
  {
    codigo: "EF09CI17",
    disciplina: "Ciências",
    anos: [9],
    descricao: "Propor iniciativas individuais e coletivas para a solução de problemas ambientais decorrentes do efeito estufa e da poluição."
  },

  // ==========================================
  // MATEMÁTICA - ANOS FINAIS (6º ao 9º)
  // ==========================================
  // 6º Ano
  {
    codigo: "EF06MA01",
    disciplina: "Matemática",
    anos: [6],
    descricao: "Comparar, ordenar, ler e escrever números naturais e números racionais em sua representação fracionária e decimal."
  },
  {
    codigo: "EF06MA02",
    disciplina: "Matemática",
    anos: [6],
    descricao: "Reconhecer o sistema de numeração decimal com base no valor posicional e nos princípios de agrupamento."
  },
  {
    codigo: "EF06MA03",
    disciplina: "Matemática",
    anos: [6],
    descricao: "Resolver e elaborar problemas que envolvam cálculos com números naturais, por meio de estratégias pessoais e algoritmos."
  },
  {
    codigo: "EF06MA04",
    disciplina: "Matemática",
    anos: [6],
    descricao: "Classificar números naturais em primos e compostos, estabelecer relações de divisibilidade e decompor em fatores primos."
  },
  {
    codigo: "EF06MA07",
    disciplina: "Matemática",
    anos: [6],
    descricao: "Compreender, comparar e ordenar frações associadas às ideias de parte de inteiros e resultado de divisão."
  },
  {
    codigo: "EF06MA09",
    disciplina: "Matemática",
    anos: [6],
    descricao: "Resolver e elaborar problemas que envolvam o cálculo da fração de uma quantidade cujo resultado seja um número natural."
  },
  {
    codigo: "EF06MA18",
    disciplina: "Matemática",
    anos: [6],
    descricao: "Reconhecer, nomear e comparar polígonos, considerando lados, vértices e ângulos, e classificá-los."
  },
  {
    codigo: "EF06MA24",
    disciplina: "Matemática",
    anos: [6],
    descricao: "Resolver e elaborar problemas que envolvam as grandezas comprimento, massa, tempo, temperatura, área, capacidade e volume."
  },
  {
    codigo: "EF06MA32",
    disciplina: "Matemática",
    anos: [6],
    descricao: "Interpretar e resolver situações que envolvam dados de pesquisas em tabelas e gráficos de colunas e barras."
  },

  // 7º Ano
  {
    codigo: "EF07MA01",
    disciplina: "Matemática",
    anos: [7],
    descricao: "Resolver e elaborar problemas com números naturais, envolvendo as noções de múltiplo e divisor e MMC e MDC."
  },
  {
    codigo: "EF07MA02",
    disciplina: "Matemática",
    anos: [7],
    descricao: "Resolver e elaborar problemas que envolvam porcentagens, como os que lidam com acréscimos e decréscimos simples."
  },
  {
    codigo: "EF07MA03",
    disciplina: "Matemática",
    anos: [7],
    descricao: "Comparar, ordenar e associar números inteiros a pontos na reta numérica e utilizá-los em situações do cotidiano."
  },
  {
    codigo: "EF07MA04",
    disciplina: "Matemática",
    anos: [7],
    descricao: "Resolver e elaborar problemas que envolvam operações com números inteiros (adição, subtração, multiplicação e divisão)."
  },
  {
    codigo: "EF07MA08",
    disciplina: "Matemática",
    anos: [7],
    descricao: "Comparar e ordenar frações associadas às ideias de partes de inteiros, resultado da divisão, razão e operador."
  },
  {
    codigo: "EF07MA16",
    disciplina: "Matemática",
    anos: [7],
    descricao: "Reconhecer se duas grandezas são diretamente proporcionais, inversamente proporcionais ou não proporcionais."
  },
  {
    codigo: "EF07MA18",
    disciplina: "Matemática",
    anos: [7],
    descricao: "Resolver e elaborar problemas que possam ser representados por equações polinomiais de 1º grau, redutíveis à forma ax + b = c."
  },
  {
    codigo: "EF07MA24",
    disciplina: "Matemática",
    anos: [7],
    descricao: "Construir triângulos usando régua e compasso, reconhecer a condição de existência e a soma dos ângulos internos."
  },
  {
    codigo: "EF07MA31",
    disciplina: "Matemática",
    anos: [7],
    descricao: "Estabelecer o cálculo de probabilidade de eventos equiprováveis por meio de frações e porcentagens."
  },

  // 8º Ano
  {
    codigo: "EF08MA01",
    disciplina: "Matemática",
    anos: [8],
    descricao: "Efetuar cálculos com potências de expoentes inteiros e aplicar esse conhecimento na representação de números em notação científica."
  },
  {
    codigo: "EF08MA02",
    disciplina: "Matemática",
    anos: [8],
    descricao: "Reconhecer a potenciação e a radiciação como operações inversas entre si no universo dos números racionais."
  },
  {
    codigo: "EF08MA04",
    disciplina: "Matemática",
    anos: [8],
    descricao: "Resolver e elaborar problemas que envolvam o cálculo de porcentagens e juros simples em situações financeiras cotidianas."
  },
  {
    codigo: "EF08MA06",
    disciplina: "Matemática",
    anos: [8],
    descricao: "Resolver e elaborar problemas que envolvam cálculo do valor numérico de expressões algébricas."
  },
  {
    codigo: "EF08MA07",
    disciplina: "Matemática",
    anos: [8],
    descricao: "Associar uma equação linear de 1º grau com duas incógnitas a uma reta no plano cartesiano."
  },
  {
    codigo: "EF08MA08",
    disciplina: "Matemática",
    anos: [8],
    descricao: "Resolver e elaborar problemas que possam ser representados por sistemas de duas equações de 1º grau com duas incógnitas."
  },
  {
    codigo: "EF08MA14",
    disciplina: "Matemática",
    anos: [8],
    descricao: "Demonstrar propriedades de quadriláteros notáveis e trapézios e relacionar com pavimentações do plano."
  },
  {
    codigo: "EF08MA19",
    disciplina: "Matemática",
    anos: [8],
    descricao: "Resolver e elaborar problemas que envolvam medidas de área de figuras geométricas planas (triângulos, quadriláteros e círculos)."
  },
  {
    codigo: "EF08MA25",
    disciplina: "Matemática",
    anos: [8],
    descricao: "Obter os valores de medidas de tendência central de uma pesquisa estatística (média, mediana e moda) e interpretar seus significados."
  },

  // 9º Ano
  {
    codigo: "EF09MA01",
    disciplina: "Matemática",
    anos: [9],
    descricao: "Reconhecer a necessidade dos números reais para medir qualquer segmento de reta e identificar números irracionais."
  },
  {
    codigo: "EF09MA02",
    disciplina: "Matemática",
    anos: [9],
    descricao: "Reconhecer um número irracional como um número real de representação decimal infinita e não periódica e estimar sua localização na reta."
  },
  {
    codigo: "EF09MA03",
    disciplina: "Matemática",
    anos: [9],
    descricao: "Efetuar cálculos com radicais por meio de suas propriedades operatórias na simplificação de expressões."
  },
  {
    codigo: "EF09MA06",
    disciplina: "Matemática",
    anos: [9],
    descricao: "Compreender as funções como relações de dependência unívoca entre duas variáveis e suas representações numérica, algébrica e gráfica."
  },
  {
    codigo: "EF09MA08",
    disciplina: "Matemática",
    anos: [9],
    descricao: "Resolver e elaborar problemas que envolvam relações de proporcionalidade direta e inversa entre grandezas por funções afins."
  },
  {
    codigo: "EF09MA09",
    disciplina: "Matemática",
    anos: [9],
    descricao: "Compreender os processos de fatoração de expressões algébricas com base em suas relações com os produtos notáveis."
  },
  {
    codigo: "EF09MA13",
    disciplina: "Matemática",
    anos: [9],
    descricao: "Demonstrar relações métricas do triângulo retângulo, entre elas o Teorema de Pitágoras, aplicando-as na resolução de problemas."
  },
  {
    codigo: "EF09MA14",
    disciplina: "Matemática",
    anos: [9],
    descricao: "Resolver e elaborar problemas com Teorema de Pitágoras e razões trigonométricas fundamentais (seno, cosseno, tangente) no triângulo retângulo."
  },
  {
    codigo: "EF09MA19",
    disciplina: "Matemática",
    anos: [9],
    descricao: "Resolver e elaborar problemas que envolvam o cálculo de volumes de prismas e cilindros retos."
  },

  // ==========================================
  // LÍNGUA INGLESA - ANOS FINAIS (6º ao 9º)
  // ==========================================
  {
    codigo: "EF06LI01",
    disciplina: "Língua Inglesa",
    anos: [6],
    descricao: "Interagir em situações de intercâmbio oral, demonstrando iniciativa para utilizar a língua inglesa em apresentações e saudações."
  },
  {
    codigo: "EF06LI08",
    disciplina: "Língua Inglesa",
    anos: [6],
    descricao: "Identificar o assunto de um texto em língua inglesa, reconhecendo sua organização textual e palavras cognatas."
  },
  {
    codigo: "EF07LI01",
    disciplina: "Língua Inglesa",
    anos: [7],
    descricao: "Interagir em situações de intercâmbio oral para realizar atividades em sala de aula, de forma respeitosa e colaborativa."
  },
  {
    codigo: "EF07LI05",
    disciplina: "Língua Inglesa",
    anos: [7],
    descricao: "Compor narrativa ficcional ou relato de acontecimento passado em língua inglesa, organizando os fatos com marcadores temporais."
  },
  {
    codigo: "EF08LI01",
    disciplina: "Língua Inglesa",
    anos: [8],
    descricao: "Fazer uso da língua inglesa para expressar opiniões, concordâncias e discordâncias em conversas e debates."
  },
  {
    codigo: "EF08LI05",
    disciplina: "Língua Inglesa",
    anos: [8],
    descricao: "Inferir informações e relações que não aparecem de modo explícito no texto em língua inglesa."
  },
  {
    codigo: "EF09LI01",
    disciplina: "Língua Inglesa",
    anos: [9],
    descricao: "Fazer uso da língua inglesa para expor pontos de vista, argumentos e contra-argumentos sobre temas de relevância social."
  },
  {
    codigo: "EF09LI06",
    disciplina: "Língua Inglesa",
    anos: [9],
    descricao: "Distinguir fatos de opiniões em textos argumentativos da esfera jornalística e digital em língua inglesa."
  },

  // ==========================================
  // ARTE - ANOS FINAIS (6º ao 9º)
  // ==========================================
  {
    codigo: "EF69AR01",
    disciplina: "Arte",
    anos: [6, 7, 8, 9],
    descricao: "Pesquisar, apreciar e analisar formas distintas das artes visuais tradicionais e contemporâneas em múltiplos suportes."
  },
  {
    codigo: "EF69AR02",
    disciplina: "Arte",
    anos: [6, 7, 8, 9],
    descricao: "Pesquisar e analisar diferentes estilos visuais, contextualizando-os no tempo e no espaço em diversas culturas."
  },
  {
    codigo: "EF69AR05",
    disciplina: "Arte",
    anos: [6, 7, 8, 9],
    descricao: "Experimentar e criar em artes visuais utilizando materiais convencionais e não convencionais e mídias digitais."
  },
  {
    codigo: "EF69AR09",
    disciplina: "Arte",
    anos: [6, 7, 8, 9],
    descricao: "Pesquisar e analisar diferentes formas de manifestação da dança e do teatro em seus contextos históricos e sociais."
  },
  {
    codigo: "EF69AR16",
    disciplina: "Arte",
    anos: [6, 7, 8, 9],
    descricao: "Analisar criticamente, por meio da apreciação, usos e funções da música em seus contextos de produção e circulação."
  },
  {
    codigo: "EF69AR24",
    disciplina: "Arte",
    anos: [6, 7, 8, 9],
    descricao: "Reconhecer e apreciar artistas, grupos e coletivos cênicos brasileiros e estrangeiros de diferentes épocas."
  },

  // ==========================================
  // EDUCAÇÃO FÍSICA - ANOS FINAIS (6º ao 9º)
  // ==========================================
  {
    codigo: "EF67EF01",
    disciplina: "Educação Física",
    anos: [6, 7],
    descricao: "Experimentar e fruir jogos eletrônicos, esportes de marca e de precisão, identificando os elementos comuns e a segurança corporal."
  },
  {
    codigo: "EF67EF03",
    disciplina: "Educação Física",
    anos: [6, 7],
    descricao: "Planejar e utilizar estratégias para solucionar desafios técnicos e táticos nos esportes de marca, precisão e invasão."
  },
  {
    codigo: "EF67EF08",
    disciplina: "Educação Física",
    anos: [6, 7],
    descricao: "Experimentar e fruir diferentes danças urbanas e do contexto comunitário, valorizando a diversidade cultural."
  },
  {
    codigo: "EF89EF01",
    disciplina: "Educação Física",
    anos: [8, 9],
    descricao: "Experimentar e fruir diferentes esportes de rede/parede, campo e taco, invasão e combate, valorizando o trabalho coletivo."
  },
  {
    codigo: "EF89EF04",
    disciplina: "Educação Física",
    anos: [8, 9],
    descricao: "Identificar os elementos técnicos e táticos individuais e coletivos nos esportes de combate e rede/parede."
  },
  {
    codigo: "EF89EF08",
    disciplina: "Educação Física",
    anos: [8, 9],
    descricao: "Discutir as transformações históricas dos padrões de beleza e saúde corporal e suas relações com a qualidade de vida."
  }
];

/**
 * Sanitiza e normaliza códigos BNCC inseridos por docentes.
 * Remove caracteres supérfluos e corrige erros de digitação recorrentes (ex: letra 'O' no lugar de '0').
 */
function sanitizeBnccCode(input) {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim().toUpperCase();

  const cleanCandidate = trimmed.replace(/[\s\-_.]/g, '');
  const matchStandard = cleanCandidate.match(/^([A-Z]{2})([0-9O]{2})([A-Z]{2})([0-9O]{2})$/);
  if (matchStandard) {
    const prefix = matchStandard[1];
    const anos = matchStandard[2].replace(/O/g, '0');
    const disc = matchStandard[3];
    const num = matchStandard[4].replace(/O/g, '0');
    return `${prefix}${anos}${disc}${num}`;
  }

  return trimmed;
}

/**
 * Busca uma habilidade por código exato ou sanitizado.
 */
function getBnccSkill(code) {
  if (!code) return null;
  const clean = sanitizeBnccCode(code);
  return BNCC_HABILIDADES.find(h => sanitizeBnccCode(h.codigo) === clean) || null;
}

/**
 * Normaliza e enriquece uma lista de códigos BNCC.
 * Aceita array de strings, array de objetos { codigo, descricao }, ou entrada mista.
 * Retorna array padronizado: [ { codigo, descricao, disciplina } ]
 */
function enrichBnccCodes(input) {
  if (!input) return [];
  const list = Array.isArray(input) ? input : [input];

  const enriched = [];
  const seenCodes = new Set();

  for (const item of list) {
    if (!item) continue;

    let rawCode = "";
    let desc = "";
    let disc = "";

    if (typeof item === 'string') {
      const trimmed = item.trim();
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const potentialCode = trimmed.substring(0, colonIndex).trim();
        const potentialDesc = trimmed.substring(colonIndex + 1).trim();
        rawCode = potentialCode;
        desc = potentialDesc;
      } else {
        rawCode = trimmed;
      }

      const cleanCode = sanitizeBnccCode(rawCode);
      const match = getBnccSkill(cleanCode);
      if (match) {
        rawCode = match.codigo;
        desc = desc || match.descricao;
        disc = match.disciplina;
      } else {
        rawCode = cleanCode || rawCode.toUpperCase();
      }
    } else if (typeof item === 'object') {
      rawCode = String(item.codigo || item.code || "").trim();
      desc = String(item.descricao || item.description || "").trim();
      disc = String(item.disciplina || item.subject || "").trim();

      const cleanCode = sanitizeBnccCode(rawCode);
      const match = getBnccSkill(cleanCode);
      if (match) {
        rawCode = match.codigo;
        if (!desc) desc = match.descricao;
        disc = disc || match.disciplina;
      } else {
        rawCode = cleanCode || rawCode.toUpperCase();
      }
    }

    if (rawCode && !seenCodes.has(rawCode)) {
      seenCodes.add(rawCode);
      enriched.push({
        codigo: rawCode,
        descricao: desc,
        disciplina: disc
      });
    }
  }

  return enriched;
}

module.exports = {
  BNCC_HABILIDADES,
  getBnccSkill,
  enrichBnccCodes,
  sanitizeBnccCode
};
