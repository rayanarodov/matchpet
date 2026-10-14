// MigraÃ§Ã£o de sessÃ£o de administrador legado
if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("pata_certa_admin_auth") === "true") {
  sessionStorage.setItem("matchpet_admin_auth", "true");
}
/**
 * Lógica principal da aplicação de adoção (Catálogo, Filtros e Modais)
 * Integrado ao Sistema de Teste de Compatibilidade e Cálculo de Afinidade (AdopterMatch).
 */

document.addEventListener("DOMContentLoaded", async () => {
  await initApp();
});

let currentAnimals = [];
let activePet = null;
let activeMediaTab = 'photos'; // 'photos' ou 'videos'
let activeQuiz = null;
let activeOngFilter = null;
let currentMainTab = 'animais';
let currentRifaFilter = 'todas';
let currentBlogCategory = 'todas';

function debounce(fn, delay = 200) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

async function initApp() {
  // Tratamento de aba inicial via parâmetro URL ou Hash (ex: ?tab=ongs ou #blog)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab') || (window.location.hash ? window.location.hash.replace('#', '') : null);
    if (initialTab && ['animais', 'ongs', 'blog', 'rifas-eventos', 'eventos', 'rifas'].includes(initialTab)) {
      currentMainTab = (initialTab === 'eventos' || initialTab === 'rifas') ? 'rifas-eventos' : initialTab;
    }
  } catch (e) {}

  // Inicializa sessão do adotante (Anônimo vs Identificado) e UI
  // Inicializa personalização de layout salva (Design Studio estilo Canva)
  if (window.LayoutDesignStorage) {
    LayoutDesignStorage.applyLayoutToDOM();
  }

  updateUserSessionUI();
  renderAdminTopBar();

  // Se for o primeiro acesso, define modo de navegação livre por padrão (sem popup bloqueante)
  try {
    if (!localStorage.getItem(ACCESS_CHOSEN_KEY)) {
      setAnonymousMode(false, false);
    }
  } catch (e) {}

  // Carrega respostas salvas do quiz de compatibilidade
  activeQuiz = window.AdopterMatch ? AdopterMatch.getSavedQuiz() : null;
  window.activeQuiz = activeQuiz;
  updateQuizBannerUI();
  updateQuizUserBannerUI();

  // Inicialização instantânea dos animais padrão para render imediato sem layout shift (0ms)
  if (window.DEFAULT_ANIMALS && window.DEFAULT_ANIMALS.length > 0) {
    currentAnimals = [...window.DEFAULT_ANIMALS];
    window.currentAnimals = currentAnimals;
  }

  // Sincronização assíncrona não-bloqueante em background com o IndexedDB/LocalStorage
  setTimeout(async () => {
    try {
      const storedPets = await PetStorage.getAll();
      if (storedPets && storedPets.length > 0) {
        const currentIds = (currentAnimals || []).map(p => p.id).join(',');
        const storedIds = storedPets.map(p => p.id).join(',');
        if (currentIds !== storedIds) {
          currentAnimals = storedPets;
          window.currentAnimals = currentAnimals;
          if (typeof applyFilters === "function" && currentMainTab === 'animais') {
            applyFilters();
          }
        }
      }
    } catch (e) {
      console.warn("Aviso ao carregar animais do storage em background:", e);
    }
  }, 250);

  // Registra eventos dos filtros com debounce de alta performance (elimina travamentos na digitação)
  const searchInput = document.getElementById("search-input");
  const speciesFilter = document.getElementById("species-filter");
  const sizeFilter = document.getElementById("size-filter");
  const dfRegionFilter = document.getElementById("df-region-filter");
  const btnReset = document.getElementById("btn-reset-filters");
  const filterVideo = document.getElementById("filter-video");
  const filterCastrado = document.getElementById("filter-castrado");
  const filterVacinado = document.getElementById("filter-vacinado");
  const filterHideDisqualified = document.getElementById("filter-hide-disqualified");
  const filterTop5 = document.getElementById("filter-top-5");

  if (searchInput) searchInput.addEventListener("input", debounce(applyFilters, 180));
  if (speciesFilter) speciesFilter.addEventListener("change", applyFilters);
  if (sizeFilter) sizeFilter.addEventListener("change", applyFilters);
  if (dfRegionFilter) dfRegionFilter.addEventListener("change", applyFilters);
  if (btnReset) btnReset.addEventListener("click", resetAllFilters);
  if (filterVideo) filterVideo.addEventListener("change", applyFilters);
  if (filterCastrado) filterCastrado.addEventListener("change", applyFilters);
  if (filterVacinado) filterVacinado.addEventListener("change", applyFilters);
  if (filterHideDisqualified) filterHideDisqualified.addEventListener("change", applyFilters);
  if (filterTop5) filterTop5.addEventListener("change", applyFilters);

  // Filtros do Mockup na Hero Section
  const heroSearchInput = document.getElementById("hero-search-input");
  const heroSearchBtn = document.getElementById("hero-search-btn");
  const speciesFilterPill = document.getElementById("species-filter-pill");
  const regionFilterPill = document.getElementById("region-filter-pill");

  if (heroSearchInput) {
    heroSearchInput.addEventListener("input", debounce((e) => {
      if (searchInput) searchInput.value = e.target.value;
      applyFilters();
    }, 180));
  }

  if (heroSearchBtn) {
    heroSearchBtn.addEventListener("click", () => {
      applyFilters();
      document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (speciesFilterPill) {
    speciesFilterPill.addEventListener("change", (e) => {
      if (speciesFilter) speciesFilter.value = e.target.value;
      applyFilters();
    });
  }

  if (regionFilterPill) {
    regionFilterPill.addEventListener("change", (e) => {
      if (dfRegionFilter) dfRegionFilter.value = e.target.value;
      applyFilters();
    });
  }

  // Seletor de Porte do Mockup
  document.querySelectorAll(".porte-pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".porte-pill-btn").forEach(b => {
        b.classList.remove("active", "bg-[#007E82]", "text-white");
        b.classList.add("text-slate-600");
      });
      btn.classList.add("active", "bg-[#007E82]", "text-white");
      btn.classList.remove("text-slate-600");

      const porteVal = btn.getAttribute("data-porte") || "todos";
      window.activePorteFilter = porteVal;
      if (sizeFilter) sizeFilter.value = porteVal;
      applyFilters();
    });
  });

  // Fechar modais ao pressionar ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePetModal();
      closeQuizModal();
      closeGlobalDisqualifiedModal();
      closeAdopterLoginModal();
      closeAdoptionProcessModal();
      closeAdopterDashboardModal();
      closeBlogModal();
    }
  });

  // Fechar modal clicando fora
  const petModal = document.getElementById("pet-modal");
  if (petModal) {
    petModal.addEventListener("click", (e) => {
      if (e.target === petModal) closePetModal();
    });
  }

  const adoptionProcessModal = document.getElementById("adoption-process-modal");
  if (adoptionProcessModal) {
    adoptionProcessModal.addEventListener("click", (e) => {
      if (e.target === adoptionProcessModal) closeAdoptionProcessModal();
    });
  }

  const adopterDashboardModal = document.getElementById("adopter-dashboard-modal");
  if (adopterDashboardModal) {
    adopterDashboardModal.addEventListener("click", (e) => {
      if (e.target === adopterDashboardModal) closeAdopterDashboardModal();
    });
  }

  const quizModal = document.getElementById("quiz-modal");
  if (quizModal) {
    quizModal.addEventListener("click", (e) => {
      if (e.target === quizModal) closeQuizModal();
    });
  }

  const globalModal = document.getElementById("global-disqualified-modal");
  if (globalModal) {
    globalModal.addEventListener("click", (e) => {
      if (e.target === globalModal) closeGlobalDisqualifiedModal();
    });
  }

  const blogModal = document.getElementById("blog-article-modal");
  if (blogModal) {
    blogModal.addEventListener("click", (e) => {
      if (e.target === blogModal) closeBlogModal();
    });
  }

  // Renderiza e ativa a aba inicial de forma limpa e unificada
  switchMainTab(currentMainTab);
  updatePortalBadges();

  // Rastreia visita silenciosa pelo coletor de métricas analíticas (deferido para não disputar thread de renderização)
  if (window.AdoteAnalytics && typeof AdoteAnalytics.trackSiteVisit === "function") {
    setTimeout(() => {
      AdoteAnalytics.trackSiteVisit().catch(err => console.warn("Aviso ao rastrear visita:", err));
    }, 1500);
  }

  // Inicializa barra de atividades em tempo real e dica diária
  initLiveActivityTicker();
  initDailyTip();
}

/**
 * Atualiza o banner informativo do teste de compatibilidade
 */
function updateQuizBannerUI() {
  const banner = document.getElementById("quiz-active-banner");
  const wrapperHideDisqualified = document.getElementById("wrapper-hide-disqualified");
  const wrapperTop5 = document.getElementById("wrapper-top-5");
  if (!banner) return;

  if (activeQuiz) {
    banner.classList.remove("hidden");
    if (wrapperHideDisqualified) wrapperHideDisqualified.classList.remove("hidden");
    if (wrapperTop5) wrapperTop5.classList.remove("hidden");

    const globalCheck = window.AdopterMatch ? AdopterMatch.checkGlobalDisqualifications(activeQuiz) : { isDisqualified: false };

    if (globalCheck.isDisqualified) {
      // Estado de Alerta: Desclassificação Geral (Exigência legal / de segurança não atendida)
      banner.className = "mb-6 p-4 bg-gradient-to-r from-rose-700 via-red-600 to-rose-800 text-white rounded-2xl shadow-lg border border-rose-400/50 flex flex-col sm:flex-row items-center justify-between gap-3";
      banner.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
            <i data-lucide="shield-alert" class="w-6 h-6 text-white"></i>
          </div>
          <div>
            <h3 class="text-sm font-black flex items-center gap-1.5">
              <span>Adoção Não Recomendada no Momento</span>
              <span class="text-[10px] bg-white px-2 py-0.5 rounded-full font-bold">Critérios Impeditivos</span>
            </h3>
            <p class="text-xs text-rose-100">Foram identificadas restrições legais ou de segurança no questionário que impedem a adoção responsável neste momento.</p>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button onclick="openGlobalDisqualifiedModal()" class="px-3.5 py-1.5 rounded-xl bg-white text-rose-800 font-black text-xs hover:bg-rose-50 transition-colors shadow-xs">
            Ver Motivos
          </button>
          <button onclick="openQuizModal()" class="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/60 text-white font-bold text-xs transition-colors">
            Revisar
          </button>
          <button onclick="clearQuizResults()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 text-white hover:bg-slate-900 text-white font-semibold text-xs transition-colors">
            Limpar
          </button>
        </div>
      `;
    } else {
      // Estado Normal: Top 5 Animais Mais Compatíveis Ativo
      banner.className = "mb-6 p-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-3";
      banner.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 text-xl font-bold">
            🐾
          </div>
          <div>
            <h3 class="text-sm font-black flex items-center gap-2">
              <span>Cãezinhos Mais Compatíveis com Você Encontrados! 💖</span>
              <span class="text-[10px] bg-white px-2 py-0.5 rounded-full font-bold">Top Afinidade</span>
            </h3>
            <p class="text-xs text-orange-100">Veja as fotos e as comoventes histórias de resgate e superação dos peludinhos mais compatíveis com o seu coração e rotina.</p>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button onclick="openQuizModal()" class="px-3.5 py-1.5 rounded-xl bg-white text-orange-800 font-bold text-xs hover:bg-orange-50 transition-colors shadow-xs">
            Refazer Teste
          </button>
          <button onclick="clearQuizResults()" class="px-3 py-1.5 rounded-xl bg-slate-800 text-white hover:bg-slate-900 text-white font-semibold text-xs transition-colors">
            Limpar
          </button>
        </div>
      `;
    }

    if (window.lucide) {
      lucide.createIcons({ root: banner });
    }
  } else {
    banner.classList.add("hidden");
    if (wrapperHideDisqualified) wrapperHideDisqualified.classList.add("hidden");
    if (wrapperTop5) wrapperTop5.classList.add("hidden");
  }

  // Sincroniza a chamada de divulgação na vitrine (visível se ainda não respondeu ao quiz)
  const vitrineCallout = document.getElementById("vitrine-quiz-callout");
  if (vitrineCallout) {
    if (activeQuiz) {
      vitrineCallout.classList.add("hidden");
    } else {
      vitrineCallout.classList.remove("hidden");
      if (window.lucide) {
        lucide.createIcons({ root: vitrineCallout });
      }
    }
  }
}

/**
 * Aplica os filtros e o cálculo de compatibilidade
 */
function applyFilters(forceTabSwitch = false) {
  if (forceTabSwitch && typeof currentMainTab !== "undefined" && currentMainTab !== 'animais') {
    switchMainTab('animais');
    return;
  }

  const heroSearch = document.getElementById("hero-search-input")?.value;
  const mainSearch = document.getElementById("search-input")?.value;
  const searchTerm = ((heroSearch !== undefined && heroSearch !== "") ? heroSearch : (mainSearch || "")).toLowerCase().trim();

  const speciesVal = document.getElementById("species-filter-pill")?.value || document.getElementById("species-filter")?.value || "todos";
  const sizeVal = window.activePorteFilter || document.getElementById("size-filter")?.value || "todos";
  const dfRegionVal = document.getElementById("region-filter-pill")?.value || document.getElementById("df-region-filter")?.value || "todos";
  const onlyWithVideo = document.getElementById("filter-video")?.checked || false;
  const onlyCastrado = document.getElementById("filter-castrado")?.checked || false;
  const onlyVacinado = document.getElementById("filter-vacinado")?.checked || false;
  if (window.currentAnimals && window.currentAnimals.length > 0) {
    currentAnimals = window.currentAnimals;
  }
  const baseAnimals = (currentAnimals && currentAnimals.length > 0) ? currentAnimals : (window.DEFAULT_ANIMALS || []);
  let filtered = baseAnimals.filter(pet => {
    // Busca por texto
    if (searchTerm) {
      const matchName = pet.nome?.toLowerCase().includes(searchTerm);
      const matchBreed = pet.raca?.toLowerCase().includes(searchTerm);
      const matchDesc = pet.descricao?.toLowerCase().includes(searchTerm);
      const matchTemp = pet.temperamento?.some(t => t.toLowerCase().includes(searchTerm));
      if (!matchName && !matchBreed && !matchDesc && !matchTemp) {
        return false;
      }
    }

    // Filtro de espécie
    if (speciesVal !== "todos" && pet.especie !== speciesVal) {
      return false;
    }

    // Filtro de porte
    if (sizeVal !== "todos" && pet.porte !== sizeVal) {
      return false;
    }

    // Filtro por Região do DF
    if (dfRegionVal !== "todos") {
      const petRegion = (pet.regiaoDF || pet.cidade || "").toLowerCase();
      const target = dfRegionVal.toLowerCase();
      if (!petRegion.includes(target) && !target.includes(petRegion)) {
        return false;
      }
    }

    // Filtro com vídeo
    if (onlyWithVideo && (!pet.videos || pet.videos.length === 0)) {
      return false;
    }

    // Filtro castrado
    if (onlyCastrado && !pet.saude?.castrado) {
      return false;
    }

    // Filtro vacinado
    if (onlyVacinado && (!pet.saude?.vacinas || pet.saude.vacinas.length === 0)) {
      return false;
    }

    // Filtro por ONG específica
    if (activeOngFilter && pet.ongId !== activeOngFilter) {
      return false;
    }

    return true;
  });

  // Se o adotante respondeu ao questionário, calcula compatibilidade e ordena
  if (activeQuiz && window.AdopterMatch) {
    filtered = filtered.map(pet => {
      const compat = AdopterMatch.calculate(pet, activeQuiz);
      return { ...pet, _compat: compat };
    });

    const hideDisqualified = document.getElementById("filter-hide-disqualified")?.checked || false;
    const onlyTop5 = document.getElementById("filter-top-5")?.checked || false;

    // Ordenação Ponderada
    filtered.sort((a, b) => {
      if (a._compat.isDisqualified && !b._compat.isDisqualified) return 1;
      if (!a._compat.isDisqualified && b._compat.isDisqualified) return -1;
      return (b._compat.score || 0) - (a._compat.score || 0);
    });

    // Atribui medalhas de classificação e ranks no Top 5
    let eligibleIndex = 1;
    filtered.forEach(pet => {
      if (!pet._compat.isDisqualified) {
        if (eligibleIndex === 1) {
          pet._compat.rank = 1;
          pet._compat.rankBadge = "🥇 1º Lugar (Par Perfeito)";
        } else if (eligibleIndex === 2) {
          pet._compat.rank = 2;
          pet._compat.rankBadge = "🥈 2º Lugar (Altíssima Afinidade)";
        } else if (eligibleIndex === 3) {
          pet._compat.rank = 3;
          pet._compat.rankBadge = "🥉 3º Lugar (Excelente Afinidade)";
        } else {
          pet._compat.rank = eligibleIndex;
          pet._compat.rankBadge = `${eligibleIndex}º Lugar`;
        }
        eligibleIndex++;
      } else {
        pet._compat.rank = null;
        pet._compat.rankBadge = null;
      }
    });

    if (hideDisqualified) {
      filtered = filtered.filter(pet => !pet._compat?.isDisqualified);
    }

    if (onlyTop5) {
      filtered = filtered.filter(pet => !pet._compat?.isDisqualified && pet._compat?.rank && pet._compat.rank <= 5);
    }
  } else {
    // Limpa scores se não houver quiz
    filtered = filtered.map(pet => {
      const { _compat, ...rest } = pet;
      return rest;
    });

    // Destaque absoluto dos animais do Mockup (Tobi, Carisa, Pami) no topo
    const featuredNames = ["Tobi", "Carisa", "Pami"];
    filtered.sort((a, b) => {
      const aIdx = featuredNames.indexOf(a.nome);
      const bIdx = featuredNames.indexOf(b.nome);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return 0;
    });
  }

  renderPetsGrid(filtered);
}

/**
 * Limpa todos os filtros da barra de busca
 */
function resetAllFilters() {
  activeOngFilter = null;
  const searchInput = document.getElementById("search-input");
  const heroSearch = document.getElementById("hero-search-input");
  const speciesFilter = document.getElementById("species-filter");
  const speciesFilterPill = document.getElementById("species-filter-pill");
  const sizeFilter = document.getElementById("size-filter");
  const dfRegionFilter = document.getElementById("df-region-filter");
  const regionFilterPill = document.getElementById("region-filter-pill");
  const filterVideo = document.getElementById("filter-video");
  const filterCastrado = document.getElementById("filter-castrado");
  const filterVacinado = document.getElementById("filter-vacinado");
  const filterHideDisqualified = document.getElementById("filter-hide-disqualified");
  const filterTop5 = document.getElementById("filter-top-5");

  if (searchInput) searchInput.value = "";
  if (heroSearch) heroSearch.value = "";
  if (speciesFilter) speciesFilter.value = "todos";
  if (speciesFilterPill) speciesFilterPill.value = "todos";
  if (sizeFilter) sizeFilter.value = "todos";
  if (dfRegionFilter) dfRegionFilter.value = "todos";
  if (regionFilterPill) regionFilterPill.value = "todos";
  if (filterVideo) filterVideo.checked = false;
  if (filterCastrado) filterCastrado.checked = false;
  if (filterVacinado) filterVacinado.checked = false;
  if (filterHideDisqualified) filterHideDisqualified.checked = false;
  if (filterTop5) filterTop5.checked = false;

  const btnTodos = document.getElementById("btn-species-todos");
  const btnCachorro = document.getElementById("btn-species-cachorro");
  const btnGato = document.getElementById("btn-species-gato");
  if (btnTodos) btnTodos.className = "species-quick-btn active px-3 py-1.5 rounded-full text-xs font-bold bg-[#D19864] text-slate-950 font-black border border-[#b87e4c] shadow-2xs transition-all cursor-pointer";
  if (btnCachorro) btnCachorro.className = "species-quick-btn px-3 py-1.5 rounded-full text-xs font-bold bg-[#F9F3EA] hover:bg-[#e6f4f5] text-slate-900 border border-[#e8ddcf] transition-all flex items-center gap-1 cursor-pointer";
  if (btnGato) btnGato.className = "species-quick-btn px-3 py-1.5 rounded-full text-xs font-bold bg-[#F9F3EA] hover:bg-[#e6f4f5] text-slate-900 border border-[#e8ddcf] transition-all flex items-center gap-1 cursor-pointer";

  if (typeof currentMainTab !== "undefined" && currentMainTab !== 'animais') {
    switchMainTab('animais');
  } else {
    applyFilters();
  }
}

/**
 * Filtro rápido por espécie (Todos, Cachorro, Gato)
 */
function setSpeciesFilter(species) {
  const selectPill = document.getElementById("species-filter-pill");
  const selectFilter = document.getElementById("species-filter");
  if (selectPill) selectPill.value = species;
  if (selectFilter) selectFilter.value = species;

  const btnTodos = document.getElementById("btn-species-todos");
  const btnCachorro = document.getElementById("btn-species-cachorro");
  const btnGato = document.getElementById("btn-species-gato");

  const activeClass = "species-quick-btn active px-3 py-1.5 rounded-full text-xs font-bold bg-[#D19864] text-slate-950 font-black border border-[#b87e4c] shadow-2xs transition-all cursor-pointer";
  const inactiveClass = "species-quick-btn px-3 py-1.5 rounded-full text-xs font-bold bg-[#F9F3EA] hover:bg-[#e6f4f5] text-slate-900 border border-[#e8ddcf] transition-all flex items-center gap-1 cursor-pointer";

  if (btnTodos) btnTodos.className = (species === 'todos') ? activeClass : inactiveClass;
  if (btnCachorro) btnCachorro.className = (species === 'cachorro') ? activeClass : inactiveClass;
  if (btnGato) btnGato.className = (species === 'gato') ? activeClass : inactiveClass;

  if (typeof currentMainTab !== "undefined" && currentMainTab !== 'animais') {
    switchMainTab('animais');
  } else {
    applyFilters();
  }
}

/**
 * Alterna a foto do card (próxima / anterior)
 */
function stepCardPhoto(petId, step, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const animalsList = (typeof currentAnimals !== "undefined" && currentAnimals.length > 0) ? currentAnimals : (window.DEFAULT_ANIMALS || []);
  const pet = animalsList.find(p => p.id === petId);
  if (!pet || !pet.fotos || pet.fotos.length <= 1) return;
  const imgEl = document.getElementById(`card-photo-${petId}`);
  if (!imgEl) return;
  const curIdx = parseInt(imgEl.getAttribute("data-photo-idx") || "0", 10);
  const newIdx = (curIdx + step + pet.fotos.length) % pet.fotos.length;
  setCardPhoto(petId, newIdx, event);
}

/**
 * Seleciona uma foto específica no card pelo índice
 */
function setCardPhoto(petId, index, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const animalsList = (typeof currentAnimals !== "undefined" && currentAnimals.length > 0) ? currentAnimals : (window.DEFAULT_ANIMALS || []);
  const pet = animalsList.find(p => p.id === petId);
  if (!pet || !pet.fotos || !pet.fotos[index]) return;
  const imgEl = document.getElementById(`card-photo-${petId}`);
  const counterEl = document.getElementById(`card-photo-counter-${petId}`);
  const dotsContainer = document.getElementById(`card-dots-${petId}`);

  if (imgEl) {
    imgEl.setAttribute("data-photo-idx", index);
    const rawPhoto = pet.fotos[index];
    const targetUrl = (window.PetDB ? PetDB.getMediaUrl(rawPhoto) : rawPhoto) || rawPhoto;
    imgEl.src = targetUrl;
  }
  if (counterEl) {
    counterEl.textContent = `${index + 1}/${pet.fotos.length}`;
  }
  if (dotsContainer) {
    dotsContainer.querySelectorAll(".card-dot").forEach((dot, dIdx) => {
      if (dIdx === index) {
        dot.className = "card-dot w-2.5 h-2.5 rounded-full bg-white scale-125 shadow-md transition-all";
      } else {
        dot.className = "card-dot w-2 h-2 rounded-full bg-white hover:bg-white shadow-xs transition-all";
      }
    });
  }
}

/* Cache e compilação instantânea de ícones vetoriais para eliminação de layout thrashing */
const FAST_ICONS = {
  'heart': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart [CLASS]"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  'award': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-award [CLASS]"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>',
  'map-pin': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin [CLASS]"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
  'building-2': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building-2 [CLASS]"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>',
  'check-circle-2': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle-2 [CLASS]"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  'info': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info [CLASS]"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  'shield-check': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-check [CLASS]"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
  'maximize-2': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-maximize-2 [CLASS]"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg>',
  'book-open': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open [CLASS]"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  'file-text': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text [CLASS]"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  'play': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play [CLASS]"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
  'sparkles': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles [CLASS]"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
  'shield-alert': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-alert [CLASS]"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>'
};

function getFastIconSvg(name, extraClass = "") {
  const tpl = FAST_ICONS[name];
  if (tpl) {
    return tpl.replace('[CLASS]', extraClass);
  }
  return `<i data-lucide="${name}" class="${extraClass}"></i>`;
}

/**
 * Renderiza a grade de cards dos animais
 */
