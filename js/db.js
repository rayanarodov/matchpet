/**
 * Camada de Banco de Dados IndexedDB para a plataforma de adoção (AdoteAmigoDB).
 * Permite armazenamento local seguro e persistente de fotos de alta resolução e
 * vídeos (Blobs/Arquivos) sem as restrições de tamanho do LocalStorage (~5MB).
 */

const DB_NAME = "AdoteAmigoDB";
const DB_VERSION = 1;
const STORE_NAME = "pets";

const PetDB = {
  db: null,
  _initPromise: null,

  /**
   * Inicializa o IndexedDB e popula com os dados padrão se estiver vazio
   */
  async init() {
    if (this.db) return this.db;
    if (this._initPromise) return this._initPromise;

    this._initPromise = new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.warn("PetDB: IndexedDB timeout (5000ms), usando fallback LocalStorage.");
        resolve(null);
      }, 5000);

      try {
        if (typeof indexedDB === "undefined") {
          clearTimeout(timer);
          resolve(null);
          return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
            store.createIndex("especie", "especie", { unique: false });
            store.createIndex("porte", "porte", { unique: false });
            store.createIndex("status", "status", { unique: false });
          }
        };

        request.onsuccess = (event) => {
          clearTimeout(timer);
          this.db = event.target.result;
          resolve(this.db);
        };

        request.onblocked = () => {
          clearTimeout(timer);
          console.warn("PetDB bloqueado, usando fallback LocalStorage.");
          resolve(null);
        };

        request.onerror = (event) => {
          clearTimeout(timer);
          console.warn("Erro ao abrir IndexedDB, usando fallback LocalStorage:", event.target.error);
          resolve(null);
        };
      } catch (err) {
        clearTimeout(timer);
        resolve(null);
      }
    });
    return this._initPromise;
  },

  /**
   * Retorna uma transação para a store de pets
   */
  getStore(mode = "readonly") {
    if (!this.db) return null;
    try {
      const transaction = this.db.transaction(STORE_NAME, mode);
      return transaction.objectStore(STORE_NAME);
    } catch (e) {
      return null;
    }
  },

  /**
   * Conta quantos animais existem na base
   */
  async count() {
    await this.init();
    if (!this.db) return 0;
    return new Promise((resolve) => {
      try {
        const timer = setTimeout(() => resolve(0), 5000);
        const store = this.getStore("readonly");
        if (!store) { clearTimeout(timer); return resolve(0); }
        const request = store.count();
        request.onsuccess = () => { clearTimeout(timer); resolve(request.result); };
        request.onerror = () => { clearTimeout(timer); resolve(0); };
      } catch (e) {
        resolve(0);
      }
    });
  },

  /**
   * Retorna todos os animais cadastrados
   */
  async getAll() {
    await this.init();
    if (!this.db) return [];
    return new Promise((resolve) => {
      try {
        const timer = setTimeout(() => resolve([]), 5000);
        const store = this.getStore("readonly");
        if (!store) { clearTimeout(timer); return resolve([]); }
        const request = store.getAll();
        request.onsuccess = () => {
          clearTimeout(timer);
          const list = request.result || [];
          list.sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0));
          resolve(list);
        };
        request.onerror = () => { clearTimeout(timer); resolve([]); };
      } catch (e) {
        resolve([]);
      }
    });
  },

  /**
   * Retorna um animal pelo ID
   */
  async getById(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore("readonly");
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Salva ou atualiza um animal (suportando Blobs de fotos e vídeos)
   */
  async save(pet) {
    await this.init();
    if (!pet.id) {
      pet.id = "pet-" + Date.now();
    }
    pet.atualizadoEm = Date.now();
    if (!pet.criadoEm) {
      pet.criadoEm = Date.now();
    }

    return new Promise((resolve, reject) => {
      const store = this.getStore("readwrite");
      const request = store.put(pet);
      request.onsuccess = () => resolve(pet);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Remove um animal pelo ID
   */
  async delete(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore("readwrite");
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Restaura os dados originais padrão
   */
  async resetDefaults() {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore("readwrite");
      const clearRequest = store.clear();
      clearRequest.onsuccess = async () => {
        if (window.DEFAULT_ANIMALS) {
          for (const pet of window.DEFAULT_ANIMALS) {
            await this.save({ ...pet });
          }
        }
        resolve(await this.getAll());
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  },

  /**
   * Exporta os registros em formato JSON (convertendo Blobs para DataURL se aplicável)
   */
  async exportBackup() {
    const pets = await this.getAll();
    const exportablePets = [];

    for (const pet of pets) {
      const copy = { ...pet };
      // Se fotos ou vídeos tiverem Blobs, converte para Base64
      if (Array.isArray(copy.fotos)) {
        copy.fotos = await Promise.all(copy.fotos.map(async (f) => {
          if (f instanceof Blob) return await this.blobToDataUrl(f);
          return f;
        }));
      }
      if (Array.isArray(copy.videos)) {
        copy.videos = await Promise.all(copy.videos.map(async (v) => {
          if (v instanceof Blob) return await this.blobToDataUrl(v);
          return v;
        }));
      }
      exportablePets.push(copy);
    }

    const data = JSON.stringify(exportablePets, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_adoteamigo_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Importa registros a partir de um texto JSON
   */
  async importBackup(jsonString) {
    try {
      const items = JSON.parse(jsonString);
      if (!Array.isArray(items)) throw new Error("JSON deve ser uma lista de animais.");
      await this.init();
      for (const item of items) {
        if (item.id) {
          await this.save(item);
        }
      }
      return true;
    } catch (e) {
      console.error("Erro na importação:", e);
      return false;
    }
  },

  /**
   * Converte Blob/File para DataURL (Base64)
   */
  blobToDataUrl(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  },

  /**
   * Converte um item de foto/vídeo (que pode ser URL string ou Blob) em uma URL utilizável pelo navegador
   */
  getMediaUrl(item) {
    if (!item) return "";
    if (typeof item === "string") return item;
    if (item instanceof Blob) {
      return URL.createObjectURL(item);
    }
    if (item.dataUrl) return item.dataUrl;
    if (item.url) return item.url;
    return "";
  }
};

if (typeof window !== "undefined") {
  window.PetDB = PetDB;
}
