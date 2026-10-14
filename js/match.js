/**
 * Motor de Compatibilidade Ponderada (Média com Pesos de Notas)
 * Calcula sub-notas de 0 a 10 para 5 dimensões e aplica média ponderada matemática.
 */

const QUIZ_STORAGE_KEY = "adoteamigo_adopter_quiz_v1";

const DEFAULT_SAMPLE_QUIZ = {
  idade: "maior",
  agressividade: "nenhum_ou_sociavel",
  moradoresAcordo: "todos_concordam",
  arcarCastracao: "posso_arcar",
  moradia: "apto_com_tela",
  tempoSozinho: "4_a_8h",
  temCriancas: "nao",
  outrosPets: "nenhum",
  estiloVida: "baixa_energia_sem_tempo",
  cuidadosMedicos: "apenas_saudavel",
  especie: "indiferente",
  porte: "indiferente",
  isSample: true
};

const AdopterMatch = {
  DEFAULT_SAMPLE_QUIZ,

  // Obtém respostas salvas do adotante
  getSavedQuiz() {
    try {
      const data = localStorage.getItem(QUIZ_STORAGE_KEY);
      if (data === "cleared" || !data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.error("Erro ao ler quiz do storage:", e);
      return null;
    }
  },

  // Salva respostas do adotante
  saveQuiz(answers) {
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(answers));
  },

  // Limpa respostas
  clearQuiz() {
    localStorage.setItem(QUIZ_STORAGE_KEY, "cleared");
  },

  /**
   * Converte a string de idade do pet ("7 anos", "10 meses", "1 ano e meio", etc.) em objeto estruturado
   * @param {string} idadeStr 
   * @returns {Object} { years: number, months: number, isPuppy: boolean, isSenior: boolean, isYoung: boolean, isAdult: boolean, label: string }
   */
  parsePetAge(idadeStr) {
    if (!idadeStr || typeof idadeStr !== "string") {
      return { years: 2, months: 24, isPuppy: false, isSenior: false, isYoung: true, isAdult: true, label: "Adulto" };
    }
    const str = idadeStr.toLowerCase().trim();
    let years = 0;
    let months = 0;

    const mMatch = str.match(/(\d+)\s*m[eê]s/);
    if (mMatch) {
      months = parseInt(mMatch[1], 10);
      years = months / 12;
    } else {
      const yMatch = str.match(/(\d+)\s*ano/);
      if (yMatch) {
        years = parseInt(yMatch[1], 10);
        if (str.includes("meio") || str.includes("6 m")) {
          years += 0.5;
        }
        months = Math.round(years * 12);
      } else {
        const dMatch = str.match(/(\d+)/);
        if (dMatch) {
          years = parseInt(dMatch[1], 10);
          months = years * 12;
        } else {
          years = 2;
          months = 24;
        }
      }
    }

    const isPuppy = years < 1 || str.includes("filhote") || str.includes("meses");
    const isSenior = years >= 6 || str.includes("idoso") || str.includes("sênior") || str.includes("senior");
    const isYoung = years >= 1 && years <= 3;
    const isAdult = !isPuppy && !isSenior;

    let label = "Adulto";
    if (isPuppy) label = `Filhote (${months} meses)`;
    else if (isSenior) label = `Sênior (${years} anos)`;
    else if (isYoung) label = `Jovem (${years} ${years === 1 ? 'ano' : 'anos'})`;
    else label = `Adulto (${years} anos)`;

    return { years, months, isPuppy, isSenior, isYoung, isAdult, label };
  },

  /**
   * Verifica se o adotante possui algum critério desclassificatório geral (impeditivo legal ou de segurança)
   * @param {Object} quiz Respostas do questionário
   * @returns {Object} { isDisqualified: boolean, reasons: Array }
   */
  checkGlobalDisqualifications(quiz) {
    if (!quiz) return { isDisqualified: false, reasons: [] };

    const reasons = [];

    // 1. Menor de Idade (Exigência de 21+ anos para assinar termo de adoção)
    if (quiz.idade === "menor") {
      reasons.push({
        tipo: "legal",
        titulo: "Idade Mínima Obrigatória (21+)",
        descricao: "Pelas diretrizes de proteção animal e adoção responsável, o Termo de Adoção e Guarda Responsável deve ser assinado exclusivamente por maiores de 21 anos. Recomendamos que um pai, mãe ou responsável legal maior de 21 anos realize o processo."
      });
    }

    // 2. Animais Agressivos no Lar (Risco grave de segurança)
    if (quiz.agressividade === "sim_agressivo") {
      reasons.push({
        tipo: "seguranca",
        titulo: "Risco de Agressividade no Domicílio",
        descricao: "A introdução de um novo pet em um ambiente com animais com histórico de agressividade grave ou ataques territoriais coloca em risco a vida dos animais. Recomendamos avaliação e acompanhamento com profissional comportamentalista antes de adotar um novo pet."
      });
    }

    // 3. Falta de Concordância dos Moradores ou Imóvel
    if (quiz.moradoresAcordo === "nao_concordam") {
      reasons.push({
        tipo: "convivencia",
        titulo: "Falta de Consentimento dos Moradores ou Restrição do Imóvel",
        descricao: "A ausência de consenso de todos que residem no lar ou proibições de contratos de aluguel/condomínio representam a principal causa de devolução traumática e abandono de animais. É fundamental que todos estejam alinhados e acolham a decisão."
      });
    }

    return {
      isDisqualified: reasons.length > 0,
      reasons
    };
  },

  /**
   * Verifica se um animal específico é desclassificado para o perfil do adotante
   * @param {Object} pet Objeto do animal
   * @param {Object} quiz Respostas do questionário
   * @returns {Object} { isDisqualified: boolean, reasons: Array }
   */
  checkPetDisqualification(pet, quiz) {
    if (!quiz) return { isDisqualified: false, reasons: [] };

    const reasons = [];
    const saude = pet.saude || {};

    // 1. Recusa em arcar com castração ou vacinas de animais que ainda não possuem
    if (quiz.arcarCastracao === "apenas_castrados_vacinados") {
      const isCastrado = saude.castrado;
      const hasVacinas = saude.vacinas && saude.vacinas.length > 0;

      if (!isCastrado) {
        reasons.push(`Animal ainda NÃO castrado pela ONG (${saude.castracaoObs || 'Aguardando procedimento'}). Você indicou que só deseja animais já castrados.`);
      }
      if (!hasVacinas) {
        reasons.push(`Animal ainda com protocolo de vacinas pendente. Você indicou que só deseja animais com vacinação completa.`);
      }
    }

    // 2. Apartamento SEM redes de proteção para adoção de gatos
    if (quiz.moradia === "apto_sem_tela" && pet.especie === "gato") {
      reasons.push("Apartamento sem telas de proteção: exigência obrigatória de segurança da ONG para entrega responsável de gatos (risco fatal de quedas).");
    }

    // 3. Recusa de animais com cuidados médicos extras / enfermidades crônicas
    const temEnfermidades = saude.possuiEnfermidades || !!(saude.enfermidadesDescricao);
    if (quiz.cuidadosMedicos === "apenas_saudavel" && temEnfermidades) {
      reasons.push(`Animal requer cuidados veterinários especiais ou medicamentos contínuos (${saude.enfermidadesDescricao || 'Cuidados especiais'}). Você optou por acolher apenas pets 100% saudáveis.`);
    }

    return {
      isDisqualified: reasons.length > 0,
      reasons
    };
  },

  /**
   * Calcula o índice de compatibilidade ponderada entre o animal e o questionário do adotante
   * @param {Object} pet Objeto do animal
   * @param {Object} quiz Respostas do questionário
   * @returns {Object} Dados com nota final ponderada, sub-notas e justificativas
   */
  calculate(pet, quiz) {
    if (!quiz) return null;

    const isGato = pet.especie === "gato";
    const isCao = pet.especie === "cachorro";
    const porte = pet.porte || "medio";
    const saude = pet.saude || {};
    const temperamento = (pet.temperamento || []).map(t => t.toLowerCase());
    const ageInfo = this.parsePetAge(pet.idade);

    const pontosFortes = [];
    const pontosAtencao = [];

    /* ==========================================================================
       DEFINIÇÃO DOS PESOS DAS 5 DIMENSÕES (Total = 100%)
       ========================================================================== */
    const pesoEnergia = 30;   // Peso 30%
    const pesoMoradia = 25;   // Peso 25%
    const pesoRotina = 15;    // Peso 15%
    const pesoFamilia = 15;   // Peso 15%
    const pesoSaude = 15;     // Peso 15%

    /* ==========================================================================
       AVALIAÇÃO DE CRITÉRIOS DESCLASSIFICATÓRIOS (GERAIS E ESPECÍFICOS DO PET)
       ========================================================================== */
    const globalCheck = this.checkGlobalDisqualifications(quiz);
    const petCheck = this.checkPetDisqualification(pet, quiz);

    if (globalCheck.isDisqualified || petCheck.isDisqualified) {
      const motivos = [];
      if (globalCheck.isDisqualified) {
        motivos.push(...globalCheck.reasons.map(r => `[Critério Geral] ${r.titulo}: ${r.descricao}`));
      }
      if (petCheck.isDisqualified) {
        motivos.push(...petCheck.reasons.map(r => `[Critério Específico] ${r}`));
      }

      return {
        score: 0,
        notaFinal: "0.0",
        nivel: "desclassificado",
        label: "Incompatível ⛔",
        color: "bg-rose-700 text-white",
        badgeBorder: "border-rose-300 bg-rose-50 text-rose-800",
        isDisqualified: true,
        isGloballyDisqualified: globalCheck.isDisqualified,
        isPetDisqualified: petCheck.isDisqualified,
        globalReasons: globalCheck.reasons,
        disqualifyReasons: motivos,
        dimensoes: [
          {
            id: "energia",
            nome: "Energia & Exercícios",
            peso: pesoEnergia,
            nota: "0.0",
            comentario: "Desclassificado por critérios impeditivos ou de segurança."
          },
          {
            id: "moradia",
            nome: "Moradia & Espaço",
            peso: pesoMoradia,
            nota: "0.0",
            comentario: "Desclassificado por critérios impeditivos ou de segurança."
          },
          {
            id: "rotina",
            nome: "Rotina & Solidão",
            peso: pesoRotina,
            nota: "0.0",
            comentario: "Desclassificado por critérios impeditivos ou de segurança."
          },
          {
            id: "familia",
            nome: "Convivência Familiar",
            peso: pesoFamilia,
            nota: "0.0",
            comentario: "Desclassificado por critérios impeditivos ou de segurança."
          },
          {
            id: "saude",
            nome: "Saúde & Cuidados",
            peso: pesoSaude,
            nota: "0.0",
            comentario: "Desclassificado por critérios impeditivos ou de segurança."
          }
        ],
        pontosFortes: [],
        pontosAtencao: motivos
      };
    }

    /* ==========================================================================
       DIMENSÃO 1: ENERGIA & ATIVIDADES FÍSICAS (Nota 0 a 10)
       Prioriza dinamicamente dados confirmados pela ONG e perfil de baixa/alta energia
       ========================================================================== */
    const comp = pet.compatibilidade || {};
    const petEnergia = pet.nivelEnergia || comp.nivelEnergia || (
      temperamento.some(t => t.includes("calm") || t.includes("tranquil") || t.includes("soneca") || t.includes("idoso") || t.includes("manso") || t.includes("dorminhoco") || t.includes("curtos")) ? "baixa" :
      (temperamento.some(t => t.includes("ativo") || t.includes("correr") || t.includes("energia") || t.includes("brincalhão") || t.includes("atleta") || t.includes("vigor")) ? "alta" : "moderada")
    );
    const petDomicilio = pet.tipoDomicilio || comp.tipoDomicilio || (
      (porte === "grande" || porte === "gigante") ? "espaco_amplo" : (isGato || porte === "mini" || porte === "pequeno" ? "apartamento" : "qualquer")
    );
    const petTempoSozinho = pet.tempoSozinho || comp.tempoSozinho || "independente";
    const petCriancas = pet.conviveCriancas || comp.conviveCriancas || "sim";
    const petCaes = pet.conviveCaes || comp.conviveCaes || "sim";
    const petGatos = pet.conviveGatos || comp.conviveGatos || (isGato ? "sim" : "adaptacao");

    let notaEnergia = 7.0;
    let descEnergia = "";

    const isPetAltaEnergia = petEnergia === "alta" || temperamento.some(t => 
      t.includes("ativo") || t.includes("correr") || t.includes("energia") || t.includes("brincalhão") || t.includes("atleta") || t.includes("vigor")
    );
    const isPetBaixaEnergia = petEnergia === "baixa" || temperamento.some(t => 
      t.includes("calm") || t.includes("tranquil") || t.includes("soneca") || t.includes("idoso") || t.includes("manso") || t.includes("dorminhoco") || t.includes("curtos")
    );

    if (quiz.estiloVida === "baixa_energia_sem_tempo") {
      // Adotante com pouco tempo para passeios / busca pet calmo
      if (petEnergia === "baixa") {
        notaEnergia = 10.0;
        descEnergia = isGato
          ? "Confirmado pela ONG ⭐: Felino calmo e independente que não demanda caminhadas diárias."
          : (ageInfo.isSenior
              ? `Prioridade para Cão Sênior ⭐: Com ${pet.idade}, possui ritmo sereno e calmo. Não demanda passeios longos; voltas higiênicas rápidas (10 a 15 min) trazem plena felicidade.`
              : "Confirmado pela ONG ⭐: Animal com baixa energia e perfil calmo, perfeito para sua rotina sem passeios longos.");
        pontosFortes.push(isGato ? "Nível de energia baixo perfeito para sua rotina sem tempo de passeios" : "Confirmado pela ONG: Perfil calmo e baixa energia ideal para sua rotina");
      } else if (isGato && !temperamento.includes("hiperativo")) {
        notaEnergia = 10.0;
        descEnergia = "Perfeito para o seu ritmo: felino calmo e independente que não demanda caminhadas diárias.";
        pontosFortes.push("Nível de energia baixo perfeito para sua rotina sem tempo de passeios");
      } else if (isCao && ageInfo.isSenior) {
        // Prioridade solicitada: Cães acima de 6 anos têm pontuação máxima quando o adotante não tem tempo para passeios longos
        notaEnergia = 10.0;
        descEnergia = `Prioridade para Cão Sênior ⭐: Com ${pet.idade}, possui ritmo sereno e calmo. Não demanda passeios longos; voltas higiênicas rápidas (10 a 15 min) trazem plena felicidade.`;
        pontosFortes.push(`Prioridade Sênior (${pet.idade}): Companheiro calmo e perfeito para quem tem pouco tempo de passeio`);
      } else if (isCao && isPetBaixaEnergia && (porte === "mini" || porte === "pequeno")) {
        notaEnergia = 9.0;
        descEnergia = "Cãozinho calmo de pequeno porte em casa; necessita somente de voltas higiênicas breves.";
        pontosFortes.push("Cão calmo de pequeno porte compatível com passeios rápidos");
      } else if (isCao && isPetBaixaEnergia && porte === "medio") {
        notaEnergia = 8.5;
        descEnergia = "Cão de porte médio tranquilo; voltas curtas diárias atendem suas necessidades.";
        pontosFortes.push("Temperamento calmo compatível com rotina com pouco tempo de passeio");
      } else if (isCao && !isPetAltaEnergia && !ageInfo.isPuppy) {
        notaEnergia = 6.0;
        descEnergia = "Energia moderada: precisará de brinquedos interativos e enriquecimento ambiental dentro do imóvel.";
        pontosAtencao.push("Cão com energia moderada; demanda estímulos e enriquecimento ambiental no lar");
      } else if (isCao && isPetAltaEnergia && (porte === "medio" || porte === "grande") && !ageInfo.isPuppy) {
        notaEnergia = 3.0;
        descEnergia = `Atenção: cão jovem (${pet.idade}) e muito ativo. Sem passeios diários vigorosos, pode acumular energia e ficar estressado.`;
        pontosAtencao.push("Cão ativo e jovem com demanda de exercícios superior ao seu tempo livre");
      } else if (isCao && (ageInfo.isPuppy || (isPetAltaEnergia && porte === "grande"))) {
        notaEnergia = 2.0;
        descEnergia = `Atenção crítica: filhote/jovem (${pet.idade}) de alta energia; exige rotina intensa de passeios longos e espaço para correr.`;
        pontosAtencao.push("Filhote/cão de alta energia exige rotina intensa de passeios e gastos físicos");
      } else {
        notaEnergia = 5.0;
        descEnergia = "Energia moderada a alta para quem tem pouco tempo disponível.";
      }
    } else if (quiz.estiloVida === "alta_energia_ativo") {
      // Adotante esportista / ativo
      if (petEnergia === "alta") {
        notaEnergia = 10.0;
        descEnergia = "Confirmado pela ONG ⭐: Animal de alta energia, ativo e vigoroso; vai amar suas atividades físicas e passeios ao ar livre.";
        pontosFortes.push("Confirmado pela ONG: Alta energia e disposição para exercícios");
      } else if (isCao && (isPetAltaEnergia || (ageInfo.isYoung && !isPetBaixaEnergia))) {
        notaEnergia = 10.0;
        descEnergia = "Combinação perfeita! Animal jovem e cheio de energia que vai amar suas caminhadas, corridas e passeios ao ar livre.";
        pontosFortes.push("Parceiro ideal para atividades físicas e passeios ao ar livre");
      } else if (isCao && ageInfo.isSenior) {
        notaEnergia = 5.5;
        descEnergia = `Pet sênior (${pet.idade}) mais calmo; prefere caminhadas leves e descanso a exercícios intensos ou corridas.`;
        pontosAtencao.push("Pet sênior/calmo não suporta rotina de corridas ou exercícios físicos intensos");
      } else {
        notaEnergia = 7.0;
        descEnergia = "Animal equilibrado; pode preferir caminhadas moderadas a treinos intensos.";
      }
    } else {
      // Moderado
      if (petEnergia === "moderada") {
        notaEnergia = 10.0;
        descEnergia = "Confirmado pela ONG ⭐: Energia moderada equilibrada para rotinas habituais.";
        pontosFortes.push("Confirmado pela ONG: Nível de energia moderado ideal para o dia a dia");
      } else if (ageInfo.isSenior) {
        notaEnergia = 9.5;
        descEnergia = "Cão maduro/sênior: excelente para passeios diários moderados e ritmo compassado.";
        pontosFortes.push("Ritmo maduro perfeito para passeios moderados e tranquilos");
      } else if (isPetBaixaEnergia) {
        notaEnergia = 9.0;
        descEnergia = "Boa adaptação ao tempo moderado de passeios diários.";
        pontosFortes.push("Nível de energia equilibrado para rotinas normais");
      } else {
        notaEnergia = 8.5;
        descEnergia = "Boa adaptação ao tempo moderado de passeios diários.";
      }
    }

    /* ==========================================================================
       DIMENSÃO 2: MORADIA & ESPAÇO FÍSICO (Nota 0 a 10)
       ========================================================================== */
    let notaMoradia = 7.0;
    let descMoradia = "";

    if (isGato) {
      if (quiz.moradia === "apto_com_tela") {
        notaMoradia = 10.0;
        descMoradia = "Apartamento 100% telado oferece a segurança máxima recomendada para gatos.";
        pontosFortes.push("Apartamento telado: máxima segurança para felinos");
      } else if (quiz.moradia === "apto_sem_tela") {
        notaMoradia = 1.0;
        descMoradia = "Crítico: apartamentos sem tela representam risco de queda para gatos.";
        pontosAtencao.push("⚠️ Exigência obrigatória de telas de proteção para adoção de felinos");
      } else if (quiz.moradia === "casa_murada") {
        notaMoradia = 9.0;
        descMoradia = "Casa murada segura para gatos.";
      } else {
        notaMoradia = 4.0;
        descMoradia = "Casa aberta ou sítio requer atenção com rotas de fuga do felino.";
        pontosAtencao.push("Risco de fuga ou perigos externos em residências abertas");
      }
    } else {
      // Cão / Outro
      if (petDomicilio === "espaco_amplo") {
        if (quiz.moradia.includes("apto")) {
          notaMoradia = 3.0;
          descMoradia = "Aviso da ONG ⚠️: A instituição indicou que este pet necessita de espaço maior (sítio, chácara ou quintal amplo) e não é indicado para apartamento.";
          pontosAtencao.push("ONG recomendou quintal amplo ou chácara para este animal");
        } else {
          notaMoradia = 10.0;
          descMoradia = "Combinação perfeita ⭐: Casa com quintal ou chácara atende plenamente ao espaço que a ONG recomendou.";
          pontosFortes.push("Espaço amplo compatível com a recomendação da ONG");
        }
      } else if (petDomicilio === "apartamento") {
        if (quiz.moradia.includes("apto")) {
          notaMoradia = 10.0;
          descMoradia = "Confirmado pela ONG ⭐: Excelente adaptação comprovada a apartamento.";
          pontosFortes.push("Confirmado pela ONG: Excelente adaptação a apartamento");
        } else {
          notaMoradia = 9.5;
          descMoradia = "Animal tranquilo e educado, adapta-se com facilidade a apartamento ou casa.";
          pontosFortes.push("Excelente adaptação a diversos portes residenciais");
        }
      } else if (petDomicilio === "casa") {
        if (quiz.moradia.includes("apto")) {
          notaMoradia = (ageInfo.isSenior || isPetBaixaEnergia) ? 7.5 : 5.0;
          descMoradia = "Aviso da ONG: Animal com preferência por casa com quintal; em apartamento necessitará de rotina regrada de passeios.";
          pontosAtencao.push("ONG sugeriu preferência por casa com quintal");
        } else {
          notaMoradia = 10.0;
          descMoradia = "Confirmado pela ONG ⭐: Casa com quintal fechado é o lar ideal para este pet.";
          pontosFortes.push("Confirmado pela ONG: Ideal para casa com quintal");
        }
      } else {
        // qualquer ou legado
        if (porte === "mini" || porte === "pequeno") {
          if (quiz.moradia.includes("apto")) {
            notaMoradia = 9.5;
            descMoradia = "Porte pequeno se adapta com facilidade e conforto a apartamento, precisando descer apenas para necessidades.";
            pontosFortes.push("Porte ideal para apartamento");
          } else {
            notaMoradia = 10.0;
            descMoradia = "Excelente adaptação a casas com quintal ou apartamentos.";
            pontosFortes.push("Porte ideal para o espaço residencial");
          }
        } else if (porte === "medio") {
          if (quiz.moradia.includes("apto")) {
            if (ageInfo.isSenior || isPetBaixaEnergia) {
              notaMoradia = 8.8;
              descMoradia = "Cão de porte médio tranquilo e silencioso: adapta-se muito bem a apartamento com voltas na rua.";
              pontosFortes.push("Cão maduro e silencioso com ótima adaptação a apartamento");
            } else if (!isPetAltaEnergia) {
              notaMoradia = 7.0;
              descMoradia = "Porte médio em apartamento: adaptável com rotina regrada de passeios.";
            } else {
              notaMoradia = 5.5;
              descMoradia = "Porte médio ativo em apartamento: necessitará de passeios regulares para gastar energia.";
              pontosAtencao.push("Cão ativo em apartamento necessita de rotina garantida de caminhadas");
            }
          } else {
            notaMoradia = 10.0;
            descMoradia = "Espaço excelente com quintal para cão de porte médio.";
            pontosFortes.push("Excelente área para o porte do animal");
          }
        } else {
          // Grande ou Gigante
          if (quiz.moradia.includes("apto")) {
            if (ageInfo.isSenior || isPetBaixaEnergia) {
              notaMoradia = 7.0;
              descMoradia = "Cão de grande porte maduro em apartamento: viável devido ao temperamento calmo, com passeios regulares.";
            } else {
              notaMoradia = 4.0;
              descMoradia = "Cão de grande porte ativo em apartamento exige dedicação especial e espaço interno adequado.";
              pontosAtencao.push("Porte grande em apartamento limita a movimentação do animal");
            }
          } else {
            notaMoradia = 10.0;
            descMoradia = "Casa com quintal ou chácara é o lar dos sonhos para este peludo!";
            pontosFortes.push("Espaço amplo ideal para o porte do cão");
          }
        }
      }
    }

    /* ==========================================================================
       DIMENSÃO 3: ROTINA & TEMPO SOZINHO (Nota 0 a 10)
       ========================================================================== */
    let notaRotina = 7.5;
    let descRotina = "";

    if (quiz.tempoSozinho === "alguem_em_casa") {
      notaRotina = 10.0;
      descRotina = "Presença humana constante em casa é o melhor cenário para o apego e segurança do pet.";
      pontosFortes.push("Rotina com tutores em casa favorece o bem-estar psicológico");
    } else if (quiz.tempoSozinho === "ate_4h") {
      notaRotina = 10.0;
      descRotina = "Período curto de ausência facilmente administrável com carinho e brinquedos.";
      pontosFortes.push("Poucas horas sozinho favorece rápida adaptação");
    } else if (quiz.tempoSozinho === "4_a_8h") {
      if (petTempoSozinho === "companhia_frequente") {
        notaRotina = 4.5;
        descRotina = "Aviso da ONG ⚠️: A instituição indicou que este animal demanda companhia frequente no lar e pode estranhar ficar 4 a 8 horas sozinho.";
        pontosAtencao.push("ONG indicou que o pet precisa de companhia frequente no lar");
      } else if (petTempoSozinho === "independente") {
        notaRotina = 10.0;
        descRotina = isGato
          ? "Confirmado pela ONG ⭐: Felino independente que lida de forma exemplar com a rotina de horário comercial."
          : "Confirmado pela ONG ⭐: Animal independente e calmo, adapta-se com tranquilidade ao horário comercial.";
        pontosFortes.push("Independência confirmada pela ONG para passar o expediente de trabalho");
      } else if (isGato) {
        notaRotina = 10.0;
        descRotina = "Gatos adultos lidam de forma exemplar com a rotina de horário comercial.";
        pontosFortes.push("Excelente independência para rotina de trabalho");
      } else if (ageInfo.isSenior || isPetBaixaEnergia) {
        notaRotina = 9.2;
        descRotina = "Cão adulto/sênior muito calmo; costuma dormir tranquilamente durante o horário comercial.";
        pontosFortes.push("Maturidade emocional exemplar para ficar sozinho durante o expediente");
      } else if (porte === "pequeno" || !isPetAltaEnergia) {
        notaRotina = 7.5;
        descRotina = "Rotina comum de trabalho; pet adulto se adapta bem com enriquecimento ambiental.";
      } else if (isPetAltaEnergia && !ageInfo.isPuppy) {
        notaRotina = 6.0;
        descRotina = "Cão jovem e cheio de energia ficando 4 a 8h sozinho pode demandar brinquedos antiestresse.";
        pontosAtencao.push("Pet jovem pode ficar inquieto se passar longas horas sem companhia");
      } else if (ageInfo.isPuppy) {
        notaRotina = 4.0;
        descRotina = "Filhotes de cães sofrem mais com 4 a 8 horas de solidão diária e demandam supervisão.";
        pontosAtencao.push("Filhotes demandam supervisão frequente e podem chorar se ficarem sozinhos");
      } else {
        notaRotina = 7.0;
        descRotina = "Rotina de trabalho com adaptação normal.";
      }
    } else {
      // Mais de 8h
      if (petTempoSozinho === "companhia_frequente") {
        notaRotina = 2.5;
        descRotina = "Aviso da ONG ⚠️: Este animal demanda companhia constante e sofrerá se passar mais de 8 horas sozinho diariamente.";
        pontosAtencao.push("Pet não suporta longos períodos diários de solidão");
      } else if (isGato) {
        notaRotina = 8.0;
        descRotina = "Possível para felinos adultos se houver arranhadores e estímulos no lar.";
      } else {
        notaRotina = 4.0;
        descRotina = "Mais de 8h diárias sozinho pode causar tédio e ansiedade de separação em cães.";
        pontosAtencao.push("Período longo de ausência diária pode demandar creche pet ou passeador");
      }
    }

    /* ==========================================================================
       DIMENSÃO 4: CONVIVÊNCIA FAMILIAR & OUTROS PETS (Nota 0 a 10)
       ========================================================================== */
    let notaFamilia = 10.0;
    let descFamilia = "Excelente adaptação ao ambiente familiar.";

    if (quiz.temCriancas === "sim") {
      if (petCriancas === "nao") {
        notaFamilia = 2.0;
        descFamilia = "Aviso da ONG ⚠️: Não recomendado para famílias com crianças pequenas (pet tímido, assustado ou sensível a barulho).";
        pontosAtencao.push("Não recomendado para lares com crianças pequenas");
      } else if (petCriancas === "sim") {
        notaFamilia = 10.0;
        descFamilia = "Confirmado pela ONG ⭐: Temperamento dócil, paciente e muito afetuoso com crianças.";
        pontosFortes.push("Confirmado pela ONG: Excelente e paciente com crianças");
      } else if (petCriancas === "supervisao") {
        notaFamilia = 7.0;
        descFamilia = "Aviso da ONG: Adaptação com crianças precisará de supervisão e aproximação gradual.";
        pontosAtencao.push("Adaptação com crianças precisará de supervisão inicial");
      } else {
        const gostaCriancas = temperamento.some(t => 
          t.includes("criança") || t.includes("dócil") || t.includes("brincalhão") || t.includes("afetuoso") || t.includes("calmo") || t.includes("manso") || t.includes("carinhoso")
        );
        if (gostaCriancas) {
          notaFamilia = 10.0;
          descFamilia = "Temperamento dócil, paciente e carinhoso com crianças pequenas.";
          pontosFortes.push("Recomendado para lares com crianças");
        } else if (temperamento.some(t => t.includes("assustado") || t.includes("tímido") || t.includes("arisco"))) {
          notaFamilia = 5.5;
          descFamilia = "Animal sensível a ruídos altos; período de adaptação com crianças deve ser calmo.";
          pontosAtencao.push("Pet tímido que pode se assustar com barulhos de crianças pequenas");
        } else {
          notaFamilia = 7.5;
          descFamilia = "Adaptação com crianças precisará de supervisão inicial.";
        }
      }
    }

    // Outros Pets
    if (quiz.outrosPets === "tem_caes" || quiz.outrosPets === "tem_ambos") {
      if (petCaes === "nao") {
        notaFamilia = Math.min(notaFamilia, 2.5);
        pontosAtencao.push("ONG indicou preferência por lar sem outros cães (filho único)");
      } else if (petCaes === "sim") {
        notaFamilia = Math.max(notaFamilia, 10.0);
        pontosFortes.push("Confirmado pela ONG: Sociável e alegre com outros cães");
      } else if (petCaes === "adaptacao") {
        notaFamilia = Math.min(notaFamilia, 6.5);
        pontosAtencao.push("ONG indicou necessidade de introdução gradual com outros cães");
      } else {
        const sociavelCaes = temperamento.some(t => t.includes("sociável") || t.includes("amigável") || t.includes("outros cães") || t.includes("outros animais") || t.includes("dócil"));
        if (sociavelCaes) {
          notaFamilia = Math.max(notaFamilia, 10.0);
          pontosFortes.push("Sociável e alegre na convivência com outros cães");
        } else {
          notaFamilia = Math.min(notaFamilia, 6.0);
          pontosAtencao.push("Pode precisar de adaptação gradual com outros cães");
        }
      }
    }

    if (quiz.outrosPets === "tem_gatos" || quiz.outrosPets === "tem_ambos") {
      if (petGatos === "nao") {
        notaFamilia = Math.min(notaFamilia, 2.0);
        pontosAtencao.push("ONG indicou que o animal não convive com gatos");
      } else if (petGatos === "sim") {
        notaFamilia = Math.max(notaFamilia, 10.0);
        pontosFortes.push("Confirmado pela ONG: Convive pacificamente com gatos");
      } else if (petGatos === "adaptacao") {
        notaFamilia = Math.min(notaFamilia, 6.0);
        pontosAtencao.push("ONG indicou que convivência com gatos precisará de aproximação progressiva");
      } else if (isCao) {
        const toleraGatos = temperamento.some(t => t.includes("gato") || t.includes("calmo") || t.includes("dócil") || t.includes("silencioso"));
        if (toleraGatos) {
          notaFamilia = Math.max(notaFamilia, 9.5);
          pontosFortes.push("Convívio tranquilo com gatos");
        } else {
          notaFamilia = Math.min(notaFamilia, 5.0);
          pontosAtencao.push("Adaptação com seus gatos atuais deve ser progressiva com auxílio da ONG");
        }
      }
    }

    /* ==========================================================================
       DIMENSÃO 5: CUIDADOS MÉDICOS & ENFERMIDADES (Nota 0 a 10)
       ========================================================================== */
    let notaSaude = 10.0;
    let descSaude = "Animal com saúde excelente, vacinas em dia e sem necessidade de cuidados médicos extras.";

    const temEnfermidade = saude.possuiEnfermidades || !!(saude.enfermidadesDescricao);

    if (temEnfermidade) {
      if (quiz.cuidadosMedicos === "sim") {
        notaSaude = 10.0;
        descSaude = "⭐ Você tem a generosidade e disposição para dar o suporte que este guerreiro precisa!";
        pontosFortes.push("Disponibilidade para acolher as necessidades de saúde especiais deste pet");
      } else if (quiz.cuidadosMedicos === "apenas_saudavel") {
        notaSaude = 2.0;
        descSaude = "Este animal possui cuidados extras informados pela ONG e você prefere um pet 100% saudável.";
        pontosAtencao.push("⚠️ Animal requer cuidados veterinários ou medicação contínua");
      } else {
        notaSaude = 6.0;
        descSaude = "Condição médica que precisará de alinhamento com os veterinários da ONG.";
      }
    } else if (!saude.castrado && quiz.arcarCastracao === "posso_arcar") {
      notaSaude = 9.0;
      descSaude = "Animal saudável; protocolo com castração programada aos 12 meses ou sob supervisão da ONG.";
    } else {
      notaSaude = 10.0;
      descSaude = "Animal com saúde perfeita, vacinas em dia e sem necessidade de cuidados médicos extras.";
      pontosFortes.push("Saúde excelente e sem exigência de medicações contínuas");
    }

    /* ==========================================================================
       BÔNUS/PENALIDADE DE PREFERÊNCIA DE ESPÉCIE & PORTE
       ========================================================================== */
    let ajustePreferencia = 0;
    if (quiz.especie && quiz.especie !== "indiferente") {
      if (quiz.especie === pet.especie) ajustePreferencia += 0.3;
      else ajustePreferencia -= 1.5;
    }
    if (quiz.porte && quiz.porte !== "indiferente") {
      if (quiz.porte === porte || (quiz.porte === 'pequeno' && porte === 'mini')) ajustePreferencia += 0.3;
      else ajustePreferencia -= 0.8;
    }

    /* ==========================================================================
       CÁLCULO DA MÉDIA PONDERADA MATEMÁTICA
       ========================================================================== */
    const somaPesos = pesoEnergia + pesoMoradia + pesoRotina + pesoFamilia + pesoSaude;
    const somaPonderada = (notaEnergia * pesoEnergia) +
                          (notaMoradia * pesoMoradia) +
                          (notaRotina * pesoRotina) +
                          (notaFamilia * pesoFamilia) +
                          (notaSaude * pesoSaude);

    let notaFinal = (somaPonderada / somaPesos) + ajustePreferencia;
    notaFinal = Math.max(1.5, Math.min(10.0, notaFinal)); // Limite entre 1.5 e 10.0
    const percentualFinal = Math.min(100, Math.round(notaFinal * 10));

    // Classificação em faixas
    let nivel = "media";
    let label = "Boa Afinidade";
    let color = "bg-blue-600 text-white";
    let badgeBorder = "border-blue-300 bg-blue-50 text-blue-800";

    if (percentualFinal >= 85) {
      nivel = "alta";
      label = "Par Perfeito ⭐";
      color = "bg-teal-600 text-white";
      badgeBorder = "border-teal-300 bg-teal-50 text-teal-900";
    } else if (percentualFinal < 65) {
      nivel = "baixa";
      label = "Requer Adaptação ⚠️";
      color = "bg-amber-600 text-white";
      badgeBorder = "border-amber-300 bg-amber-50 text-amber-900";
    }

    return {
      score: percentualFinal,
      notaFinal: notaFinal.toFixed(1),
      nivel,
      label,
      color,
      badgeBorder,
      isDisqualified: false,
      isGloballyDisqualified: false,
      isPetDisqualified: false,
      disqualifyReasons: [],
      dimensoes: [
        {
          id: "energia",
          nome: "Energia & Exercícios",
          peso: pesoEnergia,
          nota: notaEnergia.toFixed(1),
          comentario: descEnergia
        },
        {
          id: "moradia",
          nome: "Moradia & Espaço",
          peso: pesoMoradia,
          nota: notaMoradia.toFixed(1),
          comentario: descMoradia
        },
        {
          id: "rotina",
          nome: "Rotina & Solidão",
          peso: pesoRotina,
          nota: notaRotina.toFixed(1),
          comentario: descRotina
        },
        {
          id: "familia",
          nome: "Convivência Familiar",
          peso: pesoFamilia,
          nota: notaFamilia.toFixed(1),
          comentario: descFamilia
        },
        {
          id: "saude",
          nome: "Saúde & Cuidados",
          peso: pesoSaude,
          nota: notaSaude.toFixed(1),
          comentario: descSaude
        }
      ],
      pontosFortes,
      pontosAtencao
    };
  }
};

if (typeof window !== "undefined") {
  window.AdopterMatch = AdopterMatch;
}
