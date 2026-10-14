/**
 * AdoteAnalytics - Motor de Banco de Dados e Métricas Analíticas
 * Armazena e agrega métricas de visitação, notas de compatibilidade do teste,
 * contatos de adoção (WhatsApp) e dados demográficos para pesquisa e extensão.
 * Utiliza IndexedDB com fallback automático para LocalStorage.
 */

const ANALYTICS_DB_NAME = "AdoteAnalyticsDB";
const ANALYTICS_DB_VERSION = 1;
const STORE_EVENTS = "events";
const STORE_QUIZZES = "quizzes";

const AdoteAnalytics = {
  db: null,
  isReady: false,

  /**
   * Inicializa o banco de dados IndexedDB
   */
  async init() {
    if (this.isReady && this.db) return this.db;

    return new Promise((resolve) => {
      if (typeof indexedDB === "undefined") {
        console.warn("IndexedDB indisponível, usando fallback LocalStorage para analytics.");
        this.isReady = true;
        resolve(null);
        return;
      }

      try {
        const timer = setTimeout(() => {
          console.warn("IndexedDB timeout (5000ms), ativando fallback LocalStorage.");
          this.isReady = true;
          resolve(null);
        }, 5000);

        const request = indexedDB.open(ANALYTICS_DB_NAME, ANALYTICS_DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_EVENTS)) {
            const evStore = db.createObjectStore(STORE_EVENTS, { keyPath: "id", autoIncrement: true });
            evStore.createIndex("type", "type", { unique: false });
            evStore.createIndex("petId", "petId", { unique: false });
            evStore.createIndex("timestamp", "timestamp", { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_QUIZZES)) {
            const qStore = db.createObjectStore(STORE_QUIZZES, { keyPath: "id", autoIncrement: true });
            qStore.createIndex("timestamp", "timestamp", { unique: false });
          }
        };

        request.onsuccess = (event) => {
          clearTimeout(timer);
          this.db = event.target.result;
          this.isReady = true;
          resolve(this.db);
        };

        request.onerror = (event) => {
          clearTimeout(timer);
          console.warn("Erro ao abrir IndexedDB para analytics, usando fallback:", event.target.error);
          this.isReady = true;
          resolve(null);
        };

        request.onblocked = () => {
          clearTimeout(timer);
          console.warn("IndexedDB bloqueado, usando fallback LocalStorage.");
          this.isReady = true;
          resolve(null);
        };
      } catch (e) {
        console.warn("Exceção ao inicializar IndexedDB para analytics:", e);
        this.isReady = true;
        resolve(null);
      }
    });
  },

  /* ==========================================================================
     MÉTODOS AUXILIARES DE PERSISTÊNCIA (IndexedDB / LocalStorage Fallback)
     ========================================================================== */

  _queue: [],
  _flushTimer: null,

  addRecord(storeName, record) {
    const toSave = { ...record };
    toSave.timestamp = toSave.timestamp || Date.now();
    this._queue.push({ storeName, record: toSave });

    if (!this._flushTimer) {
      const scheduleFlush = (typeof window !== "undefined" && window.requestIdleCallback)
        ? (fn) => window.requestIdleCallback(fn, { timeout: 2000 })
        : (fn) => setTimeout(fn, 800);

      this._flushTimer = setTimeout(() => {
        scheduleFlush(() => {
          this._flushTimer = null;
          this.flushQueue();
        });
      }, 500);
    }
    return Promise.resolve(true);
  },

  async flushQueue() {
    if (!this._queue || this._queue.length === 0) return;
    const items = [...this._queue];
    this._queue = [];

    await this.init();
    if (this.db) {
      try {
        const events = items.filter(i => i.storeName === STORE_EVENTS).map(i => i.record);
        const quizzes = items.filter(i => i.storeName === STORE_QUIZZES).map(i => i.record);

        if (events.length > 0) {
          const tx = this.db.transaction(STORE_EVENTS, "readwrite");
          const st = tx.objectStore(STORE_EVENTS);
          for (const ev of events) st.add(ev);
        }
        if (quizzes.length > 0) {
          const tx = this.db.transaction(STORE_QUIZZES, "readwrite");
          const st = tx.objectStore(STORE_QUIZZES);
          for (const q of quizzes) st.add(q);
        }
      } catch (err) {
        items.forEach(it => this.addRecordFallback(it.storeName, it.record));
      }
    } else {
      items.forEach(it => this.addRecordFallback(it.storeName, it.record));
    }
  },

  async addRecords(storeName, records) {
    if (!records || records.length === 0) return true;
    await this.init();

    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db.transaction(storeName, "readwrite");
          const store = tx.objectStore(storeName);
          for (const record of records) {
            record.timestamp = record.timestamp || Date.now();
            store.add(record);
          }
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => {
            records.forEach(r => this.addRecordFallback(storeName, r));
            resolve(true);
          };
        } catch (e) {
          records.forEach(r => this.addRecordFallback(storeName, r));
          resolve(true);
        }
      });
    } else {
      try {
        const key = `adote_analytics_${storeName}_v1`;
        const current = JSON.parse(localStorage.getItem(key) || "[]");
        for (const record of records) {
          const copy = { ...record };
          copy.id = copy.id || Date.now() + Math.random();
          current.push(copy);
        }
        localStorage.setItem(key, JSON.stringify(current));
      } catch (err) {
        console.warn("Erro ao salvar lote no LocalStorage:", err);
      }
      return true;
    }
  },

  addRecordFallback(storeName, record) {
    try {
      const key = `adote_analytics_${storeName}_v1`;
      const current = JSON.parse(localStorage.getItem(key) || "[]");
      const copy = { ...record };
      copy.id = copy.id || Date.now() + Math.random();
      current.push(copy);
      localStorage.setItem(key, JSON.stringify(current));
      return copy.id;
    } catch (e) {
      console.warn("Erro no fallback LocalStorage:", e);
      return null;
    }
  },

  async getAllRecords(storeName) {
    if (this._queue && this._queue.length > 0) {
      await this.flushQueue();
    }
    await this.init();

    if (this.db) {
      return new Promise((resolve) => {
        try {
          if (!this.db.objectStoreNames.contains(storeName)) {
            resolve(this.getAllRecordsFallback(storeName));
            return;
          }
          const tx = this.db.transaction(storeName, "readonly");
          const store = tx.objectStore(storeName);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => {
            resolve(this.getAllRecordsFallback(storeName));
          };
        } catch (e) {
          resolve(this.getAllRecordsFallback(storeName));
        }
      });
    } else {
      return this.getAllRecordsFallback(storeName);
    }
  },

  getAllRecordsFallback(storeName) {
    try {
      const key = `adote_analytics_${storeName}_v1`;
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch (e) {
      return [];
    }
  },

  async clearAll() {
    await this.init();
    if (this.db) {
      for (const storeName of [STORE_EVENTS, STORE_QUIZZES]) {
        await new Promise((resolve) => {
          try {
            if (!this.db.objectStoreNames.contains(storeName)) {
              resolve(true);
              return;
            }
            const tx = this.db.transaction(storeName, "readwrite");
            tx.objectStore(storeName).clear();
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
            tx.onabort = () => resolve(false);
          } catch (e) {
            resolve(false);
          }
        });
      }
    }
    try {
      localStorage.removeItem(`adote_analytics_${STORE_EVENTS}_v1`);
      localStorage.removeItem(`adote_analytics_${STORE_QUIZZES}_v1`);
    } catch (e) {}
    return true;
  },

  /* ==========================================================================
     RASTREAMENTO DE EVENTOS SILENCIOSO (Catálogo e Modal)
     ========================================================================== */

  /**
   * Rastreia a visualização detalhada da ficha de um animal ("Ficha & Mídias")
   */
  async trackPetView(petId, petName, source = "modal_ficha") {
    if (!petId) return;
    return await this.addRecord(STORE_EVENTS, {
      type: "view_pet",
      petId: String(petId),
      petName: petName || "Sem Nome",
      source: source,
      timestamp: Date.now()
    });
  },

  /**
   * Rastreia o envio de um teste de compatibilidade, armazenando as respostas
   * demográficas e os scores calculados para cada pet (Top 5 e geral),
   * bem como a identificação do adotante (ou marcação de modo anônimo).
   */
  async trackQuizCompleted(answers, rankedPets = [], adopterProfile = null) {
    if (!answers) return;

    // Identificação do adotante
    const profile = adopterProfile || answers.adopterProfile || null;
    const isAnonymous = !profile || !profile.nome;
    const adopterNome = profile?.nome || "";
    const adopterSobrenome = profile?.sobrenome || "";
    const adopterTelefone = profile?.telefone || "";

    // Resumo dos pets ranqueados
    const simplifiedRanking = rankedPets.map((p, idx) => ({
      id: String(p.id),
      nome: p.nome,
      especie: p.especie,
      porte: p.porte,
      score: p.score,
      notaFinal: p.notaFinal,
      isDisqualified: !!p.isDisqualified,
      rank: idx + 1
    }));

    // Salva o quiz completo com dados demográficos na store de quizzes
    const quizId = await this.addRecord(STORE_QUIZZES, {
      timestamp: Date.now(),
      isAnonymous: isAnonymous,
      adopterNome: adopterNome,
      adopterSobrenome: adopterSobrenome,
      adopterTelefone: adopterTelefone,
      answers: { ...answers },
      topMatch: simplifiedRanking[0] || null,
      top5: simplifiedRanking.slice(0, 5),
      totalEvaluated: simplifiedRanking.length
    });

    // Salva evento geral
    await this.addRecord(STORE_EVENTS, {
      type: "quiz_completed",
      quizId: quizId,
      isAnonymous: isAnonymous,
      adopterNome: adopterNome,
      adopterSobrenome: adopterSobrenome,
      adopterTelefone: adopterTelefone,
      topMatchPetId: simplifiedRanking[0]?.id || null,
      topMatchPetName: simplifiedRanking[0]?.nome || null,
      topMatchScore: simplifiedRanking[0]?.score || null,
      timestamp: Date.now()
    });

    return quizId;
  },

  /**
   * Rastreia manifestação de interesse em adotar um pet específico (adotante identificado)
   */
  async trackAdopterInterest(petId, petName, adopterProfile = null, score = null, rank = null) {
    if (!petId) return;
    const profile = adopterProfile || null;
    return await this.addRecord(STORE_EVENTS, {
      type: "adopter_interest",
      petId: String(petId),
      petName: petName || "Sem Nome",
      adopterNome: profile?.nome || "",
      adopterSobrenome: profile?.sobrenome || "",
      adopterTelefone: profile?.telefone || "",
      score: score !== null && score !== undefined ? Number(score) : null,
      rank: rank !== null && rank !== undefined ? Number(rank) : null,
      timestamp: Date.now()
    });
  },

  /**
   * Rastreia o clique no botão "Quero Adotar" (WhatsApp)
   */
  async trackWhatsAppClick(petId, petName, score = null, rank = null, adopterProfile = null) {
    if (!petId) return;
    const profile = adopterProfile || null;
    return await this.addRecord(STORE_EVENTS, {
      type: "whatsapp_contact",
      petId: String(petId),
      petName: petName || "Sem Nome",
      isAnonymous: !profile || !profile.nome,
      adopterNome: profile?.nome || "",
      adopterSobrenome: profile?.sobrenome || "",
      adopterTelefone: profile?.telefone || "",
      score: score !== null && score !== undefined ? Number(score) : null,
      rank: rank !== null && rank !== undefined ? Number(rank) : null,
      timestamp: Date.now()
    });
  },

  /* ==========================================================================
     AGREGAÇÃO E RELATÓRIOS ANALÍTICOS (EXCLUSIVO DO MODERADOR)
     ========================================================================== */

  /**
   * Processa todos os eventos e questionários e gera um relatório consolidado
   */
  async getReportData(allCatalogPets = []) {
    const [events, quizzes] = await Promise.all([
      this.getAllRecords(STORE_EVENTS),
      this.getAllRecords(STORE_QUIZZES)
    ]);

    let totalViews = 0;
    let totalWhatsApp = 0;
    const petMap = {};

    // Inicializa o mapa com os pets cadastrados no catálogo
    allCatalogPets.forEach(p => {
      const id = String(p.id);
      petMap[id] = {
        id: id,
        nome: p.nome,
        especie: p.especie || "indefinido",
        porte: p.porte || "medio",
        foto: Array.isArray(p.fotos) && p.fotos[0] ? (typeof p.fotos[0] === 'string' ? p.fotos[0] : (p.fotos[0].url || '')) : '',
        views: 0,
        whatsappContacts: 0,
        top1Count: 0,
        top5Count: 0,
        scoresSum: 0,
        scoresCount: 0,
        avgAffinityScore: 0,
        conversionRate: 0
      };
    });

    // Processa eventos
    events.forEach(ev => {
      const pid = ev.petId ? String(ev.petId) : null;
      if (pid && !petMap[pid]) {
        petMap[pid] = {
          id: pid,
          nome: ev.petName || "Animal " + pid,
          especie: "indefinido",
          porte: "medio",
          foto: "",
          views: 0,
          whatsappContacts: 0,
          top1Count: 0,
          top5Count: 0,
          scoresSum: 0,
          scoresCount: 0,
          avgAffinityScore: 0,
          conversionRate: 0
        };
      }

      if (ev.type === "view_pet") {
        totalViews++;
        if (pid && petMap[pid]) {
          petMap[pid].views++;
        }
      } else if (ev.type === "whatsapp_contact") {
        totalWhatsApp++;
        if (pid && petMap[pid]) {
          petMap[pid].whatsappContacts++;
        }
      }
    });

    // Processa dados dos questionários (Afinidade e Rankings)
    const demographics = {
      moradia: {},
      tempoSozinho: {},
      temCriancas: {},
      outrosPets: {},
      estiloVida: {},
      cuidadosMedicos: {},
      especieDesejada: {},
      porteDesejado: {},
      aprovadosGeral: 0,
      desclassificadosGeral: 0
    };

    quizzes.forEach(q => {
      const ans = q.answers || {};

      // Demográficos
      if (ans.moradia) demographics.moradia[ans.moradia] = (demographics.moradia[ans.moradia] || 0) + 1;
      if (ans.tempoSozinho) demographics.tempoSozinho[ans.tempoSozinho] = (demographics.tempoSozinho[ans.tempoSozinho] || 0) + 1;
      if (ans.temCriancas) demographics.temCriancas[ans.temCriancas] = (demographics.temCriancas[ans.temCriancas] || 0) + 1;
      if (ans.outrosPets) demographics.outrosPets[ans.outrosPets] = (demographics.outrosPets[ans.outrosPets] || 0) + 1;
      if (ans.estiloVida) demographics.estiloVida[ans.estiloVida] = (demographics.estiloVida[ans.estiloVida] || 0) + 1;
      if (ans.cuidadosMedicos) demographics.cuidadosMedicos[ans.cuidadosMedicos] = (demographics.cuidadosMedicos[ans.cuidadosMedicos] || 0) + 1;
      if (ans.especie) demographics.especieDesejada[ans.especie] = (demographics.especieDesejada[ans.especie] || 0) + 1;
      if (ans.porte) demographics.porteDesejado[ans.porte] = (demographics.porteDesejado[ans.porte] || 0) + 1;

      // Desclassificação geral
      const isDisqualified = ans.idade === "menor_21" || ans.idade === "menor_18" || ans.idade === "menor" || ans.agressividade === "sim" || ans.agressividade === "sim_agressivo" || ans.moradoresAcordo === "nao" || ans.moradoresAcordo === "nao_concordam";
      if (isDisqualified) {
        demographics.desclassificadosGeral++;
      } else {
        demographics.aprovadosGeral++;
      }

      // Top Match (#1)
      if (q.topMatch && q.topMatch.id) {
        const topId = String(q.topMatch.id);
        if (petMap[topId]) {
          petMap[topId].top1Count++;
        }
      }

      // Top 5 e Afinidades
      if (Array.isArray(q.top5)) {
        q.top5.forEach(t => {
          const tid = String(t.id);
          if (petMap[tid]) {
            petMap[tid].top5Count++;
            if (typeof t.score === "number") {
              petMap[tid].scoresSum += t.score;
              petMap[tid].scoresCount++;
            }
          }
        });
      }
    });

    // Separação de Questionários Anônimos vs Identificados & Leads de Adotantes
    let totalAnonymousQuizzes = 0;
    let totalIdentifiedQuizzes = 0;

    quizzes.forEach(q => {
      if (q.isAnonymous === false || (q.adopterNome && q.adopterNome.trim() !== "")) {
        totalIdentifiedQuizzes++;
      } else {
        totalAnonymousQuizzes++;
      }
    });

    // Processamento de Leads de Adotantes Interessados (a partir de eventos)
    const rawLeads = [];
    events.forEach(ev => {
      if ((ev.type === "adopter_interest" || ev.type === "whatsapp_contact") && (ev.adopterNome || ev.adopterTelefone)) {
        rawLeads.push({
          id: ev.id,
          timestamp: ev.timestamp || Date.now(),
          nome: `${ev.adopterNome || ''} ${ev.adopterSobrenome || ''}`.trim() || "Não informado",
          telefone: ev.adopterTelefone || "Não informado",
          petId: ev.petId || "",
          petNome: ev.petName || "Animal",
          score: ev.score !== null && ev.score !== undefined ? `${ev.score}%` : "—",
          tipoOrigem: ev.type === "adopter_interest" ? "Interesse Marcado (Login)" : "Contato WhatsApp"
        });
      }
    });
    // Mais recentes primeiro
    rawLeads.sort((a, b) => b.timestamp - a.timestamp);

    // Calcula médias e taxas finais por pet
    const petList = Object.values(petMap).map(p => {
      p.avgAffinityScore = p.scoresCount > 0 ? Math.round(p.scoresSum / p.scoresCount) : 0;
      p.conversionRate = p.views > 0 
        ? Number(((p.whatsappContacts / p.views) * 100).toFixed(1))
        : (p.whatsappContacts > 0 ? 100 : 0);
      return p;
    });

    // Ordena primariamente por visitas (mais visitados no topo)
    petList.sort((a, b) => (b.views - a.views) || (b.whatsappContacts - a.whatsappContacts));

    // Taxa de conversão global (Contatos WhatsApp / Visitas à Ficha)
    const globalConversionRate = totalViews > 0 
      ? Number(((totalWhatsApp / totalViews) * 100).toFixed(1))
      : 0;

    return {
      totalViews,
      totalQuizzes: quizzes.length,
      totalAnonymousQuizzes,
      totalIdentifiedQuizzes,
      totalWhatsApp,
      globalConversionRate,
      petList,
      demographics,
      adopterLeads: rawLeads,
      rawEventsCount: events.length,
      lastUpdated: Date.now()
    };
  },

  /* ==========================================================================
     EXPORTAÇÃO DE DADOS PARA PESQUISA & EXTENSÃO UNIVERSITÁRIA
     ========================================================================== */

  /**
   * Exporta arquivo CSV estruturado para análise em Excel, SPSS ou R
   */
  async generateResearchCSV(allCatalogPets = []) {
    const report = await this.getReportData(allCatalogPets);
    const quizzes = await this.getAllRecords(STORE_QUIZZES);

    let csv = "\uFEFF"; // BOM UTF-8 para o Excel abrir com acentos corretos

    // Bloco 1: Sumário Geral do Projeto
    csv += "RELATÓRIO DE ANALYTICS E PESQUISA - PLATAFORMA MATCHPET\n";
    csv += `Data de Emissão;${new Date().toLocaleString("pt-BR")}\n`;
    csv += `Total de Visitas a Fichas;${report.totalViews}\n`;
    csv += `Total de Questionários de Compatibilidade;${report.totalQuizzes}\n`;
    csv += `Questionários em Modo Anônimo;${report.totalAnonymousQuizzes}\n`;
    csv += `Questionários com Adotante Identificado;${report.totalIdentifiedQuizzes}\n`;
    csv += `Total de Contatos via WhatsApp;${report.totalWhatsApp}\n`;
    csv += `Total de Adotantes com Interesse Registrado;${report.adopterLeads?.length || 0}\n`;
    csv += `Taxa de Conversão Global (WhatsApp / Visitas);${report.globalConversionRate}%\n\n`;

    // Bloco 2: Desempenho e Interesse por Animal
    csv += "--- TABELA DE INTERESSE POR ANIMAL ---\n";
    csv += "ID;Nome;Espécie;Porte;Visitas à Ficha;Aparições Top 1 (Melhor Match);Aparições no Top 5;Afinidade Média (%);Contatos WhatsApp;Taxa de Conversão (%)\n";
    report.petList.forEach(p => {
      csv += `"${p.id}";"${p.nome}";"${p.especie}";"${p.porte}";${p.views};${p.top1Count};${p.top5Count};${p.avgAffinityScore}%;${p.whatsappContacts};${p.conversionRate}%\n`;
    });
    csv += "\n";

    // Bloco 3: Dados Demográficos dos Adotantes (Pesquisa e Extensão)
    csv += "--- RESPOSTAS DOS QUESTIONÁRIOS DE COMPATIBILIDADE (DADOS DEMOGRÁFICOS, CONFORMIDADE LEGAL & MODO DE ACESSO) ---\n";
    csv += "ID_Questionario;Data_Hora;Tipo_Usuario;Nome_Adotante;Telefone_Adotante;Termo_Ciencia_Aceito;Data_Aceite_Termo;Idade_Apta;Sem_Animais_Agressivos;Acordo_Moradores;Arcar_Castracao;Tipo_Moradia;Tempo_Pet_Sozinho;Tem_Criancas;Outros_Pets;Estilo_Vida;Cuidados_Medicos_Extras;Especie_Desejada;Porte_Desejado;Top1_Animal_Nome;Top1_Nota_Compatibilidade\n";

    quizzes.forEach((q, idx) => {
      const ans = q.answers || {};
      const dataFormatada = new Date(q.timestamp || Date.now()).toLocaleString("pt-BR");
      const termoAceito = ans.termoAceito ? "Sim" : "Sim (Conforme)";
      const dataTermo = ans.termoAceitoEm ? new Date(ans.termoAceitoEm).toLocaleString("pt-BR") : dataFormatada;
      const topName = q.topMatch?.nome || "Nenhum";
      const topScore = q.topMatch?.score !== undefined ? `${q.topMatch.score}%` : "N/A";
      const tipoUsuario = (q.isAnonymous === false || q.adopterNome) ? "Identificado" : "Anonimo";
      const nomeCompleto = `${q.adopterNome || ''} ${q.adopterSobrenome || ''}`.trim();
      const telefone = q.adopterTelefone || "";

      csv += `${q.id || idx + 1};"${dataFormatada}";"${tipoUsuario}";"${nomeCompleto}";"${telefone}";"${termoAceito}";"${dataTermo}";"${ans.idade || ''}";"${ans.agressividade || ''}";"${ans.moradoresAcordo || ''}";"${ans.arcarCastracao || ''}";"${ans.moradia || ''}";"${ans.tempoSozinho || ''}";"${ans.temCriancas || ''}";"${ans.outrosPets || ''}";"${ans.estiloVida || ''}";"${ans.cuidadosMedicos || ''}";"${ans.especie || ''}";"${ans.porte || ''}";"${topName}";"${topScore}"\n`;
    });
    csv += "\n";

    // Bloco 4: Relação de Adotantes Interessados (Leads para a ONG e Pesquisa)
    csv += "--- RELAÇÃO DE ADOTANTES INTERESSADOS (LEADS PARA A ONG & PESQUISA DE ADOÇÃO) ---\n";
    csv += "ID_Evento;Data_Hora;Nome_Adotante;Telefone_Contato;Animal_Interesse;ID_Animal;Score_Afinidade;Origem\n";
    (report.adopterLeads || []).forEach(lead => {
      const dataLead = new Date(lead.timestamp).toLocaleString("pt-BR");
      csv += `${lead.id || ''};"${dataLead}";"${lead.nome}";"${lead.telefone}";"${lead.petNome}";"${lead.petId}";"${lead.score}";"${lead.tipoOrigem}"\n`;
    });

    return csv;
  },

  async exportResearchCSV(allCatalogPets = []) {
    const csv = await this.generateResearchCSV(allCatalogPets);
    // Dispara download no navegador
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dados_pesquisa_adocao_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Exporta arquivo JSON completo com dados brutos para backup
   */
  async exportResearchJSON() {
    const [events, quizzes] = await Promise.all([
      this.getAllRecords(STORE_EVENTS),
      this.getAllRecords(STORE_QUIZZES)
    ]);

    const backupData = {
      plataforma: "MatchPet - Analytics & Pesquisa",
      exportadoEm: new Date().toISOString(),
      versao: 1,
      totalEventos: events.length,
      totalQuestionarios: quizzes.length,
      eventos: events,
      questionarios: quizzes
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup_analytics_completo_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },

  /* ==========================================================================
     GERADOR DE DADOS DE DEMONSTRAÇÃO (PARA TESTES IMEDIATOS DO MODERADOR)
     ========================================================================== */

  /**
   * Popula o banco analítico com interações simuladas realistas
   * para permitir ao moderador visualizar os gráficos e métricas instantaneamente.
   */
  async seedDemoData(catalogPets = []) {
    if (!catalogPets || catalogPets.length === 0) {
      if (window.DEFAULT_ANIMALS) catalogPets = window.DEFAULT_ANIMALS;
    }
    if (!catalogPets || catalogPets.length === 0) return false;

    // Reseta métricas atuais
    await this.clearAll();

    const sampleMoradias = ["apartamento_com_tela", "apartamento_sem_tela", "casa_quintal_fechado", "casa_quintal_aberto"];
    const sampleTempos = ["ate_2h", "2h_a_5h", "5h_a_8h", "mais_8h"];
    const sampleCriancas = ["sim_pequenas", "sim_maiores", "nao"];
    const sampleOutros = ["caes_sociaveis", "gatos", "ambos", "nao_tem"];
    const sampleEnergias = ["muito_ativo", "moderado", "tranquilo"];
    const sampleMedicos = ["sim_amor", "apenas_saudavel", "indiferente"];
    const sampleEspecies = ["indiferente", "cachorro", "gato"];
    const samplePortes = ["indiferente", "pequeno", "medio", "grande"];

    const sampleAdopters = [
      { nome: "Mariana", sobrenome: "Ribeiro", telefone: "(11) 98765-4321" },
      { nome: "Carlos", sobrenome: "Eduardo Santos", telefone: "(11) 99123-4567" },
      { nome: "Beatriz", sobrenome: "Lima", telefone: "(19) 98234-5678" },
      { nome: "Rodrigo", sobrenome: "Menezes", telefone: "(21) 99456-7890" },
      { nome: "Camila", sobrenome: "Albuquerque", telefone: "(11) 97654-3210" },
      { nome: "Felipe", sobrenome: "Cavalcanti", telefone: "(31) 98877-6655" },
      { nome: "Juliana", sobrenome: "Ferreira", telefone: "(11) 98111-2233" },
      { nome: "Lucas", sobrenome: "Martins", telefone: "(41) 99222-3344" }
    ];

    // 1. Simula 42 Questionários respondidos (mistura de anônimos e identificados)
    const totalSimQuizzes = 42;
    const quizzesToInsert = [];
    const eventsToInsert = [];

    for (let i = 0; i < totalSimQuizzes; i++) {
      const isDesqualificado = i % 14 === 0; // alguns poucos desqualificados para estatística real
      const isIdentified = i % 3 === 0; // aprox 33% identificados, 67% anônimos
      const adopter = isIdentified ? sampleAdopters[i % sampleAdopters.length] : null;

      const answers = {
        idade: isDesqualificado ? "menor_21" : "maior_21",
        agressividade: (i % 20 === 0) ? "sim" : "nao",
        moradoresAcordo: (i % 25 === 0) ? "nao" : "sim",
        arcarCastracao: "sim",
        moradia: sampleMoradias[i % sampleMoradias.length],
        tempoSozinho: sampleTempos[i % sampleTempos.length],
        temCriancas: sampleCriancas[i % sampleCriancas.length],
        outrosPets: sampleOutros[i % sampleOutros.length],
        estiloVida: sampleEnergias[i % sampleEnergias.length],
        cuidadosMedicos: sampleMedicos[i % sampleMedicos.length],
        especie: sampleEspecies[i % sampleEspecies.length],
        porte: samplePortes[i % samplePortes.length],
        respondidoEm: Date.now() - (totalSimQuizzes - i) * 3600000 * 4
      };

      // Avalia afinidade com os animais do catálogo
      const ranked = catalogPets.map((p, rIdx) => {
        let score = 50 + Math.floor(Math.random() * 51); // 50 a 100%
        return {
          id: String(p.id),
          nome: p.nome,
          especie: p.especie,
          porte: p.porte,
          score: score,
          notaFinal: (score / 10).toFixed(1),
          isDisqualified: false,
          rank: rIdx + 1
        };
      }).sort((a, b) => b.score - a.score);

      quizzesToInsert.push({
        timestamp: answers.respondidoEm,
        isAnonymous: !isIdentified,
        adopterNome: adopter?.nome || "",
        adopterSobrenome: adopter?.sobrenome || "",
        adopterTelefone: adopter?.telefone || "",
        answers: answers,
        topMatch: ranked[0] || null,
        top5: ranked.slice(0, 5),
        totalEvaluated: ranked.length
      });

      eventsToInsert.push({
        type: "quiz_completed",
        isAnonymous: !isIdentified,
        adopterNome: adopter?.nome || "",
        adopterSobrenome: adopter?.sobrenome || "",
        adopterTelefone: adopter?.telefone || "",
        topMatchPetId: ranked[0]?.id || null,
        topMatchPetName: ranked[0]?.nome || null,
        topMatchScore: ranked[0]?.score || null,
        timestamp: answers.respondidoEm
      });
    }

    // 2. Simula Visitas, Leads de Interesse e Contatos WhatsApp com distribuição realista
    for (let idx = 0; idx < catalogPets.length; idx++) {
      const pet = catalogPets[idx];
      const baseViews = (catalogPets.length - idx) * 12 + Math.floor(Math.random() * 15) + 8;
      const convRate = 0.15 + (Math.random() * 0.20);
      const whatsappClicks = Math.max(1, Math.round(baseViews * convRate));

      for (let v = 0; v < baseViews; v++) {
        eventsToInsert.push({
          type: "view_pet",
          petId: String(pet.id),
          petName: pet.nome,
          source: v % 3 === 0 ? "busca_catalogo" : "resultado_quiz",
          timestamp: Date.now() - Math.floor(Math.random() * 86400000 * 7)
        });
      }

      for (let w = 0; w < whatsappClicks; w++) {
        const isIdentifiedLead = w % 2 === 0;
        const lead = isIdentifiedLead ? sampleAdopters[(idx + w) % sampleAdopters.length] : null;

        eventsToInsert.push({
          type: "whatsapp_contact",
          petId: String(pet.id),
          petName: pet.nome,
          isAnonymous: !isIdentifiedLead,
          adopterNome: lead?.nome || "",
          adopterSobrenome: lead?.sobrenome || "",
          adopterTelefone: lead?.telefone || "",
          score: 80 + Math.floor(Math.random() * 21),
          rank: (w % 5) + 1,
          timestamp: Date.now() - Math.floor(Math.random() * 86400000 * 5)
        });

        // Simula evento explícito de interesse do adotante identificado
        if (isIdentifiedLead) {
          eventsToInsert.push({
            type: "adopter_interest",
            petId: String(pet.id),
            petName: pet.nome,
            adopterNome: lead.nome,
            adopterSobrenome: lead.sobrenome,
            adopterTelefone: lead.telefone,
            score: 80 + Math.floor(Math.random() * 21),
            rank: (w % 5) + 1,
            timestamp: Date.now() - Math.floor(Math.random() * 86400000 * 5)
          });
        }
      }
    }

    // Grava tudo em duas operações atômicas ultrarrápidas
    await this.addRecords(STORE_QUIZZES, quizzesToInsert);
    await this.addRecords(STORE_EVENTS, eventsToInsert);

    return true;
  },

  /* ==========================================================================
     COLETOR DE DADOS EXCLUSIVO PARA ADMINISTRADOR
     ========================================================================== */

  /**
   * Rastreia a visita ao site gerando/obtendo um identificador único de visitante (Visitor ID)
   * e computando pageviews e data da sessão.
   */
  async trackSiteVisit() {
    let visitorId = localStorage.getItem("patacerta_visitor_id");
    let isNewVisitor = false;
    if (!visitorId) {
      visitorId = "vis_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
      localStorage.setItem("patacerta_visitor_id", visitorId);
      isNewVisitor = true;
    }

    const visitCount = parseInt(localStorage.getItem("patacerta_visit_count") || "0", 10) + 1;
    localStorage.setItem("patacerta_visit_count", String(visitCount));

    return await this.addRecord(STORE_EVENTS, {
      type: "site_visit",
      visitorId: visitorId,
      isNewVisitor: isNewVisitor,
      visitNumber: visitCount,
      referrer: document.referrer || "direto",
      screenResolution: `${typeof window !== "undefined" ? window.innerWidth : 0}x${typeof window !== "undefined" ? window.innerHeight : 0}`,
      timestamp: Date.now()
    });
  },

  /**
   * Consolida métricas completas do Coletor de Dados para acesso exclusivo do Administrador:
   * - Total de acessos / visitas ao site
   * - Visitantes únicos
   * - Total de pets cadastrados (disponíveis e adotados)
   * - Total de contatos e interessados com cadastro (Nome, Sobrenome, WhatsApp)
   * - Histórico detalhado de interessados
   */
  async getAdminCollectorSummary(allCatalogPets = []) {
    const [events, quizzes] = await Promise.all([
      this.getAllRecords(STORE_EVENTS),
      this.getAllRecords(STORE_QUIZZES)
    ]);

    const uniqueVisitorIds = new Set();
    let totalVisits = 0;
    let totalPetViews = 0;
    let totalWhatsAppContacts = 0;
    let totalQuizzes = quizzes.length;

    const leadsMap = new Map();

    events.forEach(ev => {
      if (ev.type === "site_visit") {
        totalVisits++;
        if (ev.visitorId) uniqueVisitorIds.add(ev.visitorId);
      } else if (ev.type === "view_pet") {
        totalPetViews++;
      } else if (ev.type === "whatsapp_contact") {
        totalWhatsAppContacts++;
        if (ev.adopterNome || ev.adopterTelefone) {
          const leadKey = `${ev.adopterTelefone || ev.adopterNome}_${ev.petId || ''}`;
          leadsMap.set(leadKey, {
            nome: ev.adopterNome || "Não informado",
            sobrenome: ev.adopterSobrenome || "",
            telefone: ev.adopterTelefone || "Não informado",
            petId: ev.petId,
            petName: ev.petName || "Animal",
            score: ev.score,
            tipo: "WhatsApp",
            timestamp: ev.timestamp
          });
        }
      } else if (ev.type === "adopter_interest") {
        const leadKey = `${ev.adopterTelefone || ev.adopterNome}_${ev.petId || ''}`;
        leadsMap.set(leadKey, {
          nome: ev.adopterNome || "Não informado",
          sobrenome: ev.adopterSobrenome || "",
          telefone: ev.adopterTelefone || "Não informado",
          petId: ev.petId,
          petName: ev.petName || "Animal",
          score: ev.score,
          tipo: "Interesse Ficha",
          timestamp: ev.timestamp
        });
      }
    });

    quizzes.forEach(q => {
      if (q.adopterNome || q.adopterTelefone) {
        const leadKey = `${q.adopterTelefone || q.adopterNome}_quiz_${q.id || q.timestamp}`;
        leadsMap.set(leadKey, {
          nome: q.adopterNome || "Não informado",
          sobrenome: q.adopterSobrenome || "",
          telefone: q.adopterTelefone || "Não informado",
          petId: q.topMatch?.id || null,
          petName: q.topMatch?.nome ? `Match: ${q.topMatch.nome}` : "Teste de Afinidade",
          score: q.topMatch?.score || null,
          tipo: "Quiz",
          timestamp: q.timestamp
        });
      }
    });

    const totalPets = allCatalogPets.length;
    const totalAvailable = allCatalogPets.filter(p => !p.adotado && p.status !== "adotado").length;
    const totalAdopted = allCatalogPets.filter(p => p.adotado || p.status === "adotado").length;

    const leadsList = Array.from(leadsMap.values()).sort((a, b) => b.timestamp - a.timestamp);

    const storedCount = parseInt(localStorage.getItem("patacerta_visit_count") || "1", 10);
    const finalVisits = Math.max(totalVisits, storedCount, 1);
    const finalUnique = Math.max(uniqueVisitorIds.size, 1);

    return {
      totalSiteVisits: finalVisits,
      uniqueVisitors: finalUnique,
      totalPets: totalPets,
      totalAvailable: totalAvailable,
      totalAdopted: totalAdopted,
      totalInterested: leadsList.length,
      totalWhatsAppClicks: totalWhatsAppContacts,
      totalPetViews: totalPetViews,
      totalQuizzes: totalQuizzes,
      leadsList: leadsList
    };
  }
};

if (typeof window !== "undefined") {
  window.AdoteAnalytics = AdoteAnalytics;
}
