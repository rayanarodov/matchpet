/**
 * Studio de Design Visual Estilo Canva (AdoteAmigo Design Studio)
 * Permite personalização interativa de fontes, paleta de cores, estilos de cards,
 * inserção de figuras, selos decorativos e banners promocionais vitrine.
 */

(function () {
  let draftLayout = null;
  let activeCanvaTab = "fontes";

  const CANVA_PRESETS = {
    matchpet: {
      nome: "🐾 MatchPet Aconchegante (Verde Petróleo, Caramelo & Creme)",
      fontFamily: "Nunito",
      fontSizeScale: "normal",
      colorTheme: "roxo",
      customPrimaryColor: "#007E82",
      customPrimaryHover: "#00686c",
      customPrimaryLight: "#e6f4f5",
      customBgColor: "#F9F3EA",
      cardRadius: "rounded-3xl",
      cardShadow: "shadow-sm",
      activeStickers: {
        patinhas: true,
        coracao: false,
        seloAdocao: true,
        fitaResgate: false,
        badgeVerificada: false,
        seloUrgente: false,
        customStickerUrl: "",
        stickerPosition: "top-right"
      },
      customBanner: {
        enabled: true,
        badgeText: "✨ TESTE DE COMPATIBILIDADE INTELIGENTE ✨",
        title: "Faça um quiz e encontre o animal mais compatível com você.",
        subtitle: "Responda perguntas rápidas sobre seu espaço e rotina para descobrir o pet perfeito para a sua família.",
        bgType: "gradient",
        gradientPreset: "roxo-indigo",
        solidColor: "#007E82",
        customBgImage: "",
        ctaText: "Realizar o Quiz",
        iconEmoji: "🐾"
      }
    },
    laranja: {
      nome: "🦁 Laranja Caloroso (Alternativo)",
      fontFamily: "Plus Jakarta Sans",
      fontSizeScale: "normal",
      colorTheme: "laranja",
      customPrimaryColor: "#ea580c",
      customPrimaryHover: "#c2410c",
      customPrimaryLight: "#ffedd5",
      customBgColor: "#f8fafc",
      cardRadius: "rounded-3xl",
      cardShadow: "shadow-sm",
      activeStickers: {
        patinhas: true,
        coracao: false,
        seloAdocao: true,
        fitaResgate: false,
        badgeVerificada: false,
        seloUrgente: false,
        customStickerUrl: "",
        stickerPosition: "top-right"
      },
      customBanner: {
        enabled: true,
        badgeText: "🐾 ADOÇÃO CONSCIENTE & RESPONSÁVEL",
        title: "Encontre seu melhor amigo de quatro patas",
        subtitle: "Conectamos você aos cães e gatos mais compatíveis com o seu coração e estilo de vida através do teste inteligente de afinidade.",
        bgType: "gradient",
        gradientPreset: "laranja-amber",
        solidColor: "#ea580c",
        customBgImage: "",
        ctaText: "Faça o teste e descubra seu novo amigo 🐾",
        iconEmoji: "🐶"
      }
    },
    verde: {
      nome: "🌿 Verde-Água & Menta Suave",
      fontFamily: "Poppins",
      fontSizeScale: "normal",
      colorTheme: "verde",
      customPrimaryColor: "#0d9488",
      customPrimaryHover: "#0f766e",
      customPrimaryLight: "#ccfbf1",
      customBgColor: "#f0fdfa",
      cardRadius: "rounded-2xl",
      cardShadow: "shadow-md",
      activeStickers: {
        patinhas: true,
        coracao: false,
        seloAdocao: true,
        fitaResgate: false,
        badgeVerificada: true,
        seloUrgente: false,
        customStickerUrl: "",
        stickerPosition: "top-right"
      },
      customBanner: {
        enabled: true,
        badgeText: "🌿 AMOR, RESPEITO & NATUREZA",
        title: "Dê uma nova chance para quem só tem amor",
        subtitle: "Adotar salva vidas e enche sua casa de alegria. Conheça nossos peludinhos castrados, vacinados e cheios de saúde.",
        bgType: "gradient",
        gradientPreset: "verde-esmeralda",
        solidColor: "#0d9488",
        customBgImage: "",
        ctaText: "Adotar com Consciência 🌿",
        iconEmoji: "🌱"
      }
    },
    roxo: {
      nome: "💜 Roxo Vibrante / Pet Moderno",
      fontFamily: "Fredoka",
      fontSizeScale: "large",
      colorTheme: "roxo",
      customPrimaryColor: "#007E82",
      customPrimaryHover: "#6d28d9",
      customPrimaryLight: "#ede9fe",
      customBgColor: "#faf5ff",
      cardRadius: "rounded-3xl",
      cardShadow: "shadow-md",
      activeStickers: {
        patinhas: true,
        coracao: true,
        seloAdocao: true,
        fitaResgate: false,
        badgeVerificada: false,
        seloUrgente: false,
        customStickerUrl: "",
        stickerPosition: "top-right"
      },
      customBanner: {
        enabled: true,
        badgeText: "💜 AMOR DE QUATRO PATAS",
        title: "Um match perfeito esperando por você!",
        subtitle: "Descubra qual cãozinho ou gatinho tem a energia e o temperamento que combinam com o seu dia a dia.",
        bgType: "gradient",
        gradientPreset: "roxo-indigo",
        solidColor: "#007E82",
        customBgImage: "",
        ctaText: "Descobrir Meu Match 🔮",
        iconEmoji: "✨"
      }
    },
    azul: {
      nome: "🌊 Azul Sereno & Confiança",
      fontFamily: "Montserrat",
      fontSizeScale: "normal",
      colorTheme: "azul",
      customPrimaryColor: "#0284c7",
      customPrimaryHover: "#0369a1",
      customPrimaryLight: "#e0f2fe",
      customBgColor: "#f0f9ff",
      cardRadius: "rounded-2xl",
      cardShadow: "shadow-sm",
      activeStickers: {
        patinhas: false,
        coracao: false,
        seloAdocao: true,
        fitaResgate: false,
        badgeVerificada: true,
        seloUrgente: false,
        customStickerUrl: "",
        stickerPosition: "top-right"
      },
      customBanner: {
        enabled: true,
        badgeText: "🛡️ ONG AUDITADA & PARCERIA OFICIAL",
        title: "Adoção Responsável e Segura",
        subtitle: "Acompanhamento veterinário, triagem transparente e apoio contínuo para você e seu novo companheiro.",
        bgType: "gradient",
        gradientPreset: "azul-ciano",
        solidColor: "#0284c7",
        customBgImage: "",
        ctaText: "Ver Animais Disponíveis 🐾",
        iconEmoji: "💙"
      }
    },
    rosa: {
      nome: "🌸 Rosa Doce & Acolhimento",
      fontFamily: "Nunito",
      fontSizeScale: "normal",
      colorTheme: "rosa",
      customPrimaryColor: "#db2777",
      customPrimaryHover: "#be185d",
      customPrimaryLight: "#fce7f3",
      customBgColor: "#fdf2f8",
      cardRadius: "rounded-full",
      cardShadow: "shadow-md",
      activeStickers: {
        patinhas: true,
        coracao: true,
        seloAdocao: true,
        fitaResgate: true,
        badgeVerificada: false,
        seloUrgente: false,
        customStickerUrl: "",
        stickerPosition: "top-right"
      },
      customBanner: {
        enabled: true,
        badgeText: "🌸 HISTÓRIAS DE SUPERAÇÃO & AMOR",
        title: "Transforme uma história com o seu carinho",
        subtitle: "Peludinhos resgatados que só esperam por um lar cheio de afeto e uma caminha quentinha.",
        bgType: "gradient",
        gradientPreset: "rosa-rubi",
        solidColor: "#db2777",
        customBgImage: "",
        ctaText: "Conhecer as Histórias 💖",
        iconEmoji: "🐾"
      }
    },
    dark: {
      nome: "🌙 Noturno Sofisticado / Dark Mode",
      fontFamily: "Inter",
      fontSizeScale: "normal",
      colorTheme: "dark",
      customPrimaryColor: "#f97316",
      customPrimaryHover: "#ea580c",
      customPrimaryLight: "#334155",
      customBgColor: "#0f172a",
      cardRadius: "rounded-2xl",
      cardShadow: "shadow-xl",
      activeStickers: {
        patinhas: true,
        coracao: false,
        seloAdocao: true,
        fitaResgate: false,
        badgeVerificada: false,
        seloUrgente: true,
        customStickerUrl: "",
        stickerPosition: "top-right"
      },
      customBanner: {
        enabled: true,
        badgeText: "🌙 PLATAFORMA MATCHPET PRO",
        title: "Design Noturno & Elegância Visual",
        subtitle: "Experiência de alta fidelidade visual e contraste otimizado para navegação confortável.",
        bgType: "gradient",
        gradientPreset: "dark-elegance",
        solidColor: "#0f172a",
        customBgImage: "",
        ctaText: "Explorar no Escuro 🌌",
        iconEmoji: "⭐"
      }
    }
  };

  function getActiveLayout() {
    if (draftLayout) return draftLayout;
    if (window.LayoutDesignStorage) {
      draftLayout = JSON.parse(JSON.stringify(LayoutDesignStorage.getLayout()));
    } else {
      draftLayout = JSON.parse(JSON.stringify(CANVA_PRESETS.laranja));
    }
    return draftLayout;
  }

  function isUserAdminAuthenticated() {
    if (window.isAdminAuthenticated === true) return true;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("matchpet_admin_auth") === "true") {
      window.isAdminAuthenticated = true;
      return true;
    }
    if (window.location && window.location.pathname && window.location.pathname.includes("admin.html")) {
      return true;
    }
    return false;
  }

  function openCanvaDesignStudio() {
    // Restrição exclusiva para Administrador
    if (!isUserAdminAuthenticated()) {
      if (typeof window.openAdminAuthModal === "function") {
        window.openAdminAuthModal("canva_design");
      } else {
        alert("Acesso Restrito: Apenas administradores autorizados têm permissão para acessar o Estúdio de Design da Página.");
      }
      return;
    }

    draftLayout = window.LayoutDesignStorage ? JSON.parse(JSON.stringify(LayoutDesignStorage.getLayout())) : null;
    const modal = document.getElementById("canva-design-studio-modal");
    if (!modal) return;

    modal.classList.remove("opacity-0", "pointer-events-none");
    modal.classList.add("opacity-100");
    const content = modal.querySelector(".modal-content");
    if (content) {
      content.classList.remove("scale-95");
      content.classList.add("scale-100");
    }
    document.body.style.overflow = "hidden";

    // Inicializa controles
    syncCanvaControlsWithLayout();
    switchCanvaTab(activeCanvaTab);

    if (window.lucide) lucide.createIcons({ root: modal });
  }

  function closeCanvaDesignStudio() {
    const modal = document.getElementById("canva-design-studio-modal");
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

  function switchCanvaTab(tabKey) {
    activeCanvaTab = tabKey;
    document.querySelectorAll(".canva-tab-btn").forEach(btn => {
      if (btn.dataset.tab === tabKey) {
        btn.classList.add("active", "text-orange-600", "bg-white", "shadow-sm");
        btn.classList.remove("text-slate-600");
      } else {
        btn.classList.remove("active", "text-orange-600", "bg-white", "shadow-sm");
        btn.classList.add("text-slate-600");
      }
    });

    document.querySelectorAll(".canva-tab-pane").forEach(pane => {
      if (pane.id === `canva-pane-${tabKey}`) {
        pane.classList.remove("hidden");
      } else {
        pane.classList.add("hidden");
      }
    });

    const modal = document.getElementById("canva-design-studio-modal");
    if (window.lucide && modal) lucide.createIcons({ root: modal });
  }

  function syncCanvaControlsWithLayout() {
    const l = getActiveLayout();

    // 1. Fontes
    document.querySelectorAll(".canva-font-option").forEach(btn => {
      if (btn.dataset.font === l.fontFamily) {
        btn.classList.add("border-orange-500", "bg-orange-50/70", "font-black");
        btn.classList.remove("border-slate-200");
      } else {
        btn.classList.remove("border-orange-500", "bg-orange-50/70", "font-black");
        btn.classList.add("border-slate-200");
      }
    });

    const fontScaleSelect = document.getElementById("canva-font-scale-select");
    if (fontScaleSelect) fontScaleSelect.value = l.fontSizeScale || "normal";

    // 2. Cores & Temas
    document.querySelectorAll(".color-swatch-btn").forEach(btn => {
      if (btn.dataset.theme === l.colorTheme) {
        btn.classList.add("active", "ring-4", "ring-orange-300");
      } else {
        btn.classList.remove("active", "ring-4", "ring-orange-300");
      }
    });

    const customColorInput = document.getElementById("canva-custom-color-input");
    if (customColorInput) customColorInput.value = l.customPrimaryColor || "#007E82";

    // Fundo da Página Completa
    const customBgInput = document.getElementById("canva-custom-bg-input");
    if (customBgInput) customBgInput.value = l.customBgColor || "#ffffff";
    document.querySelectorAll(".canva-bg-preset-btn").forEach(btn => {
      if (btn.dataset.bg && btn.dataset.bg.toLowerCase() === (l.customBgColor || "#ffffff").toLowerCase()) {
        btn.classList.add("ring-4", "ring-[#007E82]/50", "border-[#007E82]");
      } else {
        btn.classList.remove("ring-4", "ring-[#007E82]/50", "border-[#007E82]");
      }
    });

    // 3. Estilo dos Cards
    document.querySelectorAll(".canva-radius-option").forEach(btn => {
      if (btn.dataset.radius === l.cardRadius) {
        btn.classList.add("border-orange-500", "bg-orange-50/70");
        btn.classList.remove("border-slate-200");
      } else {
        btn.classList.remove("border-orange-500", "bg-orange-50/70");
        btn.classList.add("border-slate-200");
      }
    });

    document.querySelectorAll(".canva-shadow-option").forEach(btn => {
      if (btn.dataset.shadow === l.cardShadow) {
        btn.classList.add("border-orange-500", "bg-orange-50/70");
        btn.classList.remove("border-slate-200");
      } else {
        btn.classList.remove("border-orange-500", "bg-orange-50/70");
        btn.classList.add("border-slate-200");
      }
    });

    // 4. Figuras & Selos
    const st = l.activeStickers || {};
    const chkPatinhas = document.getElementById("canva-check-patinhas");
    const chkCoracao = document.getElementById("canva-check-coracao");
    const chkSeloAdocao = document.getElementById("canva-check-selo-adocao");
    const chkFitaResgate = document.getElementById("canva-check-fita-resgate");
    const chkBadgeVerificada = document.getElementById("canva-check-badge-verificada");
    const chkSeloUrgente = document.getElementById("canva-check-selo-urgente");
    const inputCustomSticker = document.getElementById("canva-custom-sticker-url");

    if (chkPatinhas) chkPatinhas.checked = !!st.patinhas;
    if (chkCoracao) chkCoracao.checked = !!st.coracao;
    if (chkSeloAdocao) chkSeloAdocao.checked = !!st.seloAdocao;
    if (chkFitaResgate) chkFitaResgate.checked = !!st.fitaResgate;
    if (chkBadgeVerificada) chkBadgeVerificada.checked = !!st.badgeVerificada;
    if (chkSeloUrgente) chkSeloUrgente.checked = !!st.seloUrgente;
    if (inputCustomSticker) inputCustomSticker.value = st.customStickerUrl || "";

    // 5. Banner
    const b = l.customBanner || {};
    const chkBanner = document.getElementById("canva-banner-enabled");
    const inputBannerTitle = document.getElementById("canva-banner-title");
    const inputBannerSubtitle = document.getElementById("canva-banner-subtitle");
    const inputBannerBadge = document.getElementById("canva-banner-badge");
    const inputBannerCta = document.getElementById("canva-banner-cta");
    const selectBannerPreset = document.getElementById("canva-banner-gradient");

    if (chkBanner) chkBanner.checked = !!b.enabled;
    if (inputBannerTitle) inputBannerTitle.value = b.title || "";
    if (inputBannerSubtitle) inputBannerSubtitle.value = b.subtitle || "";
    if (inputBannerBadge) inputBannerBadge.value = b.badgeText || "";
    if (inputBannerCta) inputBannerCta.value = b.ctaText || "";
    if (selectBannerPreset) selectBannerPreset.value = b.gradientPreset || "laranja-amber";

    // 6. Presets
    document.querySelectorAll(".preset-theme-card").forEach(card => {
      if (card.dataset.preset === l.colorTheme) {
        card.classList.add("active", "border-orange-500", "bg-orange-50/50");
      } else {
        card.classList.remove("active", "border-orange-500", "bg-orange-50/50");
      }
    });

    updateLivePreviewMiniCard();
  }

  function setCanvaFont(fontFamily) {
    const l = getActiveLayout();
    l.fontFamily = fontFamily;
    syncCanvaControlsWithLayout();
    if (window.LayoutDesignStorage) LayoutDesignStorage.applyLayoutToDOM(l);
  }

  function setCanvaFontSizeScale(scale) {
    const l = getActiveLayout();
    l.fontSizeScale = scale;
    syncCanvaControlsWithLayout();
    if (window.LayoutDesignStorage) LayoutDesignStorage.applyLayoutToDOM(l);
  }

  function setCanvaTheme(themeKey) {
    const l = getActiveLayout();
    l.colorTheme = themeKey;

    if (CANVA_PRESETS[themeKey]) {
      const p = CANVA_PRESETS[themeKey];
      l.customPrimaryColor = p.customPrimaryColor;
      l.customPrimaryHover = p.customPrimaryHover;
      l.customPrimaryLight = p.customPrimaryLight;
      l.customBgColor = p.customBgColor;
      l.cardRadius = p.cardRadius;
      l.customBanner.gradientPreset = p.customBanner.gradientPreset;
    }

    syncCanvaControlsWithLayout();
    if (window.LayoutDesignStorage) LayoutDesignStorage.applyLayoutToDOM(l);
  }

  function setCanvaCustomColor(colorHex) {
    const l = getActiveLayout();
    l.colorTheme = "custom";
    l.customPrimaryColor = colorHex;
    l.customPrimaryHover = colorHex;
    l.customPrimaryLight = colorHex + "22"; // 15% opacity hex
    syncCanvaControlsWithLayout();
    if (window.LayoutDesignStorage) LayoutDesignStorage.applyLayoutToDOM(l);
  }

  function setCanvaCustomBgColor(bgHex) {
    const l = getActiveLayout();
    l.customBgColor = bgHex;
    syncCanvaControlsWithLayout();
    if (window.LayoutDesignStorage) LayoutDesignStorage.applyLayoutToDOM(l);
  }

  function setCanvaCardRadius(radiusKey) {
    const l = getActiveLayout();
    l.cardRadius = radiusKey;
    syncCanvaControlsWithLayout();
    if (window.LayoutDesignStorage) LayoutDesignStorage.applyLayoutToDOM(l);
  }

  function setCanvaCardShadow(shadowKey) {
    const l = getActiveLayout();
    l.cardShadow = shadowKey;
    syncCanvaControlsWithLayout();
    if (window.LayoutDesignStorage) LayoutDesignStorage.applyLayoutToDOM(l);
  }

  function toggleCanvaSticker(stickerKey, isChecked) {
    const l = getActiveLayout();
    if (!l.activeStickers) l.activeStickers = {};
    l.activeStickers[stickerKey] = isChecked;
    updateLivePreviewMiniCard();

    // Re-renderiza o catálogo se estiver no index
    if (typeof applyFilters === "function") {
      applyFilters();
    }
  }

  function setCanvaCustomStickerUrl(url) {
    const l = getActiveLayout();
    if (!l.activeStickers) l.activeStickers = {};
    l.activeStickers.customStickerUrl = (url || "").trim();
    updateLivePreviewMiniCard();
    if (typeof applyFilters === "function") applyFilters();
  }

  function updateCanvaBannerSetting(key, val) {
    const l = getActiveLayout();
    if (!l.customBanner) l.customBanner = {};
    l.customBanner[key] = val;
    updateVitrineBannerUI(l.customBanner);
    updateLivePreviewMiniCard();
  }

  function applyCanvaPreset(presetKey) {
    if (!CANVA_PRESETS[presetKey]) return;
    draftLayout = JSON.parse(JSON.stringify(CANVA_PRESETS[presetKey]));
    syncCanvaControlsWithLayout();
    if (window.LayoutDesignStorage) LayoutDesignStorage.applyLayoutToDOM(draftLayout);
    if (typeof applyFilters === "function") applyFilters();
    updateVitrineBannerUI(draftLayout.customBanner);
  }

  function updateLivePreviewMiniCard() {
    const container = document.getElementById("canva-mini-preview-container");
    if (!container) return;

    const l = getActiveLayout();
    const stickers = l.activeStickers || {};

    const radiusMap = {
      sm: "rounded-lg",
      md: "rounded-xl",
      lg: "rounded-2xl",
      xl: "rounded-3xl",
      full: "rounded-[32px]"
    };
    const shadowMap = {
      none: "shadow-none",
      sm: "shadow-xs",
      md: "shadow-md",
      lg: "shadow-lg",
      xl: "shadow-2xl"
    };

    const cardRadiusClass = radiusMap[l.cardRadius] || "rounded-2xl";
    const cardShadowClass = shadowMap[l.cardShadow] || "shadow-md";

    container.innerHTML = `
      <div class="bg-white ${cardRadiusClass} ${cardShadowClass} border border-slate-200 overflow-hidden text-left relative">
        <div class="relative aspect-video bg-slate-200 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=480&q=75" alt="Thor" class="w-full h-full object-cover">
          
          <div class="absolute top-2 left-2 flex items-center gap-1">
            <span class="badge-tag-adocao-solid text-[9px] px-2 py-0.5">🏷️ Adoção</span>
            <span class="px-2 py-0.5 rounded-full text-[9px] font-black badge-specie-chamativa">🐶 Cachorro</span>
          </div>

          <div class="absolute bottom-2 right-2">
            <span class="badge-tag-video-solid text-[9px] px-2 py-0.5">▶️ Vídeo</span>
          </div>

          ${stickers.fitaResgate ? `<span class="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-[#F9F3EA] text-slate-950 border border-[#D19864] shadow-xs">🎗️ Resgate</span>` : ""}
          ${stickers.patinhas ? `<span class="absolute bottom-2 left-2 text-xs select-none pointer-events-none drop-shadow-xs">🐾</span>` : ""}
        </div>

        <div class="p-3.5 space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="font-extrabold text-sm text-slate-900">Thor (Exemplo de Card)</h4>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">Porte Médio</span>
          </div>
          <p class="text-[11px] text-slate-500 line-clamp-2 leading-tight">
            "Thor foi resgatado com carinho e hoje sonha em encontrar uma família para correr livre..."
          </p>
          <div class="pt-2 flex items-center gap-1.5 border-t border-slate-100">
            <button class="flex-1 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-700">Ver Ficha</button>
            <button class="flex-1 py-1.5 rounded-xl text-[11px] font-black bg-emerald-600 text-white shadow-xs">Falar no WhatsApp</button>
          </div>
        </div>
      </div>
    `;
  }

  function updateVitrineBannerUI(bannerConfig) {
    const bannerEl = document.getElementById("custom-vitrine-banner");
    if (!bannerEl) return;

    const b = bannerConfig || (getActiveLayout().customBanner);
    if (!b || b.enabled === false) {
      bannerEl.classList.add("hidden");
      return;
    }

    bannerEl.classList.remove("hidden");

    bannerEl.className = "relative overflow-hidden rounded-2xl sm:rounded-3xl p-3 sm:p-7 border-2 border-[#007E82] shadow-md sm:shadow-xl text-center space-y-1.5 sm:space-y-3.5 transition-all";
    bannerEl.style.cssText = "background: linear-gradient(135deg, #F9F3EA 0%, #faeedf 32%, #e6f4f5 70%, #faeedf 100%) !important;";

    const bannerTitle = b.title || "Faça um quiz e encontre o animal mais compatível com você";
    let bannerSubtitle = b.subtitle || "Responda perguntas rápidas sobre seu espaço e rotina para descobrir o pet perfeito para a sua família.";
    if (!bannerSubtitle || bannerSubtitle.includes("Mora em apartamento") || bannerSubtitle.length > 120) {
      bannerSubtitle = "Responda perguntas rápidas sobre seu espaço e rotina para descobrir o pet perfeito para a sua família.";
    }
    let bannerBadge = (b.badgeText || "✨ TESTE DE COMPATIBILIDADE INTELIGENTE ✨").trim();
    if (bannerBadge.includes("TESTE DE COMPATIBILIDADE INTELIGENTE")) {
      bannerBadge = "✨ TESTE DE COMPATIBILIDADE INTELIGENTE ✨";
    }
    const bannerCta = b.ctaText || "Realizar o Quiz";

    bannerEl.innerHTML = `
      <!-- Efeitos decorativos suaves da marca (#D19864 e #007E82) -->
      <div class="absolute -right-8 -bottom-8 w-40 sm:w-60 h-40 sm:h-60 bg-[#D19864] rounded-full blur-3xl pointer-events-none opacity-30"></div>
      <div class="absolute -left-8 -top-8 w-40 sm:w-60 h-40 sm:h-60 bg-[#007E82] rounded-full blur-3xl pointer-events-none opacity-30"></div>
      
      <!-- Selo Central Harmônico -->
      <div class="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-0.5 rounded-full bg-white border border-[#D19864] text-slate-950 text-[9px] sm:text-xs font-black uppercase tracking-wider shadow-2xs mx-auto max-w-full text-center">
        <span>${bannerBadge}</span>
      </div>

      <!-- Título Principal em letras pretas nítidas -->
      <h1 class="text-sm sm:text-2xl md:text-3xl font-black font-brand tracking-tight text-slate-950 leading-snug max-w-xl mx-auto break-words">
        ${bannerTitle}
      </h1>

      <!-- Texto enxuto e convidativo -->
      <p class="text-[11px] sm:text-sm text-slate-700 leading-snug font-medium max-w-md mx-auto">
        ${bannerSubtitle}
      </p>

      <!-- APENAS A OPÇÃO DE REALIZAR O QUIZ -->
      <div class="pt-0.5 sm:pt-1.5 flex items-center justify-center">
        <button 
          type="button" 
          onclick="openQuizModal()" 
          class="btn-quiz-cta w-full sm:w-auto px-5 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-slate-950 font-black text-xs sm:text-base flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
        >
          <span>${bannerCta}</span>
          <span class="text-sm sm:text-lg">🐾</span>
        </button>
      </div>

      <!-- 3 destaques harmônicos em desktop (ocultos no mobile) -->
      <div class="banner-highlights-row hidden sm:flex pt-2.5 border-t border-[#e8ddcf] flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-slate-950 font-bold max-w-2xl mx-auto">
        <div class="flex items-center justify-center gap-1 sm:gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-[#e8ddcf] text-center shadow-2xs">
          <span>⚡</span>
          <span class="leading-tight">Rápido (1 minuto)</span>
        </div>
        <div class="flex items-center justify-center gap-1 sm:gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-[#e8ddcf] text-center shadow-2xs">
          <span>🎯</span>
          <span class="leading-tight">Afinidade sob medida</span>
        </div>
        <div class="flex items-center justify-center gap-1 sm:gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-[#e8ddcf] text-center shadow-2xs">
          <span>🔒</span>
          <span class="leading-tight">100% Gratuito</span>
        </div>
      </div>
    `;

    if (window.lucide) {
      lucide.createIcons({ root: bannerEl });
    }
  }

  function saveAndApplyCanvaLayout() {
    const l = getActiveLayout();
    if (window.LayoutDesignStorage) {
      LayoutDesignStorage.saveLayout(l);
    }
    closeCanvaDesignStudio();
    if (typeof applyFilters === "function") applyFilters();

    const toast = document.getElementById("toast-notification");
    const msg = document.getElementById("toast-message");
    if (toast && msg) {
      msg.textContent = "✨ Novo layout publicado com sucesso no aplicativo!";
      toast.classList.remove("translate-y-24", "opacity-0", "pointer-events-none");
      toast.classList.add("translate-y-0", "opacity-100");
      setTimeout(() => {
        toast.classList.add("translate-y-24", "opacity-0", "pointer-events-none");
      }, 3500);
    }
  }

  function resetCanvaLayout() {
    if (confirm("Deseja restaurar todas as fontes, cores e estilos para o padrão de fábrica?")) {
      if (window.LayoutDesignStorage) {
        draftLayout = LayoutDesignStorage.resetLayout();
      } else {
        draftLayout = JSON.parse(JSON.stringify(CANVA_PRESETS.laranja));
      }
      syncCanvaControlsWithLayout();
      if (typeof applyFilters === "function") applyFilters();
      updateVitrineBannerUI(draftLayout.customBanner);
    }
  }

  function exportCanvaLayout() {
    const l = getActiveLayout();
    const jsonStr = JSON.stringify(l, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      alert("Configuração de layout copiada para a área de transferência em formato JSON!");
    }).catch(() => {
      prompt("Copie a configuração de layout JSON abaixo:", jsonStr);
    });
  }

  // Inicialização no carregamento
  document.addEventListener("DOMContentLoaded", () => {
    if (window.LayoutDesignStorage) {
      const saved = LayoutDesignStorage.getLayout();
      // LayoutDesignStorage.applyLayoutToDOM já é invocado pelo initApp() evitando duplicidade
      updateVitrineBannerUI(saved.customBanner);
    }
  });

  // Exposição Global
  window.openCanvaDesignStudio = openCanvaDesignStudio;
  window.closeCanvaDesignStudio = closeCanvaDesignStudio;
  window.switchCanvaTab = switchCanvaTab;
  window.setCanvaFont = setCanvaFont;
  window.setCanvaFontSizeScale = setCanvaFontSizeScale;
  window.setCanvaTheme = setCanvaTheme;
  window.setCanvaCustomColor = setCanvaCustomColor;
  window.setCanvaCustomBgColor = setCanvaCustomBgColor;
  window.setCanvaCardRadius = setCanvaCardRadius;
  window.setCanvaCardShadow = setCanvaCardShadow;
  window.toggleCanvaSticker = toggleCanvaSticker;
  window.setCanvaCustomStickerUrl = setCanvaCustomStickerUrl;
  window.updateCanvaBannerSetting = updateCanvaBannerSetting;
  window.applyCanvaPreset = applyCanvaPreset;
  window.saveAndApplyCanvaLayout = saveAndApplyCanvaLayout;
  window.resetCanvaLayout = resetCanvaLayout;
  window.exportCanvaLayout = exportCanvaLayout;
  window.updateVitrineBannerUI = updateVitrineBannerUI;
  window.CANVA_PRESETS = CANVA_PRESETS;

  window.DesignStudio = {
    open: openCanvaDesignStudio,
    close: closeCanvaDesignStudio,
    switchTab: switchCanvaTab,
    setFont: setCanvaFont,
    setFontScale: setCanvaFontSizeScale,
    setTheme: setCanvaTheme,
    setCustomColor: setCanvaCustomColor,
    setCustomBgColor: setCanvaCustomBgColor,
    setCardRadius: setCanvaCardRadius,
    setCardShadow: setCanvaCardShadow,
    toggleSticker: toggleCanvaSticker,
    setCustomStickerUrl: setCanvaCustomStickerUrl,
    updateBanner: updateCanvaBannerSetting,
    applyPreset: applyCanvaPreset,
    save: saveAndApplyCanvaLayout,
    reset: resetCanvaLayout,
    export: exportCanvaLayout,
    presets: CANVA_PRESETS
  };
})();
