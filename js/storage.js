/**
 * Camada unificada de persistência para a plataforma de adoção.
 * Redireciona operações para o IndexedDB (PetDB) com suporte a LocalStorage como fallback.
 */

const STORAGE_KEY = "patinhas_adocao_animais_v1";

const PetStorage = {
  // Carrega a lista completa de animais de forma assíncrona do PetDB
  async getAll() {
    if (window.PetDB) {
      try {
        const list = await Promise.race([
          PetDB.getAll(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout DB")), 5000))
        ]);
        if (list && list.length > 0) return list;
      } catch (e) {
        console.warn("Aviso ao ler do PetDB, usando fallback:", e);
      }
    }
    // Fallback para LocalStorage se IndexedDB não estiver disponível
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && parsed.length > 0) return parsed;
      }
      return window.DEFAULT_ANIMALS || [];
    } catch (e) {
      return window.DEFAULT_ANIMALS || [];
    }
  },

  // Salva lista completa
  saveAll(animals) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(animals));
    } catch (e) {
      console.warn("Aviso ao salvar no LocalStorage:", e);
    }
  },

  // Busca por ID
  async getById(id) {
    if (window.PetDB) {
      return await PetDB.getById(id);
    }
    const animals = await this.getAll();
    return animals.find(a => a.id === id) || null;
  },

  // Salva ou atualiza um animal
  async save(pet) {
    if (!pet.id) pet.id = "pet-" + Date.now();

    // Sincronização imediata no LocalStorage como fallback resiliente
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const idx = current.findIndex(a => a.id === pet.id);
      if (idx >= 0) {
        current[idx] = { ...current[idx], ...pet };
      } else {
        current.unshift(pet);
      }
      this.saveAll(current);
    } catch (e) {}

    if (window.PetDB) {
      try {
        await Promise.race([
          PetDB.save(pet),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout DB save")), 400))
        ]);
        return pet;
      } catch (e) {
        console.warn("Aviso ao salvar no PetDB, mantido no LocalStorage:", e);
      }
    }
    return pet;
  },

  // Remove um animal
  async delete(id) {
    // Sincronização imediata no LocalStorage
    try {
      let current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      current = current.filter(a => a.id !== id);
      this.saveAll(current);
    } catch (e) {}

    if (window.PetDB) {
      try {
        await Promise.race([
          PetDB.delete(id),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout DB delete")), 400))
        ]);
        return true;
      } catch (e) {
        console.warn("Aviso ao deletar no PetDB, removido do LocalStorage:", e);
      }
    }
    return true;
  },

  // Restaura dados de fábrica
  async resetToDefaults() {
    if (window.PetDB) {
      return await PetDB.resetDefaults();
    }
    this.saveAll(window.DEFAULT_ANIMALS || []);
    return window.DEFAULT_ANIMALS || [];
  },

  // Exportar dados como arquivo JSON
  async exportJSON() {
    if (window.PetDB) {
      return await PetDB.exportBackup();
    }
    const data = JSON.stringify(await this.getAll(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalogo_adocao_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Importar dados de JSON
  async importJSON(jsonString) {
    if (window.PetDB) {
      return await PetDB.importBackup(jsonString);
    }
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        this.saveAll(parsed);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
};

const ONGS_STORAGE_KEY = "patinhas_ongs_v1";
const EVENTOS_STORAGE_KEY = "patinhas_eventos_v1";
const RIFAS_STORAGE_KEY = "patinhas_rifas_v1";

const SolidarityStorage = {
  _cachedOngs: null,
  _cachedOngsAt: 0,

  // === ONGS ===
  async getOngs() {
    const now = Date.now();
    if (this._cachedOngs && (now - this._cachedOngsAt < 3000)) {
      return this._cachedOngs;
    }

    let ongs = [];
    try {
      const data = localStorage.getItem(ONGS_STORAGE_KEY);
      if (data) {
        ongs = JSON.parse(data);
      }
    } catch (e) {
      console.warn("Aviso ao ler ONGs do LocalStorage:", e);
    }
    if (!ongs || ongs.length === 0) {
      ongs = JSON.parse(JSON.stringify(window.DEFAULT_ONGS || []));
      this.saveAllOngs(ongs);
    } else {
      // Garante transição para ONG ÚNICA: se houver múltiplas ONGs legadas, mantém apenas a ONG-001
      if (ongs.length > 1) {
        const primary = ongs.find(o => o.id === "ong-001") || (window.DEFAULT_ONGS ? window.DEFAULT_ONGS[0] : ongs[0]);
        ongs = [primary];
        this.saveAllOngs(ongs);
      }

      if (window.DEFAULT_ONGS && window.DEFAULT_ONGS.length > 0) {
        const def = window.DEFAULT_ONGS[0];
        let changed = false;
        ongs = ongs.map(o => {
          let updated = { ...o };
          if ((!updated.historia || updated.historia.length < 800) && def.historia) {
            updated.historia = def.historia;
            changed = true;
          }
          if ((!updated.descricao || updated.descricao.includes("Pioneira na proteção e bem-estar animal no Distrito Federal.")) && def.descricao) {
            updated.descricao = def.descricao;
            changed = true;
          }
          if ((!updated.fotosAbrigo || updated.fotosAbrigo.length === 0) && def.fotosAbrigo) {
            updated.fotosAbrigo = [...def.fotosAbrigo];
            changed = true;
          }
          if ((!updated.videosAbrigo || updated.videosAbrigo.length === 0) && def.videosAbrigo) {
            updated.videosAbrigo = [...def.videosAbrigo];
            changed = true;
          }
          if (updated.equipeLinhaFrente) {
            delete updated.equipeLinhaFrente;
            changed = true;
          }
          return updated;
        });
        if (changed) this.saveAllOngs(ongs);
      }
    }

    // Calcula animais disponíveis dinamicamente - usa cache em memória antes de tocar no IndexedDB
    let allPets = [];
    if (window.currentAnimals && window.currentAnimals.length > 0) {
      allPets = window.currentAnimals;
    } else {
      try {
        allPets = await PetStorage.getAll();
      } catch (e) {
        allPets = window.DEFAULT_ANIMALS || [];
      }
    }

    const calculated = ongs.map(ong => {
      const catalogPets = allPets.filter(p => p.ongId === ong.id);
      const catalogAvailable = catalogPets.filter(p => p.status === "disponivel" || !p.status).length;
      const catalogAdopted = catalogPets.filter(p => p.status === "adotado").length;
      
      const displayAvailable = catalogAvailable > 0 ? catalogAvailable : (ong.baseDisponiveis || 0);
      const displayAdopted = (ong.totalAdotados || 0) + catalogAdopted;

      return {
        ...ong,
        animaisDisponiveis: displayAvailable,
        totalAdotadosCalc: displayAdopted
      };
    });

    this._cachedOngs = calculated;
    this._cachedOngsAt = now;
    return calculated;
  },

  saveAllOngs(ongs) {
    this._cachedOngs = null;
    this._cachedOngsAt = 0;
    try {
      localStorage.setItem(ONGS_STORAGE_KEY, JSON.stringify(ongs));
    } catch (e) {
      console.warn("Erro ao salvar ONGs:", e);
    }
  },

  async saveOng(ong) {
    let ongs = [];
    try {
      const data = localStorage.getItem(ONGS_STORAGE_KEY);
      ongs = data ? JSON.parse(data) : JSON.parse(JSON.stringify(window.DEFAULT_ONGS || []));
    } catch (e) {
      ongs = JSON.parse(JSON.stringify(window.DEFAULT_ONGS || []));
    }
    if (!ong.id) ong.id = "ong-" + Date.now();
    const idx = ongs.findIndex(o => o.id === ong.id);
    if (idx >= 0) {
      ongs[idx] = { ...ongs[idx], ...ong };
    } else {
      ongs.push(ong);
    }
    this.saveAllOngs(ongs);
    return ong;
  },

  // === EVENTOS / FEIRINHAS ===
  getEventos() {
    try {
      const data = localStorage.getItem(EVENTOS_STORAGE_KEY);
      if (data) {
        let parsed = JSON.parse(data);
        if (parsed && parsed.length > 0) {
          // Garante fotos e dados atualizados da única ONG ProAnima
          const defMap = {};
          (window.DEFAULT_EVENTOS || []).forEach(d => { defMap[d.id] = d; });
          let updated = false;
          parsed = parsed.map(e => {
            const defItem = defMap[e.id];
            if (!e.foto || e.foto.trim() === "" || (defItem && e.foto !== defItem.foto && e.foto.includes("placeholder"))) {
              if (defItem && defItem.foto) {
                e.foto = defItem.foto;
                updated = true;
              }
            }
            if (defItem && (!e.ongNome || e.ongNome !== defItem.ongNome)) {
              e.ongNome = defItem.ongNome;
              e.ongId = defItem.ongId;
              updated = true;
            }
            return e;
          });
          if (updated) this.saveAllEventos(parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Aviso ao ler Eventos:", e);
    }
    const def = JSON.parse(JSON.stringify(window.DEFAULT_EVENTOS || []));
    this.saveAllEventos(def);
    return def;
  },

  saveAllEventos(eventos) {
    try {
      localStorage.setItem(EVENTOS_STORAGE_KEY, JSON.stringify(eventos));
    } catch (e) {
      console.warn("Erro ao salvar Eventos:", e);
    }
  },

  saveEvento(evento) {
    const eventos = this.getEventos();
    if (!evento.id) evento.id = "evt-" + Date.now();
    const idx = eventos.findIndex(e => e.id === evento.id);
    if (idx >= 0) {
      eventos[idx] = { ...eventos[idx], ...evento };
    } else {
      eventos.unshift(evento);
    }
    this.saveAllEventos(eventos);
    return evento;
  },

  deleteEvento(id) {
    let eventos = this.getEventos();
    eventos = eventos.filter(e => e.id !== id);
    this.saveAllEventos(eventos);
  },

  // === RIFAS & ARRECADAÇÕES ===
  getRifas() {
    try {
      const data = localStorage.getItem(RIFAS_STORAGE_KEY);
      if (data) {
        let parsed = JSON.parse(data);
        if (parsed && parsed.length > 0) {
          // Garante fotos e dados atualizados da única ONG ProAnima
          const defMap = {};
          (window.DEFAULT_RIFAS || []).forEach(d => { defMap[d.id] = d; });
          let updated = false;
          parsed = parsed.map(r => {
            const defItem = defMap[r.id];
            if (!r.foto || r.foto.trim() === "" || (defItem && r.foto !== defItem.foto && r.foto.includes("placeholder"))) {
              if (defItem && defItem.foto) {
                r.foto = defItem.foto;
                updated = true;
              } else {
                r.foto = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80";
                updated = true;
              }
            }
            if (defItem && (!r.ongNome || r.ongNome !== defItem.ongNome)) {
              r.ongNome = defItem.ongNome;
              r.ongId = defItem.ongId;
              updated = true;
            }
            return r;
          });
          if (updated) this.saveAllRifas(parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Aviso ao ler Rifas:", e);
    }
    const def = JSON.parse(JSON.stringify(window.DEFAULT_RIFAS || []));
    this.saveAllRifas(def);
    return def;
  },

  saveAllRifas(rifas) {
    try {
      localStorage.setItem(RIFAS_STORAGE_KEY, JSON.stringify(rifas));
    } catch (e) {
      console.warn("Erro ao salvar Rifas:", e);
    }
  },

  saveRifa(rifa) {
    const rifas = this.getRifas();
    if (!rifa.id) rifa.id = "rifa-" + Date.now();
    const idx = rifas.findIndex(r => r.id === rifa.id);
    if (idx >= 0) {
      rifas[idx] = { ...rifas[idx], ...rifa };
    } else {
      rifas.unshift(rifa);
    }
    this.saveAllRifas(rifas);
    return rifa;
  },

  deleteRifa(id) {
    let rifas = this.getRifas();
    rifas = rifas.filter(r => r.id !== id);
    this.saveAllRifas(rifas);
  },

  contributeRifa(id, amount) {
    const rifas = this.getRifas();
    const rifa = rifas.find(r => r.id === id);
    if (rifa) {
      rifa.arrecadado = (rifa.arrecadado || 0) + amount;
      if (rifa.tipo === "dinheiro" && rifa.valorBilhete) {
        const bilhetes = Math.floor(amount / rifa.valorBilhete);
        rifa.bilhetesVendidos = (rifa.bilhetesVendidos || 0) + bilhetes;
      }
      this.saveAllRifas(rifas);
      return rifa;
    }
    return null;
  }
};

/* ==========================================================================
   CONTRATOS DE PARCERIA, FORNECIMENTO DE DADOS & CESSÃO DE IMAGEM DAS ONGS
   ========================================================================== */

const NGO_CONTRACTS_STORAGE_KEY = "adoteamigo_ngo_contracts_v1";

// Exclusão forçada de todos os contratos pré-existentes solicitada pelo usuário
(function() {
  try {
    const contractsWipedKey = "adoteamigo_all_contracts_purged_v2";
    if (!localStorage.getItem(contractsWipedKey)) {
      localStorage.setItem(NGO_CONTRACTS_STORAGE_KEY, JSON.stringify([]));
      localStorage.setItem(contractsWipedKey, "true");
    }
  } catch (e) {
    console.warn("Aviso ao purgar contratos existentes:", e);
  }
})();

const NgoContractStorage = {
  getAllContracts() {
    try {
      const data = localStorage.getItem(NGO_CONTRACTS_STORAGE_KEY);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Aviso ao ler contratos de ONGs:", e);
    }
    return [];
  },

  saveAllContracts(contracts) {
    try {
      localStorage.setItem(NGO_CONTRACTS_STORAGE_KEY, JSON.stringify(contracts || []));
    } catch (e) {
      console.warn("Erro ao salvar contratos de ONGs:", e);
    }
  },

  clearAllContracts() {
    this.saveAllContracts([]);
    return [];
  },

  deleteContract(ongIdOrId) {
    let contracts = this.getAllContracts();
    contracts = contracts.filter(c => String(c.id) !== String(ongIdOrId) && String(c.ongId) !== String(ongIdOrId));
    this.saveAllContracts(contracts);
    return contracts;
  },

  getContractByOngId(ongId) {
    if (!ongId) return null;
    const contracts = this.getAllContracts();
    return contracts.find(c => String(c.ongId) === String(ongId) && c.status === "ativo") || null;
  },

  isContractSigned(ongId) {
    if (!ongId) return false;
    const contract = this.getContractByOngId(ongId);
    return !!contract && !!contract.timestampAssinatura;
  },

  generateProtocol(ongId) {
    const cleanId = String(ongId || "ONG").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randHex = Math.random().toString(16).substring(2, 8).toUpperCase();
    return `ADOTE-${cleanId}-${dateStr}-${randHex}`;
  },

  generateIntegrityHash(data) {
    const raw = `${data.ongId}|${data.representanteCpf}|${data.timestampAssinatura}|${data.protocolo}|ADOTEAMIGO_LEGAL_V1`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, "0").toUpperCase();
    return `SHA256-SIM-${hex}-${Date.now().toString(16).toUpperCase()}`;
  },

  saveContract(contractData) {
    const contracts = this.getAllContracts();
    const ongId = contractData.ongId;
    const timestamp = contractData.timestampAssinatura || new Date().toISOString();
    const protocolo = contractData.protocolo || this.generateProtocol(ongId);
    
    const fullRecord = {
      id: contractData.id || `contract-${ongId}-${Date.now()}`,
      ongId: ongId,
      ongNome: contractData.ongNome || "ONG Parceira",
      ongCnpj: contractData.ongCnpj || "Não informado",
      representanteNome: contractData.representanteNome || "",
      representanteCpf: contractData.representanteCpf || "",
      representanteCargo: contractData.representanteCargo || "",
      representanteEmail: contractData.representanteEmail || "",
      representanteTelefone: contractData.representanteTelefone || "",
      termosAceitos: {
        cessaoImagens: !!contractData.termosAceitos?.cessaoImagens,
        fornecimentoDados: !!contractData.termosAceitos?.fornecimentoDados,
        veracidadeSanitaria: !!contractData.termosAceitos?.veracidadeSanitaria,
        independenciaPolitica: !!contractData.termosAceitos?.independenciaPolitica
      },
      assinaturaPorExtenso: contractData.assinaturaPorExtenso || contractData.representanteNome || "",
      timestampAssinatura: timestamp,
      protocolo: protocolo,
      hashIntegridade: this.generateIntegrityHash({ ongId, representanteCpf: contractData.representanteCpf, timestampAssinatura: timestamp, protocolo }),
      ipOrigem: contractData.ipOrigem || "127.0.0.1 (Registro Local de Navegação)",
      userAgent: (typeof navigator !== "undefined" && navigator.userAgent) ? navigator.userAgent : "Navegador Web Local",
      status: "ativo"
    };

    const existingIndex = contracts.findIndex(c => String(c.ongId) === String(ongId));
    if (existingIndex >= 0) {
      contracts[existingIndex] = fullRecord;
    } else {
      contracts.push(fullRecord);
    }

    this.saveAllContracts(contracts);
    return fullRecord;
  },

  revokeContract(ongId, motivo = "") {
    const contracts = this.getAllContracts();
    const contract = contracts.find(c => String(c.ongId) === String(ongId));
    if (contract) {
      contract.status = "revogado";
      contract.motivoRevogacao = motivo;
      contract.revogadoEm = new Date().toISOString();
      this.saveAllContracts(contracts);
      return contract;
    }
    return null;
  }
};

/* ==========================================================================
   CUSTOMIZADOR DE LAYOUT & DESIGN STUDIO (ESTILO CANVA)
   ========================================================================== */

const LAYOUT_DESIGN_KEY = "adoteamigo_layout_design_v1";

const DEFAULT_LAYOUT_DESIGN = {
  fontFamily: "Nunito",
  fontSizeScale: "normal", // 'compact', 'normal', 'large'
  colorTheme: "roxo", // 'roxo', 'verde', 'laranja', 'azul', 'rosa', 'dark', 'custom'
  customPrimaryColor: "#007E82",
  customPrimaryHover: "#00686c",
  customPrimaryLight: "#e6f4f5",
  customBgColor: "#F9F3EA",
  cardRadius: "rounded-3xl", // 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full'
  cardShadow: "shadow-sm", // 'shadow-none', 'shadow-sm', 'shadow-md', 'shadow-xl'
  activeStickers: {
    patinhas: true,
    coracao: false,
    seloAdocao: true,
    fitaResgate: false,
    badgeVerificada: false,
    seloUrgente: false,
    customStickerUrl: "",
    stickerPosition: "top-right" // 'top-left', 'top-right'
  },
  customBanner: {
    enabled: true,
    badgeText: "✨ TESTE DE COMPATIBILIDADE INTELIGENTE ✨",
    title: "Faça um quiz e encontre o animal mais compatível com você.",
    subtitle: "Mora em apartamento? Não tem tempo para passeios longos e busca um pet de baixa energia? Nosso sistema pondera cada característica com pesos matemáticos reais de estilo de vida, espaço e rotina para indicar o animal perfeito para a sua família.",
    bgType: "gradient", // 'gradient', 'solid', 'image'
    gradientPreset: "roxo-indigo", // 'roxo-indigo', 'laranja-amber', 'verde-esmeralda', 'azul-ciano', 'rosa-rubi', 'dark-elegance'
    solidColor: "#007E82",
    customBgImage: "",
    ctaText: "Realizar o Quiz",
    iconEmoji: "🐾"
  }
};

const LayoutDesignStorage = {
  getLayout() {
    try {
      const data = localStorage.getItem(LAYOUT_DESIGN_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const layout = {
          ...DEFAULT_LAYOUT_DESIGN,
          ...parsed,
          activeStickers: { ...DEFAULT_LAYOUT_DESIGN.activeStickers, ...(parsed.activeStickers || {}) },
          customBanner: { ...DEFAULT_LAYOUT_DESIGN.customBanner, ...(parsed.customBanner || {}) }
        };
        if (layout.customBanner && layout.customBanner.badgeText) {
          if (layout.customBanner.badgeText.includes("TESTE DE COMPATIBILIDADE INTELIGENTE")) {
            layout.customBanner.badgeText = "✨ TESTE DE COMPATIBILIDADE INTELIGENTE ✨";
          }
        }
        return layout;
      }
    } catch (e) {
      console.warn("Aviso ao ler layout salvo:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_LAYOUT_DESIGN));
  },

  saveLayout(layout) {
    try {
      localStorage.setItem(LAYOUT_DESIGN_KEY, JSON.stringify(layout));
    } catch (e) {
      console.warn("Aviso ao salvar layout:", e);
    }
    this.applyLayoutToDOM(layout);
    return layout;
  },

  resetLayout() {
    try {
      localStorage.removeItem(LAYOUT_DESIGN_KEY);
    } catch (e) {}
    const def = JSON.parse(JSON.stringify(DEFAULT_LAYOUT_DESIGN));
    this.applyLayoutToDOM(def);
    return def;
  },

  applyLayoutToDOM(layout) {
    if (typeof document === "undefined") return;
    const l = layout || this.getLayout();

    // 1. Aplica fontes
    const fontMap = {
      "Outfit": "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
      "Plus Jakarta Sans": "'Plus Jakarta Sans', system-ui, sans-serif",
      "Poppins": "'Poppins', system-ui, sans-serif",
      "Fredoka": "'Fredoka', cursive, sans-serif",
      "Montserrat": "'Montserrat', sans-serif",
      "Playfair Display": "'Playfair Display', serif",
      "Nunito": "'Nunito', sans-serif",
      "Inter": "'Inter', sans-serif"
    };
    const activeFont = fontMap[l.fontFamily] || fontMap["Outfit"] || fontMap["Plus Jakarta Sans"];

    // 2. Mapeamento de Cores por Tema
    const themeColors = {
      roxo: { primary: "#007E82", hover: "#00686c", light: "#e6f4f5", bg: "#F9F3EA", isDark: false },
      verde: { primary: "#0d9488", hover: "#0f766e", light: "#ccfbf1", bg: "#f0fdfa", isDark: false },
      laranja: { primary: "#ea580c", hover: "#c2410c", light: "#ffedd5", bg: "#f8fafc", isDark: false },
      azul: { primary: "#0284c7", hover: "#0369a1", light: "#e0f2fe", bg: "#f0f9ff", isDark: false },
      rosa: { primary: "#db2777", hover: "#be185d", light: "#fce7f3", bg: "#fdf2f8", isDark: false },
      dark: { primary: "#a855f7", hover: "#9333ea", light: "#334155", bg: "#0f172a", isDark: true },
      custom: {
        primary: l.customPrimaryColor || "#007E82",
        hover: l.customPrimaryHover || "#00686c",
        light: l.customPrimaryLight || "#e6f4f5",
        bg: l.customBgColor || "#ffffff",
        isDark: false
      }
    };

    const activeTheme = themeColors[l.colorTheme] || themeColors.roxo;
    const activeBg = l.customBgColor || activeTheme.bg || "#ffffff";
    const isDarkBg = activeTheme.isDark || (activeBg && (activeBg.toLowerCase() === '#0f172a' || activeBg.toLowerCase() === '#1e293b' || activeBg.toLowerCase() === '#000000' || activeBg.toLowerCase() === '#111827'));

    // 3. Arredondamento dos cards
    const radiusMap = {
      "rounded-xl": "0.75rem",
      "rounded-2xl": "1rem",
      "rounded-3xl": "1.5rem",
      "rounded-full": "2.5rem"
    };
    const activeRadius = radiusMap[l.cardRadius] || "1.5rem";

    // 4. Sombras
    const shadowMap = {
      "shadow-none": "none",
      "shadow-sm": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
      "shadow-md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      "shadow-xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
    };
    const activeShadow = shadowMap[l.cardShadow] || shadowMap["shadow-sm"];

    // 5. Escala de Fonte
    const fontScaleMap = {
      compact: "0.95",
      normal: "1",
      large: "1.08"
    };
    const activeScale = fontScaleMap[l.fontSizeScale] || "1";

    // Atualiza ou insere tag <style id="adoteamigo-dynamic-theme-css">
    let styleTag = document.getElementById("adoteamigo-dynamic-theme-css");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "adoteamigo-dynamic-theme-css";
      document.head.appendChild(styleTag);
    }

    styleTag.textContent = `
      :root {
        --theme-font: ${activeFont};
        --theme-primary: ${activeTheme.primary};
        --theme-primary-hover: ${activeTheme.hover};
        --theme-primary-light: ${activeTheme.light};
        --theme-bg: ${activeBg};
        --theme-card-radius: ${activeRadius};
        --theme-card-shadow: ${activeShadow};
        --theme-font-scale: ${activeScale};
      }

      body {
        font-family: var(--theme-font) !important;
        background-color: var(--theme-bg) !important;
        ${isDarkBg ? 'color: #f1f5f9 !important;' : ''}
      }

      ${isDarkBg ? `
        .bg-white:not(#canva-design-studio-modal *):not(#admin-auth-modal *):not(#admin-collector-modal *) { background-color: #1e293b !important; color: #f8fafc !important; }
        .bg-slate-50:not(#canva-design-studio-modal *):not(#admin-auth-modal *):not(#admin-collector-modal *) { background-color: #0f172a !important; color: #f8fafc !important; }
        .text-slate-900:not(#canva-design-studio-modal *):not(#admin-auth-modal *):not(#admin-collector-modal *), 
        .text-slate-800:not(#canva-design-studio-modal *):not(#admin-auth-modal *):not(#admin-collector-modal *) { color: #f8fafc !important; }
        .text-slate-600:not(#canva-design-studio-modal *):not(#admin-auth-modal *):not(#admin-collector-modal *), 
        .text-slate-500:not(#canva-design-studio-modal *):not(#admin-auth-modal *):not(#admin-collector-modal *) { color: #cbd5e1 !important; }
        .border-slate-200:not(#canva-design-studio-modal *):not(#admin-auth-modal *):not(#admin-collector-modal *), 
        .border-purple-100:not(#canva-design-studio-modal *):not(#admin-auth-modal *):not(#admin-collector-modal *) { border-color: #334155 !important; }
      ` : ''}

      .bg-purple-600, .bg-purple-500, .bg-orange-600, .bg-orange-500 {
        background-color: var(--theme-primary) !important;
      }
      .bg-purple-600:hover, .bg-purple-700:hover, .hover\\:bg-purple-700:hover, .hover\\:bg-purple-600:hover,
      .bg-orange-600:hover, .bg-orange-700:hover, .hover\\:bg-orange-700:hover, .hover\\:bg-orange-600:hover {
        background-color: var(--theme-primary-hover) !important;
      }
      .text-purple-500, .text-purple-600, .text-purple-700,
      .text-orange-500, .text-orange-600, .text-orange-700 {
        color: var(--theme-primary) !important;
      }
      .border-purple-500, .border-purple-600,
      .border-orange-500, .border-orange-600 {
        border-color: var(--theme-primary) !important;
      }
      .bg-purple-50, .bg-purple-100,
      .bg-orange-50, .bg-orange-100 {
        background-color: var(--theme-primary-light) !important;
      }
      .pet-card {
        border-radius: var(--theme-card-radius) !important;
        box-shadow: var(--theme-card-shadow) !important;
      }
    `;

    // Atualiza banner se a função existir
    if (typeof updateVitrineBannerUI === "function") {
      updateVitrineBannerUI(l.customBanner);
    }
  }
};

if (typeof window !== "undefined") {
  window.PetStorage = PetStorage;
  window.SolidarityStorage = SolidarityStorage;
  window.NgoContractStorage = NgoContractStorage;
  window.LayoutDesignStorage = LayoutDesignStorage;
}