function renderPetsGrid(pets) {
  const grid = document.getElementById("pets-grid");
  const emptyState = document.getElementById("empty-state");
  const counterEl = document.getElementById("pets-count-indicator");

  if (counterEl) {
    counterEl.textContent = `${pets.length} ${pets.length === 1 ? 'animal encontrado' : 'animais encontrados'}`;
  }

  if (!pets || pets.length === 0) {
    if (grid) grid.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");

  const layoutSettings = window.LayoutDesignStorage ? LayoutDesignStorage.getLayout() : null;
  const stickers = layoutSettings?.activeStickers || {};
  const profile = typeof getAdopterProfile === "function" ? getAdopterProfile() : null;
  const userRegion = profile?.regiaoDF || profile?.cidade;

  const favIds = getFavoritesList();
  const cardsHtml = pets.map((pet, petIdx) => {
    const hasVideo = pet.videos && pet.videos.length > 0;
    const petPhotos = pet.fotos && pet.fotos.length > 0 ? pet.fotos : [];
    const hasMultiplePhotos = petPhotos.length > 1;
    const rawPhoto = petPhotos.length > 0 ? petPhotos[0] : null;
    let mainPhoto = (window.PetDB ? PetDB.getMediaUrl(rawPhoto) : rawPhoto) || 
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=480&q=75";

    if (typeof mainPhoto === "string" && mainPhoto.includes("images.unsplash.com")) {
      mainPhoto = mainPhoto.replace(/w=\d+/, "w=480").replace(/q=\d+/, "q=75");
    }

    const porteLabels = {
      mini: { label: "Mini", color: "bg-teal-50 text-teal-800 border-teal-200" },
      pequeno: { label: "Pequeno", color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
      medio: { label: "Médio", color: "bg-[#F9F3EA] text-[#006366] border-[#e8ddcf]" },
      grande: { label: "Grande", color: "bg-amber-50 text-amber-900 border-amber-200" },
      gigante: { label: "Gigante", color: "bg-rose-50 text-rose-900 border-rose-200" }
    };
    const porteInfo = porteLabels[pet.porte] || { label: pet.porte || "Médio", color: "bg-slate-100 text-slate-700 border-slate-200" };

    const isFav = favIds.includes(pet.id);
    const compat = pet._compat;
    const isCastrado = pet.saude?.castrado;
    const castradoLabel = isCastrado ? "Castrado(a): Sim" : "Castrado(a): Não";
    const vacinasList = (pet.saude && Array.isArray(pet.saude.vacinas)) ? pet.saude.vacinas : [];
    const hasVacinas = vacinasList.length > 0 || pet.saude?.vacinado;
    const vacinaLabel = hasVacinas ? "Vacinas em dia" : "Vacinas a orientar";
    const especieLabel = pet.especie === 'gato' ? 'Gato' : pet.especie === 'outro' ? (pet.especieCustom || 'Outro') : 'Cachorro';
    const sexoLabel = pet.sexo === 'femea' ? 'Fêmea' : 'Macho';
    const racaText = pet.raca || (pet.especie === 'gato' ? 'Gato Comum (SRD)' : pet.especie === 'outro' ? 'Coelho Doméstico' : 'Vira-lata (SRD)');
    const historiaText = pet.historiaResgate || pet.descricao || "Animal amoroso aguardando uma família com carinho e responsabilidade.";
    const ongNome = pet.ongNome || "Associação ProAnima DF";
    const localidade = pet.regiaoDF || pet.cidade || "Brasília - DF";

    // Paleta de cores dinâmica e expressiva para destacar os perfis
    const especieTheme = pet.especie === 'gato'
      ? { 
          badge: 'bg-[#D19864] text-slate-950 font-black border border-[#b87e4c] shadow-xs', 
          cardAccent: 'border-t-4 border-t-emerald-400',
          racaBadge: 'bg-emerald-50 text-emerald-950 border-emerald-200',
          nameHover: 'group-hover:text-emerald-700'
        }
      : pet.especie === 'outro'
      ? { 
          badge: 'bg-[#D19864] text-slate-950 font-black border border-[#b87e4c] shadow-xs', 
          cardAccent: 'border-t-4 border-t-fuchsia-400',
          racaBadge: 'bg-fuchsia-50 text-fuchsia-950 border-fuchsia-200',
          nameHover: 'group-hover:text-fuchsia-700'
        }
      : { 
          badge: 'bg-[#D19864] text-slate-950 font-black border border-[#b87e4c] shadow-xs', 
          cardAccent: 'border-t-4 border-t-amber-400',
          racaBadge: 'bg-amber-50 text-amber-950 border-amber-200',
          nameHover: 'group-hover:text-amber-700'
        };

    const especieBadgeStyle = 'badge-specie-chamativa';
    const sexoBadgeStyle = pet.sexo === 'femea'
      ? 'badge-sexo-femea-chamativa'
      : 'badge-sexo-macho-chamativa';

    // Tags de temperamento coloridas
    const tempTags = (pet.temperamento && pet.temperamento.length > 0) 
      ? pet.temperamento.slice(0, 3) 
      : ['Dócil', 'Amoroso', 'Sociável'];
    const tempColorPalette = [
      'bg-emerald-50 text-emerald-800 border-emerald-200',
      'bg-amber-50 text-amber-900 border-amber-200',
      'bg-[#F9F3EA] text-[#004d50] border-[#e8ddcf]',
      'bg-sky-50 text-sky-900 border-sky-200'
    ];
    const tempHtml = tempTags.map((t, idx) => `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${tempColorPalette[idx % tempColorPalette.length]}">
        <span class="w-1.5 h-1.5 rounded-full bg-current opacity-75"></span>
        <span>${t}</span>
      </span>
    `).join("");

    return `
      <div class="pet-card bg-white rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-xl border border-[#e8ddcf] ${especieTheme.cardAccent} transition-all flex flex-col justify-between group relative">
        <!-- Moldura com Degradê da Foto (.pet-card-brand-frame) -->
        <div class="pet-card-brand-frame mb-3.5 relative aspect-[4/3] overflow-hidden select-none">
          <img 
            id="card-photo-${pet.id}"
            data-photo-idx="0"
            src="${mainPhoto}" 
            alt="${pet.nome}" 
            loading="${petIdx < 3 ? 'eager' : 'lazy'}"
            decoding="async"
            class="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-300"
          >

          <!-- Selos Coloridos de Destaque: Espécie & Sexo (Cores Chamativas & 100% Sólidas) -->
          <div class="absolute top-3 left-3 pointer-events-none z-10 flex items-center gap-1.5 flex-wrap">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-black ${especieBadgeStyle}">
              ${pet.especie === 'gato' ? '🐱 Gato' : pet.especie === 'outro' ? '🐰 Outro' : '🐶 Cachorro'}
            </span>
            <span class="px-2.5 py-1 rounded-full text-[11px] font-black ${sexoBadgeStyle}">
              ${pet.sexo === 'femea' ? '♀️ Fêmea' : '♂️ Macho'}
            </span>
            <span class="badge-tag-adocao-solid text-[10.5px]">
              🏷️ Adoção
            </span>
          </div>

          <!-- Stickers Decorativos do Studio Canva (se ativos) -->
          ${(stickers.fitaResgate || stickers.badgeVerificada || stickers.seloUrgente) ? `
            <div class="absolute top-11 left-3 flex flex-wrap gap-1 z-10 pointer-events-none">
              ${stickers.fitaResgate ? `<span class="px-2.5 py-0.5 rounded-full text-[9.5px] font-black bg-[#F9F3EA] text-slate-950 border border-[#D19864] shadow-xs">🎗️ Resgate</span>` : ''}
              ${stickers.badgeVerificada ? `<span class="px-2.5 py-0.5 rounded-full text-[9.5px] font-black bg-[#F9F3EA] text-slate-950 border border-[#007E82] shadow-xs">🛡️ Auditada</span>` : ''}
              ${stickers.seloUrgente ? `<span class="px-2.5 py-0.5 rounded-full text-[9.5px] font-black bg-[#D19864] text-slate-950 border border-[#b87e4c] shadow-xs">🌟 Urgente</span>` : ''}
            </div>
          ` : ''}
          ${stickers.patinhas ? `<span class="absolute top-3 right-12 text-sm z-10 select-none pointer-events-none drop-shadow-xs" title="Patinhas">🐾</span>` : ''}
          ${stickers.coracao ? `<span class="absolute bottom-3 right-12 text-sm z-10 select-none pointer-events-none drop-shadow-xs" title="Amor">❤️</span>` : ''}

          <!-- Botão de Favorito (Coração) no Topo Direito -->
          <button 
            type="button"
            onclick="toggleFavoritePet('${pet.id}', event)"
            title="${isFav ? 'Remover dos Favoritos' : 'Salvar nos Meus Favoritos'}"
            class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white hover:bg-white text-rose-500 flex items-center justify-center shadow-md transition-all hover:scale-110 z-10 cursor-pointer pointer-events-auto"
          >
            ${getFastIconSvg('heart', `w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`)}
          </button>

          <!-- Badge de Vídeo (100% Sólido e sem Transparência) -->
          ${hasVideo ? `
            <div class="absolute bottom-3 right-3 z-10 pointer-events-auto">
              <span class="badge-tag-video-solid">
                ${getFastIconSvg('play', 'w-3 h-3 fill-slate-950')} Vídeo
              </span>
            </div>
          ` : ''}

          <!-- Badge de Compatibilidade Calculada (se realizou o teste) -->
          ${compat ? `
            <div class="absolute bottom-3 left-3 flex flex-col items-start gap-1 pointer-events-none z-10">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-md border ${compat.badgeBorder}">
                ${getFastIconSvg(compat.isDisqualified ? 'shield-alert' : 'sparkles', 'w-3 h-3')}
                <span>${compat.isDisqualified ? 'Atenção' : `${compat.score}% Afinidade`}</span>
              </span>
            </div>
          ` : ''}
        </div>

        <!-- Conteúdo Textual e Explicativo do Card -->
        <div class="flex-1 flex flex-col justify-between space-y-3">
          <div>
            <!-- Nome e Idade -->
            <div class="flex items-baseline justify-between mb-1.5">
              <h3 class="font-brand text-2xl sm:text-3xl font-black tracking-tight text-slate-900 ${especieTheme.nameHover} transition-colors">
                ${pet.nome}
              </h3>
              <span class="text-xs font-extrabold text-[#003e40] bg-[#F9F3EA] px-2.5 py-0.5 rounded-full border border-[#e8ddcf]">${pet.idade}</span>
            </div>

            <!-- Raça & Localização no DF -->
            <div class="flex flex-wrap items-center justify-between gap-1.5 text-xs mb-1.5">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black ${especieTheme.racaBadge} border">
                ${getFastIconSvg('award', 'w-3.5 h-3.5 text-[#007E82]')}
                <span class="truncate max-w-[180px]">${racaText}</span>
              </span>
              <span class="text-xs font-semibold text-slate-500 flex items-center gap-1 truncate max-w-[150px]">
                ${getFastIconSvg('map-pin', 'w-3 h-3 text-slate-400')}
                <span>${localidade}</span>
              </span>
            </div>

            <!-- Tags Coloridas de Temperamento -->
            <div class="flex flex-wrap gap-1 mb-2">
              ${tempHtml}
            </div>

            <!-- ONG Responsável pelo Acolhimento -->
            <div class="text-[11px] font-medium text-[#004d50] flex items-center gap-1.5 mb-2.5 bg-[#F9F3EA] px-2.5 py-1 rounded-xl border border-[#e8ddcf]">
              ${getFastIconSvg('building-2', 'w-3.5 h-3.5 text-[#007E82] flex-shrink-0')}
              <span class="truncate">Cuidado por: <strong class="font-bold">${ongNome}</strong></span>
            </div>

            <!-- Painel de Saúde Explicativo: Castrado ou Não, Vacinas e Porte -->
            <div class="grid grid-cols-2 gap-1.5 mb-2.5">
              <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold ${isCastrado ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'}" title="Condição de Castração">
                ${getFastIconSvg(isCastrado ? 'check-circle-2' : 'info', `w-3.5 h-3.5 ${isCastrado ? 'text-emerald-600' : 'text-amber-600'} flex-shrink-0`)}
                <span class="truncate">${castradoLabel}</span>
              </div>
              <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold ${hasVacinas ? 'bg-cyan-50 text-cyan-800 border border-cyan-200' : 'bg-amber-50 text-amber-900 border border-amber-200'}" title="Situação Vacinal">
                ${getFastIconSvg('shield-check', `w-3.5 h-3.5 ${hasVacinas ? 'text-cyan-600' : 'text-amber-600'} flex-shrink-0`)}
                <span class="truncate">${vacinaLabel}</span>
              </div>
              <div class="col-span-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium ${porteInfo.color} border">
                ${getFastIconSvg('maximize-2', 'w-3 h-3 text-current flex-shrink-0 opacity-70')}
                <span>Porte: <strong class="font-bold">${porteInfo.label}</strong> ${pet.peso ? `(${pet.peso})` : ''}</span>
              </div>
            </div>

            <!-- História de Vida e Resgate -->
            <div class="p-3 rounded-2xl bg-[#F9F3EA] border border-[#e8ddcf] text-slate-700">
              <div class="flex items-center gap-1.5 text-[10px] font-black text-[#003e40] uppercase tracking-wider mb-1">
                ${getFastIconSvg('book-open', 'w-3.5 h-3.5 text-[#007E82]')}
                <span>História de Vida</span>
              </div>
              <p class="text-xs text-slate-700 italic leading-relaxed line-clamp-3">
                "${historiaText}"
              </p>
            </div>
          </div>


          <!-- Ações: Ler Ficha Completa + Quero Adotar -->
          <div class="grid grid-cols-2 gap-2 pt-2 mt-auto">
            <!-- 1. Ler Ficha Completa -->
            <button 
              type="button"
              onclick="openPetModalById('${pet.id}')" 
              class="w-full py-2.5 px-2 rounded-xl border-2 border-[#e8ddcf] hover:border-[#007E82] bg-[#F9F3EA] hover:bg-[#e6f4f5] text-[#003e40] font-black text-xs shadow-2xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02] cursor-pointer"
              title="Ler a ficha completa com histórico e exames de ${pet.nome}"
            >
              ${getFastIconSvg('file-text', 'w-3.5 h-3.5 text-[#007E82] flex-shrink-0')}
              <span class="truncate">Ler Ficha Completa</span>
            </button>

            <!-- 2. Quero Adotar -->
            <button 
              type="button" 
              onclick="handleCardAdoptClick('${pet.id}')" 
              class="w-full py-2.5 px-2 rounded-xl bg-[#D19864] hover:bg-[#c2844d] text-slate-950 font-black text-xs shadow-md shadow-[#D19864]/25 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02] cursor-pointer border border-[#b87e4c]"
              title="Entrar em contato direto para adotar ${pet.nome}"
            >
              ${getFastIconSvg('heart', 'w-3.5 h-3.5 fill-slate-950 text-white flex-shrink-0')}
              <span>Quero Adotar</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  grid.innerHTML = cardsHtml;

  if (window.lucide && grid.querySelector('[data-lucide]')) {
    lucide.createIcons({ root: grid });
  }
}

/**
 * Gera link do WhatsApp pré-formatado com pontuação de afinidade e menção à adoção responsável
 */
function generateWhatsAppLink(pet) {
  const phone = pet.contatoWhatsapp || '5511999998888';
  const profile = typeof getAdopterProfile === 'function' ? getAdopterProfile() : null;
  const identIntro = (profile && profile.nome) 
    ? `Olá! Meu nome é ${profile.nome} ${profile.sobrenome || ''} (Telefone: ${profile.telefone || ''}). ` 
    : `Olá! `;

  let message = `${identIntro}Vi o pet ${pet.nome} (Porte: ${pet.porte || 'médio'}, ID: ${pet.id}) na plataforma MatchPet e gostaria de saber mais informações para adotá-lo!`;

  if (pet._compat) {
    if (pet._compat.isDisqualified) {
      message = `${identIntro}Vi o pet ${pet.nome} na plataforma MatchPet. Li a comovente história de resgate dele e, mesmo com observações de atenção (${pet._compat.label}) no teste, gostaria de conversar com a ONG sobre a possibilidade de acolhê-lo.`;
    } else {
      message = `${identIntro}Fiz o Teste de Compatibilidade na plataforma MatchPet e tive ${pet._compat.score}% de afinidade com o(a) ${pet.nome}! Li a história de superação e dos cuidados que ele(a) recebeu na ONG e me emocionei muito. Gostaria de dar um final feliz para essa história e saber como adotá-lo(a)!`;
    }
  }

  // Declaração de ciência da Lei Sansão enviada à ONG
  message += `\n\n(Declaro ciência dos termos de adoção responsável e da Lei Sansão nº 14.064/20).`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Abre o modal detalhado buscando pelo ID do animal
 * @param {string} id ID do pet
 * @param {boolean} scrollToContact Se true, rola até a seção de termos e contato com a ONG
 */
async function openPetModalById(id, scrollToContact = false) {
  let pet = (currentAnimals && currentAnimals.find(a => String(a.id) === String(id))) ||
            (window.DEFAULT_ANIMALS ? window.DEFAULT_ANIMALS.find(a => String(a.id) === String(id)) : null);
  if (!pet && window.PetStorage) {
    pet = await PetStorage.getById(id);
  }
  if (!pet) return;

  // Se houver quiz ativo, calcula a compatibilidade
  if (activeQuiz && window.AdopterMatch) {
    pet._compat = AdopterMatch.calculate(pet, activeQuiz);
  }

  openPetModal(pet, scrollToContact);
}

/**
 * Preenche e abre o modal com as fotos, vídeos, ficha médica e compatibilidade (Mobile Screen 1 do Mockup)
 */
function openPetModal(pet, scrollToContact = false) {
  activePet = pet;
  activeMediaTab = 'photos';

  // Rastreamento Analítico de Visitas à Ficha do Animal
  if (window.AdoteAnalytics) {
    AdoteAnalytics.trackPetView(pet.id, pet.nome, "modal_ficha");
  }

  // Cabeçalho
  const nameEl = document.getElementById("modal-pet-name");
  if (nameEl) nameEl.textContent = pet.nome;
  const locEl = document.getElementById("modal-pet-location");
  if (locEl) locEl.textContent = `${pet.cidade || 'Brasília - DF'} • Porte ${pet.porte || 'Médio'}`;
  const ongNameEl = document.getElementById("modal-pet-ong-name");
  if (ongNameEl) ongNameEl.textContent = pet.ongNome || "Associação ProAnima DF";
  
  // Status & Badges de Destaque Chamativos e 100% Sólidos na Foto do Perfil
  const isFemea = pet.sexo === 'femea';
  const specieBadgeEl = document.getElementById("modal-pet-specie-badge");
  if (specieBadgeEl) {
    const icon = pet.especie === 'gato' ? '🐱 Gato' : pet.especie === 'outro' ? (pet.especieCustom ? `🐰 ${pet.especieCustom}` : '🐰 Outro') : '🐶 Cachorro';
    specieBadgeEl.textContent = icon;
    specieBadgeEl.className = "modal-badge-solid badge-specie-chamativa";
  }

  const sexoBadgeEl = document.getElementById("modal-pet-sexo-badge");
  if (sexoBadgeEl) {
    sexoBadgeEl.textContent = isFemea ? '♀️ Fêmea' : '♂️ Macho';
    sexoBadgeEl.className = `modal-badge-solid ${isFemea ? 'badge-sexo-femea-chamativa' : 'badge-sexo-macho-chamativa'}`;
  }

  const racaBadgeEl = document.getElementById("modal-pet-raca-badge");
  if (racaBadgeEl) {
    racaBadgeEl.textContent = `🐾 ${pet.raca || (pet.especie === 'gato' ? 'SRD' : 'Vira-lata')}`;
    racaBadgeEl.className = "modal-badge-solid modal-badge-raca-chamativa";
  }

  const statusEl = document.getElementById("modal-pet-status");
  if (statusEl) {
    if (pet.status === 'adotado') {
      statusEl.textContent = 'Adotado ✓';
      statusEl.className = "modal-badge-solid modal-badge-status-adotado";
    } else if (pet.status === 'em_processo') {
      statusEl.textContent = 'Em Processo';
      statusEl.className = "modal-badge-solid modal-badge-status-processo";
    } else {
      statusEl.textContent = '🏷️ Adoção Disponível';
      statusEl.className = "modal-badge-solid badge-tag-adocao-solid";
    }
  }

  const modalVideoBadge = document.getElementById("modal-pet-video-badge");
  const hasVideos = pet.videos && pet.videos.length > 0;
  if (modalVideoBadge) {
    if (hasVideos) {
      modalVideoBadge.classList.remove("hidden");
    } else {
      modalVideoBadge.classList.add("hidden");
    }
  }

  // Botão Favorito no modal
  updateModalFavBtnUI(pet.id);

  // 4 Colunas de Métricas (Idade | Porte | Castração | Vacinas)
  const porteText = {
    mini: 'Mini',
    pequeno: 'Pequeno',
    medio: 'Médio',
    grande: 'Grande',
    gigante: 'Gigante'
  };
  const sizeEl = document.getElementById("modal-pet-size");
  if (sizeEl) {
    const pLabel = porteText[pet.porte] || pet.porte || "Médio";
    sizeEl.textContent = pet.peso ? `${pLabel} (${pet.peso})` : pLabel;
  }
  
  const ageEl = document.getElementById("modal-pet-age");
  if (ageEl) ageEl.textContent = pet.idade || "2 Anos";

  const isCastrado = !!(pet.saude?.castrado);
  const castradoStatusEl = document.getElementById("modal-pet-castrado-status");
  if (castradoStatusEl) {
    castradoStatusEl.textContent = isCastrado ? "Castrado(a)" : "Não castrado";
    castradoStatusEl.className = isCastrado 
      ? "font-brand text-base sm:text-lg font-black text-[#007E82]" 
      : "font-brand text-base sm:text-lg font-black text-amber-600";
  }

  const isVacinado = (pet.saude?.vacinas && pet.saude.vacinas.length > 0) || pet.saude?.vacinado;
  const vacinasStatusEl = document.getElementById("modal-pet-vacinas-status");
  if (vacinasStatusEl) {
    vacinasStatusEl.textContent = isVacinado ? "Em dia" : "Pendente";
    vacinasStatusEl.className = isVacinado 
      ? "font-brand text-base sm:text-lg font-black text-teal-600" 
      : "font-brand text-base sm:text-lg font-black text-amber-600";
  }

  // Ficha Médica & Cuidados Veterinários Detalhados
  const castradoDetailEl = document.getElementById("modal-pet-castrado-detail");
  if (castradoDetailEl) {
    if (isCastrado) {
      castradoDetailEl.textContent = pet.saude?.castracaoObs 
        ? `Sim (${pet.saude.castracaoObs})` 
        : "Sim, procedimento cirúrgico já realizado";
    } else {
      castradoDetailEl.textContent = "Não castrado (será orientado pela equipe da ONG)";
    }
  }

  const vermifugoDetailEl = document.getElementById("modal-pet-vermifugo-detail");
  if (vermifugoDetailEl) {
    const isVermifugado = !!(pet.saude?.vermifugado);
    if (isVermifugado) {
      vermifugoDetailEl.textContent = pet.saude?.vermifugoObs 
        ? `Em dia (${pet.saude.vermifugoObs})` 
        : "Em dia com atestado sanitário";
    } else {
      vermifugoDetailEl.textContent = "Pendente de atualização pela equipe";
    }
  }

  const vacinasListEl = document.getElementById("modal-pet-vacinas-list");
  if (vacinasListEl) {
    const vacinas = (pet.saude && Array.isArray(pet.saude.vacinas)) ? pet.saude.vacinas : [];
    if (vacinas.length > 0) {
      vacinasListEl.innerHTML = vacinas.map(v => `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
          <i data-lucide="shield-check" class="w-3.5 h-3.5 text-teal-600"></i>
          <span>${v}</span>
        </span>
      `).join("");
    } else {
      vacinasListEl.innerHTML = `
        <span class="text-xs text-slate-500 italic">Cronograma vacinal em acompanhamento pela equipe veterinária da ONG.</span>
      `;
    }
  }

  const medicalNotesEl = document.getElementById("modal-pet-medical-notes");
  if (medicalNotesEl) {
    const notes = [];
    if (pet.saude?.possuiEnfermidades && pet.saude?.enfermidadesDescricao) {
      notes.push(`Condição: ${pet.saude.enfermidadesDescricao}`);
    }
    if (pet.saude?.medicamentosContinuos) {
      notes.push(`Medicação: ${pet.saude.medicamentosContinuos}`);
    }
    if (pet.saude?.cuidadosExtras) {
      notes.push(`Cuidados: ${pet.saude.cuidadosExtras}`);
    }
    if (notes.length > 0) {
      medicalNotesEl.innerHTML = `<strong>Observações Clínicas:</strong> ${notes.join(" • ")}`;
    } else {
      medicalNotesEl.innerHTML = `<strong>Observações Clínicas:</strong> Animal saudável, sem histórico de enfermidades crônicas registradas.`;
    }
  }

  // História de Resgate & Trajetória de Vida
  const rescueStoryEl = document.getElementById("modal-pet-rescue-story");
  if (rescueStoryEl) {
    rescueStoryEl.textContent = pet.historiaResgate || pet.descricao || "Animal amoroso acolhido e reabilitado com dedicação pela equipe da ONG parceira.";
  }

  // Bio e temperamento
  const descEl = document.getElementById("modal-pet-description");
  if (descEl) descEl.textContent = pet.descricao || "Animal amoroso procurando um lar definitivo e responsável.";
  
  const tempContainer = document.getElementById("modal-pet-temperament");
  if (tempContainer) {
    const temps = pet.temperamento || ["Amoroso", "Dócil", "Brincalhão"];
    const pastelBadgePalette = [
      "bg-[#e6f4f5] text-[#006366] border-[#e8ddcf]",
      "bg-sky-100 text-sky-800 border-sky-200",
      "bg-teal-100 text-teal-800 border-teal-200",
      "bg-amber-100 text-amber-800 border-amber-200"
    ];
    tempContainer.innerHTML = temps.map((t, idx) => `
      <span class="px-2.5 py-1 rounded-full text-xs font-semibold border ${pastelBadgePalette[idx % pastelBadgePalette.length]}">
        ${t}
      </span>
    `).join("");
  }

  // Critérios de Compatibilidade & Perfil (Quiz de Afinidade)
  const compatContainer = document.getElementById("modal-pet-compatibility-container");
  if (compatContainer) {
    const energiaMap = {
      baixa: { label: "Baixa Energia (Calmo)", icon: "🛋️", bg: "bg-emerald-50 text-emerald-950 border-emerald-300" },
      moderada: { label: "Energia Moderada", icon: "🐕", bg: "bg-teal-50 text-teal-950 border-teal-300" },
      alta: { label: "Alta Energia (Ativo)", icon: "⚡", bg: "bg-amber-50 text-amber-950 border-amber-300" }
    };
    const domMap = {
      apartamento: { label: "Apto ou Casa compacta", icon: "🏢" },
      casa: { label: "Casa com quintal seguro", icon: "🏠" },
      espaco_amplo: { label: "Espaço amplo (Sítio)", icon: "🌳" },
      qualquer: { label: "Adaptável (Apto/Casa)", icon: "🏡" }
    };
    const sozinhoMap = {
      independente: { label: "Independente (4h-8h)", icon: "⏳" },
      demanda_companhia: { label: "Demanda companhia", icon: "👥" }
    };
    const criancasMap = {
      sim: { label: "Dócil com crianças", icon: "👶" },
      supervisao: { label: "Supervisão c/ crianças", icon: "⚠️" },
      nao: { label: "Evitar c/ crianças", icon: "🚫" }
    };
    const caesMap = {
      sim: { label: "Sociável com cães", icon: "🐶" },
      adaptacao: { label: "Adaptação com cães", icon: "⏳" },
      nao: { label: "Filho único (sem cães)", icon: "🚫" }
    };
    const gatosMap = {
      sim: { label: "Sociável com gatos", icon: "🐱" },
      adaptacao: { label: "Adaptação com gatos", icon: "⏳" },
      nao: { label: "Não indicado p/ gatos", icon: "🚫" }
    };

    const c = pet.compatibilidade || {};
    const energiaKey = pet.nivelEnergia || c.nivelEnergia || 'moderada';
    const domKey = pet.tipoDomicilio || c.tipoDomicilio || 'qualquer';
    const sozinhoKey = pet.tempoSozinho || c.tempoSozinho || 'independente';
    const criancasKey = pet.conviveCriancas || c.conviveCriancas || 'sim';
    const caesKey = pet.conviveCaes || c.conviveCaes || 'sim';
    const gatosKey = pet.conviveGatos || c.conviveGatos || 'sim';

    const energiaInfo = energiaMap[energiaKey] || energiaMap.moderada;
    const domInfo = domMap[domKey] || domMap.qualquer;
    const sozinhoInfo = sozinhoMap[sozinhoKey] || sozinhoMap.independente;
    const criancasInfo = criancasMap[criancasKey] || criancasMap.sim;
    const caesInfo = caesMap[caesKey] || caesMap.sim;
    const gatosInfo = gatosMap[gatosKey] || gatosMap.sim;

    compatContainer.innerHTML = `
      <div class="p-2.5 rounded-xl border ${energiaInfo.bg} flex items-center gap-2">
        <span class="text-base">${energiaInfo.icon}</span>
        <div class="min-w-0">
          <span class="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Nível de Energia</span>
          <span class="font-bold text-xs truncate block">${energiaInfo.label}</span>
        </div>
      </div>
      <div class="p-2.5 rounded-xl border bg-white border-slate-200 shadow-2xs flex items-center gap-2">
        <span class="text-base">${domInfo.icon}</span>
        <div class="min-w-0">
          <span class="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Domicílio</span>
          <span class="font-bold text-xs text-slate-800 truncate block">${domInfo.label}</span>
        </div>
      </div>
      <div class="p-2.5 rounded-xl border bg-white border-slate-200 shadow-2xs flex items-center gap-2">
        <span class="text-base">${sozinhoInfo.icon}</span>
        <div class="min-w-0">
          <span class="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Tempo Sozinho</span>
          <span class="font-bold text-xs text-slate-800 truncate block">${sozinhoInfo.label}</span>
        </div>
      </div>
      <div class="p-2.5 rounded-xl border bg-white border-slate-200 shadow-2xs flex items-center gap-2">
        <span class="text-base">${criancasInfo.icon}</span>
        <div class="min-w-0">
          <span class="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Crianças</span>
          <span class="font-bold text-xs text-slate-800 truncate block">${criancasInfo.label}</span>
        </div>
      </div>
      <div class="p-2.5 rounded-xl border bg-white border-slate-200 shadow-2xs flex items-center gap-2">
        <span class="text-base">${caesInfo.icon}</span>
        <div class="min-w-0">
          <span class="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Outros Cães</span>
          <span class="font-bold text-xs text-slate-800 truncate block">${caesInfo.label}</span>
        </div>
      </div>
      <div class="p-2.5 rounded-xl border bg-white border-slate-200 shadow-2xs flex items-center gap-2">
        <span class="text-base">${gatosInfo.icon}</span>
        <div class="min-w-0">
          <span class="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Gatos</span>
          <span class="font-bold text-xs text-slate-800 truncate block">${gatosInfo.label}</span>
        </div>
      </div>
    `;
  }

  // Configura botão de WhatsApp
  const whatsappBtn = document.getElementById("modal-whatsapp-btn");
  if (whatsappBtn) {
    const ongPhone = (pet.ongWhatsapp || pet.contato?.whatsapp || pet.contato?.telefone || "61999999999").replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá! Tenho interesse em adotar o pet ${pet.nome} que vi na plataforma MatchPet!`);
    whatsappBtn.href = `https://api.whatsapp.com/send?phone=55${ongPhone}&text=${msg}`;
  }

  // Mídias: Foto Principal + 2 Miniaturas Empilhadas
  setupModalMedia(pet);

  // Exibir modal
  const modal = document.getElementById("pet-modal");
  if (modal) {
    modal.classList.remove("opacity-0", "pointer-events-none");
    modal.classList.add("opacity-100");
    const content = modal.querySelector(".modal-content");
    if (content) {
      content.classList.remove("scale-95");
      content.classList.add("scale-100");
    }
    document.body.style.overflow = "hidden";

    if (window.lucide) {
      lucide.createIcons({ root: modal });
    }
  }
}

/**
 * Configura as mídias do modal: Foto principal à esquerda e 2 miniaturas empilhadas à direita (Exato do Mockup)
 */
function setupModalMedia(pet) {
  const photos = (pet.fotos || []).map(f => window.PetDB ? PetDB.getMediaUrl(f) : f);
  const videos = (pet.videos || []).map(v => window.PetDB ? PetDB.getMediaUrl(v) : v);

  const mainPhotoEl = document.getElementById("modal-main-photo");
  const thumbsContainer = document.getElementById("modal-thumbnails");

  if (photos.length > 0) {
    if (mainPhotoEl) {
      mainPhotoEl.src = photos[0];
      mainPhotoEl.alt = pet.nome;
    }

    if (thumbsContainer) {
      // Exibe 2 miniaturas empilhadas verticalmente
      const displayThumbs = photos.length > 1 
        ? photos.slice(0, 2) 
        : [photos[0], photos[0]];

      thumbsContainer.innerHTML = displayThumbs.map((url, idx) => `
        <button 
          type="button"
          onclick="setModalMainPhoto('${url}', this)" 
          class="w-full flex-1 min-h-[65px] rounded-2xl overflow-hidden border-2 ${idx === 0 ? 'border-[#007E82] shadow-md ring-2 ring-[#007E82]/20' : 'border-slate-200 opacity-80 hover:opacity-100'} transition-all cursor-pointer bg-slate-100 group"
          title="Ver foto ${idx + 1}"
        >
          <img src="${url}" alt="${pet.nome} foto ${idx + 1}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
        </button>
      `).join("");
    }
  } else {
    if (mainPhotoEl) {
      mainPhotoEl.src = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80";
    }
    if (thumbsContainer) thumbsContainer.innerHTML = "";
  }

  // Configura Vídeos (se houver)
  const videoTarget = document.getElementById("modal-video-player-target");
  const videoCont = document.getElementById("media-videos-container");
  if (videos.length > 0 && videoTarget && videoCont) {
    videoCont.classList.remove("hidden");
    renderVideoPlayer(videos[0]);
  } else if (videoCont) {
    videoCont.classList.add("hidden");
  }
}

function setModalMainPhoto(url, btnElement) {
  const mainPhotoEl = document.getElementById("modal-main-photo");
  if (mainPhotoEl) mainPhotoEl.src = url;

  const thumbs = document.querySelectorAll("#modal-thumbnails button");
  thumbs.forEach(b => {
    b.classList.remove("border-[#007E82]", "shadow-md", "ring-2", "ring-[#007E82]/20");
    b.classList.add("border-slate-200", "opacity-80");
  });
  if (btnElement) {
    btnElement.classList.add("border-[#007E82]", "shadow-md", "ring-2", "ring-[#007E82]/20");
    btnElement.classList.remove("border-slate-200", "opacity-80");
  }
}

function renderVideoPlayer(url) {
  const target = document.getElementById("modal-video-player-target");
  if (!target) return;

  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    let videoId = "";
    if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1].split("?")[0];
    } else if (url.includes("watch?v=")) {
      videoId = url.split("watch?v=")[1].split("&")[0];
    }
    target.innerHTML = `
      <iframe 
        src="https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0" 
        title="Vídeo do animal" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen
        class="w-full h-48 rounded-xl"
      ></iframe>
    `;
  } else {
    target.innerHTML = `
      <video controls playsinline class="w-full h-48 object-contain rounded-xl bg-black">
        <source src="${url}">
        Seu navegador não suporta a reprodução deste vídeo.
      </video>
    `;
  }
}

