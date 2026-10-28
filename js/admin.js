/**
 * Controlador do Painel Administrativo (CRUD Completo)
 * Ficha Médica Básica Obrigatória (Porte, Castração, Vermífugo, Vacinas)
 * Adição de Doenças, Enfermidades ou Cuidados Extras Opcional (Toggle)
 * Upload direto no Cloudinary com fallback para IndexedDB
 */

let allAdminPets = [];
let activePhotos = [];     // Array de { type: 'url'|'blob'|'dataUrl'|'cloudinary', src: string, dataUrl?: string }
let activeVideo = null;    // { type: 'file'|'youtube'|'url'|'cloudinary', src: string, dataUrl?: string }
let activeVaccines = [];   // Array de strings de nomes de vacinas

function debounce(fn, delay = 180) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || window.location.hash.replace('#', '');
  if (initialTab && ['solidarity', 'analytics', 'crud'].includes(initialTab)) {
    switchAdminTab(initialTab);
  }

  setupDragAndDrop();
  updateCloudinaryStatusUI();
  await initNgoContractsModule();
  await loadAdminList();
});

/* ==========================================================================
   CONFIGURAÇÃO & INTEGRAÇÃO CLOUDINARY
   ========================================================================== */

function updateCloudinaryStatusUI() {
  const isConfigured = window.CloudinaryService && CloudinaryService.isConfigured();
  const dot = document.getElementById("cloudinary-status-dot");
  const indicator = document.getElementById("upload-mode-indicator");

  if (dot) {
    dot.className = isConfigured 
      ? "w-2 h-2 rounded-full bg-teal-500 shadow-xs inline-block animate-pulse" 
      : "w-2 h-2 rounded-full bg-slate-300 inline-block";
  }

  if (indicator) {
    indicator.innerHTML = isConfigured
      ? `<span class="w-2 h-2 rounded-full bg-teal-500 inline-block"></span> <span class="text-teal-700 font-bold">Nuvem Cloudinary Conectada</span>`
      : `<span class="w-2 h-2 rounded-full bg-slate-400 inline-block"></span> <span>Armazenamento Local (IndexedDB)</span>`;
  }
}

function openCloudinaryModal() {
  const config = CloudinaryService.getConfig();
  document.getElementById("cloudinary-cloud-name").value = config.cloudName || "";
  document.getElementById("cloudinary-upload-preset").value = config.uploadPreset || "";

  const feedback = document.getElementById("cloudinary-test-feedback");
  feedback.className = "hidden";

  const modal = document.getElementById("cloudinary-modal");
  modal.classList.remove("opacity-0", "pointer-events-none");
  modal.classList.add("opacity-100");
  modal.querySelector(".modal-content").classList.remove("scale-95");
  modal.querySelector(".modal-content").classList.add("scale-100");
}

function closeCloudinaryModal() {
  const modal = document.getElementById("cloudinary-modal");
  modal.classList.remove("opacity-100");
  modal.classList.add("opacity-0", "pointer-events-none");
  modal.querySelector(".modal-content").classList.remove("scale-100");
  modal.querySelector(".modal-content").classList.add("scale-95");
}

function saveCloudinarySettings() {
  const cloudName = document.getElementById("cloudinary-cloud-name").value.trim();
  const uploadPreset = document.getElementById("cloudinary-upload-preset").value.trim();

  CloudinaryService.saveConfig(cloudName, uploadPreset);
  updateCloudinaryStatusUI();
  closeCloudinaryModal();

  if (cloudName && uploadPreset) {
    showToast("Cloudinary configurado! Novos uploads irão para a nuvem.");
  } else {
    showToast("Configurações limpas. Mídias serão salvas localmente no IndexedDB.", "info");
  }
}

async function testCloudinaryConnection() {
  const cloudName = document.getElementById("cloudinary-cloud-name").value.trim();
  const uploadPreset = document.getElementById("cloudinary-upload-preset").value.trim();
  const feedback = document.getElementById("cloudinary-test-feedback");

  if (!cloudName || !uploadPreset) {
    feedback.className = "text-xs p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 block";
    feedback.textContent = "Preencha o Cloud Name e o Upload Preset para testar.";
    return;
  }

  feedback.className = "text-xs p-2.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 block";
  feedback.textContent = "Testando conexão com o Cloudinary...";

  CloudinaryService.saveConfig(cloudName, uploadPreset);
  const result = await CloudinaryService.testConnection();

  if (result.success) {
    feedback.className = "text-xs p-2.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 block";
    feedback.textContent = `✓ ${result.message}`;
    updateCloudinaryStatusUI();
  } else {
    feedback.className = "text-xs p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 block";
    feedback.textContent = `✗ ${result.message}`;
  }
}

/* ==========================================================================
   SEÇÃO OPCIONAL DE ENFERMIDADES / CUIDADOS EXTRAS
   ========================================================================== */

function toggleEnfermidadesSection() {
  const checkbox = document.getElementById("toggle-enfermidades");
  const wrapper = document.getElementById("enfermidades-fields-wrapper");
  if (!checkbox || !wrapper) return;

  if (checkbox.checked) {
    wrapper.classList.remove("hidden");
  } else {
    wrapper.classList.add("hidden");
  }

  if (window.lucide) lucide.createIcons({ root: wrapper });
}

/* ==========================================================================
   CONFIGURAÇÃO DE DRAG & DROP
   ========================================================================== */

