/**
 * Serviço de Integração com a API do Cloudinary.
 * Permite upload direto de fotos e vídeos para a nuvem utilizando Unsigned Upload Presets.
 */

const CLOUDINARY_STORAGE_KEY = "adoteamigo_cloudinary_config_v1";

const CloudinaryService = {
  // Carrega as configurações salvas
  getConfig() {
    try {
      const data = localStorage.getItem(CLOUDINARY_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Erro ao ler configurações do Cloudinary:", e);
    }
    return {
      cloudName: "",
      uploadPreset: ""
    };
  },

  // Salva as configurações
  saveConfig(cloudName, uploadPreset) {
    const config = {
      cloudName: (cloudName || "").trim(),
      uploadPreset: (uploadPreset || "").trim(),
      updatedAt: Date.now()
    };
    localStorage.setItem(CLOUDINARY_STORAGE_KEY, JSON.stringify(config));
    return config;
  },

  // Verifica se o Cloudinary está configurado
  isConfigured() {
    const config = this.getConfig();
    return !!(config.cloudName && config.uploadPreset);
  },

  /**
   * Faz o upload de um arquivo (foto ou vídeo) para o Cloudinary
   * @param {File|Blob} file Arquivo a ser enviado
   * @param {string} resourceType 'image', 'video' ou 'auto'
   * @returns {Promise<{success: boolean, url: string, publicId: string, error?: string}>}
   */
  async uploadMedia(file, resourceType = "auto") {
    const config = this.getConfig();
    if (!config.cloudName || !config.uploadPreset) {
      throw new Error("Cloudinary não configurado. Defina o Cloud Name e o Upload Preset.");
    }

    // Determina o endpoint correto (image ou video)
    let endpointType = resourceType;
    if (resourceType === "auto") {
      endpointType = file.type && file.type.startsWith("video/") ? "video" : "image";
    }

    const url = `https://api.cloudinary.com/v1_1/${config.cloudName}/${endpointType}/upload`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", config.uploadPreset);

    const response = await fetch(url, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || `Falha no upload (HTTP ${response.status})`;
      throw new Error(message);
    }

    const result = await response.json();
    return {
      success: true,
      url: result.secure_url || result.url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      bytes: result.bytes
    };
  },

  /**
   * Testa a conexão fazendo upload de uma imagem mínima de teste de 1 pixel
   */
  async testConnection() {
    const config = this.getConfig();
    if (!config.cloudName || !config.uploadPreset) {
      return { success: false, message: "Preencha o Cloud Name e o Upload Preset." };
    }

    try {
      // 1x1 GIF transparente em Base64 para teste instantâneo
      const testPixel = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      const formData = new FormData();
      formData.append("file", testPixel);
      formData.append("upload_preset", config.uploadPreset);

      const url = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;
      const response = await fetch(url, { method: "POST", body: formData });
      
      if (response.ok) {
        return { success: true, message: "Conexão com o Cloudinary estabelecida com sucesso!" };
      } else {
        const err = await response.json().catch(() => ({}));
        return { success: false, message: err.error?.message || "Erro na autenticação do preset." };
      }
    } catch (e) {
      return { success: false, message: e.message || "Erro de rede ao conectar ao Cloudinary." };
    }
  }
};

if (typeof window !== "undefined") {
  window.CloudinaryService = CloudinaryService;
}