function closePetModal() {
  const modal = document.getElementById("pet-modal");
  if (!modal) return;

  const video = modal.querySelector("video");
  if (video) video.pause();

  modal.classList.remove("opacity-100");
  modal.classList.add("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-100");
    content.classList.add("scale-95");
  }
  document.body.style.overflow = "";
}

/* ==========================================================================
   SISTEMA DE FAVORITOS (Local Storage & Feedback Visual)
   ========================================================================== */
const FAVORITES_STORAGE_KEY = "matchpet_favorites_v1"; if (!localStorage.getItem("matchpet_favorites_v1") && localStorage.getItem("pata_certa_favorites_v1")) { localStorage.setItem("matchpet_favorites_v1", localStorage.getItem("pata_certa_favorites_v1")); }

function getFavoritesList() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveFavoritesList(list) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}

function toggleFavoritePet(petId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const idStr = String(petId);
  let favs = getFavoritesList();
  const index = favs.indexOf(idStr);
  let isNowFav = false;

  if (index > -1) {
    favs.splice(index, 1);
    isNowFav = false;
    showToast("Removido dos favoritos");
  } else {
    favs.push(idStr);
    isNowFav = true;
    showToast("Adicionado aos favoritos! ❤️");
  }
  saveFavoritesList(favs);

  // Atualiza botões nos cards
  document.querySelectorAll(`[data-pet-fav-id="${idStr}"]`).forEach(btn => {
    btn.innerHTML = `<i data-lucide="heart" class="w-4 h-4 sm:w-5 sm:h-5 ${isNowFav ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}"></i>`;
    if (window.lucide) lucide.createIcons({ root: btn });
  });

  // Atualiza modal se aberto com este pet
  if (activePet && String(activePet.id) === idStr) {
    updateModalFavBtnUI(idStr);
  }

  // Atualiza dashboard se aberto
  const dashboardModal = document.getElementById("adopter-dashboard-modal");
  if (dashboardModal && !dashboardModal.classList.contains("opacity-0")) {
    renderAdopterDashboardUI();
  }
}

function toggleActivePetFavorite(event) {
  if (!activePet) return;
  toggleFavoritePet(activePet.id, event);
}

function updateModalFavBtnUI(petId) {
  const favBtn = document.getElementById("modal-pet-fav-btn");
  if (!favBtn) return;
  const favs = getFavoritesList();
  const isFav = favs.includes(String(petId));
  favBtn.innerHTML = `<i data-lucide="heart" class="w-5 h-5 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}"></i>`;
  if (window.lucide) lucide.createIcons({ root: favBtn });
}

/* ==========================================================================
   PROCESSO DE ADOÇÃO EM 5 ETAPAS (Mobile Screen 2 do Mockup)
   ========================================================================== */
window.adoptionCurrentStep = 1;
window.adoptionProcessPet = null;
const CANDIDATURAS_STORAGE_KEY = "matchpet_candidaturas_v1"; if (!localStorage.getItem("matchpet_candidaturas_v1") && localStorage.getItem("pata_certa_candidaturas_v1")) { localStorage.setItem("matchpet_candidaturas_v1", localStorage.getItem("pata_certa_candidaturas_v1")); }