function setupDragAndDrop() {
  const photoDrop = document.getElementById("photo-dropzone");
  const videoDrop = document.getElementById("video-dropzone");

  if (photoDrop) {
    ["dragenter", "dragover"].forEach(eventName => {
      photoDrop.addEventListener(eventName, (e) => {
        e.preventDefault();
        photoDrop.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach(eventName => {
      photoDrop.addEventListener(eventName, (e) => {
        e.preventDefault();
        photoDrop.classList.remove("dragover");
      });
    });
    photoDrop.addEventListener("drop", (e) => {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
      if (files.length > 0) processPhotoFiles(files);
    });
  }

  if (videoDrop) {
    ["dragenter", "dragover"].forEach(eventName => {
      videoDrop.addEventListener(eventName, (e) => {
        e.preventDefault();
        videoDrop.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach(eventName => {
      videoDrop.addEventListener(eventName, (e) => {
        e.preventDefault();
        videoDrop.classList.remove("dragover");
      });
    });
    videoDrop.addEventListener("drop", (e) => {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("video/"));
      if (files.length > 0) processVideoFile(files[0]);
    });
  }
}

/* ==========================================================================
   CARREGAMENTO & LISTAGEM (READ)
   ========================================================================== */

async function loadAdminList() {
  try {
    allAdminPets = await PetDB.getAll();
    updateDashboardStats(allAdminPets);
    renderAdminPets(allAdminPets);
  } catch (err) {
    console.error("Erro ao carregar lista de animais:", err);
    showToast("Erro ao carregar dados do banco", "error");
  }
}

function updateDashboardStats(pets) {
  document.getElementById("stat-total").textContent = pets.length;
  document.getElementById("stat-videos").textContent = pets.filter(p => p.videos && p.videos.length > 0).length;
  document.getElementById("stat-castrados").textContent = pets.filter(p => p.saude?.castrado).length;
  document.getElementById("stat-enfermidades").textContent = pets.filter(p => p.saude?.possuiEnfermidades).length;
}

function renderAdminPets(pets) {
  const container = document.getElementById("admin-pet-list");
  if (!container) return;

  if (pets.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6 text-slate-400">
        <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
        <p class="text-xs font-semibold text-slate-600">Nenhum animal cadastrado no catálogo.</p>
        <p class="text-[11px] text-slate-400 mt-1">Preencha o formulário ao lado para cadastrar o primeiro!</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons({ root: container });
    return;
  }

  container.innerHTML = pets.map(pet => {
    const rawPhoto = (pet.fotos && pet.fotos.length > 0) ? pet.fotos[0] : null;
    const photoUrl = PetDB.getMediaUrl(rawPhoto) || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=200&q=80";

    const hasVideos = pet.videos && pet.videos.length > 0;
    const possuiEnfermidade = pet.saude?.possuiEnfermidades || !!(pet.saude?.enfermidadesDescricao);
    const isCastrado = pet.saude?.castrado;
    const numVacinas = (pet.saude?.vacinas || []).length;

    const porteLabels = {
      mini: "Mini",
      pequeno: "Pequeno",
      medio: "Médio",
      grande: "Grande",
      gigante: "Gigante"
    };
    const porteNome = porteLabels[pet.porte] || pet.porte || "Médio";

    return `
      <div class="p-3.5 bg-slate-50 hover:bg-slate-100/90 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 transition-colors group">
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 bg-slate-200">
            <img src="${photoUrl}" alt="${pet.nome}" class="w-full h-full object-cover">
            ${hasVideos ? `
              <div class="absolute bottom-1 right-1 bg-orange-600 text-white rounded p-0.5 shadow">
                <i data-lucide="video" class="w-2.5 h-2.5"></i>
              </div>
            ` : ''}
          </div>

          <div class="min-w-0 space-y-0.5">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-extrabold text-slate-900 truncate">${pet.nome}</h4>
              <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                ${porteNome}
              </span>
              ${pet.status === 'adotado' ? `
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e6f4f5] text-[#007E82]">Adotado</span>
              ` : ''}
            </div>

            <p class="text-xs text-slate-500 truncate">
              ${pet.especie === 'gato' ? '🐱 Gato' : '🐶 Cão'} • ${pet.raca || 'SRD'} • ${pet.idade} • ${pet.sexo === 'femea' ? 'Fêmea' : 'Macho'}
            </p>

            <!-- Ficha Médica Básica & Enfermidades -->
            <div class="flex flex-wrap items-center gap-1.5 text-[11px] font-medium pt-0.5">
              <span class="${isCastrado ? 'text-teal-700 bg-teal-50 border-teal-200' : 'text-slate-600 bg-slate-100 border-slate-200'} px-1.5 py-0.5 rounded border text-[10px]">
                ${isCastrado ? '✓ Castrado' : 'Não castrado'}
              </span>

              <span class="${numVacinas > 0 ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-slate-500 bg-slate-100 border-slate-200'} px-1.5 py-0.5 rounded border text-[10px]">
                ${numVacinas > 0 ? `${numVacinas} vacina(s)` : 'Sem vacinas'}
              </span>

              ${possuiEnfermidade ? `
                <span class="text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                  <i data-lucide="heart-pulse" class="w-3 h-3 text-amber-600"></i> Cuidados Extras
                </span>
              ` : `
                <span class="text-teal-700 font-semibold text-[10px] flex items-center gap-0.5">
                  <i data-lucide="check" class="w-3 h-3 text-teal-600"></i> Sem Doenças
                </span>
              `}
            </div>
          </div>
        </div>

        <!-- Botões de Ação CRUD -->
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <button 
            onclick="editPet('${pet.id}')" 
            title="Editar Animal" 
            class="p-2.5 rounded-xl bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-slate-200 transition-all shadow-xs"
          >
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button 
            onclick="deletePet('${pet.id}', '${pet.nome}')" 
            title="Excluir Animal" 
            class="p-2.5 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-all shadow-xs"
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

function filterAdminListDirect() {
  const term = (document.getElementById("admin-search-input")?.value || "").toLowerCase().trim();
  const porteVal = document.getElementById("admin-porte-filter")?.value || "todos";

  const filtered = allAdminPets.filter(pet => {
    if (term) {
      const matchName = pet.nome?.toLowerCase().includes(term);
      const matchBreed = pet.raca?.toLowerCase().includes(term);
      if (!matchName && !matchBreed) return false;
    }
    if (porteVal !== "todos" && pet.porte !== porteVal) {
      return false;
    }
    return true;
  });

  renderAdminPets(filtered);
}

const filterAdminList = debounce(filterAdminListDirect, 180);
window.filterAdminList = filterAdminList;
window.filterAdminListDirect = filterAdminListDirect;

/* ==========================================================================
   GESTÃO DE FOTOS (CLOUDINARY OU LOCAL)
   ========================================================================== */

function handlePhotoUpload(event) {
  const files = Array.from(event.target.files);
  if (files.length > 0) {
    processPhotoFiles(files);
  }
  event.target.value = "";
}

async function processPhotoFiles(files) {
  const isCloudinary = window.CloudinaryService && CloudinaryService.isConfigured();
  const progressContainer = document.getElementById("photo-upload-progress");
  const progressStatus = document.getElementById("photo-upload-status");

  if (isCloudinary && progressContainer) {
    progressContainer.classList.remove("hidden");
  }

  let count = 0;
  for (const file of files) {
    count++;
    if (progressStatus) {
      progressStatus.textContent = isCloudinary 
        ? `Enviando foto ${count} de ${files.length} para o Cloudinary...`
        : `Lendo arquivo ${count} de ${files.length}...`;
    }

    try {
      if (isCloudinary) {
        const uploadRes = await CloudinaryService.uploadMedia(file, "image");
        activePhotos.push({
          type: "cloudinary",
          src: uploadRes.url,
          dataUrl: uploadRes.url
        });
      } else {
        const dataUrl = await PetDB.blobToDataUrl(file);
        activePhotos.push({
          type: "dataUrl",
          src: dataUrl,
          dataUrl: dataUrl
        });
      }
    } catch (e) {
      console.error("Erro ao enviar foto:", e);
      showToast(`Erro ao enviar ${file.name}: ${e.message}`, "error");
    }
  }

  if (progressContainer) {
    progressContainer.classList.add("hidden");
  }

  renderPhotoPreviews();
  showToast(
    isCloudinary 
      ? `${files.length} foto(s) enviada(s) para a nuvem!`
      : `${files.length} foto(s) carregada(s) localmente.`
  );
}

function addPhotosFromUrls() {
  const textarea = document.getElementById("pet-fotos-urls");
  const urls = textarea.value
    .split(/[\n,]+/)
    .map(u => u.trim())
    .filter(u => u.length > 0);

  if (urls.length === 0) return;

  urls.forEach(url => {
    activePhotos.push({
      type: "url",
      src: url
    });
  });

  textarea.value = "";
  renderPhotoPreviews();
  showToast(`${urls.length} link(s) de foto adicionado(s)!`);
}

function removePhoto(index) {
  activePhotos.splice(index, 1);
  renderPhotoPreviews();
}

function renderPhotoPreviews() {
  const grid = document.getElementById("photo-preview-grid");
  if (!grid) return;

  if (activePhotos.length === 0) {
    grid.innerHTML = "";
    return;
  }

  grid.innerHTML = activePhotos.map((photo, index) => {
    const isFirst = index === 0;
    const src = photo.dataUrl || photo.src;
    return `
      <div class="photo-preview-item">
        <img src="${src}" alt="Foto ${index + 1}">
        ${isFirst ? `
          <span class="absolute bottom-1 left-1 bg-[#007E82] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
            Capa
          </span>
        ` : ''}
        <button type="button" onclick="removePhoto(${index})" class="remove-btn" title="Remover Foto">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons({ root: grid });
}

/* ==========================================================================
   GESTÃO DE VÍDEOS (CLOUDINARY OU LOCAL)
   ========================================================================== */

function handleVideoUpload(event) {
  const file = event.target.files[0];
  if (file) {
    processVideoFile(file);
  }
  event.target.value = "";
}

async function processVideoFile(file) {
  const isCloudinary = window.CloudinaryService && CloudinaryService.isConfigured();
  const progressContainer = document.getElementById("video-upload-progress");
  const progressStatus = document.getElementById("video-upload-status");

  if (progressContainer) progressContainer.classList.remove("hidden");
  if (progressStatus) {
    progressStatus.textContent = isCloudinary 
      ? "Enviando vídeo para o Cloudinary..."
      : "Lendo arquivo de vídeo local...";
  }

  try {
    if (isCloudinary) {
      const uploadRes = await CloudinaryService.uploadMedia(file, "video");
      activeVideo = {
        type: "cloudinary",
        src: uploadRes.url,
        dataUrl: uploadRes.url,
        fileName: file.name
      };
      showToast("Vídeo enviado com sucesso para o Cloudinary!");
    } else {
      const dataUrl = await PetDB.blobToDataUrl(file);
      activeVideo = {
        type: "file",
        src: dataUrl,
        dataUrl: dataUrl,
        fileName: file.name
      };
      showToast("Vídeo carregado localmente.");
    }
    renderVideoPreview();
  } catch (e) {
    console.error("Erro ao enviar vídeo:", e);
    showToast(`Erro ao carregar vídeo: ${e.message}`, "error");
  } finally {
    if (progressContainer) progressContainer.classList.add("hidden");
  }
}

function applyVideoUrl() {
  const input = document.getElementById("pet-video-url");
  const url = (input.value || "").trim();
  if (!url) return;

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  activeVideo = {
    type: isYouTube ? "youtube" : "url",
    src: url
  };

  renderVideoPreview();
  showToast("Link de vídeo aplicado com sucesso!");
}

function removeActiveVideo() {
  activeVideo = null;
  const container = document.getElementById("video-preview-container");
  const target = document.getElementById("video-preview-target");
  const input = document.getElementById("pet-video-url");
  if (input) input.value = "";
  if (target) target.innerHTML = "";
  if (container) container.classList.add("hidden");
  showToast("Vídeo removido.");
}

function renderVideoPreview() {
  const container = document.getElementById("video-preview-container");
  const target = document.getElementById("video-preview-target");
  if (!container || !target) return;

  if (!activeVideo || !activeVideo.src) {
    container.classList.add("hidden");
    target.innerHTML = "";
    return;
  }

  container.classList.remove("hidden");

  if (activeVideo.type === "youtube" || activeVideo.src.includes("youtube.com") || activeVideo.src.includes("youtu.be")) {
    let videoId = "";
    if (activeVideo.src.includes("youtu.be/")) {
      videoId = activeVideo.src.split("youtu.be/")[1].split("?")[0];
    } else if (activeVideo.src.includes("watch?v=")) {
      videoId = activeVideo.src.split("watch?v=")[1].split("&")[0];
    }
    target.innerHTML = `
      <iframe 
        src="https://www.youtube.com/embed/${videoId}?autoplay=0" 
        title="Prévia do vídeo" 
        allowfullscreen
        class="w-full h-full rounded-xl"
      ></iframe>
    `;
  } else {
    target.innerHTML = `
      <video controls playsinline class="w-full h-full object-contain rounded-xl bg-black">
        <source src="${activeVideo.dataUrl || activeVideo.src}">
        Seu navegador não suporta a prévia deste vídeo.
      </video>
    `;
  }

  if (window.lucide && target) lucide.createIcons({ root: target });
}

/* ==========================================================================
   CONSTRUTOR DE VACINAS
   ========================================================================== */

function quickAddVaccine(name) {
  if (!activeVaccines.includes(name)) {
    activeVaccines.push(name);
    renderVaccines();
    showToast(`Vacina "${name}" adicionada!`);
  }
}

function addCustomVaccine() {
  const input = document.getElementById("custom-vaccine-input");
  const val = (input.value || "").trim();
  if (!val) return;

  if (!activeVaccines.includes(val)) {
    activeVaccines.push(val);
    renderVaccines();
    input.value = "";
    showToast(`Vacina "${val}" adicionada!`);
  }
}

function removeVaccine(name) {
  activeVaccines = activeVaccines.filter(v => v !== name);
  renderVaccines();
}

function renderVaccines() {
  const container = document.getElementById("active-vaccines-container");
  if (!container) return;

  if (activeVaccines.length === 0) {
    container.innerHTML = `<span class="text-xs text-slate-400 italic">Nenhuma vacina registrada para este animal.</span>`;
    return;
  }

  container.innerHTML = activeVaccines.map(name => `
    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-teal-100 text-teal-900 border border-teal-300">
      <i data-lucide="check" class="w-3 h-3 text-teal-700"></i>
      ${name}
      <button type="button" onclick="removeVaccine('${name}')" class="hover:text-rose-600 ml-0.5" title="Remover vacina">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>
    </span>
  `).join("");

  if (window.lucide) lucide.createIcons({ root: container });
}

/* ==========================================================================
   CRUD: SALVAR (CREATE & UPDATE)
   ========================================================================== */

async function handleSavePet(event) {
  event.preventDefault();

  const id = document.getElementById("pet-id").value;
  const nome = document.getElementById("pet-nome").value.trim();
  const especie = document.getElementById("pet-especie").value;
  const raca = document.getElementById("pet-raca").value.trim() || "Vira-lata (SRD)";
  const idade = document.getElementById("pet-idade").value.trim();
  const sexo = document.getElementById("pet-sexo").value;
  const cidade = document.getElementById("pet-cidade").value.trim() || "São Paulo - SP";
  const whatsapp = document.getElementById("pet-whatsapp").value.trim() || "5511999998888";

  // Porte e Físico
  const porte = document.getElementById("pet-porte").value;
  const peso = document.getElementById("pet-peso").value.trim();
  const pelagem = document.getElementById("pet-pelagem").value.trim();

  // Mídias
  const fotos = activePhotos.map(p => p.dataUrl || p.src);
  const videos = activeVideo ? [activeVideo.dataUrl || activeVideo.src] : [];

  // FICHA MÉDICA BÁSICA (OBRIGATÓRIA)
  const castrado = document.getElementById("pet-castrado").checked;
  const castracaoObs = document.getElementById("pet-castracao-obs").value.trim();
  const vermifugado = document.getElementById("pet-vermifugado").checked;
  const vermifugoObs = document.getElementById("pet-vermifugo-obs").value.trim();

  // PARTE OPCIONAL: Doenças, Enfermidades ou Cuidados Extras
  const possuiEnfermidades = document.getElementById("toggle-enfermidades").checked;
  let enfermidadesDescricao = "";
  let medicamentosContinuos = "";
  let cuidadosExtras = "";

  if (possuiEnfermidades) {
    enfermidadesDescricao = document.getElementById("pet-enfermidade-desc").value.trim();
    medicamentosContinuos = document.getElementById("pet-medicamentos").value.trim();
    cuidadosExtras = document.getElementById("pet-cuidados-extras").value.trim();
  }

  const saudeObj = {
    castrado,
    castracaoObs,
    vermifugado,
    vermifugoObs,
    vacinas: [...activeVaccines],
    possuiEnfermidades,
    enfermidadesDescricao,
    medicamentosContinuos,
    cuidadosExtras,
    // Aliases para manter compatibilidade:
    assistenciaMedica: possuiEnfermidades ? (enfermidadesDescricao + (medicamentosContinuos ? " • Remédios: " + medicamentosContinuos : "")) : "",
    cuidadosEspeciais: possuiEnfermidades ? cuidadosExtras : ""
  };

  // Comportamento e Status
  const rawTemp = document.getElementById("pet-temperamento").value;
  const temperamento = rawTemp
    .split(/[,;]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  const historiaResgate = document.getElementById("pet-historia-resgate")?.value.trim() || "";
  const descricao = document.getElementById("pet-descricao").value.trim();
  const status = document.getElementById("pet-status")?.value || "disponivel";
  const ongId = document.getElementById("pet-ong-id")?.value || "ong-001";
  const ongNames = {
    "ong-001": "Lar dos Anjos",
    "ong-002": "Lar dos Anjos",
    "ong-003": "Lar dos Anjos"
  };

  // Critérios de Compatibilidade para o Quiz
  const nivelEnergia = document.getElementById("pet-energia")?.value || "moderada";
  const tipoDomicilio = document.getElementById("pet-domicilio")?.value || "qualquer";
  const tempoSozinho = document.getElementById("pet-tempo-sozinho")?.value || "independente";
  const conviveCriancas = document.getElementById("pet-criancas")?.value || "sim";
  const conviveCaes = document.getElementById("pet-outros-caes")?.value || "sim";
  const conviveGatos = document.getElementById("pet-gatos")?.value || "sim";


  const petData = {
    id: id || ("pet-" + Date.now()),
    nome,
    especie,
    raca,
    idade,
    sexo,
    cidade,
    contatoWhatsapp: whatsapp,
    porte,
    peso: peso || "",
    pelagem: pelagem || "",
    fotos: fotos.length > 0 ? fotos : ["https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80"],
    videos,
    saude: saudeObj,
    temperamento: temperamento.length > 0 ? temperamento : ["Dócil", "Sociável"],
    historiaResgate,
    descricao: descricao || "Animal meigo à procura de uma família responsável e carinhosa.",
    status,
    ongId,
    ongNome: ongNames[ongId] || "ONG Parceira",
    // Critérios de Compatibilidade para o Quiz
    nivelEnergia,
    tipoDomicilio,
    tempoSozinho,
    conviveCriancas,
    conviveCaes,
    conviveGatos,
    compatibilidade: {
      nivelEnergia,
      tipoDomicilio,
      tempoSozinho,
      conviveCriancas,
      conviveCaes,
      conviveGatos
    }
  };

  try {
    await PetDB.save(petData);
    showToast(`Animal "${nome}" ${id ? 'atualizado' : 'cadastrado'} com sucesso!`);
    cancelEdit();
    await loadAdminList();
  } catch (e) {
    console.error("Erro ao salvar:", e);
    showToast("Erro ao salvar no banco de dados", "error");
  }
}

/* ==========================================================================
   CRUD: EDITAR (READ FOR UPDATE)
   ========================================================================== */

async function editPet(id) {
  try {
    const pet = await PetDB.getById(id);
    if (!pet) return;

    document.getElementById("pet-id").value = pet.id;
    document.getElementById("pet-nome").value = pet.nome || "";
    document.getElementById("pet-especie").value = pet.especie || "cachorro";
    document.getElementById("pet-raca").value = pet.raca || "";
    document.getElementById("pet-idade").value = pet.idade || "";
    document.getElementById("pet-sexo").value = pet.sexo || "macho";
    document.getElementById("pet-cidade").value = pet.cidade || "";
    document.getElementById("pet-whatsapp").value = pet.contatoWhatsapp || "";

    // Porte e Físico
    document.getElementById("pet-porte").value = pet.porte || "medio";
    document.getElementById("pet-peso").value = pet.peso || "";
    document.getElementById("pet-pelagem").value = pet.pelagem || "";

    // FICHA MÉDICA BÁSICA (OBRIGATÓRIA)
    document.getElementById("pet-castrado").checked = !!pet.saude?.castrado;
    document.getElementById("pet-castracao-obs").value = pet.saude?.castracaoObs || "";
    document.getElementById("pet-vermifugado").checked = !!pet.saude?.vermifugado;
    document.getElementById("pet-vermifugo-obs").value = pet.saude?.vermifugoObs || "";
    activeVaccines = Array.isArray(pet.saude?.vacinas) ? [...pet.saude.vacinas] : [];
    renderVaccines();

    // ENFERMIDADES / CUIDADOS EXTRAS (OPCIONAL)
    const toggleEnf = document.getElementById("toggle-enfermidades");
    const temEnfermidades = pet.saude?.possuiEnfermidades || 
      !!(pet.saude?.enfermidadesDescricao || pet.saude?.medicamentosContinuos || pet.saude?.cuidadosExtras);

    toggleEnf.checked = !!temEnfermidades;
    toggleEnfermidadesSection();

    if (temEnfermidades && pet.saude) {
      document.getElementById("pet-enfermidade-desc").value = pet.saude.enfermidadesDescricao || pet.saude.assistenciaMedica || "";
      document.getElementById("pet-medicamentos").value = pet.saude.medicamentosContinuos || "";
      document.getElementById("pet-cuidados-extras").value = pet.saude.cuidadosExtras || pet.saude.cuidadosEspeciais || "";
    } else {
      document.getElementById("pet-enfermidade-desc").value = "";
      document.getElementById("pet-medicamentos").value = "";
      document.getElementById("pet-cuidados-extras").value = "";
    }

    // Mídias: Fotos
    activePhotos = (pet.fotos || []).map(f => ({
      type: typeof f === "string" ? (f.includes("cloudinary.com") ? "cloudinary" : "url") : "blob",
      src: PetDB.getMediaUrl(f),
      dataUrl: typeof f === "string" ? f : null
    }));
    renderPhotoPreviews();

    // Mídias: Vídeos
    if (pet.videos && pet.videos.length > 0) {
      const v = pet.videos[0];
      const isYouTube = typeof v === "string" && (v.includes("youtube.com") || v.includes("youtu.be"));
      const isCloudinary = typeof v === "string" && v.includes("cloudinary.com");
      activeVideo = {
        type: isYouTube ? "youtube" : (isCloudinary ? "cloudinary" : "file"),
        src: PetDB.getMediaUrl(v),
        dataUrl: typeof v === "string" ? v : null
      };
      renderVideoPreview();
    } else {
      removeActiveVideo();
    }

    // Comportamento e Bio
    document.getElementById("pet-temperamento").value = (pet.temperamento || []).join(", ");
    const elHistoria = document.getElementById("pet-historia-resgate");
    if (elHistoria) elHistoria.value = pet.historiaResgate || "";
    document.getElementById("pet-descricao").value = pet.descricao || "";
    document.getElementById("pet-status").value = pet.status || "disponivel";
    if (document.getElementById("pet-ong-id")) {
      document.getElementById("pet-ong-id").value = pet.ongId || "ong-001";
    }

    // Critérios de Compatibilidade para o Quiz
    const comp = pet.compatibilidade || {};
    if (document.getElementById("pet-energia")) {
      document.getElementById("pet-energia").value = pet.nivelEnergia || comp.nivelEnergia || (
        (pet.temperamento || []).some(t => t.toLowerCase().includes("calm") || t.toLowerCase().includes("tranquil") || t.toLowerCase().includes("soneca") || t.toLowerCase().includes("idoso")) ? "baixa" :
        ((pet.temperamento || []).some(t => t.toLowerCase().includes("ativo") || t.toLowerCase().includes("energia") || t.toLowerCase().includes("correr") || t.toLowerCase().includes("brincalhão")) ? "alta" : "moderada")
      );
    }
    if (document.getElementById("pet-domicilio")) {
      document.getElementById("pet-domicilio").value = pet.tipoDomicilio || comp.tipoDomicilio || (
        (pet.porte === "grande" || pet.porte === "gigante") ? "espaco_amplo" :
        (pet.especie === "gato" || pet.porte === "mini" || pet.porte === "pequeno" ? "apartamento" : "qualquer")
      );
    }
    if (document.getElementById("pet-tempo-sozinho")) {
      document.getElementById("pet-tempo-sozinho").value = pet.tempoSozinho || comp.tempoSozinho || "independente";
    }
    if (document.getElementById("pet-criancas")) {
      document.getElementById("pet-criancas").value = pet.conviveCriancas || comp.conviveCriancas || "sim";
    }
    if (document.getElementById("pet-outros-caes")) {
      document.getElementById("pet-outros-caes").value = pet.conviveCaes || comp.conviveCaes || "sim";
    }
    if (document.getElementById("pet-gatos")) {
      document.getElementById("pet-gatos").value = pet.conviveGatos || comp.conviveGatos || (pet.especie === "gato" ? "sim" : "adaptacao");
    }

    // Modo de Edição
    document.getElementById("form-title").innerHTML = `
      <i data-lucide="edit" class="w-5 h-5 text-orange-500"></i>
      Editando: <span class="text-orange-600">${pet.nome}</span>
    `;
    document.getElementById("btn-submit").innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Atualizar Animal`;
    document.getElementById("btn-cancel-edit").classList.remove("hidden");

    document.getElementById("form-container").scrollIntoView({ behavior: "smooth" });

    const formCont = document.getElementById("form-container");
    if (window.lucide && formCont) lucide.createIcons({ root: formCont });
  } catch (e) {
    console.error("Erro ao carregar pet para edição:", e);
  }
}

function cancelEdit() {
  document.getElementById("pet-form").reset();
  document.getElementById("pet-id").value = "";
  activePhotos = [];
  activeVideo = null;
  activeVaccines = [];

  // Reseta toggle de enfermidades
  document.getElementById("toggle-enfermidades").checked = false;
  toggleEnfermidadesSection();

  // Reseta campos de compatibilidade do quiz
  if (document.getElementById("pet-energia")) document.getElementById("pet-energia").value = "moderada";
  if (document.getElementById("pet-domicilio")) document.getElementById("pet-domicilio").value = "qualquer";
  if (document.getElementById("pet-tempo-sozinho")) document.getElementById("pet-tempo-sozinho").value = "independente";
  if (document.getElementById("pet-criancas")) document.getElementById("pet-criancas").value = "sim";
  if (document.getElementById("pet-outros-caes")) document.getElementById("pet-outros-caes").value = "sim";
  if (document.getElementById("pet-gatos")) document.getElementById("pet-gatos").value = "sim";

  renderPhotoPreviews();
  removeActiveVideo();
  renderVaccines();

  document.getElementById("form-title").innerHTML = `
    <i data-lucide="plus-circle" class="w-5 h-5 text-orange-500"></i>
    Cadastrar Novo Animal
  `;
  document.getElementById("btn-submit").innerHTML = `<i data-lucide="save" class="w-4 h-4"></i> Salvar Animal`;
  document.getElementById("btn-cancel-edit").classList.add("hidden");

  const formCont = document.getElementById("form-container");
  if (window.lucide && formCont) lucide.createIcons({ root: formCont });
}

/* ==========================================================================
   CRUD: EXCLUIR (DELETE)
   ========================================================================== */

async function deletePet(id, nome) {
  if (confirm(`Tem certeza que deseja remover o animal "${nome}" do catálogo?`)) {
    try {
      await PetDB.delete(id);
      showToast(`"${nome}" foi removido do catálogo.`, "info");
      await loadAdminList();
    } catch (e) {
      console.error("Erro ao excluir:", e);
      showToast("Erro ao excluir animal do banco.", "error");
    }
  }
}

async function restoreDefaults() {
  if (confirm("Deseja restaurar a lista inicial de animais de exemplo? Todas as alterações serão substituídas pelos dados originais.")) {
    try {
      await PetDB.resetDefaults();
      cancelEdit();
      await loadAdminList();
      showToast("Catálogo original restaurado!");
    } catch (e) {
      console.error("Erro ao restaurar:", e);
      showToast("Erro ao restaurar dados.", "error");
    }
  }
}

async function exportData() {
  try {
    showToast("Gerando arquivo de backup...");
    await PetDB.exportBackup();
  } catch (e) {
    console.error("Erro ao exportar:", e);
    showToast("Erro ao exportar backup.", "error");
  }
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const ok = await PetDB.importBackup(e.target.result);
      if (ok) {
        showToast("Backup importado com sucesso!");
        await loadAdminList();
      } else {
        showToast("Erro: Formato de arquivo JSON inválido.", "error");
      }
    } catch (err) {
      showToast("Erro ao importar arquivo.", "error");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

/* ==========================================================================
   FEEDBACK: NOTIFICAÇÃO TOAST
   ========================================================================== */

let toastTimeout;
function showToast(message, type = "success") {
  const toast = document.getElementById("toast-notification");
  const msgEl = document.getElementById("toast-message");
  const iconEl = document.getElementById("toast-icon");
  if (!toast || !msgEl) return;

  clearTimeout(toastTimeout);
  msgEl.textContent = message;

  if (type === "error") {
    toast.className = "flex items-center gap-2.5 px-4 py-3 bg-rose-900 text-white rounded-2xl shadow-xl text-xs font-bold border border-rose-700 transition-all";
    iconEl.setAttribute("data-lucide", "alert-triangle");
    iconEl.className = "w-4 h-4 text-rose-400";
  } else if (type === "info") {
    toast.className = "flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-2xl shadow-xl text-xs font-bold border border-slate-700 transition-all";
    iconEl.setAttribute("data-lucide", "info");
    iconEl.className = "w-4 h-4 text-blue-400";
  } else {
    toast.className = "flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-2xl shadow-xl text-xs font-bold border border-slate-700 transition-all";
    iconEl.setAttribute("data-lucide", "check-circle");
    iconEl.className = "w-4 h-4 text-teal-400";
  }

  if (window.lucide && toast) lucide.createIcons({ root: toast });

  toast.classList.remove("translate-y-24", "opacity-0", "pointer-events-none");
  toast.classList.add("translate-y-0", "opacity-100");

  toastTimeout = setTimeout(() => {
    toast.classList.add("translate-y-24", "opacity-0", "pointer-events-none");
    toast.classList.remove("translate-y-0", "opacity-100");
  }, 3500);
}

/* ==========================================================================
   GERENCIAMENTO DE ABAS (CRUD vs ANALYTICS / PESQUISA)
   ========================================================================== */

let currentAdminTab = "crud";
let currentAnalyticsPetList = [];

function switchAdminTab(tabName) {
  currentAdminTab = tabName;
  const crudContent = document.getElementById("tab-content-crud");
  const solidarityContent = document.getElementById("tab-content-solidarity");
  const analyticsContent = document.getElementById("tab-content-analytics");
  
  const btnCrud = document.getElementById("tab-btn-crud");
  const btnSolidarity = document.getElementById("tab-btn-solidarity");
  const btnAnalytics = document.getElementById("tab-btn-analytics");

  if (crudContent) crudContent.classList.add("hidden");
  if (solidarityContent) solidarityContent.classList.add("hidden");
  if (analyticsContent) analyticsContent.classList.add("hidden");

  const inactiveClass = "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:text-[#007E82] hover:bg-[#F9F3EA] transition-all border border-transparent flex-shrink-0 whitespace-nowrap cursor-pointer";
  if (btnCrud) btnCrud.className = inactiveClass;
  if (btnSolidarity) btnSolidarity.className = inactiveClass;
  if (btnAnalytics) btnAnalytics.className = inactiveClass;

  const activeClass = "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-[#e6f4f5] text-[#007E82] shadow-xs border-2 border-[#007E82] transition-all flex-shrink-0 whitespace-nowrap cursor-pointer";

  if (tabName === "solidarity") {
    if (solidarityContent) solidarityContent.classList.remove("hidden");
    if (btnSolidarity) {
      btnSolidarity.className = activeClass;
    }
    renderAdminSolidarity();
  } else if (tabName === "analytics") {
    if (analyticsContent) analyticsContent.classList.remove("hidden");
    if (btnAnalytics) {
      btnAnalytics.className = activeClass;
    }
    renderAnalyticsDashboard();
  } else {
    if (crudContent) crudContent.classList.remove("hidden");
    if (btnCrud) {
      btnCrud.className = activeClass;
    }
  }
}

/* ==========================================================================
   PAINEL ANALÍTICO E PESQUISA DE EXTENSÃO (MODERADOR)
   ========================================================================== */

async function renderAnalyticsDashboard() {
  if (!window.AdoteAnalytics) return;

  try {
    const report = await AdoteAnalytics.getReportData(allAdminPets);

    // Atualiza KPIs
    const elViews = document.getElementById("kpi-total-views");
    const elQuizzes = document.getElementById("kpi-total-quizzes");
    const elAnonBadge = document.getElementById("kpi-anon-badge");
    const elIdentified = document.getElementById("kpi-total-identified");
    const elWhatsApp = document.getElementById("kpi-total-whatsapp");
    const elConv = document.getElementById("kpi-conversion-rate");
    const elTotalLeadsBadge = document.getElementById("badge-total-leads");

    if (elViews) elViews.textContent = report.totalViews;
    if (elQuizzes) elQuizzes.textContent = report.totalQuizzes;
    if (elAnonBadge) elAnonBadge.textContent = `${report.totalAnonymousQuizzes || 0} anônimos`;
    if (elIdentified) elIdentified.textContent = report.totalIdentifiedQuizzes || 0;
    if (elWhatsApp) elWhatsApp.textContent = report.totalWhatsApp;
    if (elConv) elConv.textContent = `${report.globalConversionRate}%`;
    if (elTotalLeadsBadge) elTotalLeadsBadge.textContent = `${report.adopterLeads?.length || 0} Interessados`;

    // Tabela por animal
    currentAnalyticsPetList = report.petList || [];
    renderAnalyticsPetTableRows(currentAnalyticsPetList);

    // Tabela de Adotantes Interessados (Leads para a ONG)
    renderAnalyticsLeadsTableRows(report.adopterLeads || []);

    // Gráficos Demográficos
    renderDemographics(report.demographics, report.totalQuizzes);

    const tabContent = document.getElementById("tab-content-analytics");
    if (window.lucide && tabContent) lucide.createIcons({ root: tabContent });
  } catch (err) {
    console.error("Erro ao carregar dashboard de analytics:", err);
  }
}

function renderAnalyticsLeadsTableRows(leads) {
  const tbody = document.getElementById("analytics-leads-tbody");
  if (!tbody) return;

  if (!leads || leads.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-slate-400">
          <i data-lucide="user-x" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
          <p class="font-medium">Nenhum adotante identificado manifestou interesse ainda.</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Quando um usuário anônimo ou identificado clicar em "Quero Adotar", seus dados aparecerão aqui.</p>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons({ root: tbody });
    return;
  }

  tbody.innerHTML = leads.map(lead => {
    const dataFormatada = new Date(lead.timestamp).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const cleanPhone = (lead.telefone || "").replace(/\D/g, "");
    const waUrl = cleanPhone.length >= 10
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá ${lead.nome}! Somos da coordenação da ONG/MatchPet. Vimos que você demonstrou interesse em adotar o pet ${lead.petNome}. Podemos conversar sobre a adoção responsável?`)}`
      : "#";

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
          ${dataFormatada}
        </td>
        <td class="py-3 px-4">
          <span class="font-bold text-slate-900 block">${lead.nome}</span>
        </td>
        <td class="py-3 px-4 font-mono text-slate-700">
          ${lead.telefone}
        </td>
        <td class="py-3 px-4">
          <span class="font-bold text-orange-600 block">${lead.petNome}</span>
          <span class="text-[10px] text-slate-400">ID: ${lead.petId}</span>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded-md font-bold text-xs ${lead.score !== '—' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}">
            ${lead.score}
          </span>
        </td>
        <td class="py-3 px-4 text-[11px] text-slate-600">
          <span class="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
            ${lead.tipoOrigem}
          </span>
        </td>
        <td class="py-3 px-4 text-center">
          ${cleanPhone.length >= 10 ? `
            <a 
              href="${waUrl}" 
              target="_blank" 
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-transform hover:scale-105"
              title="Abrir conversa no WhatsApp com o adotante"
            >
              <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
              <span>Falar no WhatsApp</span>
            </a>
          ` : `
            <span class="text-slate-400 text-xs">—</span>
          `}
        </td>
      </tr>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons({ root: tbody });
}

function renderAnalyticsPetTableRows(petList) {
  const tbody = document.getElementById("analytics-pet-tbody");
  if (!tbody) return;

  if (!petList || petList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-10 text-slate-400">
          <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
          <p>Nenhuma métrica de visualização ou questionário registrada ainda.</p>
          <p class="text-[11px] text-slate-400 mt-1">Clique em "Simular Dados Demo" acima para gerar interações simuladas.</p>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons({ root: tbody });
    return;
  }

  const maxViews = Math.max(1, ...petList.map(p => p.views));

  tbody.innerHTML = petList.map(pet => {
    const defaultImg = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=150&q=80";
    const imgUrl = pet.foto ? (window.PetDB ? PetDB.getMediaUrl(pet.foto) : pet.foto) : defaultImg;
    const viewPct = Math.round((pet.views / maxViews) * 100);

    // Badge de afinidade média
    let affinityBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">Sem notas</span>`;
    if (pet.avgAffinityScore > 0) {
      const color = pet.avgAffinityScore >= 80 ? "bg-teal-100 text-teal-800 border-teal-200" :
                    pet.avgAffinityScore >= 60 ? "bg-amber-100 text-amber-800 border-amber-200" :
                    "bg-slate-100 text-slate-700 border-slate-200";
      affinityBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-black border ${color}">${pet.avgAffinityScore}%</span>`;
    }

    // Badge de conversão
    const convBadgeColor = pet.conversionRate >= 30 ? "text-teal-700 bg-teal-50 border-teal-200" :
                           pet.conversionRate > 0 ? "text-[#007E82] bg-[#e6f4f5] border-[#b2dedf]" :
                           "text-slate-500 bg-slate-50 border-slate-200";

    return `
      <tr class="hover:bg-slate-50/80 transition-colors">
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <img src="${imgUrl}" alt="${pet.nome}" class="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-slate-200 shadow-2xs">
            <div>
              <span class="font-extrabold text-slate-900 block text-xs sm:text-sm">${pet.nome}</span>
              <span class="text-[10px] text-slate-400 font-mono">ID: ${pet.id}</span>
            </div>
          </div>
        </td>
        <td class="py-3 px-3 capitalize text-slate-700 font-medium">
          <span class="inline-flex items-center gap-1">
            ${pet.especie === 'gato' ? '🐱 Gato' : '🐶 Cão'} • ${pet.porte || 'médio'}
          </span>
        </td>
        <td class="py-3 px-3 text-center">
          <div class="inline-flex flex-col items-center">
            <span class="font-extrabold text-slate-900 text-sm">${pet.views}</span>
            <div class="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
              <div class="h-full bg-blue-500 rounded-full" style="width: ${viewPct}%"></div>
            </div>
          </div>
        </td>
        <td class="py-3 px-3 text-center">
          ${pet.top1Count > 0 
            ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">⭐ ${pet.top1Count}x</span>` 
            : `<span class="text-slate-400 text-xs">-</span>`}
        </td>
        <td class="py-3 px-3 text-center">
          ${pet.top5Count > 0 
            ? `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">${pet.top5Count}x</span>` 
            : `<span class="text-slate-400 text-xs">-</span>`}
        </td>
        <td class="py-3 px-3 text-center">
          ${affinityBadge}
        </td>
        <td class="py-3 px-3 text-center font-black text-teal-700">
          <span class="inline-flex items-center gap-1">
            <i data-lucide="message-circle" class="w-3.5 h-3.5 text-teal-600"></i>
            ${pet.whatsappContacts}
          </span>
        </td>
        <td class="py-3 px-4 text-center">
          <span class="px-2.5 py-1 rounded-xl text-xs font-black border ${convBadgeColor}">
            ${pet.conversionRate}%
          </span>
        </td>
      </tr>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons({ root: tbody });
}

function filterAnalyticsPetsTableDirect() {
  const query = (document.getElementById("analytics-pet-search")?.value || "").toLowerCase().trim();
  if (!query) {
    renderAnalyticsPetTableRows(currentAnalyticsPetList);
    return;
  }
  const filtered = currentAnalyticsPetList.filter(p => 
    (p.nome && p.nome.toLowerCase().includes(query)) ||
    (p.id && p.id.toLowerCase().includes(query)) ||
    (p.especie && p.especie.toLowerCase().includes(query))
  );
  renderAnalyticsPetTableRows(filtered);
}

const filterAnalyticsPetsTable = debounce(filterAnalyticsPetsTableDirect, 180);
window.filterAnalyticsPetsTable = filterAnalyticsPetsTable;
window.filterAnalyticsPetsTableDirect = filterAnalyticsPetsTableDirect;

function renderDemographics(demo, totalQuizzes) {
  const total = Math.max(1, totalQuizzes || 0);

  // 1. Moradia
  const moradiaLabels = {
    "apartamento_com_tela": "Apartamento (com tela)",
    "apartamento_sem_tela": "Apartamento (sem tela)",
    "casa_quintal_fechado": "Casa (muro fechado)",
    "casa_quintal_aberto": "Casa (quintal aberto)"
  };
  renderBarChart("demo-moradia-chart", demo.moradia || {}, moradiaLabels, total, "bg-blue-500");

  // 2. Tempo Sozinho
  const tempoLabels = {
    "ate_2h": "Até 2 horas",
    "2h_a_5h": "2 a 5 horas",
    "5h_a_8h": "5 a 8 horas",
    "mais_8h": "Mais de 8 horas"
  };
  renderBarChart("demo-tempo-chart", demo.tempoSozinho || {}, tempoLabels, total, "bg-amber-500");

  // 3. Estilo de Vida / Energia
  const energiaLabels = {
    "muito_ativo": "Muito Ativo (corridas/parques)",
    "moderado": "Moderado (passeios diários)",
    "tranquilo": "Tranquilo (calmo / caseiro)"
  };
  renderBarChart("demo-energia-chart", demo.estiloVida || {}, energiaLabels, total, "bg-teal-500");

  // 4. Crianças
  const criancasLabels = {
    "sim_pequenas": "Sim, crianças pequenas (< 6 anos)",
    "sim_maiores": "Sim, crianças maiores (> 6 anos)",
    "nao": "Não há crianças"
  };
  renderBarChart("demo-criancas-chart", demo.temCriancas || {}, criancasLabels, total, "bg-pink-500");

  // 5. Cuidados Médicos
  const medicoLabels = {
    "sim_amor": "Sim, com muito amor ❤️",
    "apenas_saudavel": "Apenas pet 100% saudável",
    "indiferente": "Posso avaliar o caso"
  };
  renderBarChart("demo-medico-chart", demo.cuidadosMedicos || {}, medicoLabels, total, "bg-rose-500");

  // 6. Elegibilidade Geral
  const elegEl = document.getElementById("demo-elegibilidade-chart");
  if (elegEl) {
    const aptos = demo.aprovadosGeral || 0;
    const desq = demo.desclassificadosGeral || 0;
    const aptosPct = Math.round((aptos / total) * 100);
    const desqPct = Math.round((desq / total) * 100);

    elegEl.innerHTML = `
      <div class="space-y-3 pt-1">
        <div class="space-y-1">
          <div class="flex justify-between text-xs font-bold text-slate-700">
            <span class="flex items-center gap-1.5 text-teal-700">
              <i data-lucide="check-circle" class="w-3.5 h-3.5 text-teal-600"></i> Aptos e Elegíveis
            </span>
            <span>${aptos} (${aptosPct}%)</span>
          </div>
          <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-teal-500 rounded-full transition-all duration-500" style="width: ${aptosPct}%"></div>
          </div>
        </div>

        <div class="space-y-1">
          <div class="flex justify-between text-xs font-bold text-slate-700">
            <span class="flex items-center gap-1.5 text-rose-700">
              <i data-lucide="alert-octagon" class="w-3.5 h-3.5 text-rose-600"></i> Desclassificados (Critérios Impeditivos)
            </span>
            <span>${desq} (${desqPct}%)</span>
          </div>
          <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-rose-500 rounded-full transition-all duration-500" style="width: ${desqPct}%"></div>
          </div>
          <p class="text-[10px] text-slate-400 pt-0.5">Menores de 21 anos, presença de cães agressivos ou falta de consenso entre moradores.</p>
        </div>
      </div>
    `;
  }
}

function renderBarChart(containerId, countsObj, labelMap, total, barColorClass = "bg-orange-500") {
  const container = document.getElementById(containerId);
  if (!container) return;

  const entries = Object.entries(labelMap);
  container.innerHTML = entries.map(([key, label]) => {
    const count = countsObj[key] || 0;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;

    return `
      <div class="space-y-1">
        <div class="flex justify-between text-[11px] font-semibold text-slate-700">
          <span class="truncate pr-2">${label}</span>
          <span class="font-mono text-slate-500">${count} (${pct}%)</span>
        </div>
        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full ${barColorClass} rounded-full transition-all duration-500" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

/* ==========================================================================
   AÇÕES DE EXPORTAÇÃO, DEMO E LIMPEZA DE ANALYTICS
   ========================================================================== */

async function exportAnalyticsCSV() {
  if (!window.AdoteAnalytics) return;
  try {
    showToast("Gerando relatório CSV para Pesquisa e Extensão...");
    await AdoteAnalytics.exportResearchCSV(allAdminPets);
  } catch (e) {
    console.error("Erro ao exportar CSV:", e);
    showToast("Erro ao exportar CSV.", "error");
  }
}

async function exportAnalyticsJSON() {
  if (!window.AdoteAnalytics) return;
  try {
    showToast("Gerando backup completo JSON...");
    await AdoteAnalytics.exportResearchJSON();
  } catch (e) {
    console.error("Erro ao exportar JSON:", e);
    showToast("Erro ao exportar JSON.", "error");
  }
}

async function handleSeedAnalyticsDemo() {
  if (!window.AdoteAnalytics) return;
  try {
    showToast("Simulando 40+ questionários e centenas de visitas...");
    await AdoteAnalytics.seedDemoData(allAdminPets);
    showToast("Dados de demonstração gerados com sucesso!");
    await renderAnalyticsDashboard();
  } catch (e) {
    console.error("Erro ao simular demo:", e);
    showToast("Erro ao simular dados demo.", "error");
  }
}

async function handleClearAnalytics() {
  if (!confirm("Tem certeza de que deseja zerar todos os dados de métricas e questionários?")) {
    return;
  }
  if (!window.AdoteAnalytics) return;
  try {
    await AdoteAnalytics.clearAll();
    showToast("Métricas zeradas com sucesso.", "info");
    await renderAnalyticsDashboard();
  } catch (e) {
    console.error("Erro ao zerar analytics:", e);
    showToast("Erro ao zerar analytics.", "error");
  }
}

// Expõe funções para o escopo global
window.handlePhotoUpload = handlePhotoUpload;
window.handleVideoUpload = handleVideoUpload;
window.addPhotosFromUrls = addPhotosFromUrls;
window.removePhoto = removePhoto;
window.applyVideoUrl = applyVideoUrl;
window.removeActiveVideo = removeActiveVideo;
window.quickAddVaccine = quickAddVaccine;
window.addCustomVaccine = addCustomVaccine;
window.removeVaccine = removeVaccine;
window.handleSavePet = handleSavePet;
window.editPet = editPet;
window.deletePet = deletePet;
window.cancelEdit = cancelEdit;
window.restoreDefaults = restoreDefaults;
window.exportData = exportData;
window.importData = importData;
window.filterAdminList = filterAdminList;
window.toggleEnfermidadesSection = toggleEnfermidadesSection;
window.openCloudinaryModal = openCloudinaryModal;
window.closeCloudinaryModal = closeCloudinaryModal;
window.saveCloudinarySettings = saveCloudinarySettings;
window.testCloudinaryConnection = testCloudinaryConnection;
window.switchAdminTab = switchAdminTab;
window.renderAnalyticsDashboard = renderAnalyticsDashboard;
window.filterAnalyticsPetsTable = filterAnalyticsPetsTable;
window.exportAnalyticsCSV = exportAnalyticsCSV;
window.exportAnalyticsJSON = exportAnalyticsJSON;
window.handleSeedAnalyticsDemo = handleSeedAnalyticsDemo;
window.handleClearAnalytics = handleClearAnalytics;

// Exportações da Moderação Solidária
window.renderAdminSolidarity = renderAdminSolidarity;
window.loadAdminOngs = loadAdminOngs;
window.openEditOngModal = openEditOngModal;
window.closeModalEditOng = closeModalEditOng;
window.handleSaveOng = handleSaveOng;
window.loadAdminEventos = loadAdminEventos;
window.openNewEventoModal = openNewEventoModal;
window.openEditEventoModal = openEditEventoModal;
window.closeModalEditEvento = closeModalEditEvento;
window.handleSaveEvento = handleSaveEvento;
window.deleteAdminEvento = deleteAdminEvento;
window.loadAdminRifas = loadAdminRifas;
window.openNewRifaModal = openNewRifaModal;
window.openEditRifaModal = openEditRifaModal;
window.closeModalEditRifa = closeModalEditRifa;
window.toggleRifaTypeFields = toggleRifaTypeFields;
window.handleSaveRifa = handleSaveRifa;
window.quickAddContribution = quickAddContribution;
window.deleteAdminRifa = deleteAdminRifa;

/* ==========================================================================
   MODERAÇÃO SOLIDÁRIA: ONGS, FEIRINHAS DE ADOÇÃO & RIFAS (MODERADOR)
   ========================================================================== */

async function renderAdminSolidarity() {
  loadAdminEventos();
  loadAdminRifas();
  await loadAdminOngs();
  await renderNgoContractsAuditTable();
}

/// === GESTÃO DE ONGS ===
let adminEditingShelterPhotos = [];
let adminEditingShelterVideos = [];

async function loadAdminOngs() {
  const container = document.getElementById("admin-ongs-list");
  if (!container) return;

  let ongs = [];
  try {
    ongs = await SolidarityStorage.getOngs();
  } catch (e) {
    ongs = window.DEFAULT_ONGS || [];
  }

  container.innerHTML = ongs.map(ong => {
    const totalAdotados = ong.totalAdotadosCalc || ong.totalAdotados || 0;
    const disponiveis = ong.animaisDisponiveis || ong.baseDisponiveis || 0;
    const countFotos = Array.isArray(ong.fotosAbrigo) ? ong.fotosAbrigo.length : 0;
    const countVideos = Array.isArray(ong.videosAbrigo) ? ong.videosAbrigo.length : 0;

    return `
      <div class="p-5 bg-white rounded-3xl border-2 border-[#007E82]/30 shadow-md flex flex-col justify-between space-y-4 group">
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#e6f4f5] text-[#007E82] uppercase tracking-wider border border-[#007E82]/30">${ong.sigla || 'ONG'}</span>
              <h4 class="text-lg font-black text-slate-900 mt-1">${ong.nome}</h4>
              <p class="text-xs text-slate-500">${ong.cidade} • ${ong.regiao || 'Sede'}</p>
            </div>
            <button onclick="openEditOngModal('${ong.id}')" class="p-2.5 rounded-xl bg-[#F9F3EA] hover:bg-[#D19864] text-slate-800 hover:text-slate-950 border border-[#e8ddcf] shadow-2xs transition-all cursor-pointer" title="Editar História, Fotos & Vídeos da ONG">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Métricas Obrigatórias em Destaque -->
          <div class="grid grid-cols-2 gap-2 p-3 bg-[#F9F3EA] rounded-2xl border border-[#e8ddcf] mb-3">
            <div>
              <span class="text-xs font-black text-slate-900 block">${ong.nome}</span>
              <span class="text-[11px] text-slate-600 block">${ong.cidade} • ${ong.regiao || 'Sede'}</span>
            </div>
            <div class="text-right">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#D19864] text-slate-950 border border-[#b87e4c]">ONG Parceira Oficial</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-2xl my-3 text-center border border-slate-200">
            <div>
              <span class="block text-sm font-black text-slate-800">${disponiveis}</span>
              <span class="text-[10px] text-slate-500 uppercase font-bold">Disponíveis</span>
            </div>
            <div>
              <span class="block text-sm font-black text-[#007E82]">${totalAdotados}</span>
              <span class="text-[10px] text-slate-500 uppercase font-bold">Adotados</span>
            </div>
          </div>

          <!-- Mídias do Abrigo (Fotos e Vídeos) -->
          <div class="flex items-center gap-2 mb-3">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#e6f4f5] text-[#007E82] text-xs font-bold border border-[#007E82]/30">
              <i data-lucide="camera" class="w-3.5 h-3.5"></i> ${countFotos} Fotos do Abrigo
            </span>
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#faeee3] text-[#D19864] text-xs font-bold border border-[#D19864]/30">
              <i data-lucide="video" class="w-3.5 h-3.5"></i> ${countVideos} Vídeos
            </span>
          </div>

          <div class="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div class="truncate"><strong class="text-slate-900">Pix:</strong> <code class="font-mono text-[#D19864] font-bold">${ong.chavePix || 'Não cadastrada'}</code></div>
            <div><strong class="text-slate-900">WhatsApp:</strong> ${ong.whatsapp || 'Não informado'}</div>
          </div>
        </div>

        <div class="space-y-2 mt-4">
          <button type="button" onclick="openEditOngModal('${ong.id}')" class="w-full py-2.5 px-3 bg-[#007E82] hover:bg-[#00686c] text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:scale-[1.01]">
            <i data-lucide="sparkles" class="w-4 h-4"></i>
            <span>Editar História, Fotos & Vídeos do Abrigo</span>
          </button>
          <div class="mt-2">
            <button type="button" onclick="adminQuickAddPetForOng('${ong.id}')" class="w-full py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer">
              <i data-lucide="plus-circle" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>+ Cadastrar Pet para esta ONG</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons({ root: container });
}

function adminRenderShelterPhotos() {
  const container = document.getElementById("admin-shelter-photos-container");
  if (!container) return;

  if (!adminEditingShelterPhotos || adminEditingShelterPhotos.length === 0) {
    container.innerHTML = `
      <div class="text-center py-3 bg-white rounded-xl border border-dashed border-slate-300 p-2 text-xs text-slate-500 font-bold">
        Nenhuma foto do abrigo adicionada. Clique em "+ Adicionar Foto" acima.
      </div>
    `;
    return;
  }

  container.innerHTML = adminEditingShelterPhotos.map((url, idx) => `
    <div class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
      <div class="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
        <img src="${url}" alt="Foto ${idx+1}" class="w-full h-full object-cover" onerror="this.src='img/matchpet-icon.png'">
      </div>
      <input 
        type="url" 
        value="${url}" 
        placeholder="https://images.unsplash.com/..." 
        onchange="adminEditingShelterPhotos[${idx}] = this.value; adminRenderShelterPhotos();" 
        class="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#007E82] outline-none"
      >
      <button 
        type="button" 
        onclick="adminRemoveShelterPhotoField(${idx})" 
        class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
        title="Remover foto"
      >
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `).join("");

  if (window.lucide) lucide.createIcons({ root: container });
}

function adminAddShelterPhotoField() {
  if (!adminEditingShelterPhotos) adminEditingShelterPhotos = [];
  adminEditingShelterPhotos.push("https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=800&q=80");
  adminRenderShelterPhotos();
}

function adminRemoveShelterPhotoField(idx) {
  if (!adminEditingShelterPhotos) return;
  adminEditingShelterPhotos.splice(idx, 1);
  adminRenderShelterPhotos();
}

function adminRenderShelterVideos() {
  const container = document.getElementById("admin-shelter-videos-container");
  if (!container) return;

  if (!adminEditingShelterVideos || adminEditingShelterVideos.length === 0) {
    container.innerHTML = `
      <div class="text-center py-3 bg-white rounded-xl border border-dashed border-slate-300 p-2 text-xs text-slate-500 font-bold">
        Nenhum vídeo do abrigo adicionado. Clique em "+ Adicionar Vídeo" acima.
      </div>
    `;
    return;
  }

  container.innerHTML = adminEditingShelterVideos.map((url, idx) => `
    <div class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
      <div class="w-9 h-9 rounded-lg bg-[#faeee3] text-[#D19864] flex items-center justify-center font-bold flex-shrink-0 border border-[#e8ddcf] text-sm">
        🎥
      </div>
      <input 
        type="url" 
        value="${url}" 
        placeholder="https://...mp4" 
        onchange="adminEditingShelterVideos[${idx}] = this.value; adminRenderShelterVideos();" 
        class="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#007E82] outline-none"
      >
      <button 
        type="button" 
        onclick="adminRemoveShelterVideoField(${idx})" 
        class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
        title="Remover vídeo"
      >
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `).join("");

  if (window.lucide) lucide.createIcons({ root: container });
}

function adminAddShelterVideoField() {
  if (!adminEditingShelterVideos) adminEditingShelterVideos = [];
  adminEditingShelterVideos.push("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
  adminRenderShelterVideos();
}

function adminRemoveShelterVideoField(idx) {
  if (!adminEditingShelterVideos) return;
  adminEditingShelterVideos.splice(idx, 1);
  adminRenderShelterVideos();
}

async function openEditOngModal(ongId) {
  const ongs = await SolidarityStorage.getOngs();
  const ong = ongs.find(o => o.id === ongId) || ongs[0];
  if (!ong) return;

  document.getElementById("ong-edit-id").value = ong.id;
  document.getElementById("ong-edit-nome").value = ong.nome || "";
  document.getElementById("ong-edit-sigla").value = ong.sigla || "";
  document.getElementById("ong-edit-cidade").value = ong.cidade || "";
  document.getElementById("ong-edit-regiao").value = ong.regiao || "";
  document.getElementById("ong-edit-total-adotados").value = ong.totalAdotados || 0;
  document.getElementById("ong-edit-base-disponiveis").value = ong.baseDisponiveis || 0;
  document.getElementById("ong-edit-chave-pix").value = ong.chavePix || "";
  document.getElementById("ong-edit-whatsapp").value = ong.whatsapp || "";
  document.getElementById("ong-edit-foto").value = ong.foto || "";
  document.getElementById("ong-edit-descricao").value = ong.descricao || "";
  
  const historiaInput = document.getElementById("ong-edit-historia");
  if (historiaInput) {
    historiaInput.value = ong.historia || "";
  }

  adminEditingShelterPhotos = Array.isArray(ong.fotosAbrigo) ? [...ong.fotosAbrigo] : [];
  adminEditingShelterVideos = Array.isArray(ong.videosAbrigo) ? [...ong.videosAbrigo] : [];

  adminRenderShelterPhotos();
  adminRenderShelterVideos();

  document.getElementById("modal-ong-title").textContent = `Editar ONG & Abrigo: ${ong.nome}`;

  openModalGeneric("modal-edit-ong");
}

function closeModalEditOng() {
  closeModalGeneric("modal-edit-ong");
}

async function handleSaveOng(e) {
  e.preventDefault();
  const id = document.getElementById("ong-edit-id").value;
  const ongs = await SolidarityStorage.getOngs();
  const existing = ongs.find(o => o.id === id) || ongs[0] || {};

  const historiaInput = document.getElementById("ong-edit-historia");

  const updatedOng = {
    ...existing,
    id: id || "ong-001",
    nome: document.getElementById("ong-edit-nome").value.trim(),
    sigla: document.getElementById("ong-edit-sigla").value.trim(),
    cidade: document.getElementById("ong-edit-cidade").value.trim(),
    regiao: document.getElementById("ong-edit-regiao").value.trim(),
    totalAdotados: parseInt(document.getElementById("ong-edit-total-adotados").value, 10) || 0,
    baseDisponiveis: parseInt(document.getElementById("ong-edit-base-disponiveis").value, 10) || 0,
    chavePix: document.getElementById("ong-edit-chave-pix").value.trim(),
    whatsapp: document.getElementById("ong-edit-whatsapp").value.trim(),
    foto: document.getElementById("ong-edit-foto").value.trim() || existing.foto,
    descricao: document.getElementById("ong-edit-descricao").value.trim(),
    historia: historiaInput ? historiaInput.value.trim() : (existing.historia || ""),
    fotosAbrigo: Array.isArray(adminEditingShelterPhotos) && adminEditingShelterPhotos.length > 0
      ? adminEditingShelterPhotos.filter(u => u && u.trim().length > 0)
      : (existing.fotosAbrigo || []),
    videosAbrigo: Array.isArray(adminEditingShelterVideos) && adminEditingShelterVideos.length > 0
      ? adminEditingShelterVideos.filter(u => u && u.trim().length > 0)
      : (existing.videosAbrigo || [])
  };

  await SolidarityStorage.saveOng(updatedOng);
  closeModalEditOng();
  await loadAdminOngs();
  showToast("História, fotos, vídeos e dados da ONG atualizados com sucesso!");
}

window.adminRenderShelterPhotos = adminRenderShelterPhotos;
window.adminAddShelterPhotoField = adminAddShelterPhotoField;
window.adminRemoveShelterPhotoField = adminRemoveShelterPhotoField;
window.adminRenderShelterVideos = adminRenderShelterVideos;
window.adminAddShelterVideoField = adminAddShelterVideoField;
window.adminRemoveShelterVideoField = adminRemoveShelterVideoField;
window.openEditOngModal = openEditOngModal;
window.closeModalEditOng = closeModalEditOng;
window.handleSaveOng = handleSaveOng;

// === GESTÃO DE EVENTOS / FEIRINHAS ===
function loadAdminEventos() {
  const container = document.getElementById("admin-eventos-list");
  if (!container) return;

  const eventos = SolidarityStorage.getEventos();

  if (!eventos || eventos.length === 0) {
    container.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 text-xs">Nenhuma feirinha cadastrada.</div>`;
    return;
  }

  const EVENTO_PALETTES = [
    {
      borderTop: 'border-t-4 border-t-[#007E82]',
      tagBg: 'bg-[#007E82] text-white',
      dateBorder: 'border-[#007E82]',
      dateIconBg: 'bg-[#007E82] text-white',
      dateBlockBg: 'bg-[#e6f4f5]',
      dateBlockBorder: 'border-[#007E82]/40',
      clockColor: 'text-[#007E82]'
    },
    {
      borderTop: 'border-t-4 border-t-[#D19864]',
      tagBg: 'bg-[#D19864] text-slate-950 font-black',
      dateBorder: 'border-[#D19864]',
      dateIconBg: 'bg-[#D19864] text-slate-950',
      dateBlockBg: 'bg-[#fdf5eb]',
      dateBlockBorder: 'border-[#D19864]/40',
      clockColor: 'text-[#965c28]'
    },
    {
      borderTop: 'border-t-4 border-t-[#C8553D]',
      tagBg: 'bg-[#C8553D] text-white',
      dateBorder: 'border-[#C8553D]',
      dateIconBg: 'bg-[#C8553D] text-white',
      dateBlockBg: 'bg-[#fdf1ee]',
      dateBlockBorder: 'border-[#C8553D]/40',
      clockColor: 'text-[#8c311c]'
    }
  ];

  container.innerHTML = eventos.map((ev, idx) => {
    const pal = EVENTO_PALETTES[idx % EVENTO_PALETTES.length];
    const coverPhoto = ev.foto || "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=600&q=80";
    return `
      <div class="p-4 bg-white rounded-2xl border border-slate-200 ${pal.borderTop} shadow-xs flex flex-col justify-between space-y-3 overflow-hidden">
        <div>
          <div class="relative h-20 admin-feirinha-card-cover -mx-4 -mt-4 mb-3 overflow-hidden bg-slate-100 rounded-t-2xl">
            <img src="${coverPhoto}" alt="${ev.titulo}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=600&q=80'">
            <div class="absolute top-2 left-2">
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-white/95 text-slate-950 border ${pal.dateBorder} shadow-2xs flex items-center gap-1">
                <span class="p-0.5 rounded ${pal.dateIconBg}"><i data-lucide="calendar" class="w-2.5 h-2.5"></i></span>
                <span>${ev.dataExtenso}</span>
              </span>
            </div>
          </div>
          <div class="flex items-start justify-between gap-2 mb-1">
            <h4 class="text-sm font-black text-slate-900 leading-snug">${ev.titulo}</h4>
            <div class="flex items-center gap-1 flex-shrink-0">
              <button onclick="openEditEventoModal('${ev.id}')" class="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer" title="Editar">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="deleteAdminEvento('${ev.id}')" class="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-rose-600 border border-slate-200 transition-colors cursor-pointer" title="Excluir">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
          
          <!-- Bloco de Destaque da Data do Evento com Cor da Paleta -->
          <div class="my-1.5 p-2 ${pal.dateBlockBg} rounded-xl border ${pal.dateBlockBorder} text-xs font-black text-slate-950 flex items-center justify-between">
            <span class="flex items-center gap-1.5"><i data-lucide="calendar-check-2" class="w-3.5 h-3.5 text-slate-900"></i> ${ev.dataExtenso}</span>
            <span class="px-1.5 py-0.5 rounded-md bg-white ${pal.clockColor} text-[10px] border border-slate-200 font-bold">${ev.horario}</span>
          </div>

          <p class="text-xs text-slate-700 flex items-center gap-1 mt-0.5 font-bold"><i data-lucide="map-pin" class="w-3.5 h-3.5 text-[#D19864]"></i> ${ev.local}</p>
          <p class="text-[11px] text-slate-500 font-medium mt-0.5">${ev.ongNome}</p>
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span class="font-bold">🐾 ${(ev.animaisPresentes || []).length} animais na feira</span>
          <a href="${ev.linkMaps}" target="_blank" class="text-[#007E82] font-black hover:underline">Ver Maps</a>
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons({ root: container });
}

async function populateOngSelect(selectId, selectedId = "") {
  const select = document.getElementById(selectId);
  if (!select) return;
  const ongs = await SolidarityStorage.getOngs();
  select.innerHTML = ongs.map(o => `
    <option value="${o.id}" ${o.id === selectedId ? 'selected' : ''}>${o.nome} (${o.sigla || o.cidade})</option>
  `).join("");
}

async function openNewEventoModal() {
  document.getElementById("form-edit-evento").reset();
  document.getElementById("evento-edit-id").value = "";
  document.getElementById("modal-evento-title").textContent = "Adicionar Feirinha de Adoção";
  await populateOngSelect("evento-edit-ong-id");
  openModalGeneric("modal-edit-evento");
}

async function openEditEventoModal(eventoId) {
  const eventos = SolidarityStorage.getEventos();
  const ev = eventos.find(e => e.id === eventoId);
  if (!ev) return;

  await populateOngSelect("evento-edit-ong-id", ev.ongId);
  document.getElementById("evento-edit-id").value = ev.id;
  document.getElementById("evento-edit-titulo").value = ev.titulo || "";
  document.getElementById("evento-edit-data").value = ev.data || "";
  document.getElementById("evento-edit-data-extenso").value = ev.dataExtenso || "";
  document.getElementById("evento-edit-horario").value = ev.horario || "";
  document.getElementById("evento-edit-local").value = ev.local || "";
  document.getElementById("evento-edit-endereco").value = ev.endereco || "";
  document.getElementById("evento-edit-link-maps").value = ev.linkMaps || "";
  document.getElementById("evento-edit-foto").value = ev.foto || "";
  document.getElementById("evento-edit-animais").value = (ev.animaisPresentes || []).join(", ");
  document.getElementById("evento-edit-descricao").value = ev.descricao || "";

  document.getElementById("modal-evento-title").textContent = "Editar Feirinha de Adoção";
  openModalGeneric("modal-edit-evento");
}

function closeModalEditEvento() {
  closeModalGeneric("modal-edit-evento");
}

async function handleSaveEvento(e) {
  e.preventDefault();
  const id = document.getElementById("evento-edit-id").value;
  const ongId = document.getElementById("evento-edit-ong-id").value;
  const ongs = await SolidarityStorage.getOngs();
  const ong = ongs.find(o => o.id === ongId);

  const animaisStr = document.getElementById("evento-edit-animais").value;
  const animaisArr = animaisStr.split(",").map(s => s.trim()).filter(Boolean);

  const novoEvento = {
    id: id || "evt-" + Date.now(),
    titulo: document.getElementById("evento-edit-titulo").value.trim(),
    data: document.getElementById("evento-edit-data").value,
    dataExtenso: document.getElementById("evento-edit-data-extenso").value.trim(),
    horario: document.getElementById("evento-edit-horario").value.trim(),
    local: document.getElementById("evento-edit-local").value.trim(),
    endereco: document.getElementById("evento-edit-endereco").value.trim(),
    ongId: ongId,
    ongNome: ong ? ong.nome : "ONG Parceira",
    linkMaps: document.getElementById("evento-edit-link-maps").value.trim() || "https://maps.google.com",
    foto: document.getElementById("evento-edit-foto").value.trim() || "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=800&q=80",
    animaisPresentes: animaisArr,
    descricao: document.getElementById("evento-edit-descricao").value.trim()
  };

  SolidarityStorage.saveEvento(novoEvento);
  closeModalEditEvento();
  loadAdminEventos();
  showToast("Feirinha salva com sucesso!");
}

function deleteAdminEvento(id) {
  if (confirm("Deseja realmente remover esta feirinha do calendário?")) {
    SolidarityStorage.deleteEvento(id);
    loadAdminEventos();
    showToast("Feirinha removida.", "info");
  }
}

// === GESTÃO DE RIFAS & CAMPANHAS DE RAÇÃO ===
function loadAdminRifas() {
  const container = document.getElementById("admin-rifas-list");
  if (!container) return;

  const rifas = SolidarityStorage.getRifas();

  if (!rifas || rifas.length === 0) {
    container.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 text-xs">Nenhuma campanha cadastrada.</div>`;
    return;
  }

  const RIFA_PALETTES = [
    {
      borderTop: 'border-t-4 border-t-[#D19864]',
      tagBg: 'bg-[#D19864] text-slate-950 font-black',
      dateBorder: 'border-[#D19864]',
      dateIconBg: 'bg-[#D19864] text-slate-950',
      dateBlockBg: 'bg-[#fdf5eb]',
      dateBlockBorder: 'border-[#D19864]/40',
      progressFill: 'bg-[#D19864]',
      iconColor: 'text-[#D19864]'
    },
    {
      borderTop: 'border-t-4 border-t-[#007E82]',
      tagBg: 'bg-[#007E82] text-white font-black',
      dateBorder: 'border-[#007E82]',
      dateIconBg: 'bg-[#007E82] text-white',
      dateBlockBg: 'bg-[#e6f4f5]',
      dateBlockBorder: 'border-[#007E82]/40',
      progressFill: 'bg-[#007E82]',
      iconColor: 'text-[#007E82]'
    },
    {
      borderTop: 'border-t-4 border-t-[#E6A020]',
      tagBg: 'bg-[#E6A020] text-slate-950 font-black',
      dateBorder: 'border-[#E6A020]',
      dateIconBg: 'bg-[#E6A020] text-slate-950',
      dateBlockBg: 'bg-[#fef9ed]',
      dateBlockBorder: 'border-[#E6A020]/40',
      progressFill: 'bg-[#E6A020]',
      iconColor: 'text-[#E6A020]'
    }
  ];

  container.innerHTML = rifas.map((rifa, idx) => {
    const pal = RIFA_PALETTES[idx % RIFA_PALETTES.length];
    const isMoney = rifa.tipo === 'dinheiro';
    const percent = Math.min(100, Math.round(((rifa.arrecadado || 0) / (rifa.meta || 1)) * 100));
    const coverPhoto = rifa.foto || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80";

    return `
      <div class="p-4 bg-white rounded-2xl border border-slate-200 ${pal.borderTop} shadow-xs flex flex-col justify-between space-y-3 overflow-hidden">
        <div>
          <div class="relative h-20 admin-rifa-card-cover -mx-4 -mt-4 mb-3 overflow-hidden bg-slate-100 rounded-t-2xl">
            <img src="${coverPhoto}" alt="${rifa.titulo}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80'">
            <div class="absolute top-2 left-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black shadow-xs ${pal.tagBg}">
                ${isMoney ? (rifa.id === 'rifa-003' ? '✨ Filhotes' : '🎟️ Rifa') : '🥣 Ração'}
              </span>
            </div>
            <div class="absolute top-2 right-2">
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-white/95 text-slate-950 border ${pal.dateBorder} shadow-2xs flex items-center gap-1">
                <span class="p-0.5 rounded ${pal.dateIconBg}"><i data-lucide="calendar" class="w-2.5 h-2.5"></i></span>
                <span>${isMoney ? 'Sorteio: ' : 'Vigência: '}${rifa.dataSorteio || 'A definir'}</span>
              </span>
            </div>
          </div>
          <div class="flex items-start justify-between gap-2 mb-1">
            <h4 class="text-sm font-black text-slate-900 leading-snug">${rifa.titulo}</h4>
            <div class="flex items-center gap-1 flex-shrink-0">
              <button onclick="openEditRifaModal('${rifa.id}')" class="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer" title="Editar">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="deleteAdminRifa('${rifa.id}')" class="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-rose-600 border border-slate-200 transition-colors cursor-pointer" title="Excluir">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
          
          <!-- Bloco de Destaque da Data do Sorteio / Vigência -->
          <div class="my-1.5 p-2 ${pal.dateBlockBg} rounded-xl border ${pal.dateBlockBorder} text-xs font-black text-slate-950 flex items-center justify-between">
            <span class="flex items-center gap-1.5"><i data-lucide="calendar-heart" class="w-3.5 h-3.5 ${pal.iconColor}"></i> ${isMoney ? 'Data Sorteio:' : 'Vigência:'} ${rifa.dataSorteio || 'A definir'}</span>
            <span class="px-1.5 py-0.5 rounded-md bg-white text-[10px] font-black text-slate-950 border border-slate-200">${isMoney ? `R$ ${rifa.valorBilhete || 15}/bilhete` : 'Solidária'}</span>
          </div>

          <p class="text-[11px] text-slate-600 font-bold">${rifa.ongNome}</p>

          <!-- Barra de Progresso Rápida com Cor da Paleta -->
          <div class="mt-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div class="flex justify-between text-[11px] font-bold">
              <span class="text-slate-900">${isMoney ? `R$ ${rifa.arrecadado.toLocaleString('pt-BR')} / R$ ${rifa.meta.toLocaleString('pt-BR')}` : `${rifa.arrecadado}kg / ${rifa.meta}kg`}</span>
              <span class="${percent >= 70 ? 'text-teal-700' : 'text-amber-700'} font-black">${percent}%</span>
            </div>
            <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div class="h-full rounded-full ${pal.progressFill}" style="width: ${percent}%"></div>
            </div>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <button onclick="quickAddContribution('${rifa.id}', ${isMoney ? (rifa.valorBilhete || 50) : 50})" class="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer">
            <i data-lucide="plus-circle" class="w-3.5 h-3.5 text-[#D19864]"></i>
            <span>+ ${isMoney ? `R$ ${rifa.valorBilhete || 50}` : '50 kg'}</span>
          </button>
          <button onclick="openEditRifaModal('${rifa.id}')" class="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-bold transition-colors cursor-pointer">
            Ajustar
          </button>
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons({ root: container });
}

function quickAddContribution(rifaId, amount) {
  const updated = SolidarityStorage.contributeRifa(rifaId, amount);
  if (updated) {
    loadAdminRifas();
    showToast(`Registrado: +${updated.tipo === 'dinheiro' ? `R$ ${amount}` : `${amount}kg`} na campanha!`);
  }
}

async function openNewRifaModal() {
  document.getElementById("form-edit-rifa").reset();
  document.getElementById("rifa-edit-id").value = "";
  document.getElementById("modal-rifa-title").textContent = "Adicionar Rifa / Campanha Solidária";
  await populateOngSelect("rifa-edit-ong-id");
  toggleRifaTypeFields();
  openModalGeneric("modal-edit-rifa");
}

async function openEditRifaModal(rifaId) {
  const rifas = SolidarityStorage.getRifas();
  const rifa = rifas.find(r => r.id === rifaId);
  if (!rifa) return;

  await populateOngSelect("rifa-edit-ong-id", rifa.ongId);
  document.getElementById("rifa-edit-id").value = rifa.id;
  document.getElementById("rifa-edit-titulo").value = rifa.titulo || "";
  document.getElementById("rifa-edit-tipo").value = rifa.tipo || "dinheiro";
  document.getElementById("rifa-edit-meta").value = rifa.meta || 0;
  document.getElementById("rifa-edit-arrecadado").value = rifa.arrecadado || 0;
  document.getElementById("rifa-edit-valor-bilhete").value = rifa.valorBilhete || "";
  document.getElementById("rifa-edit-total-bilhetes").value = rifa.totalBilhetes || "";
  document.getElementById("rifa-edit-bilhetes-vendidos").value = rifa.bilhetesVendidos || "";
  document.getElementById("rifa-edit-premio").value = rifa.premio || rifa.pontoColeta || "";
  document.getElementById("rifa-edit-chave-pix").value = rifa.chavePix || "";
  document.getElementById("rifa-edit-whatsapp").value = rifa.whatsapp || "";
  document.getElementById("rifa-edit-data-sorteio").value = rifa.dataSorteio || "";
  document.getElementById("rifa-edit-foto").value = rifa.foto || "";
  document.getElementById("rifa-edit-descricao").value = rifa.descricao || "";

  toggleRifaTypeFields();
  document.getElementById("modal-rifa-title").textContent = "Editar Rifa / Campanha";
  openModalGeneric("modal-edit-rifa");
}

function toggleRifaTypeFields() {
  const tipo = document.getElementById("rifa-edit-tipo")?.value || "dinheiro";
  const fieldsDinheiro = document.getElementById("fields-rifa-dinheiro");
  const labelMeta = document.getElementById("label-rifa-meta");
  const labelArrecadado = document.getElementById("label-rifa-arrecadado");
  const labelPremio = document.getElementById("label-rifa-premio");

  if (tipo === "racao") {
    if (fieldsDinheiro) fieldsDinheiro.classList.add("hidden");
    if (labelMeta) labelMeta.textContent = "Meta Total (em Kg de Ração)";
    if (labelArrecadado) labelArrecadado.textContent = "Já Arrecadado (em Kg)";
    if (labelPremio) labelPremio.textContent = "Ponto de Coleta ou Observações da Campanha";
  } else {
    if (fieldsDinheiro) fieldsDinheiro.classList.remove("hidden");
    if (labelMeta) labelMeta.textContent = "Meta Total (R$)";
    if (labelArrecadado) labelArrecadado.textContent = "Já Arrecadado (R$)";
    if (labelPremio) labelPremio.textContent = "Prêmio do Sorteio";
  }
}

function closeModalEditRifa() {
  closeModalGeneric("modal-edit-rifa");
}

async function handleSaveRifa(e) {
  e.preventDefault();
  const id = document.getElementById("rifa-edit-id").value;
  const tipo = document.getElementById("rifa-edit-tipo").value;
  const ongId = document.getElementById("rifa-edit-ong-id").value;
  const ongs = await SolidarityStorage.getOngs();
  const ong = ongs.find(o => o.id === ongId);

  const novaRifa = {
    id: id || "rifa-" + Date.now(),
    titulo: document.getElementById("rifa-edit-titulo").value.trim(),
    tipo: tipo,
    ongId: ongId,
    ongNome: ong ? ong.nome : "ONG Parceira",
    meta: parseFloat(document.getElementById("rifa-edit-meta").value) || 0,
    arrecadado: parseFloat(document.getElementById("rifa-edit-arrecadado").value) || 0,
    chavePix: document.getElementById("rifa-edit-chave-pix").value.trim(),
    whatsapp: document.getElementById("rifa-edit-whatsapp").value.trim(),
    dataSorteio: document.getElementById("rifa-edit-data-sorteio").value.trim(),
    foto: document.getElementById("rifa-edit-foto").value.trim() || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80",
    descricao: document.getElementById("rifa-edit-descricao").value.trim()
  };

  if (tipo === "dinheiro") {
    novaRifa.valorBilhete = parseFloat(document.getElementById("rifa-edit-valor-bilhete").value) || 15;
    novaRifa.totalBilhetes = parseInt(document.getElementById("rifa-edit-total-bilhetes").value, 10) || 100;
    novaRifa.bilhetesVendidos = parseInt(document.getElementById("rifa-edit-bilhetes-vendidos").value, 10) || 0;
    novaRifa.premio = document.getElementById("rifa-edit-premio").value.trim();
  } else {
    novaRifa.unidade = "kg";
    novaRifa.pontoColeta = document.getElementById("rifa-edit-premio").value.trim();
    novaRifa.precoSaco15kg = 85;
  }

  SolidarityStorage.saveRifa(novaRifa);
  closeModalEditRifa();
  loadAdminRifas();
  showToast("Campanha salva com sucesso!");
}

function deleteAdminRifa(id) {
  if (confirm("Deseja realmente excluir esta rifa/campanha?")) {
    SolidarityStorage.deleteRifa(id);
    loadAdminRifas();
    showToast("Campanha removida.", "info");
  }
}

// Helpers de Modal Genérico
function openModalGeneric(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
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

function closeModalGeneric(modalId) {
  const modal = document.getElementById(modalId);
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

// Expõe no escopo global
window.switchAdminTab = switchAdminTab;
window.renderAnalyticsDashboard = renderAnalyticsDashboard;
window.renderAnalyticsLeadsTableRows = renderAnalyticsLeadsTableRows;

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
   GESTÃO DE CONTRATOS DE PARCERIA & CESSÃO DE IMAGENS (GATEKEEPER & AUDITORIA)
   ========================================================================== */

let currentActiveOngId = "ong-001";
const ACTIVE_ONG_STORAGE_KEY = "adoteamigo_active_ong_id_v1";

async function initNgoContractsModule() {
  let ongs = [];
  try {
    ongs = await SolidarityStorage.getOngs();
  } catch (e) {
    ongs = window.DEFAULT_ONGS || [];
  }

  // Restaura ONG ativa salva ou define primeira
  try {
    const saved = localStorage.getItem(ACTIVE_ONG_STORAGE_KEY);
    if (saved && ongs.some(o => o.id === saved)) {
      currentActiveOngId = saved;
    } else if (ongs.length > 0) {
      currentActiveOngId = ongs[0].id;
    }
  } catch (e) {
    if (ongs.length > 0) currentActiveOngId = ongs[0].id;
  }

  // Popula os seletores de ONG
  populateAdminOngSelectors(ongs);

  // Módulo de contratos desativado
}

function populateAdminOngSelectors(ongs) {
  const headerSelect = document.getElementById("admin-active-ong-select");
  const modalSelect = document.getElementById("contract-form-ong-id");

  const list = (ongs && ongs.length > 0) ? ongs : (window.DEFAULT_ONGS || []);

  if (headerSelect) {
    headerSelect.innerHTML = list.map(o => `
      <option value="${o.id}" ${o.id === currentActiveOngId ? 'selected' : ''}>
        ${o.sigla ? `[${o.sigla}] ` : ''}${o.nome}
      </option>
    `).join("");
  }

  if (modalSelect) {
    modalSelect.innerHTML = list.map(o => `
      <option value="${o.id}" ${o.id === currentActiveOngId ? 'selected' : ''}>
        ${o.sigla ? `[${o.sigla}] ` : ''}${o.nome}
      </option>
    `).join("");
  }
}

function onAdminActiveOngChange(ongId) {
  currentActiveOngId = ongId;
  try {
    localStorage.setItem(ACTIVE_ONG_STORAGE_KEY, ongId);
  } catch (e) {}

  
  showToast(`ONG Ativa alterada para: ${getOngNameById(ongId)}`, "info");
}

function getOngNameById(ongId) {
  if (window.DEFAULT_ONGS) {
    const found = window.DEFAULT_ONGS.find(o => o.id === ongId);
    if (found) return found.nome;
  }
  return "ONG Parceira";
}

function updateNgoContractBadgeUI() {
  const container = document.getElementById("ngo-header-contract-status");
  if (container) container.innerHTML = "";
}

function checkNgoContractGatekeeper(ongId) {}
function openNgoContractModal(ongId = null, isGatekeeper = false) {}
function closeNgoContractModal() {}
function onContractModalOngChange(ongId) {}
async function handleNgoContractSubmit(event) { if (event) event.preventDefault(); }
function openSignedContractView(ongId) {}
function closeSignedContractView() {}
function printSignedContract() {}
async function renderNgoContractsAuditTable() {}
async function confirmDeleteAllContracts() {}
async function confirmDeleteContract(ongId) {}

// Expõe no escopo global
window.switchAdminTab = switchAdminTab;
window.renderAnalyticsDashboard = renderAnalyticsDashboard;
window.renderAnalyticsLeadsTableRows = renderAnalyticsLeadsTableRows;

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

// Expõe funções no escopo global
window.applyCpfMask = applyCpfMask;
window.applyCnpjMask = applyCnpjMask;
window.applyPhoneMask = applyPhoneMask;
window.initNgoContractsModule = initNgoContractsModule;
window.onAdminActiveOngChange = onAdminActiveOngChange;
window.onContractModalOngChange = onContractModalOngChange;
window.openNgoContractModal = openNgoContractModal;
window.closeNgoContractModal = closeNgoContractModal;
window.handleNgoContractSubmit = handleNgoContractSubmit;
window.openSignedContractView = openSignedContractView;
window.closeSignedContractView = closeSignedContractView;
window.printSignedContract = printSignedContract;
window.renderNgoContractsAuditTable = renderNgoContractsAuditTable;
window.updateNgoContractBadgeUI = updateNgoContractBadgeUI;
window.checkNgoContractGatekeeper = checkNgoContractGatekeeper;
window.confirmDeleteAllContracts = confirmDeleteAllContracts;
window.confirmDeleteContract = confirmDeleteContract;

/* ==========================================================================
   CADASTRO DE NOVA ONG COM ASSINATURA DE DIRETRIZES INTEGRADA (ADMIN)
   ========================================================================== */

function adminQuickAddPetForOng(ongId) {
  if (!ongId) return;
  currentActiveOngId = ongId;
  const select = document.getElementById("admin-active-ong-select");
  if (select) select.value = ongId;
  const petOngSelect = document.getElementById("pet-ong-select");
  if (petOngSelect) petOngSelect.value = ongId;
  
  switchAdminTab("crud");
  const petNome = document.getElementById("pet-nome");
  if (petNome) {
    petNome.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => petNome.focus(), 300);
  }
  showToast("ONG selecionada para novo cadastro de pet!");
}
window.adminQuickAddPetForOng = adminQuickAddPetForOng;

function setAdminSampleOngLogo(type) {
  const input = document.getElementById("admin-reg-ong-foto");
  if (!input) return;
  const samples = {
    rescue: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80",
    cat: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80",
    general: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=600&q=80"
  };
  input.value = samples[type] || samples.rescue;
}
window.setAdminSampleOngLogo = setAdminSampleOngLogo;

function applyAdminCpfMask(input) {
  applyCpfMask(input);
}
window.applyAdminCpfMask = applyAdminCpfMask;

function applyAdminCnpjMask(input) {
  applyCnpjMask(input);
}
window.applyAdminCnpjMask = applyAdminCnpjMask;

function applyAdminPhoneMask(input) {
  applyPhoneMask(input);
}
window.applyAdminPhoneMask = applyAdminPhoneMask;

function openAdminNewOngModal() {
  const modal = document.getElementById("admin-ong-register-modal");
  if (!modal) return;
  const form = document.getElementById("admin-ong-register-form");
  if (form) form.reset();
  const errBox = document.getElementById("admin-reg-ong-error-box");
  if (errBox) errBox.classList.add("hidden");

  // Sugestão de logo padrão
  const fotoInput = document.getElementById("admin-reg-ong-foto");
  if (fotoInput && !fotoInput.value) {
    fotoInput.value = "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80";
  }

  modal.classList.remove("opacity-0", "pointer-events-none");
  modal.classList.add("opacity-100");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-95");
    content.classList.add("scale-100");
  }
  if (window.lucide) lucide.createIcons({ root: modal });
}
window.openAdminNewOngModal = openAdminNewOngModal;

function closeAdminNewOngModal() {
  const modal = document.getElementById("admin-ong-register-modal");
  if (!modal) return;
  modal.classList.remove("opacity-100");
  modal.classList.add("opacity-0", "pointer-events-none");
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.remove("scale-100");
    content.classList.add("scale-95");
  }
}
window.closeAdminNewOngModal = closeAdminNewOngModal;

async function handleAdminNewOngSubmit(event) {
  event.preventDefault();
  const errBox = document.getElementById("admin-reg-ong-error-box");
  const errText = document.getElementById("admin-reg-ong-error-text");

  function showError(msg) {
    if (errText) errText.textContent = msg;
    if (errBox) errBox.classList.remove("hidden");
    if (window.lucide) lucide.createIcons({ root: errBox });
  }

  // Coleta dados da ONG
  const nome = (document.getElementById("admin-reg-ong-nome")?.value || "").trim();
  const sigla = (document.getElementById("admin-reg-ong-sigla")?.value || "").trim().toUpperCase();
  const cnpj = (document.getElementById("admin-reg-ong-cnpj")?.value || "").trim();
  const regiao = (document.getElementById("admin-reg-ong-regiao")?.value || "").trim();
  const whatsapp = (document.getElementById("admin-reg-ong-whatsapp")?.value || "").replace(/\D/g, "");
  const instagram = (document.getElementById("admin-reg-ong-instagram")?.value || "").trim();
  const chavePix = (document.getElementById("admin-reg-ong-chave-pix")?.value || "").trim();
  const foto = (document.getElementById("admin-reg-ong-foto")?.value || "").trim() || "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80";
  const descricao = (document.getElementById("admin-reg-ong-descricao")?.value || "").trim();

  // Coleta dados do Representante Legal & Assinatura
  const repNome = (document.getElementById("admin-reg-ong-rep-nome")?.value || "").trim();
  const repCargo = (document.getElementById("admin-reg-ong-rep-cargo")?.value || "").trim();
  const repCpf = (document.getElementById("admin-reg-ong-rep-cpf")?.value || "").trim();
  const repEmail = (document.getElementById("admin-reg-ong-rep-email")?.value || "").trim();

  const chkImagem = document.getElementById("admin-reg-ong-check-imagem")?.checked;
  const chkLgpd = document.getElementById("admin-reg-ong-check-lgpd")?.checked;
  const chkSanitario = document.getElementById("admin-reg-ong-check-sanitario")?.checked;
  const chkIndep = document.getElementById("admin-reg-ong-check-independencia")?.checked;

  const signature = (document.getElementById("admin-reg-ong-signature-input")?.value || "").trim();

  if (!nome || !sigla || !cnpj || !whatsapp || !descricao) {
    showError("Por favor, preencha todos os campos obrigatórios da organização.");
    return;
  }
  if (!repNome || !repCargo || !repCpf || !repEmail) {
    showError("Por favor, preencha a qualificação completa do Representante Legal.");
    return;
  }
  if (!chkImagem || !chkLgpd || !chkSanitario || !chkIndep) {
    showError("É mandatório assinalar todas as declarações legais de adesão, cessão de imagem e LGPD.");
    return;
  }
  if (!signature || signature.length < 5) {
    showError("Digite a assinatura eletrônica formal completa do Representante Legal.");
    return;
  }

  // Gera ID único
  const slug = sigla.toLowerCase().replace(/[^a-z0-9]/g, "") || ("ong-" + Date.now().toString(36));
  const newOngId = "ong-" + slug + "-" + Math.floor(Math.random() * 1000);

  const novaOng = {
    id: newOngId,
    nome: nome,
    sigla: sigla,
    cnpj: cnpj,
    cidade: "Brasília",
    regiao: regiao,
    whatsapp: whatsapp,
    instagram: instagram ? (instagram.startsWith("@") ? instagram : "@" + instagram) : "",
    chavePix: chavePix || "pix@adocao.org.br",
    foto: foto,
    descricao: descricao,
    totalAdotados: 0,
    baseDisponiveis: 0,
    anoFundacao: new Date().getFullYear().toString()
  };

  try {
    // 1. Salva a ONG no SolidarityStorage
    await SolidarityStorage.saveOng(novaOng);

    // 2. Salva o Contrato / Diretrizes no NgoContractStorage
    const contractData = {
      ongId: newOngId,
      repNome: repNome,
      repCargo: repCargo,
      repCpf: repCpf,
      repEmail: repEmail,
      signature: signature,
      consentImagem: true,
      consentLgpd: true,
      consentSanitario: true,
      consentIndependencia: true,
      protocol: "ADOTE-ONG-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000)
    };

    if (window.NgoContractStorage && typeof NgoContractStorage.saveContract === "function") {
      NgoContractStorage.saveContract(contractData);
    }

    closeAdminNewOngModal();

    // 3. Atualiza UI do admin
    await loadAdminOngs();
    await loadActiveOngSelector();
    await renderNgoContractsAuditTable();
    updateNgoContractBadgeUI(newOngId);

    showToast(`ONG "${novaOng.nome}" cadastrada e validada com sucesso! Protocolo: ${contractData.protocol}`);
  } catch (err) {
    console.error("Erro ao cadastrar ONG no Admin:", err);
    showError("Ocorreu um erro ao salvar o registro da ONG. Tente novamente.");
  }
}
window.handleAdminNewOngSubmit = handleAdminNewOngSubmit;