function getCandidaturasList() {
  try {
    const raw = localStorage.getItem(CANDIDATURAS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    return [
      {
        id: "cand_tobi_01",
        petId: "1",
        petNome: "Tobi",
        petFoto: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80",
        ongNome: "Associação ProAnima DF",
        data: new Date().toLocaleDateString("pt-BR"),
        status: "Em Análise pela ONG ✨",
        dataVisita: "Próximo Sábado, 10h"
      }
    ];
  } catch (e) {
    return [];
  }
}

function saveCandidatura(cand) {
  try {
    const list = getCandidaturasList();
    list.unshift(cand);
    localStorage.setItem(CANDIDATURAS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}

function openAdoptionProcessModal(petId = null) {
  if (petId) {
    handleCardAdoptClick(petId);
  } else if (activePet) {
    handlePetModalAdoptClick();
  } else if (currentAnimals && currentAnimals.length > 0) {
    handleCardAdoptClick(currentAnimals[0].id);
  }
}

function openAdoptionProcessForActivePet() {
  handlePetModalAdoptClick();
}

function closeAdoptionProcessModal() {
  // Stubs para compatibilidade reversa
}

/* ==========================================================================
   LAYOUT EXCLUSIVO: MEUS FAVORITOS
   ========================================================================== */
function openFavoritesModal() {
  renderFavoritesModalUI();

  const modal = document.getElementById("adopter-dashboard-modal");
  if (modal) {
    modal.classList.remove("opacity-0", "pointer-events-none");
    modal.classList.add("opacity-100");
    const content = modal.querySelector(".modal-content");
    if (content) {
      content.classList.remove("scale-95");
      content.classList.add("scale-100");
    }
    document.body.style.overflow = "hidden";
    if (window.lucide) lucide.createIcons({ root: modal });
  }
}

function closeFavoritesModal() {
  const modal = document.getElementById("adopter-dashboard-modal");
  if (!modal) return;
  modal.classList.remove("opacity-100");
  modal.classList.add("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-100");
    content.classList.add("scale-95");
  }
  document.body.style.overflow = "";
}

// Aliases para compatibilidade total
const openAdopterDashboardModal = openFavoritesModal;
const closeAdopterDashboardModal = closeFavoritesModal;

function renderFavoritesModalUI() {
  const container = document.getElementById("dashboard-favorites-list");
  const badgeCount = document.getElementById("favorites-badge-count");
  if (!container) return;

  const favIds = getFavoritesList();
  const allPets = (window.currentAnimals && window.currentAnimals.length > 0) ? window.currentAnimals : (window.DEFAULT_ANIMALS || []);
  const favPets = allPets.filter(p => favIds.includes(String(p.id)));

  if (badgeCount) {
    badgeCount.textContent = `${favPets.length} pet(s)`;
  }

  // Se o usuário ainda não favoritou nenhum animal (Estado Vazio Solicitado)
  if (favPets.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 px-4 sm:px-6 space-y-5 bg-gradient-to-b from-[#e6f4f5]/70 to-[#F9F3EA]/50 rounded-3xl border-2 border-dashed border-[#e8ddcf]">
        <div class="w-16 h-16 rounded-3xl bg-rose-100 text-rose-500 mx-auto flex items-center justify-center text-3xl shadow-inner animate-pulse">
          🐾
        </div>
        <div class="space-y-2 max-w-md mx-auto">
          <h4 class="text-base sm:text-lg font-black text-slate-800 leading-snug">
            Parece que ainda não há nenhum peludinho por aqui, clique abaixo para encontrar sua alma gêmea
          </h4>
          <p class="text-xs text-slate-500 font-medium leading-relaxed">
            Explore o catálogo de animais resgatados no Distrito Federal e toque no coraçãozinho de qualquer pet para adicioná-lo à sua lista de favoritos!
          </p>
        </div>
        <div>
          <button 
            type="button" 
            onclick="closeFavoritesModal(); switchMainTab('animais'); document.getElementById('catalogo')?.scrollIntoView({behavior: 'smooth'})"
            class="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#007E82] via-[#006568] to-[#D19864] hover:opacity-95 text-white font-black text-xs sm:text-sm shadow-md shadow-[#007E82]/25 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <i data-lucide="sparkles" class="w-4 h-4 text-amber-300"></i>
            <span>Encontrar Minha Alma Gêmea 🐾</span>
          </button>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: container });
    return;
  }

  // Quando há animais favoritados: exibe apenas os animais favoritados
  container.innerHTML = favPets.map(pet => {
    const photo = (pet.fotos && pet.fotos[0]) 
      ? (typeof pet.fotos[0] === 'string' ? pet.fotos[0] : (pet.fotos[0].url || '')) 
      : 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80';
    
    const isAdopted = pet.status === "adotado" || pet.adotado;
    const especieTag = pet.especie === 'cachorro' ? 'Cachorro' : (pet.especie === 'gato' ? 'Gato' : (pet.especieCustom || 'Outro'));
    const sexoTag = pet.sexo === 'femea' ? 'Fêmea' : 'Macho';
    const ongNome = pet.ongNome || 'ONG Parceira DF';
    const localidade = pet.regiaoDF || pet.cidade || 'Distrito Federal';

    return `
      <div class="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs hover:border-[#007E82] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        <div class="flex items-center gap-3.5 w-full sm:w-auto">
          <img src="${photo}" alt="${pet.nome}" class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-slate-100 flex-shrink-0 shadow-2xs">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="text-base font-black text-slate-900 leading-tight">${pet.nome}</h4>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${isAdopted ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
                ${isAdopted ? 'Adotado' : 'Disponível'}
              </span>
            </div>
            <p class="text-xs text-slate-600 font-semibold mt-0.5">
              ${especieTag} • ${sexoTag} • Porte ${pet.porte || 'Médio'} • ${pet.idade || 'Idade n/d'}
            </p>
            <p class="text-[11px] text-[#007E82] font-bold truncate mt-0.5 flex items-center gap-1.5">
              <span>${ongNome}</span> • <span class="text-slate-500 font-normal">${localidade}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-center flex-shrink-0 w-full sm:w-auto justify-end">
          <button 
            type="button" 
            onclick="closeFavoritesModal(); handleCardAdoptClick('${pet.id}');"
            class="px-4 py-2 rounded-xl bg-gradient-to-r from-[#007E82] to-[#005c60] hover:from-[#00383b] hover:to-[#004d50] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Quero Adotar / Falar com a ONG"
          >
            <i data-lucide="heart" class="w-3.5 h-3.5 fill-slate-950 text-white"></i>
            <span>Quero Adotar</span>
          </button>
          <button 
            type="button" 
            onclick="closeFavoritesModal(); openPetModalById('${pet.id}');"
            class="px-3 py-2 rounded-xl bg-[#F9F3EA] hover:bg-[#e6f4f5] text-[#003e40] font-bold text-xs border border-[#e8ddcf] transition-colors flex items-center gap-1 cursor-pointer"
            title="Ler Ficha Completa"
          >
            <i data-lucide="file-text" class="w-3.5 h-3.5 text-[#007E82]"></i>
            <span>Ler Ficha Completa</span>
          </button>
          <button 
            type="button" 
            onclick="handleRemoveFromFavorites('${pet.id}', event)"
            class="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
            title="Remover dos Favoritos"
          >
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) {
    lucide.createIcons({ root: container });
  }
}

function handleRemoveFromFavorites(petId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  toggleFavoritePet(petId);
  renderFavoritesModalUI();
}

const renderAdopterDashboardUI = renderFavoritesModalUI;

/* ==========================================================================
/* ==========================================================================
   SESSÃO 100% ANÔNIMA (SEM LOGIN NEM IDENTIFICAÇÃO DE USUÁRIO)
   ========================================================================== */

const ADOPTER_PROFILE_KEY = "adoteamigo_adopter_profile_v1";
const ACCESS_CHOSEN_KEY = "adoteamigo_access_mode_chosen_v1";

/**
 * Obtém o perfil atual do adotante (estritamente anônimo)
 */
function getAdopterProfile() {
  return { mode: "anonymous", anonymousConsent: true };
}

/**
 * Em modo 100% anônimo, a identificação não é solicitada nem exigida
 */
function isAdopterIdentified() {
  return false;
}

/**
 * Função mantida para retrocompatibilidade; preserva o anonimato
 */
function saveAdopterProfile() {
  return { mode: "anonymous", anonymousConsent: true };
}

/**
 * Define e assegura o modo anônimo
 */
function setAnonymousMode(showToastMsg = false, triggerFilter = true) {
  const profile = {
    mode: "anonymous",
    anonymousConsent: true,
    atualizadoEm: new Date().toISOString()
  };
  try {
    localStorage.setItem(ADOPTER_PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(ACCESS_CHOSEN_KEY, "true");
  } catch (e) {}

  updateUserSessionUI();
  updateQuizUserBannerUI();
  if (triggerFilter) {
    if (typeof applyFilters === "function" && currentMainTab === 'animais') applyFilters();
    if (typeof renderOngsGrid === "function" && currentMainTab === 'ongs') renderOngsGrid();
  }
  return profile;
}

/**
 * Atualiza o indicador de sessão no topo (Navbar) exibindo selo estático de Modo Anônimo
 */
function updateUserSessionUI() {
  const container = document.getElementById("user-session-container");
  if (!container) return;

  container.innerHTML = `
    <div class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F9F3EA] text-[#007E82] text-xs font-black border border-[#e8ddcf] shadow-2xs select-none" title="Navegação 100% Anônima e Segura">
      <span class="w-2 h-2 rounded-full bg-[#007E82]"></span>
      <i data-lucide="shield" class="w-3.5 h-3.5 text-[#007E82]"></i>
      <span>Modo Anônimo</span>
    </div>
  `;

  if (window.lucide) {
    lucide.createIcons({ root: container });
  }
}

/**
 * Atualiza o banner do Quiz de Compatibilidade garantindo anonimato absoluto
 */
function updateQuizUserBannerUI() {
  const banner = document.getElementById("quiz-user-session-banner");
  if (!banner) return;

  banner.className = "p-3.5 sm:p-4 rounded-2xl bg-white/80 border border-[#007E82]/30 text-[#003e40] flex items-center gap-3 text-xs shadow-2xs";
  banner.innerHTML = `
    <div class="w-9 h-9 rounded-xl bg-[#e6f4f5] text-[#007E82] border border-[#b2dedf] flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
      <i data-lucide="shield-check" class="w-5 h-5 text-[#007E82]"></i>
    </div>
    <div>
      <span class="font-black text-slate-950 block text-xs sm:text-sm">
        Quiz 100% Anônimo &amp; Seguro
      </span>
      <span class="text-slate-600 font-medium text-[11px] leading-tight block">
        Suas respostas são confidenciais e livres de cadastro. Navegue e descubra a compatibilidade sem informar seus dados.
      </span>
    </div>
  `;
  banner.classList.remove("hidden");

  if (window.lucide) {
    lucide.createIcons({ root: banner });
  }
}

// Stubs seguros para compatibilidade com chamadas legadas
function openUserProfileModal() {}
function closeUserProfileModal() {}
function renderUserProfileModalUI() {}
function handleUserProfileSubmit(event) { if (event) event.preventDefault(); }
function selectAnonymousModeFromProfile() {}
function openWelcomeAccessModal() {}
function closeWelcomeAccessModal() {}
function chooseAccessMode() { setAnonymousMode(false); }
function openAdopterLoginModal() {}
function closeAdopterLoginModal() {}
function handleAdopterLoginSubmit(event) { if (event) event.preventDefault(); }

/**
 * Máscara automática de telefone celular/fixo: (XX) XXXXX-XXXX
 */
function applyPhoneMask(input) {
  if (!input) return;
  let value = input.value.replace(/\D/g, "");
  if (value.length > 11) value = value.slice(0, 11);

  if (value.length > 10) {
    // (XX) XXXXX-XXXX
    input.value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
  } else if (value.length > 6) {
    // (XX) XXXX-XXXX
    input.value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
  } else if (value.length > 2) {
    input.value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
  } else if (value.length > 0) {
    input.value = `(${value}`;
  } else {
    input.value = "";
  }
}

/**
 * Ação disparada ao clicar em "Adotar" no card da vitrine
 */
function handleCardAdoptClick(petId) {
  const pet = (currentAnimals && currentAnimals.find(a => String(a.id) === String(petId))) ||
              (window.DEFAULT_ANIMALS ? window.DEFAULT_ANIMALS.find(a => String(a.id) === String(petId)) : null);
  if (!pet) return;
  activePet = pet;
  proceedToOngContact(pet, getAdopterProfile());
}

/**
 * Ação disparada ao clicar em "Adotar" dentro do modal do animal
 */
function handlePetModalAdoptClick() {
  if (!activePet) return;
  proceedToOngContact(activePet, getAdopterProfile());
}

/**
 * Alias genérico para adoção
 */
function handlePetAdoptClick(petOrId) {
  if (typeof petOrId === 'object' && petOrId !== null) {
    activePet = petOrId;
    handlePetModalAdoptClick();
  } else {
    handleCardAdoptClick(petOrId);
  }
}

/* ==========================================================================
   FEEDBACK VISUAL: TOAST NOTIFICATIONS
   ========================================================================== */
let appToastTimeout = null;
function showToast(message, type = "success") {
  let toast = document.getElementById("toast-notification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-notification";
    toast.className = "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-2xl shadow-xl text-xs font-bold border border-slate-700 transition-all duration-300 translate-y-24 opacity-0 pointer-events-none";
    toast.innerHTML = `
      <div id="toast-icon" class="w-4 h-4 text-teal-400">
        <i data-lucide="check-circle" class="w-4 h-4"></i>
      </div>
      <span id="toast-message"></span>
    `;
    document.body.appendChild(toast);
  }

  const msgEl = document.getElementById("toast-message") || toast.querySelector("#toast-message");
  if (msgEl) msgEl.textContent = message;

  if (window.lucide && toast) {
    lucide.createIcons({ root: toast });
  }

  if (appToastTimeout) clearTimeout(appToastTimeout);

  toast.classList.remove("translate-y-24", "opacity-0", "pointer-events-none");
  toast.classList.add("translate-y-0", "opacity-100");

  appToastTimeout = setTimeout(() => {
    toast.classList.add("translate-y-24", "opacity-0", "pointer-events-none");
    toast.classList.remove("translate-y-0", "opacity-100");
  }, 3500);
}

/* ==========================================================================
   TERMO DE CONSCIENTIZAÇÃO, LEI SANSÃO & COMPROMETIMENTO DO ADOTANTE
   ========================================================================== */

const TERMS_STORAGE_KEY = "adoteamigo_terms_accepted_v1";
const TERMS_ACCEPTED_AT_KEY = "adoteamigo_terms_accepted_at_v1";

function areAdoptionTermsAccepted() {
  try {
    return localStorage.getItem(TERMS_STORAGE_KEY) === "true";
  } catch (e) {
    return false;
  }
}

/**
 * Abre o modal exclusivo de comprometimento e aviso penal de criminalização contra abandono
 */
function openAdoptionCommitmentModal(pet) {
  if (!pet) pet = activePet;
  if (!pet) return;
  activePet = pet;

  const modal = document.getElementById("adoption-commitment-modal");
  if (!modal) return;

  const nameEl = document.getElementById("commitment-pet-name");
  if (nameEl) nameEl.textContent = pet.nome;

  const ongEl = document.getElementById("commitment-ong-name");
  if (ongEl) ongEl.textContent = pet.ongNome || "ONG Parceira";

  // Checkboxes
  const c1 = document.getElementById("commitment-check-1");
  const c2 = document.getElementById("commitment-check-2");
  const c3 = document.getElementById("commitment-check-3");
  const isAccepted = areAdoptionTermsAccepted();
  if (c1) c1.checked = isAccepted;
  if (c2) c2.checked = isAccepted;
  if (c3) c3.checked = isAccepted;

  const err = document.getElementById("commitment-terms-error-msg");
  if (err) err.classList.add("hidden");

  modal.classList.remove("opacity-0", "pointer-events-none");
  modal.classList.add("opacity-100");
  modal.querySelector(".modal-content").classList.remove("scale-95");
  modal.querySelector(".modal-content").classList.add("scale-100");
  document.body.style.overflow = "hidden";

  if (window.lucide) {
    lucide.createIcons({ root: modal });
  }
}

function closeAdoptionCommitmentModal() {
  const modal = document.getElementById("adoption-commitment-modal");
  if (!modal) return;

  modal.classList.remove("opacity-100");
  modal.classList.add("opacity-0", "pointer-events-none");
  modal.querySelector(".modal-content").classList.remove("scale-100");
  modal.querySelector(".modal-content").classList.add("scale-95");
  document.body.style.overflow = "";
}

/**
 * Validação do comprometimento:
 * Após confirmar o comprometimento, direciona para o contato com a ONG ou para o cadastro pendente
 */
function confirmAdoptionCommitment() {
  const c1 = document.getElementById("commitment-check-1")?.checked;
  const c2 = document.getElementById("commitment-check-2")?.checked;
  const c3 = document.getElementById("commitment-check-3")?.checked;
  const err = document.getElementById("commitment-terms-error-msg");

  if (!c1 || !c2 || !c3) {
    if (err) err.classList.remove("hidden");
    return;
  }

  if (err) err.classList.add("hidden");

  try {
    localStorage.setItem(TERMS_STORAGE_KEY, "true");
    localStorage.setItem(TERMS_ACCEPTED_AT_KEY, new Date().toISOString());
  } catch (e) {}

  closeAdoptionCommitmentModal();
  closePetModal();

  const pet = activePet;
  if (!pet) return;

  // Em modo 100% anônimo, direciona diretamente ao WhatsApp oficial da ONG
  proceedToOngContact(pet, getAdopterProfile());
}

/**
 * Redireciona o usuário para o WhatsApp oficial da ONG após confirmação de compromisso e identificação
 */
function proceedToOngContact(pet, profile) {
  if (window.AdoteAnalytics) {
    AdoteAnalytics.trackWhatsAppClick(
      pet.id,
      pet.nome,
      pet._compat?.score !== undefined ? pet._compat.score : null,
      pet._compat?.rank || null,
      profile
    );
  }

  const url = generateWhatsAppLink(pet);
  showToast(`Direcionando para o WhatsApp oficial da ONG ${pet.ongNome || ''}... 🐾`);
  window.open(url, "_blank");
}

function handleContactWhatsApp(event) {
  if (event) event.preventDefault();
  if (activePet) {
    proceedToOngContact(activePet, getAdopterProfile());
  }
}

/* ==========================================================================
   QUESTIONÁRIO DE COMPATIBILIDADE (DIRETO E SEM INTERCEPTAÇÃO)
   ========================================================================== */

function openQuizModal() {
  const modal = document.getElementById("quiz-modal");
  if (!modal) return;

  // Pré-preenche caso já exista quiz salvo
  const saved = AdopterMatch.getSavedQuiz();
  if (saved) {
    const form = document.getElementById("quiz-form");
    if (form) {
      if (saved.idade) {
        const rad = form.querySelector(`input[name="quiz_idade"][value="${saved.idade}"]`);
        if (rad) rad.checked = true;
      }
      if (saved.agressividade) {
        const rad = form.querySelector(`input[name="quiz_agressividade"][value="${saved.agressividade}"]`);
        if (rad) rad.checked = true;
      }
      if (saved.moradoresAcordo) {
        const rad = form.querySelector(`input[name="quiz_moradores_acordo"][value="${saved.moradoresAcordo}"]`);
        if (rad) rad.checked = true;
      }
      if (saved.arcarCastracao) {
        const rad = form.querySelector(`input[name="quiz_arcar_castracao"][value="${saved.arcarCastracao}"]`);
        if (rad) rad.checked = true;
      }
      if (saved.moradia) {
        const rad = form.querySelector(`input[name="quiz_moradia"][value="${saved.moradia}"]`);
        if (rad) rad.checked = true;
      }
      if (saved.tempoSozinho) {
        const rad = form.querySelector(`input[name="quiz_tempo"][value="${saved.tempoSozinho}"]`);
        if (rad) rad.checked = true;
      }
      if (saved.temCriancas) {
        const rad = form.querySelector(`input[name="quiz_criancas"][value="${saved.temCriancas}"]`);
        if (rad) rad.checked = true;
      }
      if (saved.outrosPets) {
        const rad = form.querySelector(`input[name="quiz_outros_pets"][value="${saved.outrosPets}"]`);
        if (rad) rad.checked = true;
      }
      if (saved.estiloVida) {
        const rad = form.querySelector(`input[name="quiz_energia"][value="${saved.estiloVida}"]`);
        if (rad) rad.checked = true;
      }
      if (saved.cuidadosMedicos) {
        const rad = form.querySelector(`input[name="quiz_medico"][value="${saved.cuidadosMedicos}"]`);
        if (rad) rad.checked = true;
      }
      if (saved.especie) {
        form.querySelector(`select[name="quiz_especie"]`).value = saved.especie;
      }
      if (saved.porte) {
        form.querySelector(`select[name="quiz_porte"]`).value = saved.porte;
      }
    }
  }

  updateQuizUserBannerUI();
  modal.classList.remove("opacity-0", "pointer-events-none");
  modal.classList.add("opacity-100");
  modal.querySelector(".modal-content").classList.remove("scale-95");
  modal.querySelector(".modal-content").classList.add("scale-100");
  document.body.style.overflow = "hidden";
  if (window.lucide) lucide.createIcons({ root: modal });
}

function closeQuizModal() {
  const modal = document.getElementById("quiz-modal");
  if (!modal) return;

  modal.classList.remove("opacity-100");
  modal.classList.add("opacity-0", "pointer-events-none");
  modal.querySelector(".modal-content").classList.remove("scale-100");
  modal.querySelector(".modal-content").classList.add("scale-95");
  document.body.style.overflow = "";
}

function handleQuizSubmit(event) {
  if (event && event.preventDefault) event.preventDefault();
  const form = (event && event.target && event.target.querySelector) 
    ? event.target 
    : document.getElementById("quiz-form");

  const profile = getAdopterProfile();
  const identified = isAdopterIdentified();

  const answers = {
    idade: form.querySelector('input[name="quiz_idade"]:checked')?.value,
    agressividade: form.querySelector('input[name="quiz_agressividade"]:checked')?.value,
    moradoresAcordo: form.querySelector('input[name="quiz_moradores_acordo"]:checked')?.value,
    arcarCastracao: form.querySelector('input[name="quiz_arcar_castracao"]:checked')?.value,
    moradia: form.querySelector('input[name="quiz_moradia"]:checked')?.value,
    tempoSozinho: form.querySelector('input[name="quiz_tempo"]:checked')?.value,
    temCriancas: form.querySelector('input[name="quiz_criancas"]:checked')?.value,
    outrosPets: form.querySelector('input[name="quiz_outros_pets"]:checked')?.value,
    estiloVida: form.querySelector('input[name="quiz_energia"]:checked')?.value,
    cuidadosMedicos: form.querySelector('input[name="quiz_medico"]:checked')?.value,
    especie: form.querySelector('select[name="quiz_especie"]')?.value,
    porte: form.querySelector('select[name="quiz_porte"]')?.value,
    isAnonymous: !identified,
    adopterProfile: identified ? { ...profile } : null,
    respondidoEm: Date.now()
  };

  // Validação
  if (!answers.idade || !answers.agressividade || !answers.moradoresAcordo || !answers.arcarCastracao ||
      !answers.moradia || !answers.tempoSozinho || !answers.temCriancas || !answers.outrosPets || !answers.estiloVida || !answers.cuidadosMedicos) {
    alert("Por favor, responda a todas as perguntas obrigatórias do questionário.");
    return;
  }

  AdopterMatch.saveQuiz(answers);
  activeQuiz = answers;
  window.activeQuiz = answers;

  // Rastreamento Analítico para Pesquisa & Extensão (Estatísticas do Moderador)
  if (window.AdoteAnalytics && window.AdopterMatch) {
    const listToEvaluate = (currentAnimals && currentAnimals.length > 0)
      ? currentAnimals
      : (window.DEFAULT_ANIMALS || []);
    const evaluatedPets = listToEvaluate.map(p => {
      const comp = AdopterMatch.calculate(p, answers);
      return {
        id: p.id,
        nome: p.nome,
        especie: p.especie,
        porte: p.porte,
        score: comp ? comp.score : 0,
        notaFinal: comp ? comp.notaFinal : "0.0",
        isDisqualified: comp ? comp.isDisqualified : false
      };
    }).sort((a, b) => b.score - a.score);

    AdoteAnalytics.trackQuizCompleted(answers, evaluatedPets, profile);
  }

  closeQuizModal();
  updateQuizBannerUI();
  applyFilters();

  // Se houver desclassificação geral (menor de idade, pet agressivo, sem acordo), abre o modal explicativo
  const globalCheck = AdopterMatch.checkGlobalDisqualifications(answers);
  if (globalCheck.isDisqualified) {
    openGlobalDisqualifiedModal();
  } else {
    // Rola até o catálogo
    const catalogoSec = document.getElementById("catalogo");
    if (catalogoSec) catalogoSec.scrollIntoView({ behavior: "smooth" });
  }
}

function openGlobalDisqualifiedModal() {
  const modal = document.getElementById("global-disqualified-modal");
  if (!modal || !activeQuiz) return;

  const globalCheck = AdopterMatch.checkGlobalDisqualifications(activeQuiz);
  const container = document.getElementById("global-disqualified-reasons");

  if (container) {
    container.innerHTML = globalCheck.reasons.map(r => `
      <div class="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
        <h4 class="text-xs font-black text-rose-900 flex items-center gap-1.5">
          <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600 flex-shrink-0"></i>
          ${r.titulo}
        </h4>
        <p class="text-xs text-rose-800 leading-relaxed">${r.descricao}</p>
      </div>
    `).join("");
  }

  modal.classList.remove("opacity-0", "pointer-events-none");
  modal.classList.add("opacity-100");
  modal.querySelector(".modal-content").classList.remove("scale-95");
  modal.querySelector(".modal-content").classList.add("scale-100");
  document.body.style.overflow = "hidden";

  if (window.lucide) {
    lucide.createIcons({ root: modal });
  }
}

function closeGlobalDisqualifiedModal() {
  const modal = document.getElementById("global-disqualified-modal");
  if (!modal) return;

  modal.classList.remove("opacity-100");
  modal.classList.add("opacity-0", "pointer-events-none");
  modal.querySelector(".modal-content").classList.remove("scale-100");
  modal.querySelector(".modal-content").classList.add("scale-95");
  document.body.style.overflow = "";
}

function clearQuizResults() {
  AdopterMatch.clearQuiz();
  activeQuiz = null;
  window.activeQuiz = null;
  updateQuizBannerUI();
  applyFilters();
}

function onWhatsAppClick(petId, petName, score = null, rank = null) {
  if (window.AdoteAnalytics) {
    AdoteAnalytics.trackWhatsAppClick(petId, petName, score, rank);
  }
}

// Expõe funções no escopo global
window.getActiveQuiz = () => activeQuiz;
window.openPetModalById = openPetModalById;
window.closePetModal = closePetModal;
window.setModalMainPhoto = setModalMainPhoto;
window.switchMediaTab = switchMediaTab;
window.renderVideoPlayer = renderVideoPlayer;
window.resetAllFilters = resetAllFilters;
window.applyFilters = applyFilters;
window.openQuizModal = openQuizModal;
window.closeQuizModal = closeQuizModal;
window.openGlobalDisqualifiedModal = openGlobalDisqualifiedModal;
window.closeGlobalDisqualifiedModal = closeGlobalDisqualifiedModal;
window.handleQuizSubmit = handleQuizSubmit;
window.clearQuizResults = clearQuizResults;
window.onWhatsAppClick = onWhatsAppClick;
window.stepCardPhoto = stepCardPhoto;
window.setCardPhoto = setCardPhoto;
window.switchMainTab = switchMainTab;
window.filterRifasEventosSubTab = filterRifasEventosSubTab;
window.renderOngsGrid = renderOngsGrid;
window.renderEventosGrid = renderEventosGrid;
window.filterRifas = filterRifas;
window.renderRifasGrid = renderRifasGrid;
window.contributeSimulatedRifa = contributeSimulatedRifa;
window.filterPetsByOng = filterPetsByOng;
window.clearOngFilter = clearOngFilter;
window.onContactTermsChange = onContactTermsChange;
window.handleContactWhatsApp = handleContactWhatsApp;
window.areAdoptionTermsAccepted = areAdoptionTermsAccepted;
window.copyPixKey = copyPixKey;
window.updatePortalBadges = updatePortalBadges;
window.getAdopterProfile = getAdopterProfile;
window.isAdopterIdentified = isAdopterIdentified;
window.saveAdopterProfile = saveAdopterProfile;
window.setAnonymousMode = setAnonymousMode;
window.updateUserSessionUI = updateUserSessionUI;
window.updateQuizUserBannerUI = updateQuizUserBannerUI;
window.openWelcomeAccessModal = openWelcomeAccessModal;
window.closeWelcomeAccessModal = closeWelcomeAccessModal;
window.chooseAccessMode = chooseAccessMode;
window.openAdopterLoginModal = openAdopterLoginModal;
window.closeAdopterLoginModal = closeAdopterLoginModal;
window.handleAdopterLoginSubmit = handleAdopterLoginSubmit;
window.applyPhoneMask = applyPhoneMask;
window.handleCardAdoptClick = handleCardAdoptClick;
window.setSpeciesFilter = setSpeciesFilter;
window.filterBlogPosts = filterBlogPosts;
window.renderBlogSection = renderBlogSection;
window.openBlogModal = openBlogModal;
window.closeBlogModal = closeBlogModal;

/* ==========================================================================
   NAVEGAÇÃO POR ABAS DO PORTAL (Encontrar Animais, Painéis ONGs, Blog Atualizado)
   ========================================================================== */

function switchMainTab(tabName) {
  let targetSubTab = null;
  if (tabName === 'eventos') {
    tabName = 'rifas-eventos';
    targetSubTab = 'eventos';
  } else if (tabName === 'rifas') {
    tabName = 'rifas-eventos';
    targetSubTab = 'rifas';
  }
  currentMainTab = tabName;

  // 1. Atualiza botões da navegação superior (3 opções: Encontrar Animais, Painéis ONGs, Blog Atualizado)
  const headerNavTabs = [
    { id: 'animais', btn: 'nav-btn-animais' },
    { id: 'ongs', btn: 'nav-btn-ongs' },
    { id: 'blog', btn: 'nav-btn-blog' }
  ];

  headerNavTabs.forEach(t => {
    const el = document.getElementById(t.btn);
    if (!el) return;
    const isActive = t.id === tabName;
    if (isActive) {
      el.className = "nav-tab-btn active px-4 py-2.5 rounded-full text-slate-950 font-black bg-[#D19864] border border-[#b87e4c] shadow-sm transition-all flex items-center gap-2 cursor-pointer";
    } else {
      el.className = "nav-tab-btn px-4 py-2.5 rounded-full text-slate-700 hover:text-[#004d50] hover:bg-[#F9F3EA] transition-all flex items-center gap-2 cursor-pointer";
    }
  });

  // 1.1 Atualiza botões da navegação exclusiva para celular
  const mobileNavTabs = [
    { id: 'animais', btn: 'mobile-nav-btn-animais' },
    { id: 'ongs', btn: 'mobile-nav-btn-ongs' },
    { id: 'blog', btn: 'mobile-nav-btn-blog' }
  ];

  mobileNavTabs.forEach(t => {
    const el = document.getElementById(t.btn);
    if (!el) return;
    const isActive = t.id === tabName;
    if (isActive) {
      el.className = "mobile-nav-btn active flex-1 py-1.5 px-2 rounded-xl text-xs font-black text-center bg-[#D19864] text-slate-950 border border-[#b87e4c] flex items-center justify-center gap-1 shadow-2xs transition-all";
    } else {
      el.className = "mobile-nav-btn flex-1 py-1.5 px-2 rounded-xl text-xs font-bold text-center text-slate-700 bg-white hover:bg-[#F9F3EA] border border-[#e8ddcf] flex items-center justify-center gap-1 transition-all";
    }
  });

  // 2. Atualiza botões do novo painel posicionado acima da barra de pesquisa (Animais, ONGs, Rifas ou Eventos)
  const portalSegmentTabs = [
    { id: 'animais', btn: 'portal-tab-animais', badge: 'panel-badge-pets', activeBadgeCls: 'bg-[#F9F3EA] text-slate-950 font-black', inactiveBadgeCls: 'bg-[#e6f4f5] text-[#006366] font-bold' },
    { id: 'ongs', btn: 'portal-tab-ongs', badge: 'panel-badge-ongs', activeBadgeCls: 'bg-[#F9F3EA] text-slate-950 font-black', inactiveBadgeCls: 'bg-[#e6f4f5] text-[#006366] font-bold' },
    { id: 'rifas-eventos', btn: 'portal-tab-rifas-eventos', badge: 'panel-badge-rifas-eventos', activeBadgeCls: 'bg-[#F9F3EA] text-slate-950 font-black', inactiveBadgeCls: 'bg-amber-100 text-amber-900 font-bold' }
  ];

  portalSegmentTabs.forEach(t => {
    const el = document.getElementById(t.btn);
    const badgeEl = document.getElementById(t.badge);
    if (!el) return;
    const isActive = t.id === tabName;
    if (isActive) {
      el.className = "portal-segment-tab active flex-auto sm:flex-1 inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-full text-[10.5px] sm:text-sm font-extrabold transition-all whitespace-nowrap bg-[#D19864] text-slate-950 border border-[#b87e4c] shadow-md shadow-[#D19864]/20 cursor-pointer";
      if (badgeEl) {
        badgeEl.className = `ml-0.5 sm:ml-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9.5px] sm:text-[11px] ${t.activeBadgeCls}`;
      }
    } else {
      el.className = "portal-segment-tab flex-auto sm:flex-1 inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-full text-[10.5px] sm:text-sm font-bold text-slate-600 hover:text-[#003e40] hover:bg-[#F9F3EA] transition-all whitespace-nowrap cursor-pointer";
      if (badgeEl) {
        badgeEl.className = `ml-0.5 sm:ml-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9.5px] sm:text-[11px] ${t.inactiveBadgeCls}`;
      }
    }
  });

  // 3. Alterna visibilidade dos containers de conteúdo
  const contentMap = {
    'animais': document.getElementById('tab-content-animais'),
    'ongs': document.getElementById('tab-content-ongs'),
    'blog': document.getElementById('tab-content-blog'),
    'rifas-eventos': document.getElementById('tab-content-rifas-eventos')
  };

  Object.entries(contentMap).forEach(([id, el]) => {
    if (el) {
      el.classList.toggle('hidden', id !== tabName);
    }
  });

  // 4. Alterna visibilidade da barra de pesquisa e filtros (ativa e visível na aba Animais)
  const heroSearchContainer = document.getElementById('hero-search-container');
  if (heroSearchContainer) {
    heroSearchContainer.classList.toggle('hidden', tabName !== 'animais');
  }

  // 5. Executa renderizadores específicos para cada seção
  if (tabName === 'ongs') {
    renderOngsGrid();
  } else if (tabName === 'blog') {
    renderBlogSection();
  } else if (tabName === 'rifas-eventos') {
    if (targetSubTab) {
      filterRifasEventosSubTab(targetSubTab);
    } else {
      filterRifasEventosSubTab('todos');
    }
    renderEventosGrid();
    renderRifasGrid(window.currentRifaFilter || 'todas');
  } else if (tabName === 'animais') {
    applyFilters();
  }

  updatePortalBadges();
  if (typeof lucide !== "undefined" && lucide.createIcons) {
    const activeEl = contentMap[tabName];
    if (activeEl) lucide.createIcons({ root: activeEl });
  }
}

/**
 * Leva o usuário ao topo e início absoluto do site (Aba Animais).
 * Acionado pela pata no layout central (Floating Bottom Dock).
 */
function scrollToSiteTop() {
  if (typeof switchMainTab === 'function') {
    switchMainTab('animais');
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
}

function filterRifasEventosSubTab(subTab) {
  const btnTodos = document.getElementById('subtab-re-todos');
  const btnEventos = document.getElementById('subtab-re-eventos');
  const btnRifas = document.getElementById('subtab-re-rifas');

  const contentEventos = document.getElementById('subcontent-eventos');
  const contentRifas = document.getElementById('subcontent-rifas');

  const buttons = [
    { id: 'todos', el: btnTodos },
    { id: 'eventos', el: btnEventos },
    { id: 'rifas', el: btnRifas }
  ];

  buttons.forEach(b => {
    if (!b.el) return;
    if (b.id === subTab) {
      b.el.className = "subtab-re-btn active px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-[#D19864] text-slate-950 font-black border border-[#b87e4c] shadow-2xs transition-all cursor-pointer";
    } else {
      b.el.className = "subtab-re-btn px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:text-[#004d50] hover:bg-[#F9F3EA] transition-all cursor-pointer";
    }
  });

  if (contentEventos) {
    contentEventos.classList.toggle('hidden', subTab === 'rifas');
  }
  if (contentRifas) {
    contentRifas.classList.toggle('hidden', subTab === 'eventos');
  }

  if (typeof lucide !== "undefined" && lucide.createIcons) {
    const reCont = document.getElementById('tab-content-rifas-eventos');
    if (reCont) lucide.createIcons({ root: reCont });
  }
}

async function updatePortalBadges() {
  const badgePets = document.getElementById("panel-badge-pets") || document.getElementById("badge-total-pets");
  const badgeOngs = document.getElementById("panel-badge-ongs") || document.getElementById("badge-total-ongs");
  const badgeRifasEventos = document.getElementById("panel-badge-rifas-eventos");
  const badgeEventos = document.getElementById("badge-total-eventos");
  const badgeRifas = document.getElementById("badge-total-rifas");

  if (badgePets) {
    const list = (window.currentAnimals && window.currentAnimals.length > 0) ? window.currentAnimals : (window.DEFAULT_ANIMALS || []);
    badgePets.textContent = list.length;
  }

  if (window.SolidarityStorage) {
    try {
      const ongs = await SolidarityStorage.getOngs();
      if (badgeOngs) badgeOngs.textContent = ongs.length;

      const totalAdotadosGeral = ongs.reduce((acc, curr) => acc + (curr.totalAdotadosCalc || curr.totalAdotados || 0), 0);
      const statTotalAdotados = document.getElementById("stat-ongs-total-adotados");
      if (statTotalAdotados) {
        statTotalAdotados.textContent = `${totalAdotadosGeral}+`;
      }

      const eventos = SolidarityStorage.getEventos() || [];
      if (badgeEventos) badgeEventos.textContent = `${eventos.length}`;
      const statEventosCount = document.getElementById("stat-eventos-count");
      if (statEventosCount) statEventosCount.textContent = eventos.length;

      const rifas = SolidarityStorage.getRifas() || [];
      if (badgeRifas) badgeRifas.textContent = `${rifas.length} ativas`;

      if (badgeRifasEventos) {
        const totalAcoes = eventos.length + rifas.length;
        badgeRifasEventos.innerHTML = `${totalAcoes}<span class="hidden sm:inline"> ações</span>`;
      }
    } catch (e) {
      console.warn("Erro ao atualizar contadores do portal:", e);
    }
  }
}

/* ==========================================================================
   BLOG ATUALIZADO (Histórias, Dicas de Saúde & Notícias)
   ========================================================================== */

function filterBlogPosts(category) {
  currentBlogCategory = category;

  const btnMap = {
    'todas': 'blog-filter-todas',
    'História de Adoção': 'blog-filter-historia',
    'Dicas & Saúde': 'blog-filter-dicas',
    'Notícias das ONGs': 'blog-filter-ongs'
  };

  Object.entries(btnMap).forEach(([cat, btnId]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const isActive = cat === category;
    if (isActive) {
      btn.className = "blog-filter-btn active px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-[#003e40] transition-all shadow-sm cursor-pointer";
    } else {
      btn.className = "blog-filter-btn px-3.5 py-2 rounded-xl text-xs font-bold text-[#F9F3EA] hover:text-white hover:bg-white transition-all cursor-pointer";
    }
  });

  renderBlogSection(category);
}

function renderBlogSection(category) {
  category = category || currentBlogCategory || "todas";
  const grid = document.getElementById("blog-grid");
  if (!grid) return;

  const posts = window.DEFAULT_BLOG_POSTS || [];
  let filtered = posts;

  if (category && category !== "todas") {
    filtered = posts.filter(p => (p.categoria && p.categoria.toLowerCase().includes(category.toLowerCase())) || (category.toLowerCase().includes(p.categoria?.toLowerCase() || '')));
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12 bg-white rounded-3xl border border-[#e8ddcf] p-8">
        <p class="text-slate-500 text-sm font-semibold">Nenhuma matéria encontrada para esta categoria.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(post => {
    return `
      <article class="bg-white rounded-3xl border border-[#e8ddcf] shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group hover:-translate-y-1">
        <!-- Imagem de Capa -->
        <div class="relative aspect-[16/10] overflow-hidden bg-slate-100">
          <img 
            src="${post.foto}" 
            alt="${post.titulo}" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          >
          <div class="absolute top-3.5 left-3.5">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide border shadow-2xs ${post.categoriaBadge || 'bg-[#F9F3EA] text-[#007E82] border-[#e8ddcf]'}">
              ${post.categoria}
            </span>
          </div>
        </div>

        <!-- Conteúdo do Card -->
        <div class="p-5 sm:p-6 flex flex-col flex-1 justify-between gap-4">
          <div class="space-y-2.5">
            <div class="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span class="flex items-center gap-1">
                <i data-lucide="calendar" class="w-3.5 h-3.5 text-[#007E82]"></i>
                ${post.data}
              </span>
              <span class="flex items-center gap-1">
                <i data-lucide="clock" class="w-3.5 h-3.5 text-slate-400"></i>
                ${post.tempoLeitura}
              </span>
            </div>

            <h3 class="font-brand text-lg font-black text-slate-900 group-hover:text-[#004d50] transition-colors leading-snug">
              ${post.titulo}
            </h3>

            <p class="text-xs text-slate-600 leading-relaxed line-clamp-3">
              ${post.resumo}
            </p>
          </div>

          <!-- Rodapé do Card: Autor e Ação -->
          <div class="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
            <span class="text-[11px] font-bold text-slate-500 truncate max-w-[55%]">
              ✍️ ${post.autor}
            </span>

            <button 
              type="button" 
              onclick="openBlogModal('${post.id}')" 
              class="px-3.5 py-1.5 rounded-xl bg-[#F9F3EA] hover:bg-gradient-to-r hover:from-[#007E82] hover:to-[#005c60] hover:text-white text-[#003e40] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs group-hover:bg-[#e6f4f5]"
            >
              <span>Ler Matéria</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  if (typeof lucide !== "undefined" && lucide.createIcons) {
    const blogGrid = document.getElementById("blog-grid");
    if (blogGrid) lucide.createIcons({ root: blogGrid });
  }
}

function openBlogModal(postId) {
  const posts = window.DEFAULT_BLOG_POSTS || [];
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  const modal = document.getElementById("blog-article-modal");
  if (!modal) return;

  const imgEl = document.getElementById("blog-modal-image");
  const catEl = document.getElementById("blog-modal-category");
  const dateEl = document.getElementById("blog-modal-date");
  const authorEl = document.getElementById("blog-modal-author");
  const readEl = document.getElementById("blog-modal-readtime");
  const titleEl = document.getElementById("blog-modal-title");
  const summaryEl = document.getElementById("blog-modal-summary");
  const bodyEl = document.getElementById("blog-modal-body");

  if (imgEl) {
    imgEl.src = post.foto;
    imgEl.alt = post.titulo;
  }
  if (catEl) catEl.textContent = post.categoria;
  if (dateEl) dateEl.textContent = post.data;
  if (authorEl) authorEl.textContent = post.autor;
  if (readEl) readEl.textContent = post.tempoLeitura;
  if (titleEl) titleEl.textContent = post.titulo;
  if (summaryEl) summaryEl.textContent = post.resumo;
  if (bodyEl) bodyEl.innerHTML = post.conteudo;

  modal.classList.remove("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-95");
    content.classList.add("scale-100");
  }

  if (typeof lucide !== "undefined" && lucide.createIcons) {
    lucide.createIcons({ root: modal });
  }
}

function closeBlogModal() {
  const modal = document.getElementById("blog-article-modal");
  if (!modal) return;
  modal.classList.add("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-100");
    content.classList.add("scale-95");
  }
}

/* ==========================================================================
   RENDERIZADORES: ONGs PARCEIRAS (Animais Adotados & Animais Disponíveis)
   ========================================================================== */

async function renderOngsGrid() {
  const container = document.getElementById("ongs-grid");
  if (!container) return;

  container.innerHTML = `<div class="py-12 text-center text-slate-500 font-bold">Carregando instituição parceira...</div>`;

  let ongs = [];
  try {
    ongs = await SolidarityStorage.getOngs();
  } catch (e) {
    ongs = window.DEFAULT_ONGS || [];
  }

  if (!ongs || ongs.length === 0) {
    container.innerHTML = `<div class="py-12 text-center text-slate-500 font-bold">Nenhuma ONG cadastrada no momento.</div>`;
    return;
  }

  // Define a ONG ativa (apenas UMA apresentada)
  if (!window.currentFeaturedOngId || !ongs.some(o => o.id === window.currentFeaturedOngId)) {
    window.currentFeaturedOngId = ongs[0].id;
  }

  const activeOng = ongs.find(o => o.id === window.currentFeaturedOngId) || ongs[0];
  const activeIdx = ongs.findIndex(o => o.id === activeOng.id);

  const totalAdotados = activeOng.totalAdotadosCalc || activeOng.totalAdotados || 0;
  const disponiveis = activeOng.animaisDisponiveis || activeOng.baseDisponiveis || 0;
  const coverPhoto = activeOng.foto || "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80";

  const historia = activeOng.historia || "A instituição atua incansavelmente na defesa e acolhimento de animais abandonados no Distrito Federal, garantindo reabilitação e lares responsáveis.";
  const fotosAbrigo = Array.isArray(activeOng.fotosAbrigo) && activeOng.fotosAbrigo.length > 0 
    ? activeOng.fotosAbrigo 
    : [
        "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?auto=format&fit=crop&w=800&q=80"
      ];
  const videosAbrigo = Array.isArray(activeOng.videosAbrigo) && activeOng.videosAbrigo.length > 0 
    ? activeOng.videosAbrigo 
    : [
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
      ];

  const html = `
    <!-- CARD PRINCIPAL DA ONG OFICIAL (INSTITUIÇÃO ÚNICA COM LAYOUT LATERALIZADO) -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 md:p-10 border-2 border-[#007E82] shadow-lg transition-all space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        <!-- Coluna de Apresentação & Texto Principal (7 colunas) -->
        <div class="lg:col-span-7 space-y-4">
          <!-- Badges Oficiais -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-[#F9F3EA] text-[#007E82] border border-[#e8ddcf] shadow-2xs">
              ${activeOng.sigla || 'PROANIMA'} • Fundada em ${activeOng.anoFundacao || '2003'} (23 Anos)
            </span>
            <span class="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs flex items-center gap-1.5">
              <i data-lucide="shield-check" class="w-4 h-4 text-emerald-700"></i>
              <span>ONG Oficial Verificada</span>
            </span>
            <span class="px-3 py-1 rounded-full text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 flex items-center gap-1">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-[#D19864]"></i>
              <span>${activeOng.cidade}</span>
            </span>
          </div>

          <!-- Título & Subtítulo -->
          <div>
            <h2 style="font-family: 'Fredoka', 'Nunito', sans-serif;" class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-950 leading-tight">
              ${activeOng.nome}
            </h2>
            <p class="text-sm sm:text-base font-black text-[#007E82] mt-1">
              Proteção Animal Integral, Acolhimento Ético &amp; Resgate Humanizado no DF
            </p>
          </div>

          <!-- Descrição Institucional Rica -->
          <p class="text-xs sm:text-sm md:text-base text-slate-800 leading-relaxed font-normal">
            ${activeOng.descricao || "Pioneira na proteção e bem-estar animal no Distrito Federal há mais de 23 anos. Atuamos com resgate ético, reabilitação veterinária completa, acolhimento em abrigo estruturado e intermediação de adoções conscientes em Brasília e regiões administrativas."}
          </p>

          <!-- Métricas Rápidas em Linha -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div class="p-3.5 rounded-2xl bg-[#F9F3EA] border border-[#e8ddcf] flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-teal-100 text-[#007E82] flex items-center justify-center font-black text-xl flex-shrink-0">
                ❤️
              </div>
              <div>
                <span class="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">Vidas Salvas</span>
                <span class="text-xl sm:text-2xl font-black text-teal-900 tracking-tight">${totalAdotados}</span>
              </div>
            </div>

            <div class="p-3.5 rounded-2xl bg-[#faeee3] border border-[#e8ddcf] flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-100 text-[#D19864] flex items-center justify-center font-black text-xl flex-shrink-0">
                🐾
              </div>
              <div>
                <span class="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">No Abrigo</span>
                <span class="text-xl sm:text-2xl font-black text-[#D19864] tracking-tight">${disponiveis}</span>
              </div>
            </div>

            <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xl flex-shrink-0">
                🏥
              </div>
              <div>
                <span class="text-[11px] font-bold text-emerald-800 block uppercase tracking-wider">Protocolo</span>
                <span class="text-xs sm:text-sm font-black text-emerald-950 block leading-tight">100% Castrados</span>
              </div>
            </div>
          </div>

          <!-- Barra de Ações Rápidas -->
          <div class="flex flex-wrap items-center gap-2.5 pt-2">
            <button 
              type="button" 
              onclick="switchMainTab('animais')" 
              class="flex-1 min-w-[180px] py-3 px-4 rounded-2xl bg-[#D19864] hover:bg-[#b87e4c] text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#b87e4c]"
            >
              <i data-lucide="paw-print" class="w-4 h-4"></i>
              <span>Ver Pets para Adoção (${disponiveis})</span>
            </button>

            <a 
              href="https://wa.me/${activeOng.whatsapp || '5561999998888'}?text=${encodeURIComponent('Olá! Encontrei a Associação ProAnima DF no MatchPet e gostaria de saber mais sobre as adoções!')}" 
              target="_blank" 
              class="btn-whatsapp-solid px-4 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              title="Falar no WhatsApp"
            >
              <i data-lucide="message-circle" class="w-4 h-4"></i>
              <span>WhatsApp</span>
            </a>

            ${activeOng.instagram ? `
              <a 
                href="https://instagram.com/${activeOng.instagram.replace('@', '')}" 
                target="_blank" 
                class="px-3.5 py-3 rounded-2xl bg-[#F9F3EA] hover:bg-[#faeee3] text-slate-950 font-black text-xs sm:text-sm border border-[#e8ddcf] transition-all flex items-center gap-1.5 cursor-pointer"
                title="Instagram da ONG"
              >
                <i data-lucide="instagram" class="w-4 h-4 text-[#007E82]"></i>
                <span>${activeOng.instagram}</span>
              </a>
            ` : ''}

            <!-- Botão Admin -->
            <button 
              type="button" 
              onclick="openModeratorOngEditModal('${activeOng.id}')" 
              class="px-3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Área do Moderador: Editar história, fotos e vídeos do abrigo"
            >
              <i data-lucide="edit-3" class="w-3.5 h-3.5 text-[#007E82]"></i>
              <span>Editar ONG (Admin)</span>
            </button>
          </div>

          <!-- Chave Pix Copiar -->
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 overflow-hidden">
              <span class="text-xs font-bold text-slate-500 uppercase tracking-wider flex-shrink-0">Chave Pix:</span>
              <code class="text-xs font-mono font-bold text-slate-900 truncate select-all">${activeOng.chavePix || 'contato@proanimadf.org.br'}</code>
            </div>
            <button 
              type="button" 
              onclick="copyPixKey('${activeOng.chavePix || 'contato@proanimadf.org.br'}', this)" 
              class="btn-pix-copy-solid px-3.5 py-1.5 rounded-lg font-black text-[11px] transition-colors flex-shrink-0 cursor-pointer"
              title="Copiar Chave Pix"
            >
              Copiar Chave
            </button>
          </div>
        </div>

        <!-- Coluna Lateral de Foto Reduzida e Lateralizada (5 colunas) -->
        <div class="lg:col-span-5 space-y-3">
          <div class="ong-hero-photo-container border-2 border-[#007E82] shadow-md group">
            <img 
              src="${coverPhoto}" 
              alt="${activeOng.nome}" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            >
            <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"></div>
            <div class="absolute bottom-3 left-3 right-3 text-white">
              <span class="px-2.5 py-1 rounded-lg bg-[#007E82] text-white text-[11px] font-black uppercase tracking-wider inline-block">
                Sede &amp; Abrigo ProAnima • DF
              </span>
              <p class="text-xs text-slate-200 mt-1 font-medium">Ambiente acolhedor com solários e suporte veterinário integral</p>
            </div>
          </div>

          <!-- 2 Miniaturas Laterais Compactas -->
          <div class="grid grid-cols-2 gap-3">
            <div class="ong-mini-photo-card border border-[#e8ddcf] shadow-2xs">
              <img src="${fotosAbrigo[0] || coverPhoto}" alt="Solário Canino" class="w-full h-full object-cover">
              <div class="absolute bottom-1 left-1.5 right-1.5 bg-black/60 rounded px-1.5 py-0.5 text-[10px] text-white font-bold truncate">
                Solário Canino
              </div>
            </div>
            <div class="ong-mini-photo-card border border-[#e8ddcf] shadow-2xs">
              <img src="${fotosAbrigo[1] || coverPhoto}" alt="Gatil Enriquecido" class="w-full h-full object-cover">
              <div class="absolute bottom-1 left-1.5 right-1.5 bg-black/60 rounded px-1.5 py-0.5 text-[10px] text-white font-bold truncate">
                Gatil Enriquecido
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- SEÇÃO 2: HISTÓRIA EXPANDIDA COM FOTOS LATERALIZADAS AO TEXTO -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 md:p-10 border-2 border-[#e8ddcf] shadow-md space-y-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8ddcf] pb-5">
        <div class="space-y-1">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e6f4f5] text-[#007E82] text-xs font-black uppercase tracking-wider">
            <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
            <span>Nossa Trajetória &amp; Propósito</span>
          </div>
          <h3 style="font-family: 'Fredoka', 'Nunito', sans-serif;" class="text-2xl sm:text-3xl font-extrabold text-slate-950">
            A História da ${activeOng.nome}
          </h3>
          <p class="text-xs sm:text-sm text-slate-600">
            Conheça os 23 anos de atuação ininterrupta na proteção, resgate ético e acolhimento de animais no Distrito Federal.
          </p>
        </div>
        
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500 font-bold bg-[#F9F3EA] px-3 py-1.5 rounded-xl border border-[#e8ddcf]">
            ✍️ Conteúdo Institucional Oficial
          </span>
          <button 
            type="button" 
            onclick="openModeratorOngEditModal('${activeOng.id}')" 
            class="px-3 py-1.5 rounded-xl bg-[#D19864] hover:bg-[#b87e4c] text-slate-950 font-black text-xs transition-all flex items-center gap-1 cursor-pointer"
            title="Atualizar texto da história"
          >
            <i data-lucide="edit-2" class="w-3 h-3"></i>
            <span>Editar História</span>
          </button>
        </div>
      </div>

      <!-- GRID PRINCIPAL COM TEXTO EXPANDIDO E FOTOS LATERALIZADAS -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Coluna de Texto Expandido da História (7 colunas) -->
        <div class="lg:col-span-7 space-y-5 text-sm sm:text-base text-slate-800 leading-relaxed font-normal">
          ${historia.split('\n\n').map((paragrafo, idx) => `
            <div class="p-4 sm:p-5 rounded-2xl bg-[#F9F3EA]/60 border border-[#e8ddcf] hover:bg-[#F9F3EA] transition-colors">
              <div class="flex items-start gap-3">
                <div class="w-7 h-7 rounded-full bg-[#007E82] text-white flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5">
                  ${idx + 1}
                </div>
                <p class="leading-relaxed text-slate-900 font-normal">
                  ${paragrafo}
                </p>
              </div>
            </div>
          `).join("")}

          <!-- Compromisso e Apoio -->
          <div class="p-4 rounded-2xl bg-[#e6f4f5] border border-[#b2dedf] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-800">
            <span class="flex items-center gap-2 font-bold">
              <i data-lucide="heart" class="w-4 h-4 text-[#D19864] flex-shrink-0"></i>
              <span>Adoção é um ato de amor e compromisso para toda a vida. Visitas mediante agendamento prévio.</span>
            </span>
            <button 
              type="button" 
              onclick="openModeratorOngEditModal('${activeOng.id}')" 
              class="text-xs font-black text-[#007E82] hover:underline flex items-center gap-1 cursor-pointer flex-shrink-0"
            >
              <i data-lucide="edit-2" class="w-3 h-3"></i>
              <span>Atualizar dados</span>
            </button>
          </div>
        </div>

        <!-- Coluna Lateral de Fotos Reduzidas & Lateralizadas ao Texto (5 colunas) -->
        <div class="lg:col-span-5 space-y-4">
          <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#007E82]">
            <i data-lucide="camera" class="w-3.5 h-3.5"></i>
            <span>Momentos do Abrigo &amp; Resgates</span>
          </div>

          <!-- Mini Galeria Lateralizada de Fotos Compactas -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
            ${fotosAbrigo.slice(0, 4).map((f, i) => {
              const legendas = [
                "Solário & Recreação Canina no DF",
                "Gatil Vertical Protegido & Enriquecido",
                "Atendimento Clínico & Triagem Veterinária",
                "Socialização & Afeto Diário aos Resgatados"
              ];
              const legenda = legendas[i] || `Instalação ProAnima #${i+1}`;
              return `
                <div class="group relative rounded-2xl overflow-hidden ong-lateral-story-photo bg-slate-100 border-2 border-[#e8ddcf] shadow-xs hover:shadow-md transition-all">
                  <img src="${f}" alt="${legenda}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3">
                    <span class="text-xs text-white font-bold flex items-center gap-1.5">
                      <i data-lucide="image" class="w-3.5 h-3.5 text-[#D19864] flex-shrink-0"></i>
                      <span class="truncate">${legenda}</span>
                    </span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>

          <!-- Card Solidário de Apoio Lateral -->
          <div class="p-4 rounded-2xl bg-[#faeee3] border border-[#e8ddcf] space-y-2">
            <span class="text-xs font-black text-amber-950 uppercase tracking-wider block flex items-center gap-1.5">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-[#D19864]"></i>
              <span>Como Apoiar a ProAnima</span>
            </span>
            <p class="text-xs text-slate-700 leading-relaxed">
              Nossa instituição é mantida 100% por doações de pessoas como você. Qualquer valor contribui com remédios, vacinas e ração especial.
            </p>
            <div class="pt-1 flex items-center justify-between gap-2">
              <code class="text-[11px] font-mono font-black text-slate-900 truncate">${activeOng.chavePix || 'contato@proanimadf.org.br'}</code>
              <button 
                type="button" 
                onclick="copyPixKey('${activeOng.chavePix || 'contato@proanimadf.org.br'}', this)" 
                class="btn-pix-copy-solid px-3 py-1.5 rounded-lg font-black text-[11px] transition-colors cursor-pointer"
              >
                Copiar Pix
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- SEÇÃO 3: FOTOS E VÍDEOS DAS INSTALAÇÕES DO ABRIGO -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 md:p-10 border-2 border-[#e8ddcf] shadow-md space-y-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8ddcf] pb-4">
        <div class="space-y-1">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e6f4f5] text-[#007E82] text-xs font-black uppercase tracking-wider">
            <i data-lucide="camera" class="w-3.5 h-3.5"></i>
            <span>Instalações &amp; Bem-Estar</span>
          </div>
          <h3 style="font-family: 'Fredoka', 'Nunito', sans-serif;" class="text-2xl sm:text-3xl font-extrabold text-slate-950">
            Conheça Nosso Abrigo: Fotos &amp; Vídeos
          </h3>
          <p class="text-xs sm:text-sm text-slate-600">
            Espaços higienizados, solários amplos e atendimento veterinário com muito afeto aos animais resgatados no DF.
          </p>
        </div>

        <button 
          type="button" 
          onclick="openModeratorOngEditModal('${activeOng.id}')" 
          class="px-4 py-2.5 rounded-xl bg-[#D19864] hover:bg-[#b87e4c] text-slate-950 font-black text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto border border-[#b87e4c]"
        >
          <i data-lucide="edit-3" class="w-4 h-4"></i>
          <span>Editar Fotos &amp; Vídeos (Admin)</span>
        </button>
      </div>

      <!-- Galeria de Fotos do Abrigo (Tamanho Controlado e Compacto) -->
      <div class="space-y-3">
        <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#007E82]">
          <span>📸</span>
          <span>Instalações, Áreas de Solário e Enfermaria</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${fotosAbrigo.map((f, i) => `
            <div class="group relative rounded-2xl overflow-hidden ong-facility-card bg-slate-100 border-2 border-[#e8ddcf] shadow-xs hover:shadow-md transition-all">
              <img src="${f}" alt="Instalações do Abrigo ${i+1}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
              <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-3.5">
                <span class="text-xs text-white font-bold flex items-center gap-1.5">
                  <i data-lucide="eye" class="w-3.5 h-3.5 text-[#D19864]"></i>
                  <span>Instalação do Abrigo #${i+1}</span>
                </span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Galeria de Vídeos do Abrigo -->
      ${videosAbrigo.length > 0 ? `
        <div class="space-y-3 pt-6 border-t border-[#e8ddcf]">
          <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#D19864]">
            <span>🎥</span>
            <span>Vídeos da Rotina, Resgates &amp; Reabilitação no Abrigo</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${videosAbrigo.map((v, i) => `
              <div class="bg-[#F9F3EA] rounded-3xl p-4 sm:p-5 border-2 border-[#e8ddcf] shadow-sm space-y-3">
                <div class="relative rounded-2xl overflow-hidden aspect-video bg-black shadow-xs">
                  <video controls preload="metadata" class="w-full h-full object-cover">
                    <source src="${v}" type="video/mp4">
                    Seu navegador não suporta vídeos.
                  </video>
                </div>
                <div class="flex items-center justify-between text-xs text-slate-800 font-bold">
                  <span class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-[#007E82] animate-pulse"></span>
                    <span>Momento do Abrigo #${i+1}</span>
                  </span>
                  <span class="text-[11px] text-slate-500 font-normal">Vídeo gravado no abrigo</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons({ root: container });
}

window.selectFeaturedOng = function(ongId) {
  window.currentFeaturedOngId = ongId;
  renderOngsGrid();
};

window.nextFeaturedOng = async function() {
  let ongs = [];
  try {
    ongs = await SolidarityStorage.getOngs();
  } catch(e) {
    ongs = window.DEFAULT_ONGS || [];
  }
  if (!ongs || ongs.length === 0) return;
  const currIdx = ongs.findIndex(o => o.id === window.currentFeaturedOngId);
  const nextIdx = (currIdx + 1) % ongs.length;
  window.currentFeaturedOngId = ongs[nextIdx].id;
  renderOngsGrid();
};

window.prevFeaturedOng = async function() {
  let ongs = [];
  try {
    ongs = await SolidarityStorage.getOngs();
  } catch(e) {
    ongs = window.DEFAULT_ONGS || [];
  }
  if (!ongs || ongs.length === 0) return;
  const currIdx = ongs.findIndex(o => o.id === window.currentFeaturedOngId);
  const prevIdx = (currIdx - 1 + ongs.length) % ongs.length;
  window.currentFeaturedOngId = ongs[prevIdx].id;
  renderOngsGrid();
};

window.openModeratorOngEditModal = async function(ongId) {
  let ongs = [];
  try {
    ongs = await SolidarityStorage.getOngs();
  } catch(e) {
    ongs = window.DEFAULT_ONGS || [];
  }
  const targetId = ongId || window.currentFeaturedOngId || (ongs[0] ? ongs[0].id : null);
  const ong = ongs.find(o => o.id === targetId) || ongs[0];
  if (!ong) return;

  const modal = document.getElementById("moderator-ong-edit-modal");
  if (!modal) return;

  const idInput = document.getElementById("mod-ong-id");
  if (idInput) idInput.value = ong.id;

  const titleEl = document.getElementById("mod-ong-modal-title");
  if (titleEl) titleEl.textContent = `Editar História, Fotos & Vídeos - ${ong.nome}`;

  const histInput = document.getElementById("mod-ong-historia");
  if (histInput) histInput.value = ong.historia || "";

  window.currentEditingShelterPhotos = Array.isArray(ong.fotosAbrigo) 
    ? [...ong.fotosAbrigo] 
    : [];

  window.currentEditingShelterVideos = Array.isArray(ong.videosAbrigo) 
    ? [...ong.videosAbrigo] 
    : [];
  
  renderModeratorShelterPhotosFields();
  renderModeratorShelterVideosFields();

  modal.classList.remove("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-95");
    content.classList.add("scale-100");
  }
  if (window.lucide) lucide.createIcons({ root: modal });
};

window.closeModeratorOngEditModal = function() {
  const modal = document.getElementById("moderator-ong-edit-modal");
  if (!modal) return;
  modal.classList.add("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.add("scale-95");
    content.classList.remove("scale-100");
  }
};

window.renderModeratorShelterPhotosFields = function() {
  const container = document.getElementById("mod-shelter-photos-container");
  if (!container) return;

  if (!window.currentEditingShelterPhotos || window.currentEditingShelterPhotos.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 bg-white rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500 font-bold">
        Nenhuma foto do abrigo adicionada ainda. Clique em "+ Adicionar Foto" acima.
      </div>
    `;
    return;
  }

  container.innerHTML = window.currentEditingShelterPhotos.map((url, idx) => `
    <div class="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
      <div class="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
        <img src="${url}" alt="Foto ${idx+1}" class="w-full h-full object-cover" onerror="this.src='img/matchpet-icon.png'">
      </div>
      <input 
        type="url" 
        value="${url}" 
        placeholder="https://images.unsplash.com/..." 
        onchange="window.currentEditingShelterPhotos[${idx}] = this.value; renderModeratorShelterPhotosFields();" 
        class="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#007E82] outline-none"
      >
      <button 
        type="button" 
        onclick="removeModeratorShelterPhotoField(${idx})" 
        class="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
        title="Remover esta foto"
      >
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `).join("");

  if (window.lucide) lucide.createIcons({ root: container });
};

window.addModeratorShelterPhotoField = function() {
  if (!window.currentEditingShelterPhotos) window.currentEditingShelterPhotos = [];
  window.currentEditingShelterPhotos.push("https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=800&q=80");
  renderModeratorShelterPhotosFields();
};

window.removeModeratorShelterPhotoField = function(idx) {
  if (!window.currentEditingShelterPhotos) return;
  window.currentEditingShelterPhotos.splice(idx, 1);
  renderModeratorShelterPhotosFields();
};

window.renderModeratorShelterVideosFields = function() {
  const container = document.getElementById("mod-shelter-videos-container");
  if (!container) return;

  if (!window.currentEditingShelterVideos || window.currentEditingShelterVideos.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 bg-white rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500 font-bold">
        Nenhum vídeo do abrigo adicionado ainda. Clique em "+ Adicionar Vídeo" acima.
      </div>
    `;
    return;
  }

  container.innerHTML = window.currentEditingShelterVideos.map((url, idx) => `
    <div class="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
      <div class="w-10 h-10 rounded-lg bg-[#faeee3] text-[#D19864] flex items-center justify-center font-bold flex-shrink-0 border border-[#e8ddcf]">
        🎥
      </div>
      <input 
        type="url" 
        value="${url}" 
        placeholder="https://...mp4" 
        onchange="window.currentEditingShelterVideos[${idx}] = this.value; renderModeratorShelterVideosFields();" 
        class="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#007E82] outline-none"
      >
      <button 
        type="button" 
        onclick="removeModeratorShelterVideoField(${idx})" 
        class="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
        title="Remover este vídeo"
      >
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `).join("");

  if (window.lucide) lucide.createIcons({ root: container });
};

window.addModeratorShelterVideoField = function() {
  if (!window.currentEditingShelterVideos) window.currentEditingShelterVideos = [];
  window.currentEditingShelterVideos.push("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
  renderModeratorShelterVideosFields();
};

window.removeModeratorShelterVideoField = function(idx) {
  if (!window.currentEditingShelterVideos) return;
  window.currentEditingShelterVideos.splice(idx, 1);
  renderModeratorShelterVideosFields();
};

window.renderModeratorTeamFields = function() {};
window.addModeratorTeamMemberField = function() {};
window.removeModeratorTeamMemberField = function() {};

window.saveModeratorOngData = async function(e) {
  if (e) e.preventDefault();
  const ongId = document.getElementById("mod-ong-id").value;
  const historia = document.getElementById("mod-ong-historia").value.trim();

  let ongs = [];
  try {
    ongs = await SolidarityStorage.getOngs();
  } catch(err) {
    ongs = window.DEFAULT_ONGS || [];
  }
  const ong = ongs.find(o => o.id === ongId) || ongs[0];
  if (!ong) return;

  ong.historia = historia;
  ong.fotosAbrigo = (window.currentEditingShelterPhotos || []).filter(u => u && u.trim().length > 0);
  ong.videosAbrigo = (window.currentEditingShelterVideos || []).filter(u => u && u.trim().length > 0);
  delete ong.equipeLinhaFrente;

  await SolidarityStorage.saveOng(ong);
  closeModeratorOngEditModal();
  
  // Re-render
  window.currentFeaturedOngId = ong.id;
  await renderOngsGrid();

  if (typeof showFeedbackToast === "function") {
    showFeedbackToast("História, fotos e vídeos da ONG atualizados pelo Moderador com sucesso! 🐾");
  }
};

/* ==========================================================================
   RENDERIZADORES: FEIRINHAS DE ADOÇÃO (Eventos Presenciais)
   ========================================================================== */

function renderEventosGrid() {
  const container = document.getElementById("eventos-grid");
  if (!container) return;

  const eventos = SolidarityStorage.getEventos();

  if (!eventos || eventos.length === 0) {
    container.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400">Nenhuma feirinha agendada no momento.</div>`;
    return;
  }

  const EVENTO_PALETTES = [
    {
      themeName: 'teal',
      borderTop: 'border-t-4 border-t-[#007E82]',
      tagBg: 'bg-[#007E82] text-white',
      tagText: '🎪 Grande Feira Central',
      dateBorder: 'border-[#007E82]',
      dateIconBg: 'bg-[#007E82] text-white',
      dateBlockBg: 'bg-[#e6f4f5]',
      dateBlockBorder: 'border-[#007E82]',
      dateLabelColor: 'text-[#005c60]',
      clockColor: 'text-[#007E82]',
      btnBg: 'bg-[#007E82] hover:bg-[#00686c] text-white',
      iconColor: 'text-[#007E82]'
    },
    {
      themeName: 'caramelo',
      borderTop: 'border-t-4 border-t-[#D19864]',
      tagBg: 'bg-[#D19864] text-slate-950 font-black',
      tagText: '🐾 Abrace um Amigo',
      dateBorder: 'border-[#D19864]',
      dateIconBg: 'bg-[#D19864] text-slate-950',
      dateBlockBg: 'bg-[#fdf5eb]',
      dateBlockBorder: 'border-[#D19864]',
      dateLabelColor: 'text-[#965c28]',
      clockColor: 'text-[#965c28]',
      btnBg: 'bg-[#D19864] hover:bg-[#b87e4c] text-slate-950 font-black',
      iconColor: 'text-[#D19864]'
    },
    {
      themeName: 'terracota',
      borderTop: 'border-t-4 border-t-[#C8553D]',
      tagBg: 'bg-[#C8553D] text-white font-black',
      tagText: '❤️ Feira & Conscientização',
      dateBorder: 'border-[#C8553D]',
      dateIconBg: 'bg-[#C8553D] text-white',
      dateBlockBg: 'bg-[#fdf1ee]',
      dateBlockBorder: 'border-[#C8553D]',
      dateLabelColor: 'text-[#8c311c]',
      clockColor: 'text-[#8c311c]',
      btnBg: 'bg-[#C8553D] hover:bg-[#b04530] text-white font-black',
      iconColor: 'text-[#C8553D]'
    }
  ];

  const html = eventos.map((evento, idx) => {
    const pal = EVENTO_PALETTES[idx % EVENTO_PALETTES.length];
    const coverPhoto = evento.foto || "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=800&q=80";
    const petsPills = (evento.animaisPresentes || []).map(nomePet => `
      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white text-slate-800 font-bold text-xs border border-slate-200 shadow-2xs">
        🐾 ${nomePet}
      </span>
    `).join("");

    return `
      <div class="bg-white rounded-3xl overflow-hidden border border-slate-200/90 ${pal.borderTop} shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
        <div>
          <!-- Capa com Badge da Data com Fundo Sólido e Alto Contraste -->
          <div class="relative h-48 overflow-hidden bg-slate-900 select-none">
            <img 
              src="${coverPhoto}" 
              alt="${evento.titulo}" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onerror="this.src='https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=800&q=80'"
            >
            <div class="absolute top-3 left-3 z-10">
              <span class="px-3 py-1 rounded-xl text-xs font-black ${pal.tagBg} shadow-md flex items-center gap-1.5 border border-white/30">
                ${pal.tagText}
              </span>
            </div>
            <div class="absolute bottom-3 left-3 z-10">
              <span class="px-3 py-1.5 rounded-xl text-xs font-black bg-white text-slate-950 shadow-lg flex items-center gap-2 border-2 ${pal.dateBorder}">
                <span class="p-1 rounded-lg ${pal.dateIconBg} flex items-center justify-center shadow-2xs">
                  <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                </span>
                <span class="tracking-tight">${evento.dataExtenso}</span>
              </span>
            </div>
            <div class="absolute bottom-3 right-3 z-10">
              <span class="px-3 py-1.5 rounded-xl text-xs font-black bg-white text-slate-950 shadow-lg border-2 border-slate-200 flex items-center gap-1.5">
                <i data-lucide="clock" class="w-3.5 h-3.5 ${pal.clockColor}"></i>
                <span>${evento.horario}</span>
              </span>
            </div>
          </div>

          <!-- Corpo do Evento (Fundo Branco Sólido com Texto Preto Nítido) -->
          <div class="p-5 space-y-3.5">
            <div>
              <h3 style="font-family: 'Fredoka', 'Nunito', sans-serif;" class="text-xl font-black text-slate-950 leading-snug">
                ${evento.titulo}
              </h3>
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F9F3EA] text-slate-900 text-xs font-black border border-[#e8ddcf] mt-1.5">
                <i data-lucide="building-2" class="w-3.5 h-3.5 ${pal.iconColor}"></i>
                <span>Realização: ${evento.ongNome}</span>
              </div>
            </div>

            <!-- Bloco de Destaque da Data do Evento com Cores Variadas da Paleta -->
            <div class="p-3 ${pal.dateBlockBg} rounded-2xl border-2 ${pal.dateBlockBorder} flex items-center justify-between gap-2 shadow-2xs">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-xl ${pal.dateIconBg} flex items-center justify-center flex-shrink-0 shadow-xs">
                  <i data-lucide="calendar-check-2" class="w-4 h-4"></i>
                </div>
                <div class="min-w-0">
                  <span class="text-[10px] font-black uppercase tracking-wider ${pal.dateLabelColor} block">Data do Evento</span>
                  <span class="text-xs font-black text-slate-950 block truncate">${evento.dataExtenso}</span>
                </div>
              </div>
              <div class="px-2.5 py-1 rounded-lg bg-white border ${pal.dateBlockBorder}/30 text-xs font-black ${pal.clockColor} shadow-2xs flex items-center gap-1 flex-shrink-0">
                <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                <span>${evento.horario}</span>
              </div>
            </div>
            
            <!-- Local e Endereço -->
            <div class="space-y-1 p-3.5 rounded-2xl bg-[#F9F3EA] border border-[#e8ddcf]">
              <div class="text-xs font-black text-slate-950 flex items-center gap-1.5">
                <i data-lucide="map-pin" class="w-4 h-4 text-[#D19864] flex-shrink-0"></i>
                <span>${evento.local}</span>
              </div>
              <div class="text-[11px] text-slate-700 font-semibold pl-5">
                ${evento.endereco}
              </div>
            </div>

            <!-- Descrição -->
            <p class="text-xs text-slate-700 font-medium leading-relaxed">
              ${evento.descricao}
            </p>

            <!-- Peludinhos Confirmados -->
            ${evento.animaisPresentes && evento.animaisPresentes.length > 0 ? `
              <div class="p-3 bg-[#F9F3EA] rounded-2xl border border-[#e8ddcf] space-y-1.5">
                <span class="text-[10px] font-black uppercase tracking-wider text-slate-900 block flex items-center gap-1">
                  <i data-lucide="heart" class="w-3 h-3 fill-[#007E82] text-[#007E82]"></i> Alguns Peludinhos Confirmados
                </span>
                <div class="flex flex-wrap gap-1.5">
                  ${petsPills}
                </div>
              </div>
            ` : ''}

          </div>
        </div>

        <!-- Rodapé do Card: Ações com Cor Temática do Evento -->
        <div class="p-5 pt-0 flex items-center gap-2">
          <a 
            href="${evento.linkMaps}" 
            target="_blank" 
            class="flex-1 py-2.5 px-3 ${pal.btnBg} text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.01]"
          >
            <i data-lucide="map" class="w-4 h-4"></i>
            <span>Ver no Google Maps</span>
          </a>

          <a 
            href="https://wa.me/?text=${encodeURIComponent('🐾 Convite Especial! Vamos na ' + evento.titulo + '? Acontece ' + evento.dataExtenso + ' (' + evento.horario + ') no ' + evento.local + '. Veja no Maps: ' + evento.linkMaps)}" 
            target="_blank" 
            class="p-2.5 rounded-xl bg-[#F9F3EA] hover:bg-teal-100 text-[#007E82] border border-[#e8ddcf] transition-all flex items-center justify-center cursor-pointer"
            title="Convidar Amigos no WhatsApp"
          >
            <i data-lucide="share-2" class="w-4 h-4"></i>
          </a>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons({ root: container });
}

/* ==========================================================================
   RENDERIZADORES: RIFAS SOLIDÁRIAS & ARRECADAÇÃO DE RAÇÃO
   ========================================================================== */

function filterRifas(type) {
  currentRifaFilter = type;
  
  const buttons = [
    { id: 'btn-rifa-filter-todas', type: 'todas' },
    { id: 'btn-rifa-filter-dinheiro', type: 'dinheiro' },
    { id: 'btn-rifa-filter-racao', type: 'racao' }
  ];

  buttons.forEach(b => {
    const btn = document.getElementById(b.id);
    if (!btn) return;
    if (b.type === type) {
      btn.className = "rifa-filter-btn active px-3.5 py-2 rounded-xl text-xs font-bold bg-[#D19864] text-slate-950 font-black transition-all shadow-xs border border-[#b87e4c]";
    } else {
      btn.className = "rifa-filter-btn px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all";
    }
  });

  renderRifasGrid(type);
}

function renderRifasGrid(filterType = 'todas') {
  const container = document.getElementById("rifas-grid");
  if (!container) return;

  let rifas = SolidarityStorage.getRifas();
  if (filterType !== 'todas') {
    rifas = rifas.filter(r => r.tipo === filterType);
  }

  if (!rifas || rifas.length === 0) {
    container.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400">Nenhuma campanha encontrada nesta categoria.</div>`;
    return;
  }

  const RIFA_PALETTES = [
    {
      themeName: 'caramelo',
      borderTop: 'border-t-4 border-t-[#D19864]',
      tagBg: 'bg-[#D19864] text-slate-950 font-black',
      dateBorder: 'border-[#D19864]',
      dateIconBg: 'bg-[#D19864] text-slate-950',
      dateBlockBg: 'bg-[#fdf5eb]',
      dateBlockBorder: 'border-[#D19864]',
      dateLabelColor: 'text-[#965c28]',
      progressFill: 'bg-[#D19864]',
      percentTextColor: 'text-[#965c28]',
      supportBadge: 'bg-[#fdf5eb] text-slate-950 border border-[#D19864]/40',
      pixBorder: 'border-[#D19864]',
      ongColor: 'text-[#965c28]',
      detailIcon: 'text-[#D19864]',
      detailLabel: 'text-[#965c28]'
    },
    {
      themeName: 'teal',
      borderTop: 'border-t-4 border-t-[#007E82]',
      tagBg: 'bg-[#007E82] text-white font-black',
      dateBorder: 'border-[#007E82]',
      dateIconBg: 'bg-[#007E82] text-white',
      dateBlockBg: 'bg-[#e6f4f5]',
      dateBlockBorder: 'border-[#007E82]',
      dateLabelColor: 'text-[#005c60]',
      progressFill: 'bg-[#007E82]',
      percentTextColor: 'text-[#007E82]',
      supportBadge: 'bg-[#e6f4f5] text-[#005c60] border border-[#007E82]/30',
      pixBorder: 'border-[#007E82]',
      ongColor: 'text-[#007E82]',
      detailIcon: 'text-[#007E82]',
      detailLabel: 'text-[#005c60]'
    },
    {
      themeName: 'dourado',
      borderTop: 'border-t-4 border-t-[#E6A020]',
      tagBg: 'bg-[#E6A020] text-slate-950 font-black',
      dateBorder: 'border-[#E6A020]',
      dateIconBg: 'bg-[#E6A020] text-slate-950',
      dateBlockBg: 'bg-[#fef9ed]',
      dateBlockBorder: 'border-[#E6A020]',
      dateLabelColor: 'text-[#784906]',
      progressFill: 'bg-[#E6A020]',
      percentTextColor: 'text-[#784906]',
      supportBadge: 'bg-[#fef9ed] text-slate-950 border border-[#E6A020]/40',
      pixBorder: 'border-[#E6A020]',
      ongColor: 'text-[#784906]',
      detailIcon: 'text-[#E6A020]',
      detailLabel: 'text-[#784906]'
    }
  ];

  const html = rifas.map((rifa, idx) => {
    const pal = RIFA_PALETTES[idx % RIFA_PALETTES.length];
    const isMoney = rifa.tipo === 'dinheiro';
    const percent = Math.min(100, Math.round(((rifa.arrecadado || 0) / (rifa.meta || 1)) * 100));
    const coverPhoto = rifa.foto || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80";

    return `
      <div class="bg-white rounded-3xl overflow-hidden border border-slate-200/90 ${pal.borderTop} shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
        <div>
          <!-- Capa com Badge de Tipo e Badge da Data do Sorteio -->
          <div class="relative h-48 overflow-hidden bg-slate-900 select-none">
            <img 
              src="${coverPhoto}" 
              alt="${rifa.titulo}" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80'"
            >
            <div class="absolute top-3.5 left-3.5 z-10">
              <span class="px-3.5 py-1.5 rounded-xl text-xs font-black ${pal.tagBg} shadow-lg flex items-center gap-1.5 border border-white/40">
                ${isMoney ? (rifa.id === 'rifa-003' ? '✨ Rifa do Bem / Filhotes' : '🎟️ Rifa Beneficente') : '🥣 Campanha de Ração'}
              </span>
            </div>
            <div class="absolute bottom-3 left-3 z-10">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-white text-slate-950 shadow-lg border-2 ${pal.dateBorder}">
                <span class="p-1 rounded-lg ${pal.dateIconBg} flex items-center justify-center shadow-2xs">
                  <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                </span>
                <span class="tracking-tight">${isMoney ? 'Sorteio: ' : 'Vigência: '}${rifa.dataSorteio}</span>
              </span>
            </div>
            <div class="absolute bottom-3 right-3 z-10">
              <span class="px-3 py-1.5 rounded-xl text-xs font-black bg-white text-slate-950 shadow-lg border-2 border-slate-200">
                ${percent}% da meta
              </span>
            </div>
          </div>

          <!-- Conteúdo da Campanha (Fundo Branco com Letras Nítidas) -->
          <div class="p-5 space-y-4">
            <div>
              <span class="text-xs ${pal.ongColor} font-black block mb-0.5">${rifa.ongNome}</span>
              <h3 style="font-family: 'Fredoka', 'Nunito', sans-serif;" class="text-lg font-black text-slate-950 leading-snug">
                ${rifa.titulo}
              </h3>
            </div>

            <!-- Bloco de Destaque da Data do Sorteio / Vigência com Cores Variadas -->
            <div class="p-3 ${pal.dateBlockBg} rounded-2xl border-2 ${pal.dateBlockBorder} flex items-center justify-between gap-2 shadow-2xs">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-xl ${pal.dateIconBg} flex items-center justify-center flex-shrink-0 shadow-xs">
                  <i data-lucide="calendar-heart" class="w-4 h-4"></i>
                </div>
                <div class="min-w-0">
                  <span class="text-[10px] font-black uppercase tracking-wider ${pal.dateLabelColor} block">${isMoney ? 'Data Prevista do Sorteio' : 'Prazo da Campanha'}</span>
                  <span class="text-xs font-black text-slate-950 block truncate">${rifa.dataSorteio}</span>
                </div>
              </div>
              <div class="px-2.5 py-1 rounded-lg bg-white border ${pal.dateBlockBorder}/40 text-[11px] font-black text-slate-900 shadow-2xs flex items-center gap-1 flex-shrink-0">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 ${pal.detailIcon}"></i>
                <span>${isMoney ? 'Bilhetes limitados' : '100% Solidário'}</span>
              </div>
            </div>
            
            <!-- Barra de Progresso da Meta com Cor Temática -->
            <div class="space-y-2 p-3.5 bg-[#F9F3EA] rounded-2xl border border-[#e8ddcf]">
              <div class="flex items-center justify-between text-xs">
                <span class="font-black text-slate-950">
                  ${isMoney ? `R$ ${rifa.arrecadado.toLocaleString('pt-BR')} arrecadados` : `${rifa.arrecadado.toLocaleString('pt-BR')} kg arrecadados`}
                </span>
                <span class="font-black ${pal.percentTextColor}">
                  ${percent}% da meta
                </span>
              </div>

              <!-- Barra de preenchimento -->
              <div class="w-full bg-white h-3 rounded-full overflow-hidden border border-[#e8ddcf]">
                <div 
                  class="h-full rounded-full transition-all duration-700 ${pal.progressFill}" 
                  style="width: ${percent}%"
                ></div>
              </div>

              <div class="flex items-center justify-between text-[11px] text-slate-700 font-bold pt-0.5">
                <span>Meta: ${isMoney ? `R$ ${rifa.meta.toLocaleString('pt-BR')}` : `${rifa.meta.toLocaleString('pt-BR')} kg`}</span>
                <span>${isMoney ? `${rifa.bilhetesVendidos || 0} de ${rifa.totalBilhetes || 0} bilhetes` : `Faltam ${(rifa.meta - rifa.arrecadado)} kg`}</span>
              </div>
            </div>

            <!-- Descrição -->
            <p class="text-xs text-slate-700 font-medium leading-relaxed italic">
              "${rifa.descricao}"
            </p>

            <!-- Detalhes Específicos (Prêmio / Coleta) -->
            <div class="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs text-slate-900 space-y-1.5 shadow-2xs">
              ${isMoney ? `
                <div class="font-black flex items-center gap-1.5 ${pal.detailLabel}">
                  <i data-lucide="award" class="w-4 h-4 ${pal.detailIcon}"></i>
                  <span>Prêmio do Sorteio:</span>
                </div>
                <p class="text-[11.5px] text-slate-800 font-semibold leading-relaxed">${rifa.premio}</p>
                <div class="pt-1 flex items-center gap-2">
                  <span class="px-2.5 py-1 rounded-lg ${pal.dateBlockBg} text-slate-950 font-black text-xs border ${pal.dateBlockBorder}/30">
                    Valor do Bilhete: R$ ${rifa.valorBilhete},00
                  </span>
                </div>
              ` : `
                <div class="font-black flex items-center gap-1.5 ${pal.detailLabel}">
                  <i data-lucide="package-check" class="w-4 h-4 ${pal.detailIcon}"></i>
                  <span>Ponto de Entrega de Ração:</span>
                </div>
                <p class="text-[11.5px] text-slate-800 font-semibold leading-relaxed">${rifa.pontoColeta || 'Entrega na sede da ONG'}</p>
                <div class="pt-1 flex items-center gap-2">
                  <span class="px-2.5 py-1 rounded-lg ${pal.dateBlockBg} text-slate-950 font-black text-xs border ${pal.dateBlockBorder}/30">
                    Cota de 1 saco (15kg): R$ ${rifa.precoSaco15kg || 85},00
                  </span>
                </div>
              `}
            </div>

            <!-- Chave Pix com Copiar em 1 Clique -->
            <div class="p-3.5 bg-[#F9F3EA] rounded-2xl border-2 ${pal.pixBorder} flex items-center justify-between gap-2 shadow-2xs">
              <div class="truncate">
                <span class="text-[10.5px] font-black text-slate-800 uppercase block tracking-wider">Chave Pix Oficial ProAnima</span>
                <code class="text-xs font-mono font-black text-slate-950 truncate block select-all">${rifa.chavePix || 'contato@proanimadf.org.br'}</code>
              </div>
              <button 
                type="button" 
                onclick="copyPixKey('${rifa.chavePix || 'contato@proanimadf.org.br'}', this)" 
                class="px-3 py-1.5 rounded-xl bg-[#007E82] hover:bg-[#00686c] text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all flex-shrink-0 cursor-pointer"
                title="Copiar Chave Pix"
              >
                <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copiar
              </button>
            </div>

          </div>
        </div>

        <!-- Rodapé do Card: Ações Interativas -->
        <div class="p-5 pt-0 space-y-2">
          <div class="flex items-center gap-2">
            <!-- Botão de Simulação Interativa de Apoio/Compra -->
            <button 
              type="button"
              onclick="contributeSimulatedRifa('${rifa.id}', ${isMoney ? (rifa.valorBilhete || 15) : 15})" 
              class="flex-1 py-2.5 px-3 ${isMoney ? 'bg-amber-600 hover:bg-amber-700' : 'bg-teal-600 hover:bg-teal-700'} text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.01]"
              title="${isMoney ? 'Simular compra de bilhete' : 'Simular doação de ração'}"
            >
              <i data-lucide="${isMoney ? 'ticket' : 'plus-circle'}" class="w-4 h-4"></i>
              <span>${isMoney ? `Simular Compra (+R$ ${rifa.valorBilhete || 15})` : `Simular Doação (+15 kg)`}</span>
            </button>

            <!-- Link WhatsApp para Enviar Comprovante -->
            <a 
              href="https://wa.me/${rifa.whatsapp}?text=${encodeURIComponent('Olá! Acabei de fazer um Pix para a campanha ' + rifa.titulo + ' da ' + rifa.ongNome + ' e gostaria de enviar o comprovante!')}" 
              target="_blank" 
              class="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-all flex items-center justify-center"
              title="Enviar Comprovante de Apoio no WhatsApp"
            >
              <i data-lucide="message-circle" class="w-4 h-4"></i>
            </a>
          </div>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons({ root: container });
}

function contributeSimulatedRifa(rifaId, amount) {
  if (!window.SolidarityStorage) return;
  const updated = SolidarityStorage.contributeRifa(rifaId, amount);
  if (updated) {
    renderRifasGrid(currentRifaFilter);
    updatePortalBadges();
    alert(`🎉 Muito obrigado! Seu apoio simulado (${updated.tipo === 'dinheiro' ? `+R$ ${amount}` : `+${amount} kg`}) foi registrado na campanha "${updated.titulo}"!`);
  }
}

/* ==========================================================================
   FILTRO DE ANIMAIS POR ONG & UTILITÁRIOS
   ========================================================================== */

function filterPetsByOng(ongId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  activeOngFilter = ongId;
  switchMainTab('animais');

  const catalogEl = document.getElementById("catalogo");
  if (catalogEl) {
    catalogEl.scrollIntoView({ behavior: "smooth" });
  }
}

function clearOngFilter() {
  activeOngFilter = null;
  applyFilters();
}

function copyPixKey(pixKey, btnEl) {
  if (!pixKey) return;
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(pixKey).then(() => {
      showCopiedFeedback(btnEl);
    }).catch(() => {
      fallbackCopy(pixKey, btnEl);
    });
  } else {
    fallbackCopy(pixKey, btnEl);
  }
}

function fallbackCopy(text, btnEl) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand("copy");
    showCopiedFeedback(btnEl);
  } catch (e) {
    console.error("Falha ao copiar:", e);
  }
  document.body.removeChild(textArea);
}

function showCopiedFeedback(btnEl) {
  if (!btnEl) return;
  const originalHtml = btnEl.innerHTML;
  btnEl.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i> Copiado!`;
  btnEl.classList.add("bg-teal-600");
  if (window.lucide) lucide.createIcons({ root: btnEl });
  
  setTimeout(() => {
    btnEl.innerHTML = originalHtml;
    btnEl.classList.remove("bg-teal-600");
    if (window.lucide) lucide.createIcons({ root: btnEl });
  }, 2000);
}

/* ==========================================================================
   EXPORTAÇÕES GLOBAIS WINDOW
   ========================================================================== */
window.openAdoptionCommitmentModal = openAdoptionCommitmentModal;
window.closeAdoptionCommitmentModal = closeAdoptionCommitmentModal;
window.confirmAdoptionCommitment = confirmAdoptionCommitment;
window.handlePetModalAdoptClick = handlePetModalAdoptClick;
window.handleCardAdoptClick = handleCardAdoptClick;
window.handlePetAdoptClick = handlePetAdoptClick;
window.proceedToOngContact = proceedToOngContact;
window.openAdopterLoginModal = openAdopterLoginModal;
window.closeAdopterLoginModal = closeAdopterLoginModal;
window.handleAdopterLoginSubmit = handleAdopterLoginSubmit;
window.chooseAccessMode = chooseAccessMode;
window.openWelcomeAccessModal = openWelcomeAccessModal;
window.closeWelcomeAccessModal = closeWelcomeAccessModal;
window.setAnonymousMode = setAnonymousMode;
window.applyPhoneMask = applyPhoneMask;
window.showToast = showToast;
window.openAdoptionProcessModal = openAdoptionProcessModal;
window.openAdoptionProcessForActivePet = openAdoptionProcessForActivePet;
window.closeAdoptionProcessModal = closeAdoptionProcessModal;
window.setAdoptionStep = setAdoptionStep;
window.goToAdoptionStep = goToAdoptionStep;
window.submitAdoptionProcess = submitAdoptionProcess;
window.openAdopterDashboardModal = openAdopterDashboardModal;
window.closeAdopterDashboardModal = closeAdopterDashboardModal;
window.renderAdopterDashboardUI = renderAdopterDashboardUI;
window.toggleFavoritePet = toggleFavoritePet;
window.toggleActivePetFavorite = toggleActivePetFavorite;
window.getFavoritesList = getFavoritesList;
window.openPetModalById = openPetModalById;
window.closePetModal = closePetModal;
window.setModalMainPhoto = setModalMainPhoto;

/* ==========================================================================
   BARRA DE ATIVIDADE AO VIVO & DICA DO TUTOR (DESIGN VIVO E ATRAENTE)
   ========================================================================== */

function initLiveActivityTicker() {
  const tickerEl = document.getElementById("live-activity-ticker-content");
  if (!tickerEl || window.__tickerInitialized) return;
  window.__tickerInitialized = true;

  const tickerMessages = [
    "🐾 <strong>Luna</strong> (Gatinha dócil) foi adotada com sucesso em Águas Claras há 15 minutos! Parabéns à nova família! 🎉",
    "🐶 <strong>Rex</strong> (Cão jovem, 1 ano) acabou de ser cadastrado para adoção pela Associação ProAnima DF! ❤️",
    "🎯 <strong>4 novos adotantes</strong> realizaram o Teste de Compatibilidade na última hora no DF!",
    "🥣 <strong>140 kg de ração</strong> arrecadados na Campanha Solidária de Ceilândia!",
    "🐱 <strong>Mingau</strong> encontrou um lar seguro e telado no Plano Piloto hoje! Parabéns! 🏠",
    "✨ <strong>Thor</strong> concluiu sua recuperação veterinária e está 100% pronto para adoção amorosa!"
  ];

  let currentTickerIdx = 0;
  if (window.__tickerInterval) clearInterval(window.__tickerInterval);
  window.__tickerInterval = setInterval(() => {
    currentTickerIdx = (currentTickerIdx + 1) % tickerMessages.length;
    tickerEl.style.opacity = '0';
    setTimeout(() => {
      tickerEl.innerHTML = tickerMessages[currentTickerIdx];
      requestAnimationFrame(() => {
        tickerEl.style.opacity = '1';
      });
    }, 250);
  }, 7000);
}

const CONSCIOUS_TUTOR_TIPS = [
  "Nos primeiros 15 dias de adoção (fase de adaptação), mantenha a rotina calma, evite visitas barulhentas e permita que o pet explore seu novo espaço no próprio ritmo.",
  "Gatos necessitam de enriquecimento vertical (prateleiras, arranhadores) e telas de proteção em 100% das janelas para garantir uma vida longa e sem acidentes.",
  "Passeios diários com cães não são apenas para necessidades físicas, mas principalmente para estimulação mental e farejamento de novos aromas.",
  "Mantenha a carteirinha de vacinação e o vermífugo rigorosamente em dia para prevenir zoonoses e garantir a longevidade do seu companheiro.",
  "A castração previne fugas, brigas territoriais e reduz a quase zero o risco de tumores de mama e próstata em cães e gatos."
];
let currentTipIdx = 0;

function initDailyTip() {
  const tipEl = document.getElementById("daily-tip-text");
  if (!tipEl) return;
  tipEl.textContent = `"${CONSCIOUS_TUTOR_TIPS[0]}"`;
}

function rotateDailyTip() {
  currentTipIdx = (currentTipIdx + 1) % CONSCIOUS_TUTOR_TIPS.length;
  const tipEl = document.getElementById("daily-tip-text");
  if (tipEl) {
    tipEl.style.opacity = '0';
    setTimeout(() => {
      tipEl.textContent = `"${CONSCIOUS_TUTOR_TIPS[currentTipIdx]}"`;
      tipEl.style.opacity = '1';
    }, 200);
  }
}

function setSamplePhoto(type) {
  const input = document.getElementById("new-pet-foto");
  if (!input) return;
  const samples = {
    dog: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1000&q=80",
    cat: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1000&q=80",
    puppy: "https://images.unsplash.com/photo-1591160690555-5debfba289f0?auto=format&fit=crop&w=1000&q=80"
  };
  input.value = samples[type] || samples.dog;
}

/* ==========================================================================
   GESTÃO DE ANIMAIS DAS ONGS (ADICIONAR E REMOVER)
   ========================================================================== */

let currentManagingOngId = "todas";

async function openOngManagementModal(ongId = null) {
  const modal = document.getElementById("ong-management-modal");
  if (!modal) return;

  const filterSelect = document.getElementById("ong-management-filter");
  if (filterSelect && window.SolidarityStorage) {
    const ongs = await SolidarityStorage.getOngs();
    filterSelect.innerHTML = `<option value="todas">Todas as ONGs Parceiras</option>` +
      ongs.map(o => `<option value="${o.id}">${o.nome}</option>`).join("");
    if (ongId) {
      filterSelect.value = ongId;
      currentManagingOngId = ongId;
    } else {
      currentManagingOngId = filterSelect.value || "todas";
    }
  }

  updateOngManagementGuidelinesStatus(currentManagingOngId);
  await renderOngPetsList(currentManagingOngId);

  modal.classList.remove("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-95");
    content.classList.add("scale-100");
  }
  if (window.lucide) lucide.createIcons({ root: modal });
}

function closeOngManagementModal() {
  const modal = document.getElementById("ong-management-modal");
  if (!modal) return;
  modal.classList.add("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-100");
    content.classList.add("scale-95");
  }
}

async function filterOngPetsList(ongId) {
  currentManagingOngId = ongId;
  updateOngManagementGuidelinesStatus(ongId);
  await renderOngPetsList(ongId);
}

async function renderOngPetsList(ongId = "todas") {
  const container = document.getElementById("ong-pets-list");
  const summaryEl = document.getElementById("ong-pets-count-summary");
  if (!container) return;

  const allPets = (window.currentAnimals && window.currentAnimals.length > 0) 
    ? window.currentAnimals 
    : await PetStorage.getAll();

  let filtered = allPets;
  if (ongId && ongId !== "todas") {
    filtered = allPets.filter(p => p.ongId === ongId || (p.ongNome && p.ongNome.toLowerCase().includes(ongId.toLowerCase())));
  }

  if (summaryEl) {
    summaryEl.textContent = `Total: ${filtered.length} animal(is) cadastrado(s) na visualização.`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6">
        <div class="text-3xl mb-2">🐾</div>
        <p class="text-xs sm:text-sm font-bold text-slate-700">Nenhum animal cadastrado para esta ONG ainda.</p>
        <p class="text-[11px] text-slate-500 mt-1">Clique no botão acima para cadastrar o primeiro pet!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(pet => {
    const isAdopted = pet.status === "adotado" || pet.adotado;
    const photoUrl = Array.isArray(pet.fotos) && pet.fotos[0] 
      ? (typeof pet.fotos[0] === 'string' ? pet.fotos[0] : (pet.fotos[0].url || '')) 
      : 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80';

    return `
      <div class="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-[#007E82] transition-colors">
        <div class="flex items-center gap-3">
          <img src="${photoUrl}" alt="${pet.nome}" class="w-14 h-14 rounded-xl object-cover bg-slate-100 flex-shrink-0">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="text-sm font-black text-slate-900 leading-tight">${pet.nome}</h4>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${isAdopted ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
                ${isAdopted ? 'Adotado ✓' : 'Disponível 🟢'}
              </span>
            </div>
            <p class="text-[11px] text-slate-500 font-medium mt-0.5">
              ${pet.especie === 'cachorro' ? '🐶 Cão' : (pet.especie === 'gato' ? '🐱 Gato' : '🐰 Pet')} • ${pet.porte || 'Médio'} • ${pet.idade || 'Idade n/d'} • ${pet.ongNome || 'ONG'}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          <button 
            type="button" 
            onclick="handleOngToggleAdopted('${pet.id}')" 
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isAdopted ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'} cursor-pointer"
            title="${isAdopted ? 'Reativar como Disponível' : 'Marcar como Adotado'}"
          >
            ${isAdopted ? '🟢 Reativar' : '🎉 Marcar Adotado'}
          </button>
          <button 
            type="button" 
            onclick="handleOngDeletePet('${pet.id}', '${pet.nome}')" 
            class="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
            title="Remover animal do catálogo"
          >
            <i data-lucide="trash-2" class="w-3.5 h-3.5 text-rose-600"></i>
            <span>Remover</span>
          </button>
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons({ root: container });
}

async function handleOngToggleAdopted(petId) {
  const allPets = await PetStorage.getAll();
  const pet = allPets.find(p => String(p.id) === String(petId));
  if (!pet) return;

  const willBeAdopted = !(pet.status === "adotado" || pet.adotado);
  pet.status = willBeAdopted ? "adotado" : "disponivel";
  pet.adotado = willBeAdopted;

  await PetStorage.save(pet);
  currentAnimals = await PetStorage.getAll();
  window.currentAnimals = currentAnimals;

  applyFilters();
  await renderOngPetsList(currentManagingOngId);
  updatePortalBadges();

  showToast(willBeAdopted ? `🎉 Parabéns! ${pet.nome} marcado como adotado!` : `🟢 ${pet.nome} reativado como disponível!`);
}

async function handleOngDeletePet(petId, petNome) {
  const confirmDel = confirm(`Tem certeza que deseja remover o animal "${petNome}" do catálogo da plataforma? Esta ação não pode ser desfeita.`);
  if (!confirmDel) return;

  await PetStorage.delete(petId);
  currentAnimals = await PetStorage.getAll();
  window.currentAnimals = currentAnimals;

  applyFilters();
  await renderOngPetsList(currentManagingOngId);
  updatePortalBadges();

  showToast(`🗑️ ${petNome} foi removido do catálogo com sucesso.`);
}

/* ==========================================================================
   CADASTRO DE NOVA ONG COM ASSINATURA OBRIGATÓRIA DE DIRETRIZES & IMAGEM
   ========================================================================== */

function setSampleOngLogo(type) {
  const input = document.getElementById("reg-ong-foto");
  if (!input) return;
  const logos = {
    rescue: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80",
    cat: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80",
    general: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80"
  };
  input.value = logos[type] || logos.rescue;
}

function syncRegisterSignatureHint(val) {
  const sigInput = document.getElementById("reg-signature");
  if (sigInput && !sigInput.value) {
    sigInput.placeholder = val ? `Digite "${val}" para assinar` : "Digite exatamente seu Nome Completo como assinatura digital";
  }
}

function openOngRegisterModal() {
  const modal = document.getElementById("ong-register-modal");
  if (!modal) return;

  const form = document.getElementById("ong-register-form");
  if (form) form.reset();

  const errBox = document.getElementById("ong-register-error-msg");
  if (errBox) errBox.classList.add("hidden");

  setSampleOngLogo("rescue");

  modal.classList.remove("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-95");
    content.classList.add("scale-100");
  }
  if (window.lucide) lucide.createIcons({ root: modal });
}

function closeOngRegisterModal() {
  const modal = document.getElementById("ong-register-modal");
  if (!modal) return;
  modal.classList.add("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-100");
    content.classList.add("scale-95");
  }
}

async function handleOngRegisterSubmit(event) {
  if (event) event.preventDefault();

  const errBox = document.getElementById("ong-register-error-msg");
  const errText = document.getElementById("ong-register-error-text");

  function showError(msg) {
    if (errBox && errText) {
      errText.textContent = msg;
      errBox.classList.remove("hidden");
      errBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  // 1. Dados da Instituição
  const nome = document.getElementById("reg-ong-nome")?.value?.trim();
  const sigla = document.getElementById("reg-ong-sigla")?.value?.trim();
  const cnpj = document.getElementById("reg-ong-cnpj")?.value?.trim();
  const regiao = document.getElementById("reg-ong-regiao")?.value || "Brasília / Plano Piloto";
  const whatsapp = document.getElementById("reg-ong-whatsapp")?.value?.trim();
  const instagram = document.getElementById("reg-ong-instagram")?.value?.trim();
  const chavePix = document.getElementById("reg-ong-chave-pix")?.value?.trim();
  const foto = document.getElementById("reg-ong-foto")?.value?.trim() || "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80";
  const descricao = document.getElementById("reg-ong-descricao")?.value?.trim();

  // 2. Dados do Representante Legal e Diretrizes
  const repNome = document.getElementById("reg-rep-nome")?.value?.trim();
  const repCargo = document.getElementById("reg-rep-cargo")?.value?.trim();
  const repCpf = document.getElementById("reg-rep-cpf")?.value?.trim();
  const repEmail = document.getElementById("reg-rep-email")?.value?.trim();
  const repTelefone = document.getElementById("reg-rep-telefone")?.value?.trim();

  const checkImagens = document.getElementById("reg-check-imagens")?.checked;
  const checkDados = document.getElementById("reg-check-dados")?.checked;
  const checkVeracidade = document.getElementById("reg-check-veracidade")?.checked;
  const checkIndependencia = document.getElementById("reg-check-independencia")?.checked;
  const signature = document.getElementById("reg-signature")?.value?.trim();

  // Validações
  if (!nome || nome.length < 3) {
    showError("Por favor, informe o nome oficial da ONG / Instituto (mínimo 3 letras).");
    return;
  }
  if (!sigla || sigla.length < 2) {
    showError("Por favor, informe a sigla ou nome curto da instituição.");
    return;
  }
  const cleanCnpj = (cnpj || "").replace(/\D/g, "");
  if (cleanCnpj.length < 11) {
    showError("Por favor, informe um CNPJ válido da ONG ou CPF do protetor responsável.");
    return;
  }
  const cleanWhats = (whatsapp || "").replace(/\D/g, "");
  if (cleanWhats.length < 10) {
    showError("Por favor, informe um WhatsApp institucional válido com DDD.");
    return;
  }
  if (!descricao || descricao.length < 10) {
    showError("Por favor, descreva brevemente a atuação e história de resgates da entidade.");
    return;
  }

  // Validações do Representante e Diretrizes
  if (!repNome || repNome.length < 3) {
    showError("Por favor, informe o nome completo do representante legal da ONG.");
    return;
  }
  if (!repCargo || repCargo.length < 2) {
    showError("Por favor, informe o cargo ou função na entidade (ex: Presidente, Coordenador(a)).");
    return;
  }
  const cleanCpf = (repCpf || "").replace(/\D/g, "");
  if (cleanCpf.length !== 11) {
    showError("Por favor, informe um CPF válido com 11 dígitos do representante legal.");
    return;
  }
  if (!repEmail || !repEmail.includes("@")) {
    showError("Por favor, informe um e-mail institucional oficial válido.");
    return;
  }
  const cleanRepTel = (repTelefone || "").replace(/\D/g, "");
  if (cleanRepTel.length < 10) {
    showError("Por favor, informe o telefone celular do representante com DDD.");
    return;
  }

  if (!checkImagens || !checkDados || !checkVeracidade || !checkIndependencia) {
    showError("É obrigatório concordar com as 4 declarações legais de cessão de imagem e diretrizes para concluir o cadastro.");
    return;
  }

  if (!signature || signature.toLowerCase() !== repNome.toLowerCase()) {
    showError(`A assinatura digital deve corresponder exatamente ao nome completo do representante legal ("${repNome}").`);
    return;
  }

  if (errBox) errBox.classList.add("hidden");

  const newOngId = "ong-" + Date.now();

  const newOng = {
    id: newOngId,
    nome: nome,
    sigla: sigla.toUpperCase(),
    cidade: `${regiao} - DF`,
    regiao: regiao,
    anoFundacao: new Date().getFullYear(),
    foto: foto,
    descricao: descricao,
    chavePix: chavePix || "",
    whatsapp: cleanWhats.startsWith("55") ? cleanWhats : `55${cleanWhats}`,
    instagram: instagram ? (instagram.startsWith("@") ? instagram : `@${instagram}`) : "",
    totalAdotados: 0,
    baseDisponiveis: 0,
    cnpj: cnpj
  };

  // 1. Salvar ONG no SolidarityStorage
  await SolidarityStorage.saveOng(newOng);

  // 2. Salvar Contrato Oficial de Diretrizes & Cessão de Imagem no NgoContractStorage
  const contractRecord = {
    ongId: newOngId,
    ongNome: nome,
    ongCnpj: cnpj,
    representanteNome: repNome,
    representanteCpf: repCpf,
    representanteCargo: repCargo,
    representanteEmail: repEmail,
    representanteTelefone: repTelefone,
    termosAceitos: {
      cessaoImagens: true,
      fornecimentoDados: true,
      veracidadeSanitaria: true,
      independenciaPolitica: true
    },
    assinaturaPorExtenso: signature
  };

  const savedContract = NgoContractStorage.saveContract(contractRecord);

  // 3. Fechar modal de cadastro
  closeOngRegisterModal();

  // 4. Atualizar grid de ONGs
  await renderOngsGrid();

  // 5. Toast comemorativo de sucesso
  showToast(`🎉 Instituição "${nome}" cadastrada com sucesso e Diretrizes assinadas! (Protocolo: ${savedContract.protocolo}). Agora você já pode adicionar animais!`);

  // 6. Abrir automaticamente o modal para cadastrar o primeiro pet da nova ONG
  setTimeout(() => {
    openOngAddPetModal(newOngId);
  }, 400);
}

/* ==========================================================================
   CADASTRO E GESTÃO DE ANIMAIS DAS ONGS
   ========================================================================== */

async function openOngAddPetModal(preferredOngId = null) {
  const modal = document.getElementById("ong-add-pet-modal");
  if (!modal) return;

  const selectOng = document.getElementById("new-pet-ong");
  if (selectOng && window.SolidarityStorage) {
    const ongs = await SolidarityStorage.getOngs();
    const optionsHtml = ongs.map(o => `<option value="${o.id}" data-nome="${o.nome}" data-cidade="${o.cidade}" data-whats="${o.whatsapp}">${o.nome} (${o.cidade})</option>`).join("");
    selectOng.innerHTML = optionsHtml + `<option value="__new__" class="font-bold text-orange-600">➕ Cadastrar Nova Instituição...</option>`;
    
    if (preferredOngId && preferredOngId !== "todas") {
      selectOng.value = preferredOngId;
    } else if (currentManagingOngId && currentManagingOngId !== "todas") {
      selectOng.value = currentManagingOngId;
    }
  }

  const activeOngId = selectOng ? selectOng.value : "ong-001";
  updateOngGuidelinesStatusInAddModal(activeOngId);

  setSamplePhoto('dog');

  modal.classList.remove("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-95");
    content.classList.add("scale-100");
  }
  if (window.lucide) lucide.createIcons({ root: modal });
}

function closeOngAddPetModal() {
  const modal = document.getElementById("ong-add-pet-modal");
  if (!modal) return;
  modal.classList.add("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-100");
    content.classList.add("scale-95");
  }
}

function onNewPetOngChange(ongId) {
  if (ongId === "__new__") {
    openOngRegisterModal();
    const selectOng = document.getElementById("new-pet-ong");
    if (selectOng && selectOng.options.length > 1) {
      selectOng.selectedIndex = 0;
      updateOngGuidelinesStatusInAddModal(selectOng.value);
    }
    return;
  }
  updateOngGuidelinesStatusInAddModal(ongId);
}

function updateOngGuidelinesStatusInAddModal(ongId) {
  const container = document.getElementById("add-pet-guidelines-status-box");
  if (!container) return;
  if (!ongId || ongId === "__new__") {
    const sel = document.getElementById("new-pet-ong");
    ongId = sel ? sel.value : "ong-001";
  }

  const isSigned = window.NgoContractStorage && NgoContractStorage.isContractSigned(ongId);
  const contract = isSigned ? NgoContractStorage.getContractByOngId(ongId) : null;

  const submitBtn = document.getElementById("btn-submit-ong-add-pet");
  const submitText = document.getElementById("btn-submit-ong-add-pet-text");
  const submitIcon = document.getElementById("btn-submit-ong-add-pet-icon");

  if (isSigned && contract) {
    container.innerHTML = `
      <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs mb-1">
        <div class="flex items-center gap-2 text-emerald-900 font-semibold">
          <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600 flex-shrink-0"></i>
          <div>
            <div class="font-black text-[12px] text-emerald-950 flex items-center gap-1.5 flex-wrap">
              <span>Diretrizes de Imagem &amp; Logo Assinadas</span>
              <span class="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded font-mono font-bold">${contract.protocolo}</span>
            </div>
            <p class="text-[11px] text-emerald-800">Signatário(a): ${contract.representanteNome} (${contract.representanteCargo || 'Representante Legal'})</p>
          </div>
        </div>
        <button type="button" onclick="openNgoGuidelinesViewModal('${ongId}')" class="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-2xs flex items-center gap-1 flex-shrink-0 cursor-pointer">
          <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
          <span>Ver Termo</span>
        </button>
      </div>
    `;
    const check = document.getElementById("new-pet-diretrizes-check");
    if (check) check.checked = true;

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.className = "px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-black shadow-md transition-all flex items-center gap-2 cursor-pointer";
    }
    if (submitText) submitText.textContent = "Salvar e Publicar Animal";
    if (submitIcon) submitIcon.setAttribute("data-lucide", "check");
  } else {
    container.innerHTML = `
      <div class="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs mb-1">
        <div class="flex items-start gap-2.5 text-rose-950">
          <i data-lucide="shield-alert" class="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5"></i>
          <div>
            <div class="font-black text-[12.5px] text-rose-950 flex items-center gap-1.5">
              <span>⚠️ Bloqueado: Diretrizes &amp; Direitos de Imagem Pendentes</span>
            </div>
            <p class="text-[11.5px] text-rose-800 leading-snug mt-0.5">
              Por exigência da <strong>Lei Federal nº 9.610/98</strong> e <strong>LGPD</strong>, a instituição precisa assinar o termo de cessão de imagem e diretrizes antes de poder adicionar animais à plataforma.
            </p>
          </div>
        </div>
        <button type="button" onclick="openNgoGuidelinesModal('${ongId}', true)" class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-sm flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer">
          <i data-lucide="file-signature" class="w-4 h-4"></i>
          <span>Assinar Agora para Liberar</span>
        </button>
      </div>
    `;
    const check = document.getElementById("new-pet-diretrizes-check");
    if (check) check.checked = false;

    if (submitBtn) {
      submitBtn.className = "px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-black shadow-md transition-all flex items-center gap-2 cursor-pointer";
    }
    if (submitText) submitText.textContent = "⚠️ Assinar Diretrizes p/ Cadastrar";
    if (submitIcon) submitIcon.setAttribute("data-lucide", "file-signature");
  }
  if (window.lucide) lucide.createIcons({ root: container });
  if (submitBtn && window.lucide) lucide.createIcons({ root: submitBtn });
}

function updateOngManagementGuidelinesStatus(ongId) {
  const btn = document.getElementById("ong-mgmt-guidelines-btn");
  const statusSpan = document.getElementById("ong-mgmt-guidelines-status");
  if (!btn || !statusSpan) return;

  if (!ongId || ongId === "todas") {
    btn.className = "px-3.5 py-2 rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer";
    statusSpan.textContent = "Diretrizes de Imagem";
    return;
  }

  const isSigned = window.NgoContractStorage && NgoContractStorage.isContractSigned(ongId);
  if (isSigned) {
    btn.className = "px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer";
    statusSpan.textContent = "Diretrizes: Assinadas ✓";
  } else {
    btn.className = "px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer";
    statusSpan.textContent = "Diretrizes: Pendente ⚠️";
  }
}

async function handleOngAddPetSubmit(event) {
  event.preventDefault();

  const selectOng = document.getElementById("new-pet-ong");
  const selectedOption = selectOng ? selectOng.options[selectOng.selectedIndex] : null;
  const ongId = selectOng ? selectOng.value : "ong-001";
  const ongNome = selectedOption ? selectedOption.getAttribute("data-nome") : "ONG Parceira";
  const ongWhatsapp = selectedOption ? selectedOption.getAttribute("data-whats") : "5561999998888";


  const diretrizesChecked = document.getElementById("new-pet-diretrizes-check")?.checked;
  if (!diretrizesChecked) {
    showToast("⚠️ Por favor, confirme a declaração de autorização de imagens e diretrizes institucionais.");
    return;
  }

  const nome = document.getElementById("new-pet-nome")?.value?.trim();
  const especie = document.getElementById("new-pet-especie")?.value || "cachorro";
  const raca = document.getElementById("new-pet-raca")?.value?.trim() || "Vira-lata (SRD)";
  const porte = document.getElementById("new-pet-porte")?.value || "medio";
  const idade = document.getElementById("new-pet-idade")?.value?.trim() || "1 ano";
  const sexo = document.getElementById("new-pet-sexo")?.value || "macho";
  const regiaoDF = document.getElementById("new-pet-regiao")?.value || "Brasília / Plano Piloto";
  const foto = document.getElementById("new-pet-foto")?.value?.trim() || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1000&q=80";
  const descricao = document.getElementById("new-pet-descricao")?.value?.trim() || "Animal resgatado com muito amor, dócil e pronto para adoção responsável.";
  const castrado = !!document.getElementById("new-pet-castrado")?.checked;
  const vacinado = !!document.getElementById("new-pet-vacinado")?.checked;
  const vermifugado = !!document.getElementById("new-pet-vermifugado")?.checked;

  // Critérios de Compatibilidade para o Quiz (Algoritmo de Afinidade)
  const nivelEnergia = document.getElementById("new-pet-energia")?.value || "moderada";
  const tipoDomicilio = document.getElementById("new-pet-domicilio")?.value || "qualquer";
  const tempoSozinho = document.getElementById("new-pet-tempo-sozinho")?.value || "independente";
  const conviveCriancas = document.getElementById("new-pet-criancas")?.value || "sim";
  const conviveCaes = document.getElementById("new-pet-outros-caes")?.value || "sim";
  const conviveGatos = document.getElementById("new-pet-gatos")?.value || "sim";

  const newPet = {
    id: "pet-" + Date.now(),
    nome: nome,
    especie: especie,
    raca: raca,
    porte: porte,
    idade: idade,
    sexo: sexo,
    cidade: `${regiaoDF} - DF`,
    regiaoDF: regiaoDF,
    ongId: ongId,
    ongNome: ongNome,
    contatoWhatsapp: ongWhatsapp,
    fotos: [foto],
    descricao: descricao,
    historiaResgate: `Animal acolhido e protegido pela instituição ${ongNome}. Foi avaliado por veterinários e está pronto para encontrar seu lar definitivo.`,
    nivelEnergia: nivelEnergia,
    tipoDomicilio: tipoDomicilio,
    tempoSozinho: tempoSozinho,
    conviveCriancas: conviveCriancas,
    conviveCaes: conviveCaes,
    conviveGatos: conviveGatos,
    compatibilidade: {
      nivelEnergia: nivelEnergia,
      tipoDomicilio: tipoDomicilio,
      tempoSozinho: tempoSozinho,
      conviveCriancas: conviveCriancas,
      conviveCaes: conviveCaes,
      conviveGatos: conviveGatos
    },
    saude: {
      castrado: castrado,
      vacinado: vacinado,
      vermifugado: vermifugado,
      vacinas: vacinado ? ["Antirrábica", "V10/V4"] : [],
      possuiEnfermidades: false
    },
    temperamento: ["Dócil", "Amoroso", "Resgatado", "Sociável"],
    status: "disponivel",
    adotado: false,
    criadoEm: Date.now()
  };

  await PetStorage.save(newPet);
  currentAnimals = await PetStorage.getAll();
  window.currentAnimals = currentAnimals;

  applyFilters();
  updatePortalBadges();
  closeOngAddPetModal();

  const mgmtModal = document.getElementById("ong-management-modal");
  if (mgmtModal && !mgmtModal.classList.contains("opacity-0")) {
    await renderOngPetsList(currentManagingOngId);
  }

  showToast(`🎉 ${nome} foi cadastrado com sucesso e já está disponível para adoção!`);
}

/* ==========================================================================
   DIRETRIZES INSTITUCIONAIS, CESSÃO DE IMAGEM & LOGO DAS ONGS (LEI 9.610/98 & LGPD)
   ========================================================================== */

async function openNgoGuidelinesModal(ongId = null, isMandatory = false) {
  const modal = document.getElementById("ngo-guidelines-modal");
  if (!modal) return;

  const selectOng = document.getElementById("guidelines-form-ong-id");
  let ongs = [];
  try {
    ongs = await SolidarityStorage.getOngs();
  } catch (e) {
    ongs = window.DEFAULT_ONGS || [];
  }

  if (selectOng && ongs.length > 0) {
    selectOng.innerHTML = ongs.map(o => `<option value="${o.id}">${o.nome} (${o.cidade || 'DF'})</option>`).join("");
    if (ongId && ongId !== "todas") {
      selectOng.value = ongId;
    }
  }

  const targetId = selectOng ? selectOng.value : (ongId || "ong-001");
  onGuidelinesModalOngChange(targetId);

  modal.classList.remove("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-95");
    content.classList.add("scale-100");
  }
  if (window.lucide) lucide.createIcons({ root: modal });
}

function closeNgoGuidelinesModal() {
  const modal = document.getElementById("ngo-guidelines-modal");
  if (!modal) return;
  modal.classList.add("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-100");
    content.classList.add("scale-95");
  }
}

function onGuidelinesModalOngChange(ongId) {
  const cnpjs = {
    "ong-001": "12.345.678/0001-90",
    "ong-002": "23.456.789/0001-01",
    "ong-003": "34.567.890/0001-12",
    "ong-004": "45.678.901/0001-23",
    "ong-005": "56.789.012/0001-34",
    "ong-006": "67.890.123/0001-45"
  };

  const existing = window.NgoContractStorage ? NgoContractStorage.getContractByOngId(ongId) : null;
  const inputNome = document.getElementById("guidelines-form-rep-nome");
  const inputCpf = document.getElementById("guidelines-form-rep-cpf");
  const inputCargo = document.getElementById("guidelines-form-rep-cargo");
  const inputCnpj = document.getElementById("guidelines-form-ong-cnpj");
  const inputEmail = document.getElementById("guidelines-form-rep-email");
  const inputTel = document.getElementById("guidelines-form-rep-telefone");
  const inputSig = document.getElementById("guidelines-form-signature");
  const errBox = document.getElementById("guidelines-form-error-msg");

  if (errBox) errBox.classList.add("hidden");

  if (existing) {
    if (inputNome) inputNome.value = existing.representanteNome || "";
    if (inputCpf) inputCpf.value = existing.representanteCpf || "";
    if (inputCargo) inputCargo.value = existing.representanteCargo || "";
    if (inputCnpj) inputCnpj.value = existing.ongCnpj || cnpjs[ongId] || "";
    if (inputEmail) inputEmail.value = existing.representanteEmail || "";
    if (inputTel) inputTel.value = existing.representanteTelefone || "";
    if (inputSig) inputSig.value = existing.assinaturaPorExtenso || "";

    const c1 = document.getElementById("guidelines-check-imagens");
    const c2 = document.getElementById("guidelines-check-dados");
    const c3 = document.getElementById("guidelines-check-veracidade");
    const c4 = document.getElementById("guidelines-check-independencia");
    if (c1) c1.checked = !!existing.termosAceitos?.cessaoImagens;
    if (c2) c2.checked = !!existing.termosAceitos?.fornecimentoDados;
    if (c3) c3.checked = !!existing.termosAceitos?.veracidadeSanitaria;
    if (c4) c4.checked = !!existing.termosAceitos?.independenciaPolitica;
  } else {
    if (inputCnpj) inputCnpj.value = cnpjs[ongId] || "12.345.678/0001-90";
    if (inputNome) inputNome.value = "";
    if (inputCpf) inputCpf.value = "";
    if (inputCargo) inputCargo.value = "";
    if (inputEmail) inputEmail.value = "";
    if (inputTel) inputTel.value = "";
    if (inputSig) inputSig.value = "";
    const c1 = document.getElementById("guidelines-check-imagens");
    const c2 = document.getElementById("guidelines-check-dados");
    const c3 = document.getElementById("guidelines-check-veracidade");
    const c4 = document.getElementById("guidelines-check-independencia");
    if (c1) c1.checked = false;
    if (c2) c2.checked = false;
    if (c3) c3.checked = false;
    if (c4) c4.checked = false;
  }
}

async function handleNgoGuidelinesSubmit(event) {
  if (event) event.preventDefault();

  const selectOng = document.getElementById("guidelines-form-ong-id");
  const ongId = selectOng ? selectOng.value : "ong-001";
  let ongNome = "ONG Parceira";
  if (selectOng && selectOng.options[selectOng.selectedIndex]) {
    ongNome = selectOng.options[selectOng.selectedIndex].text.split("(")[0].trim();
  }

  const ongCnpj = document.getElementById("guidelines-form-ong-cnpj")?.value.trim();
  const repNome = document.getElementById("guidelines-form-rep-nome")?.value.trim();
  const repCpf = document.getElementById("guidelines-form-rep-cpf")?.value.trim();
  const repCargo = document.getElementById("guidelines-form-rep-cargo")?.value.trim();
  const repEmail = document.getElementById("guidelines-form-rep-email")?.value.trim();
  const repTelefone = document.getElementById("guidelines-form-rep-telefone")?.value.trim();
  const signature = document.getElementById("guidelines-form-signature")?.value.trim();

  const c1 = document.getElementById("guidelines-check-imagens")?.checked;
  const c2 = document.getElementById("guidelines-check-dados")?.checked;
  const c3 = document.getElementById("guidelines-check-veracidade")?.checked;
  const c4 = document.getElementById("guidelines-check-independencia")?.checked;

  const errBox = document.getElementById("guidelines-form-error-msg");
  const errText = document.getElementById("guidelines-form-error-text");

  function showError(msg) {
    if (errBox && errText) {
      errText.textContent = msg;
      errBox.classList.remove("hidden");
    }
  }

  if (!repNome || repNome.length < 3) {
    showError("Por favor, informe o nome completo do representante legal da ONG.");
    return;
  }
  const cleanCpf = (repCpf || "").replace(/\D/g, "");
  if (cleanCpf.length !== 11) {
    showError("Por favor, informe um CPF válido com 11 dígitos.");
    return;
  }
  if (!repCargo || repCargo.length < 2) {
    showError("Por favor, informe o cargo ou função na entidade.");
    return;
  }
  const cleanCnpj = (ongCnpj || "").replace(/\D/g, "");
  if (cleanCnpj.length < 14) {
    showError("Por favor, informe um CNPJ válido da organização.");
    return;
  }
  if (!repEmail || !repEmail.includes("@")) {
    showError("Por favor, informe um e-mail institucional válido.");
    return;
  }
  const cleanTel = (repTelefone || "").replace(/\D/g, "");
  if (cleanTel.length < 10) {
    showError("Por favor, informe um telefone de contato com DDD.");
    return;
  }
  if (!c1 || !c2 || !c3 || !c4) {
    showError("É obrigatório marcar todas as 4 declarações de consentimento para validar as diretrizes.");
    return;
  }
  if (!signature || signature.toLowerCase().trim() !== repNome.toLowerCase().trim()) {
    showError(`A assinatura eletrônica digitada deve corresponder ao nome completo do representante ("${repNome}").`);
    return;
  }

  if (errBox) errBox.classList.add("hidden");

  const contractRecord = {
    ongId: ongId,
    ongNome: ongNome,
    ongCnpj: ongCnpj,
    representanteNome: repNome,
    representanteCpf: repCpf,
    representanteCargo: repCargo,
    representanteEmail: repEmail,
    representanteTelefone: repTelefone,
    termosAceitos: {
      cessaoImagens: c1,
      fornecimentoDados: c2,
      veracidadeSanitaria: c3,
      independenciaPolitica: c4
    },
    assinaturaPorExtenso: signature
  };

  const saved = NgoContractStorage.saveContract(contractRecord);

  closeNgoGuidelinesModal();

  // Atualiza modal de cadastro de pet se estiver aberto
  updateOngGuidelinesStatusInAddModal(ongId);

  // Atualiza painel de gestão de ONGs se estiver aberto
  updateOngManagementGuidelinesStatus(ongId);

  // Atualiza grid de ONGs
  await renderOngsGrid();

  showToast(`🎉 Diretrizes assinadas com sucesso! Protocolo: ${saved.protocolo}`);
}

function openNgoGuidelinesViewModal(ongId = null) {
  const targetId = ongId || document.getElementById("guidelines-form-ong-id")?.value || "ong-001";
  const contract = window.NgoContractStorage ? NgoContractStorage.getContractByOngId(targetId) : null;
  if (!contract) {
    showToast("⚠️ Nenhuma diretriz assinada encontrada para esta instituição.");
    return;
  }

  const elProto = document.getElementById("print-contract-protocolo");
  const elData = document.getElementById("print-contract-data");
  const elOng = document.getElementById("print-contract-ong-nome");
  const elCnpj = document.getElementById("print-contract-ong-cnpj");
  const elRepNome = document.getElementById("print-contract-rep-nome");
  const elRepCpf = document.getElementById("print-contract-rep-cpf");
  const elRepCargo = document.getElementById("print-contract-rep-cargo");
  const elRepContato = document.getElementById("print-contract-rep-contato");

  const elSigNome = document.getElementById("print-signature-nome");
  const elSigCargo = document.getElementById("print-signature-cargo-entidade");
  const elSigProto = document.getElementById("print-signature-protocolo");
  const elSigData = document.getElementById("print-signature-data");
  const elSigHash = document.getElementById("print-signature-hash");

  const dateFormatted = new Date(contract.timestampAssinatura).toLocaleString("pt-BR", {
    dateStyle: "full",
    timeStyle: "medium"
  });

  if (elProto) elProto.textContent = contract.protocolo;
  if (elData) elData.textContent = dateFormatted;
  if (elOng) elOng.textContent = contract.ongNome || "ONG Parceira";
  if (elCnpj) elCnpj.textContent = contract.ongCnpj || "Não informado";
  if (elRepNome) elRepNome.textContent = contract.representanteNome;
  if (elRepCpf) elRepCpf.textContent = contract.representanteCpf;
  if (elRepCargo) elRepCargo.textContent = contract.representanteCargo;
  if (elRepContato) elRepContato.textContent = `${contract.representanteEmail} • ${contract.representanteTelefone}`;

  if (elSigNome) elSigNome.textContent = contract.assinaturaPorExtenso || contract.representanteNome;
  if (elSigCargo) elSigCargo.textContent = `${contract.representanteCargo} - ${contract.ongNome}`;
  if (elSigProto) elSigProto.textContent = contract.protocolo;
  if (elSigData) elSigData.textContent = dateFormatted;
  if (elSigHash) elSigHash.textContent = contract.hashIntegridade || "SHA256-SIM-VALIDATED";

  const modal = document.getElementById("ngo-guidelines-view-modal");
  if (!modal) return;
  modal.classList.remove("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-95");
    content.classList.add("scale-100");
  }
  if (window.lucide) lucide.createIcons({ root: modal });
}

function closeNgoGuidelinesViewModal() {
  const modal = document.getElementById("ngo-guidelines-view-modal");
  if (!modal) return;
  modal.classList.add("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-100");
    content.classList.add("scale-95");
  }
}

function printSignedContract() {
  window.print();
}

/* ==========================================================================
   MÁSCARAS DE ENTRADA (CPF, CNPJ, TELEFONE)
   ========================================================================== */

function applyCpfMask(input) {
  if (!input) return;
  let val = input.value.replace(/\D/g, "");
  if (val.length > 11) val = val.slice(0, 11);
  if (val.length > 9) {
    input.value = `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6, 9)}-${val.slice(9)}`;
  } else if (val.length > 6) {
    input.value = `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6)}`;
  } else if (val.length > 3) {
    input.value = `${val.slice(0, 3)}.${val.slice(3)}`;
  } else {
    input.value = val;
  }
}

function applyCnpjMask(input) {
  if (!input) return;
  let val = input.value.replace(/\D/g, "");
  if (val.length > 14) val = val.slice(0, 14);
  if (val.length > 12) {
    input.value = `${val.slice(0, 2)}.${val.slice(2, 5)}.${val.slice(5, 8)}/${val.slice(8, 12)}-${val.slice(12)}`;
  } else if (val.length > 8) {
    input.value = `${val.slice(0, 2)}.${val.slice(2, 5)}.${val.slice(5, 8)}/${val.slice(8)}`;
  } else if (val.length > 5) {
    input.value = `${val.slice(0, 2)}.${val.slice(2, 5)}.${val.slice(5)}`;
  } else if (val.length > 2) {
    input.value = `${val.slice(0, 2)}.${val.slice(2)}`;
  } else {
    input.value = val;
  }
}

function applyPhoneMask(input) {
  if (!input) return;
  let val = input.value.replace(/\D/g, "");
  if (val.length > 11) val = val.slice(0, 11);
  if (val.length > 10) {
    input.value = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
  } else if (val.length > 6) {
    input.value = `(${val.slice(0, 2)}) ${val.slice(2, 6)}-${val.slice(6)}`;
  } else if (val.length > 2) {
    input.value = `(${val.slice(0, 2)}) ${val.slice(2)}`;
  } else if (val.length > 0) {
    input.value = `(${val}`;
  } else {
    input.value = "";
  }
}

/* ==========================================================================
   ACESSO RESTRITO & COLETOR DE DADOS EXCLUSIVO PARA ADMIN
   ========================================================================== */

var isAdminAuthenticated = (typeof sessionStorage !== "undefined" && sessionStorage.getItem("matchpet_admin_auth") === "true");
var adminAuthTargetAction = "admin_panel";
window.isAdminAuthenticated = isAdminAuthenticated;
window.adminAuthTargetAction = adminAuthTargetAction;

const PREDEFINED_ADMIN_PASSWORD = "adoção1410";

function isValidAdminPassword(pass) {
  if (!pass) return false;
  const clean = pass.trim().toLowerCase();
  return clean === "adoção1410" || clean === "adocao1410";
}
window.isValidAdminPassword = isValidAdminPassword;

function updateAdminHeaderLoginUI() {
  const isAuth = isAdminAuthenticated || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("matchpet_admin_auth") === "true");
  const btnLabel = document.getElementById("btn-admin-header-label");
  const btnIcon = document.getElementById("btn-admin-header-icon");
  const btn = document.getElementById("btn-toggle-admin-panel");
  const unauthView = document.getElementById("admin-panel-unauth-view");
  const authView = document.getElementById("admin-panel-auth-view");

  if (isAuth) {
    if (btnLabel) btnLabel.textContent = "Admin Ativo";
    if (btn) {
      btn.className = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-black border-2 border-emerald-500 shadow-xs transition-all cursor-pointer select-none";
    }
    if (btnIcon) {
      btnIcon.setAttribute("data-lucide", "shield-check");
      btnIcon.className = "w-3.5 h-3.5 text-emerald-600";
    }
    if (unauthView) unauthView.classList.add("hidden");
    if (authView) authView.classList.remove("hidden");
  } else {
    if (btnLabel) btnLabel.textContent = "Área Admin";
    if (btn) {
      btn.className = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#F9F3EA] text-slate-900 hover:text-[#007E82] text-xs font-black border-2 border-[#007E82]/30 hover:border-[#007E82] shadow-xs transition-all cursor-pointer select-none";
    }
    if (btnIcon) {
      btnIcon.setAttribute("data-lucide", "lock");
      btnIcon.className = "w-3.5 h-3.5 text-[#007E82]";
    }
    if (unauthView) unauthView.classList.remove("hidden");
    if (authView) authView.classList.add("hidden");
  }

  if (window.lucide) {
    if (btn) lucide.createIcons({ root: btn });
    const panel = document.getElementById("admin-header-dropdown-panel");
    if (panel) lucide.createIcons({ root: panel });
  }
}
window.updateAdminHeaderLoginUI = updateAdminHeaderLoginUI;

function toggleAdminHeaderPanel(event, forceState) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const panel = document.getElementById("admin-header-dropdown-panel");
  const chevron = document.getElementById("admin-header-chevron");
  if (!panel) return;

  const isCurrentlyHidden = panel.classList.contains("hidden");
  const shouldOpen = (typeof forceState === "boolean") ? forceState : isCurrentlyHidden;

  if (shouldOpen) {
    panel.classList.remove("hidden");
    if (chevron) chevron.style.transform = "rotate(180deg)";
    updateAdminHeaderLoginUI();
    const passInput = document.getElementById("header-admin-password");
    if (passInput && !isAdminAuthenticated && sessionStorage.getItem("matchpet_admin_auth") !== "true") {
      setTimeout(() => passInput.focus(), 150);
    }
  } else {
    panel.classList.add("hidden");
    if (chevron) chevron.style.transform = "rotate(0deg)";
    const err = document.getElementById("header-admin-error");
    if (err) err.classList.add("hidden");
  }
}
window.toggleAdminHeaderPanel = toggleAdminHeaderPanel;

function toggleAdminPassVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === "password";
  input.type = isPass ? "text" : "password";
  if (btn) {
    btn.innerHTML = isPass ? '<i data-lucide="eye-off" class="w-4 h-4"></i>' : '<i data-lucide="eye" class="w-4 h-4"></i>';
    if (window.lucide) lucide.createIcons({ root: btn });
  }
}
window.toggleAdminPassVisibility = toggleAdminPassVisibility;

function handleHeaderAdminLogin(event) {
  event.preventDefault();
  const input = document.getElementById("header-admin-password");
  const err = document.getElementById("header-admin-error");
  const pass = input ? input.value : "";

  if (isValidAdminPassword(pass)) {
    isAdminAuthenticated = true;
    window.isAdminAuthenticated = true;
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("matchpet_admin_auth", "true");
    }
    if (err) err.classList.add("hidden");
    if (input) input.value = "";
    
    renderAdminTopBar();
    updateAdminHeaderLoginUI();
    
    // Alerta suave e feedback visual
    const notification = document.createElement("div");
    notification.className = "fixed bottom-5 right-5 z-50 bg-[#007E82] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold transition-all";
    notification.innerHTML = '<span>🛡️ Modo Administrador ativado com sucesso!</span>';
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 400);
    }, 3500);
  } else {
    if (err) err.classList.remove("hidden");
    if (input) {
      input.select();
      input.focus();
    }
  }
}
window.handleHeaderAdminLogin = handleHeaderAdminLogin;

// Fecha o painel de login se clicar fora dele
if (typeof document !== "undefined") {
  document.addEventListener("click", function(e) {
    const wrapper = document.getElementById("admin-login-menu-wrapper");
    const panel = document.getElementById("admin-header-dropdown-panel");
    if (wrapper && panel && !wrapper.contains(e.target)) {
      panel.classList.add("hidden");
      const chevron = document.getElementById("admin-header-chevron");
      if (chevron) chevron.style.transform = "rotate(0deg)";
    }
  });
}

function renderAdminTopBar() {
  const bar = document.getElementById("admin-top-bar");
  const isAuth = (typeof sessionStorage !== "undefined" && sessionStorage.getItem("matchpet_admin_auth") === "true");
  if (bar) {
    if (isAuth) {
      bar.classList.remove("hidden");
      if (window.lucide) lucide.createIcons({ root: bar });
    } else {
      bar.classList.add("hidden");
    }
  }
  updateAdminHeaderLoginUI();
}
window.renderAdminTopBar = renderAdminTopBar;

function adminLogout() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("matchpet_admin_auth");
  }
  isAdminAuthenticated = false;
  window.isAdminAuthenticated = false;
  renderAdminTopBar();
  updateAdminHeaderLoginUI();
  toggleAdminHeaderPanel(null, false);
  alert("Sessão de Administrador finalizada com sucesso. Você retornou à visualização comum do Adotante.");
}
window.adminLogout = adminLogout;

function openAdminAuthModal(targetAction = "admin_panel") {
  adminAuthTargetAction = targetAction;
  window.adminAuthTargetAction = targetAction;

  const isAuth = isAdminAuthenticated || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("matchpet_admin_auth") === "true");
  if (isAuth) {
    isAdminAuthenticated = true;
    window.isAdminAuthenticated = true;
    renderAdminTopBar();
    if (adminAuthTargetAction === "admin_panel") {
      window.location.href = "admin.html";
    } else if (adminAuthTargetAction === "canva_design") {
      if (typeof openCanvaDesignStudio === "function") {
        openCanvaDesignStudio();
      }
    } else {
      openAdminCollectorModal();
    }
    return;
  }

  const modal = document.getElementById("admin-auth-modal");
  if (!modal) return;
  const err = document.getElementById("admin-auth-error");
  if (err) err.classList.add("hidden");
  const input = document.getElementById("admin-password-input") || document.getElementById("admin-pin-input");
  if (input) input.value = "";

  // Adapta textos do modal conforme a ação de destino (Painel Admin vs Canva Studio vs Coletor)
  const titleEl = document.getElementById("admin-auth-modal-title");
  const descEl = document.getElementById("admin-auth-modal-desc");
  if (adminAuthTargetAction === "canva_design") {
    if (titleEl) titleEl.textContent = "Estúdio de Design Canva • Acesso Admin";
    if (descEl) descEl.textContent = "A personalização completa de design, cores e layout da página é exclusiva para administradores. Digite a senha master:";
  } else if (adminAuthTargetAction === "admin_panel") {
    if (titleEl) titleEl.textContent = "Área Administrativa Oficial";
    if (descEl) descEl.textContent = "Área exclusiva para moderação de ONGs, gestão de pets, contratos e métricas da plataforma. Digite a senha de administrador:";
  } else {
    if (titleEl) titleEl.textContent = "Acesso Restrito ao Administrador";
    if (descEl) descEl.textContent = "Digite a senha de administrador (adoção1410) para acessar:";
  }

  modal.classList.remove("opacity-0", "pointer-events-none");
  modal.classList.add("opacity-100");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-95");
    content.classList.add("scale-100");
  }
  if (input) setTimeout(() => input.focus(), 150);
  if (window.lucide) lucide.createIcons({ root: modal });
}

function closeAdminAuthModal() {
  const modal = document.getElementById("admin-auth-modal");
  if (!modal) return;
  modal.classList.remove("opacity-100");
  modal.classList.add("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-100");
    content.classList.add("scale-95");
  }
}

function handleAdminAuthSubmit(event) {
  event.preventDefault();
  const input = document.getElementById("admin-password-input") || document.getElementById("admin-pin-input");
  const err = document.getElementById("admin-auth-error");
  const pin = input ? input.value : "";

  if (isValidAdminPassword(pin)) {
    isAdminAuthenticated = true;
    window.isAdminAuthenticated = true;
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("matchpet_admin_auth", "true");
    }
    renderAdminTopBar();
    updateAdminHeaderLoginUI();
    closeAdminAuthModal();

    if (adminAuthTargetAction === "admin_panel") {
      window.location.href = "admin.html";
    } else if (adminAuthTargetAction === "canva_design") {
      if (typeof openCanvaDesignStudio === "function") {
        openCanvaDesignStudio();
      }
    } else {
      openAdminCollectorModal();
    }
  } else {
    if (err) err.classList.remove("hidden");
    if (input) {
      input.select();
      input.focus();
    }
  }
}

function triggerCanvaAdminStudio() {
  if (isAdminAuthenticated || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("matchpet_admin_auth") === "true")) {
    isAdminAuthenticated = true;
    if (typeof openCanvaDesignStudio === "function") {
      openCanvaDesignStudio();
    }
  } else {
    openAdminAuthModal("canva_design");
  }
}
window.triggerCanvaAdminStudio = triggerCanvaAdminStudio;

async function openAdminCollectorModal() {
  const modal = document.getElementById("admin-collector-modal");
  if (!modal) return;

  await refreshAdminCollectorData();

  modal.classList.remove("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-95");
    content.classList.add("scale-100");
  }
  if (window.lucide) lucide.createIcons({ root: modal });
}

function closeAdminCollectorModal() {
  const modal = document.getElementById("admin-collector-modal");
  if (!modal) return;
  modal.classList.add("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-100");
    content.classList.add("scale-95");
  }
}

async function refreshAdminCollectorData() {
  if (!window.AdoteAnalytics || typeof AdoteAnalytics.getAdminCollectorSummary !== "function") return;

  const allPets = (window.currentAnimals && window.currentAnimals.length > 0)
    ? window.currentAnimals
    : await PetStorage.getAll();

  const summary = await AdoteAnalytics.getAdminCollectorSummary(allPets);

  const visitsEl = document.getElementById("admin-stat-visits");
  const visitorsEl = document.getElementById("admin-stat-visitors");
  const petsEl = document.getElementById("admin-stat-pets");
  const petsSubEl = document.getElementById("admin-stat-pets-sub");
  const interestedEl = document.getElementById("admin-stat-interested");
  const badgeLeadsEl = document.getElementById("admin-leads-badge");
  const tableBody = document.getElementById("admin-leads-table-body");
  const emptyEl = document.getElementById("admin-leads-empty");

  if (visitsEl) visitsEl.textContent = summary.totalSiteVisits;
  if (visitorsEl) visitorsEl.textContent = summary.uniqueVisitors;
  if (petsEl) petsEl.textContent = summary.totalPets;
  if (petsSubEl) petsSubEl.textContent = `${summary.totalAvailable} disp. / ${summary.totalAdopted} adot.`;
  if (interestedEl) interestedEl.textContent = summary.totalInterested;
  if (badgeLeadsEl) badgeLeadsEl.textContent = `${summary.totalInterested} contatos coletados`;

  if (!tableBody) return;

  if (!summary.leadsList || summary.leadsList.length === 0) {
    tableBody.innerHTML = "";
    if (emptyEl) emptyEl.classList.remove("hidden");
    return;
  }

  if (emptyEl) emptyEl.classList.add("hidden");

  tableBody.innerHTML = summary.leadsList.map(lead => {
    const d = new Date(lead.timestamp);
    const dateFormatted = d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const cleanPhone = lead.telefone ? lead.telefone.replace(/\D/g, "") : "";
    const waLink = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá ${lead.nome}! Vimos seu interesse na adoção do ${lead.petName} pelo MatchPet!`)}` : '#';

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">${dateFormatted}</td>
        <td class="p-3 font-bold text-slate-800">${lead.nome} ${lead.sobrenome}</td>
        <td class="p-3 font-mono font-medium text-slate-600">${lead.telefone}</td>
        <td class="p-3">
          <span class="font-bold text-[#004d50]">${lead.petName}</span>
          ${lead.score ? `<span class="ml-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">${lead.score}% afinidade</span>` : ''}
        </td>
        <td class="p-3">
          <span class="px-2 py-0.5 rounded-full text-[10.5px] font-bold ${lead.tipo === 'WhatsApp' ? 'bg-emerald-50 text-emerald-800' : 'bg-[#F9F3EA] text-[#006366]'}">
            ${lead.tipo}
          </span>
        </td>
        <td class="p-3 text-right whitespace-nowrap">
          ${cleanPhone ? `
            <a href="${waLink}" target="_blank" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-2xs">
              <i data-lucide="message-circle" class="w-3 h-3"></i> WhatsApp
            </a>
          ` : '<span class="text-slate-400 text-[11px]">Sem tel</span>'}
        </td>
      </tr>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons({ root: tableBody });
}

async function exportAdminLeadsCSV() {
  if (!window.AdoteAnalytics || typeof AdoteAnalytics.getAdminCollectorSummary !== "function") return;
  const allPets = await PetStorage.getAll();
  const summary = await AdoteAnalytics.getAdminCollectorSummary(allPets);

  const headers = ["Data", "Nome", "Sobrenome", "Telefone", "Animal_Interesse", "Tipo_Acao", "Score_Afinidade"];
  const rows = (summary.leadsList || []).map(l => [
    new Date(l.timestamp).toISOString(),
    `"${(l.nome || '').replace(/"/g, '""')}"`,
    `"${(l.sobrenome || '').replace(/"/g, '""')}"`,
    `"${(l.telefone || '').replace(/"/g, '""')}"`,
    `"${(l.petName || '').replace(/"/g, '""')}"`,
    `"${(l.tipo || '').replace(/"/g, '""')}"`,
    l.score || ""
  ]);

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `matchpet_interessados_leads_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("📥 Relatório CSV de interessados exportado com sucesso!");
}

async function simulateTrafficAndLeads() {
  if (!window.AdoteAnalytics || typeof AdoteAnalytics.seedDemoInteractions !== "function") return;
  const allPets = await PetStorage.getAll();
  await AdoteAnalytics.seedDemoInteractions(allPets);
  await refreshAdminCollectorData();
  showToast("⚡ +25 visitas, cliques e pessoas interessadas geradas com sucesso!");
}

/* ==========================================================================
   EXPORTAÇÕES GLOBAIS ADICIONAIS
   ========================================================================== */
window.initLiveActivityTicker = initLiveActivityTicker;
window.rotateDailyTip = rotateDailyTip;
window.setSamplePhoto = setSamplePhoto;
window.openOngManagementModal = openOngManagementModal;
window.closeOngManagementModal = closeOngManagementModal;
window.filterOngPetsList = filterOngPetsList;
window.renderOngPetsList = renderOngPetsList;
window.handleOngToggleAdopted = handleOngToggleAdopted;
window.handleOngDeletePet = handleOngDeletePet;
window.openOngAddPetModal = openOngAddPetModal;
window.closeOngAddPetModal = closeOngAddPetModal;
window.handleOngAddPetSubmit = handleOngAddPetSubmit;
window.openAdminAuthModal = openAdminAuthModal;
window.closeAdminAuthModal = closeAdminAuthModal;
window.handleAdminAuthSubmit = handleAdminAuthSubmit;
window.openAdminCollectorModal = openAdminCollectorModal;
window.closeAdminCollectorModal = closeAdminCollectorModal;
window.refreshAdminCollectorData = refreshAdminCollectorData;
window.exportAdminLeadsCSV = exportAdminLeadsCSV;
window.simulateTrafficAndLeads = simulateTrafficAndLeads;
window.openFavoritesModal = openFavoritesModal;
window.closeFavoritesModal = closeFavoritesModal;
window.renderFavoritesModalUI = renderFavoritesModalUI;
window.handleRemoveFromFavorites = handleRemoveFromFavorites;
window.openAdopterDashboardModal = openFavoritesModal;
window.closeAdopterDashboardModal = closeFavoritesModal;
window.renderAdopterDashboardUI = renderFavoritesModalUI;

// Exportações das Diretrizes Institucionais e Termo de Imagem de ONGs
window.openNgoGuidelinesModal = openNgoGuidelinesModal;
window.closeNgoGuidelinesModal = closeNgoGuidelinesModal;
window.onGuidelinesModalOngChange = onGuidelinesModalOngChange;
window.handleNgoGuidelinesSubmit = handleNgoGuidelinesSubmit;
window.openNgoGuidelinesViewModal = openNgoGuidelinesViewModal;
window.closeNgoGuidelinesViewModal = closeNgoGuidelinesViewModal;
window.printSignedContract = printSignedContract;
window.onNewPetOngChange = onNewPetOngChange;
window.updateOngGuidelinesStatusInAddModal = updateOngGuidelinesStatusInAddModal;
window.updateOngManagementGuidelinesStatus = updateOngManagementGuidelinesStatus;
window.applyCpfMask = applyCpfMask;
window.applyCnpjMask = applyCnpjMask;
window.applyPhoneMask = applyPhoneMask;
window.triggerCanvaAdminStudio = triggerCanvaAdminStudio;
window.isAdminAuthenticated = isAdminAuthenticated;

// Exportações de Cadastro de ONG com Diretrizes Integradas
window.openOngRegisterModal = openOngRegisterModal;
window.closeOngRegisterModal = closeOngRegisterModal;
window.handleOngRegisterSubmit = handleOngRegisterSubmit;
window.setSampleOngLogo = setSampleOngLogo;
window.syncRegisterSignatureHint = syncRegisterSignatureHint;

// Exportações da Sessão e Modal de Perfil do Usuário (Anônimo vs Identificado)
window.openUserProfileModal = openUserProfileModal;
window.closeUserProfileModal = closeUserProfileModal;
window.renderUserProfileModalUI = renderUserProfileModalUI;
window.handleUserProfileSubmit = handleUserProfileSubmit;
window.selectAnonymousModeFromProfile = selectAnonymousModeFromProfile;
window.updateUserSessionUI = updateUserSessionUI;
window.scrollToSiteTop = scrollToSiteTop;
