/**
 * Banco de dados inicial de animais, ONGs parceiras e Regiões do Distrito Federal (DF).
 * Suporte a cálculo de proximidade e correspondência inteligente de perfil.
 */

/* ==========================================================================
   REGIÕES ADMINISTRATIVAS DO DISTRITO FEDERAL (DF) & PROXIMIDADE
   ========================================================================== */

const DF_REGIONS = [
  { nome: "Taguatinga", zona: "Oeste", sigla: "TAG" },
  { nome: "Ceilândia", zona: "Oeste", sigla: "CEI" },
  { nome: "Guará", zona: "Sul", sigla: "GUA" },
  { nome: "Brasília / Plano Piloto", zona: "Central", sigla: "BSB" },
  { nome: "Águas Claras", zona: "Oeste", sigla: "ACL" },
  { nome: "Samambaia", zona: "Oeste", sigla: "SAM" },
  { nome: "Vicente Pires", zona: "Oeste", sigla: "VCP" },
  { nome: "Sudoeste / Octogonal", zona: "Central", sigla: "SUD" },
  { nome: "Cruzeiro", zona: "Central", sigla: "CRU" },
  { nome: "Lago Sul", zona: "Central", sigla: "LGS" },
  { nome: "Lago Norte", zona: "Central", sigla: "LGN" },
  { nome: "Sobradinho", zona: "Norte", sigla: "SOB" },
  { nome: "Planaltina", zona: "Norte", sigla: "PLA" },
  { nome: "Gama", zona: "Sul", sigla: "GAM" },
  { nome: "Santa Maria", zona: "Sul", sigla: "SMA" },
  { nome: "Riacho Fundo", zona: "Sul", sigla: "RFU" },
  { nome: "Recanto das Emas", zona: "Sul", sigla: "REM" },
  { nome: "São Sebastião", zona: "Leste", sigla: "SSB" },
  { nome: "Park Way", zona: "Sul", sigla: "PKW" },
  { nome: "Núcleo Bandeirante", zona: "Sul", sigla: "NBD" },
  { nome: "Candangolândia", zona: "Sul", sigla: "CDL" },
  { nome: "Paranoá", zona: "Leste", sigla: "PRN" },
  { nome: "Itapoã", zona: "Leste", sigla: "ITP" },
  { nome: "Jardim Botânico", zona: "Leste", sigla: "JBT" },
  { nome: "Brazlândia", zona: "Oeste", sigla: "BRZ" },
  { nome: "SCIA / Estrutural", zona: "Central", sigla: "STR" },
  { nome: "SIA", zona: "Central", sigla: "SIA" },
  { nome: "Fercal", zona: "Norte", sigla: "FRC" },
  { nome: "Sol Nascente / Pôr do Sol", zona: "Oeste", sigla: "SNS" },
  { nome: "Arniqueira", zona: "Oeste", sigla: "ARN" },
  { nome: "Varjão", zona: "Central", sigla: "VRJ" }
];

/**
 * Calcula a proximidade geográfica entre duas regiões do Distrito Federal
 * @param {string} regiaoAdotante Região/Cidade do adotante
 * @param {string} regiaoTarget Região/Cidade da ONG ou do pet
 * @returns {Object|null} { isSame, isNeighbor, distanceKm, label, badgeColor }
 */
function getDfProximity(regiaoAdotante, regiaoTarget) {
  if (!regiaoAdotante || !regiaoTarget) return null;
  const clean = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const c1 = clean(regiaoAdotante);
  const c2 = clean(regiaoTarget);

  const r1 = DF_REGIONS.find(r => clean(r.nome) === c1 || c1.includes(clean(r.nome)) || clean(r.nome).includes(c1));
  const r2 = DF_REGIONS.find(r => clean(r.nome) === c2 || c2.includes(clean(r.nome)) || clean(r.nome).includes(c2));

  if (!r1 || !r2) {
    if (c1 === c2 && c1.length > 0) {
      return { 
        isSame: true, 
        isNeighbor: true, 
        distanceKm: 0, 
        label: `Na sua Região 📍`, 
        badgeColor: "bg-teal-100 text-teal-800 border-teal-300" 
      };
    }
    return null;
  }

  if (r1.nome === r2.nome) {
    return { 
      isSame: true, 
      isNeighbor: true, 
      distanceKm: 0, 
      label: `Na sua Região (${r2.nome}) 📍`, 
      badgeColor: "bg-teal-100 text-teal-800 border-teal-300" 
    };
  }

  if (r1.zona === r2.zona) {
    return { 
      isSame: false, 
      isNeighbor: true, 
      distanceKm: 6, 
      label: `Muito Próxima (~6 km • ${r2.nome}) 🚗`, 
      badgeColor: "bg-teal-100 text-teal-800 border-teal-300" 
    };
  }

  const vizinhasZonas = (r1.zona === "Oeste" && r2.zona === "Sul") || (r1.zona === "Central" && (r2.zona === "Sul" || r2.zona === "Oeste"));
  const dist = vizinhasZonas ? 12 : 20;

  return { 
    isSame: false, 
    isNeighbor: vizinhasZonas, 
    distanceKm: dist, 
    label: `${r2.nome} (~${dist} km)`, 
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300" 
  };
}

/* ==========================================================================
   BANCO DE DADOS DE ANIMAIS (COM FOCO NO DISTRITO FEDERAL & DIVERSIDADE DE IDADES)
   ========================================================================== */

const DEFAULT_ANIMALS = [
  {
    id: "pet-001",
    nome: "Tobi",
    especie: "cachorro",
    raca: "Vira-lata Caramelo (SRD)",
    porte: "medio",
    peso: "16 kg",
    pelagem: "Curta, Dourada / Caramelo",
    idade: "2 anos",
    sexo: "macho",
    descricao: "Tobi é um cão jovem alegre, brincalhão e com excelente energia. Adora correr no gramado, passear ao ar livre e encher sua casa de amor e lealdade.",
    historiaResgate: "Tobi foi acolhido com muito carinho em Brasília. Passou por reabilitação completa e hoje é 100% saudável, amoroso e pronto para viver muitas aventuras com sua nova família.",
    fotos: [
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=1000&q=80"
    ],
    videos: [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
    ],
    saude: {
      castrado: true,
      castracaoObs: "Procedimento realizado em 2024",
      vermifugado: true,
      vermifugoObs: "Aplicado recentemente",
      vacinas: ["Antirrábica", "V10 Canina", "Gripe Canina"],
      possuiEnfermidades: false,
      enfermidadesDescricao: "",
      medicamentosContinuos: "",
      cuidadosExtras: "Passeios regulares para gastar energia"
    },
    temperamento: ["Jovem", "Ativo", "Brincalhão", "Sociável", "Cheio de energia"],
    nivelEnergia: "alta",
    tipoDomicilio: "casa",
    tempoSozinho: "independente",
    conviveCriancas: "sim",
    conviveCaes: "sim",
    conviveGatos: "adaptacao",
    compatibilidade: {
      nivelEnergia: "alta",
      tipoDomicilio: "casa",
      tempoSozinho: "independente",
      conviveCriancas: "sim",
      conviveCaes: "sim",
      conviveGatos: "adaptacao"
    },
    status: "disponivel",
    ongId: "ong-001",
    ongNome: "Associação ProAnima DF",
    cidade: "Brasília / Plano Piloto - DF",
    regiaoDF: "Brasília / Plano Piloto",
    contatoWhatsapp: "5561999998888"
  },
  {
    id: "pet-002",
    nome: "Carisa",
    especie: "gato",
    raca: "Gata Tigrada (Tabby)",
    porte: "pequeno",
    peso: "4 kg",
    pelagem: "Curta, Tigrada Cinza e Marrom",
    idade: "1 ano e meio",
    sexo: "femea",
    descricao: "Carisa é uma gatinha doce, curiosa e companheira. Adora observar a janela telada, receber carinho atrás das orelhas e tirar sonecas na sala.",
    historiaResgate: "Carisa foi resgatada filhote e acolhida em nosso abrigo. Foi cuidada com muito afeto, vermifugada e castrada pela equipe veterinária.",
    fotos: [
      "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=1000&q=80"
    ],
    videos: [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
    ],
    saude: {
      castrado: true,
      castracaoObs: "Castrada pela ONG",
      vermifugado: true,
      vermifugoObs: "Em dia",
      vacinas: ["Antirrábica", "Quádrupla Felina (V4)"],
      possuiEnfermidades: false,
      enfermidadesDescricao: "",
      medicamentosContinuos: "",
      cuidadosExtras: "Arranhadores e ambiente telado"
    },
    temperamento: ["Calma", "Muito carinhosa", "Excelente em apartamento", "Dócil"],
    nivelEnergia: "baixa",
    tipoDomicilio: "apartamento",
    tempoSozinho: "independente",
    conviveCriancas: "sim",
    conviveCaes: "adaptacao",
    conviveGatos: "sim",
    compatibilidade: {
      nivelEnergia: "baixa",
      tipoDomicilio: "apartamento",
      tempoSozinho: "independente",
      conviveCriancas: "sim",
      conviveCaes: "adaptacao",
      conviveGatos: "sim"
    },
    status: "disponivel",
    ongId: "ong-001",
    ongNome: "Associação ProAnima DF",
    cidade: "Brasília / Plano Piloto - DF",
    regiaoDF: "Brasília / Plano Piloto",
    contatoWhatsapp: "5561999998888"
  },
  {
    id: "pet-003",
    nome: "Pami",
    especie: "outro",
    raca: "Mini Coelho Caramelo",
    porte: "mini",
    peso: "1.8 kg",
    pelagem: "Fofa, Dourada / Avelã",
    idade: "8 meses",
    sexo: "femea",
    descricao: "Pami é uma coelhinha adorável, tranquila e muito meiga. Extremamente limpa, dócil no contato e perfeita para lares silenciosos.",
    historiaResgate: "Pami foi resgatada de um criadouro irregular no DF. Hoje é saudável, adora feno fresquinho e convive em harmonia com todos ao seu redor no abrigo.",
    fotos: [
      "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1535241749838-299277b6305f?auto=format&fit=crop&w=1000&q=80"
    ],
    videos: [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
    ],
    saude: {
      castrado: true,
      castracaoObs: "Castrada por especialista em silvestres",
      vermifugado: true,
      vermifugoObs: "Em dia",
      vacinas: ["Vermifugada & Atestado Sanitário"],
      possuiEnfermidades: false,
      enfermidadesDescricao: "",
      medicamentosContinuos: "",
      cuidadosExtras: "Alimentação rica em feno e vegetais frescos"
    },
    temperamento: ["Calma", "Dócil", "Silenciosa", "Curiosa", "Adora carinho"],
    nivelEnergia: "baixa",
    tipoDomicilio: "apartamento",
    tempoSozinho: "independente",
    conviveCriancas: "supervisao",
    conviveCaes: "adaptacao",
    conviveGatos: "adaptacao",
    compatibilidade: {
      nivelEnergia: "baixa",
      tipoDomicilio: "apartamento",
      tempoSozinho: "independente",
      conviveCriancas: "supervisao",
      conviveCaes: "adaptacao",
      conviveGatos: "adaptacao"
    },
    status: "disponivel",
    ongId: "ong-001",
    ongNome: "Associação ProAnima DF",
    cidade: "Brasília / Plano Piloto - DF",
    regiaoDF: "Brasília / Plano Piloto",
    contatoWhatsapp: "5561999998888"
  },
  {
    id: "pet-004",
    nome: "Bob",
    especie: "cachorro",
    raca: "Beagle Mix",
    porte: "medio",
    peso: "15 kg",
    pelagem: "Curta, Tricolor",
    idade: "4 anos",
    sexo: "macho",
    descricao: "Bob é um cão curioso e dócil com energia moderada. Focado em farejar petiscos, aprende truques rápido e adapta-se a apartamentos com brinquedos interativos.",
    historiaResgate: "Bob foi acolhido pela ONG após ser resgatado e agora busca uma família amorosa. Companheiro fiel e muito inteligente.",
    fotos: [
      "https://images.unsplash.com/photo-1505628346881-b72b27e84530?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1000&q=80"
    ],
    videos: [],
    saude: {
      castrado: true,
      castracaoObs: "Castrado",
      vermifugado: true,
      vermifugoObs: "Em dia",
      vacinas: ["Antirrábica", "V10 Canina", "Gripe Canina"],
      possuiEnfermidades: false,
      enfermidadesDescricao: "",
      medicamentosContinuos: "",
      cuidadosExtras: "Limpeza quinzenal das orelhas"
    },
    temperamento: ["Curioso", "Energia moderada", "Amigável", "Obediente"],
    nivelEnergia: "moderada",
    tipoDomicilio: "qualquer",
    tempoSozinho: "independente",
    conviveCriancas: "sim",
    conviveCaes: "sim",
    conviveGatos: "sim",
    compatibilidade: {
      nivelEnergia: "moderada",
      tipoDomicilio: "qualquer",
      tempoSozinho: "independente",
      conviveCriancas: "sim",
      conviveCaes: "sim",
      conviveGatos: "sim"
    },
    status: "disponivel",
    ongId: "ong-001",
    ongNome: "Associação ProAnima DF",
    cidade: "Brasília / Plano Piloto - DF",
    regiaoDF: "Brasília / Plano Piloto",
    contatoWhatsapp: "5561999998888"
  },
  {
    id: "pet-005",
    nome: "Luna",
    especie: "cachorro",
    raca: "Pastor Alemão Mix",
    porte: "grande",
    peso: "26 kg",
    pelagem: "Média, Capa Preta",
    idade: "10 meses",
    sexo: "femea",
    descricao: "Luna é uma filhotona de pastor alemão (10 meses) cheia de vida, porte grande (26kg) e muito ativa. Precisa de espaço amplo ou tutores dedicados a passeios longos e adestramento.",
    historiaResgate: "Luna foi resgatada filhote e acolhida pela ONG. Cresceu saudável e forte, esperando uma família que curta passeios e brincadeiras.",
    fotos: [
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1561037404-61cd46aa615b?auto=format&fit=crop&w=1000&q=80"
    ],
    videos: [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4"
    ],
    saude: {
      castrado: false,
      castracaoObs: "Castração inclusa pela ONG aos 12 meses",
      vermifugado: true,
      vermifugoObs: "Protocolo de filhote completo",
      vacinas: ["Antirrábica", "V10 Canina (3 doses)"],
      possuiEnfermidades: false,
      enfermidadesDescricao: "",
      medicamentosContinuos: "",
      cuidadosExtras: "Adestramento positivo e exercícios físicos"
    },
    temperamento: ["Filhote", "Jovem", "Muito Ativa", "Inteligente", "Porte Grande"],
    nivelEnergia: "alta",
    tipoDomicilio: "espaco_amplo",
    tempoSozinho: "companhia_frequente",
    conviveCriancas: "supervisao",
    conviveCaes: "sim",
    conviveGatos: "adaptacao",
    compatibilidade: {
      nivelEnergia: "alta",
      tipoDomicilio: "espaco_amplo",
      tempoSozinho: "companhia_frequente",
      conviveCriancas: "supervisao",
      conviveCaes: "sim",
      conviveGatos: "adaptacao"
    },
    status: "disponivel",
    ongId: "ong-001",
    ongNome: "Associação ProAnima DF",
    cidade: "Brasília / Plano Piloto - DF",
    regiaoDF: "Brasília / Plano Piloto",
    contatoWhatsapp: "5561999998888"
  },
  {
    id: "pet-006",
    nome: "Chico",
    especie: "gato",
    raca: "Frajola (SRD)",
    porte: "pequeno",
    peso: "4.5 kg",
    pelagem: "Curta, Preto e Branco",
    idade: "1 ano",
    sexo: "macho",
    descricao: "Chico é um gatinho calmo, extremamente carinhoso e dócil. Fica super tranquilo enquanto você trabalha, adora sonecas na janela telada e é perfeito para apartamentos com redes de proteção.",
    historiaResgate: "Chico foi acolhido pela ONG no DF. É meigo, sociável e adora amassar pãozinho com as patinhas.",
    fotos: [
      "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=1000&q=80"
    ],
    videos: [],
    saude: {
      castrado: true,
      castracaoObs: "Castrado pela ONG",
      vermifugado: true,
      vermifugoObs: "Em dia",
      vacinas: ["V4 Felina", "Antirrábica"],
      possuiEnfermidades: false,
      enfermidadesDescricao: "",
      medicamentosContinuos: "",
      cuidadosExtras: "Lar estritamente telado"
    },
    temperamento: ["Calmo", "Ronronador", "Amigável", "Independente", "Dócil"],
    nivelEnergia: "baixa",
    tipoDomicilio: "apartamento",
    tempoSozinho: "independente",
    conviveCriancas: "sim",
    conviveCaes: "adaptacao",
    conviveGatos: "sim",
    compatibilidade: {
      nivelEnergia: "baixa",
      tipoDomicilio: "apartamento",
      tempoSozinho: "independente",
      conviveCriancas: "sim",
      conviveCaes: "adaptacao",
      conviveGatos: "sim"
    },
    status: "disponivel",
    ongId: "ong-001",
    ongNome: "Associação ProAnima DF",
    cidade: "Brasília / Plano Piloto - DF",
    regiaoDF: "Brasília / Plano Piloto",
    contatoWhatsapp: "5561999998888"
  },
  {
    id: "pet-007",
    nome: "Barnabé",
    especie: "cachorro",
    raca: "Vira-lata Caramelo (SRD)",
    porte: "medio",
    peso: "14 kg",
    pelagem: "Curta, Caramelo Dourado",
    idade: "7 anos",
    sexo: "macho",
    descricao: "Barnabé tem 7 anos e é a personificação da calma e serenidade. Adora passar a tarde tirando sonecas no tapete, não late sem motivo e fica extremamente satisfeito com voltas higiênicas rápidas de 10 a 15 minutos. Ideal para quem mora em apartamento ou casa e não tem tempo para passeios longos.",
    historiaResgate: "Barnabé viveu anos em um terreno até ser acolhido com carinho pelo abrigo da ONG. Tratado com zelo, revelou uma doçura e gratidão infinitas. É um cãozinho pacífico que se adapta de imediato à rotina de quem busca paz.",
    fotos: [
      "https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1000&q=80"
    ],
    videos: [],
    saude: {
      castrado: true,
      castracaoObs: "Castrado pela ONG",
      vermifugado: true,
      vermifugoObs: "Em dia",
      vacinas: ["Antirrábica", "V10 Canina"],
      possuiEnfermidades: false,
      enfermidadesDescricao: "",
      medicamentosContinuos: "",
      cuidadosExtras: "Passeios leves e caminha confortável"
    },
    temperamento: ["Idoso (7 anos)", "Calmo", "Dorminhoco", "Companheiro", "Passeios Curtos", "Dócil", "Silencioso"],
    nivelEnergia: "baixa",
    tipoDomicilio: "apartamento",
    tempoSozinho: "independente",
    conviveCriancas: "sim",
    conviveCaes: "sim",
    conviveGatos: "sim",
    compatibilidade: {
      nivelEnergia: "baixa",
      tipoDomicilio: "apartamento",
      tempoSozinho: "independente",
      conviveCriancas: "sim",
      conviveCaes: "sim",
      conviveGatos: "sim"
    },
    status: "disponivel",
    ongId: "ong-001",
    ongNome: "Associação ProAnima DF",
    cidade: "Brasília / Plano Piloto - DF",
    regiaoDF: "Brasília / Plano Piloto",
    contatoWhatsapp: "5561999998888"
  },
  {
    id: "pet-008",
    nome: "Fred",
    especie: "cachorro",
    raca: "Poodle Mix",
    porte: "pequeno",
    peso: "6.5 kg",
    pelagem: "Encaracolada, Champanhe",
    idade: "8 anos",
    sexo: "macho",
    descricao: "Fred tem 8 anos de pura doçura e mansidão. Cãozinho idoso e caseiro, perfeito para apartamento, adora ficar aconchegado no colo enquanto você assiste TV ou trabalha em home office. Não tem energia acumulada, não destrói móveis e demanda apenas carinho e pequenos passeios.",
    historiaResgate: "Fred foi acolhido pela ONG no DF após seu antigo tutor idoso falecer. É muito educado, silencioso e afetuoso, sonhando com um lar quentinho para passar seus anos dourados.",
    fotos: [
      "https://images.unsplash.com/photo-1591769225440-811ad7d6eca3?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=1000&q=80"
    ],
    videos: [],
    saude: {
      castrado: true,
      castracaoObs: "Castrado",
      vermifugado: true,
      vermifugoObs: "Em dia",
      vacinas: ["Antirrábica", "V8 Canina"],
      possuiEnfermidades: false,
      enfermidadesDescricao: "",
      medicamentosContinuos: "",
      cuidadosExtras: "Tosa higiênica e carinho"
    },
    temperamento: ["Idoso (8 anos)", "Muito Calmo", "Companheiro", "Excelente em Apartamento", "Carinhoso"],
    nivelEnergia: "baixa",
    tipoDomicilio: "apartamento",
    tempoSozinho: "independente",
    conviveCriancas: "sim",
    conviveCaes: "sim",
    conviveGatos: "sim",
    compatibilidade: {
      nivelEnergia: "baixa",
      tipoDomicilio: "apartamento",
      tempoSozinho: "independente",
      conviveCriancas: "sim",
      conviveCaes: "sim",
      conviveGatos: "sim"
    },
    status: "disponivel",
    ongId: "ong-001",
    ongNome: "Associação ProAnima DF",
    cidade: "Brasília / Plano Piloto - DF",
    regiaoDF: "Brasília / Plano Piloto",
    contatoWhatsapp: "5561999998888"
  },
  {
    id: "pet-009",
    nome: "Max",
    especie: "cachorro",
    raca: "Boxer Mix",
    porte: "grande",
    peso: "25 kg",
    pelagem: "Curta, Tigrada",
    idade: "1 ano e 6 meses",
    sexo: "macho",
    descricao: "Max é um garotão jovem cheio de energia e alegria de viver. Ama corridas matinais, brincar com bolinhas e gastar energia ao ar livre. Ideal para tutores com rotina ativa e tempo para exercícios diários.",
    historiaResgate: "Max foi encontrado acolhido no Parque da Cidade em Brasília e recuperado pela ONG. Reabilitado com vigor e adestramento básico, está pronto para ser o melhor parceiro de corridas de quem ama esportes e atividades ao ar livre.",
    fotos: [
      "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1000&q=80"
    ],
    videos: [],
    saude: {
      castrado: true,
      castracaoObs: "Castrado pela ONG",
      vermifugado: true,
      vermifugoObs: "Em dia",
      vacinas: ["Antirrábica", "V10 Canina", "Gripe Canina"],
      possuiEnfermidades: false,
      enfermidadesDescricao: "",
      medicamentosContinuos: "",
      cuidadosExtras: "Passeios longos diários (+40 min)"
    },
    temperamento: ["Jovem", "Muito Ativo", "Atlético", "Brincalhão", "Porte Grande"],
    nivelEnergia: "alta",
    tipoDomicilio: "espaco_amplo",
    tempoSozinho: "independente",
    conviveCriancas: "sim",
    conviveCaes: "sim",
    conviveGatos: "adaptacao",
    compatibilidade: {
      nivelEnergia: "alta",
      tipoDomicilio: "espaco_amplo",
      tempoSozinho: "independente",
      conviveCriancas: "sim",
      conviveCaes: "sim",
      conviveGatos: "adaptacao"
    },
    status: "disponivel",
    ongId: "ong-001",
    ongNome: "Associação ProAnima DF",
    cidade: "Brasília / Plano Piloto - DF",
    regiaoDF: "Brasília / Plano Piloto",
    contatoWhatsapp: "5561999998888"
  }
];

/* ==========================================================================
   ONGs PARCEIRAS DO DISTRITO FEDERAL
   ========================================================================== */

const DEFAULT_ONGS = [
  {
    id: "ong-001",
    nome: "Associação ProAnima DF",
    sigla: "PROANIMA",
    cidade: "Brasília / Plano Piloto - DF",
    regiao: "Brasília / Plano Piloto",
    anoFundacao: 2003,
    foto: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
    descricao: "Pioneira na proteção e bem-estar animal no Distrito Federal há mais de 23 anos. Atuamos com resgate ético, reabilitação veterinária completa, acolhimento em abrigo estruturado e intermediação de adoções conscientes em Brasília e regiões administrativas.",
    chavePix: "contato@proanimadf.org.br",
    whatsapp: "5561999998888",
    instagram: "@proanima_df",
    totalAdotados: 540,
    baseDisponiveis: 16,
    historia: "Fundada em 2003 no coração de Brasília por uma aliança pioneira de médicos veterinários, biólogos e voluntários apaixonados pela causa, a Associação ProAnima nasceu com um propósito claro e inegociável: construir uma resposta ética, estruturada e permanente contra o abandono e os maus-tratos de animais no Distrito Federal.\n\nAo longo de mais de 23 anos de dedicação ininterrupta, nossa instituição já transformou a história de mais de 1.500 cães e gatos vulneráveis acolhidos, reabilitados e encaminhados para lares responsáveis. Atuamos com resgates prioritários em diversas regiões administrativas do DF — de Ceilândia, Samambaia e Taguatinga ao Plano Piloto, Guará e Sobradinho —, priorizando animais doentes, atropelados, vítimas de negligência severa ou ninhadas sem amparo maternal.\n\nNosso protocolo de acolhimento é conduzido sob os mais rigorosos padrões da medicina veterinária ética. Todo animal que chega ao abrigo é imediatamente recebido em nossa enfermaria para triagem clínica geral, testagem sorológica para zoonoses, coleta de exames laboratoriais, banho terapêutico, vermifugação e início do esquema vacinal com imunizantes importados polivalentes. Para preservar a saúde coletiva de todos os residentes, os recém-chegados cumprem período de quarentena monitorado antes de sua integração aos espaços de convivência.\n\nA infraestrutura do nosso abrigo no Distrito Federal foi planejada exclusivamente para devolver a dignidade, a segurança e a alegria aos resgatados. Dispomos de solários amplos e ensolarados, canis higienizados com isolamento térmico e piso antiderrapante, além de um gatil vertical enriquecido com pontes suspensas, tocas confortáveis e telas de proteção completas. Nossos cuidadores e adestradores voluntários realizam atividades diárias de enriquecimento comportamental e passeios guiados, restaurando a autoconfiança de pets que sofreram traumas no passado.\n\nAcreditamos firmemente que a castração é a única medida humanitária eficaz para combater a superpopulação e prevenir doenças graves. Por essa razão, 100% dos animais adultos acolhidos pela ProAnima são castrados e microchipados antes de serem liberados para adoção. No caso de filhotes resgatados que encontram um lar antes da idade mínima cirúrgica, a ProAnima assegura e financia o procedimento gratuitamente em nossa rede veterinária credenciada assim que atingem o desenvolvimento necessário.\n\nA adoção responsável na ProAnima é um pacto de amor e cidadania: realizamos entrevistas criteriosas de alinhamento com a família, visitas acompanhadas ao abrigo e assinatura do termo de tutela responsável, mantendo um canal permanente de suporte e acompanhamento no pós-adoção. Mantida unicamente pelo amor de voluntários, doações voluntárias e feirinhas solidárias, a ProAnima reafirma todos os dias que adotar não é apenas salvar uma vida — é transformar uma família inteira.",
    fotosAbrigo: [
      "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?auto=format&fit=crop&w=800&q=80"
    ],
    videosAbrigo: [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
    ]
  }
];

/* ==========================================================================
   EVENTOS & FEIRINHAS NO DISTRITO FEDERAL
   ========================================================================== */

const DEFAULT_EVENTOS = [
  {
    id: "evt-001",
    titulo: "Feirinha de Adoção no Parque da Cidade - Brasília",
    data: "2026-10-12",
    dataExtenso: "Sábado, 12 de Outubro de 2026",
    horario: "10:00 às 16:00",
    local: "Parque da Cidade Dona Sarah Kubitschek - Estacionamento 10",
    endereco: "Eixo Monumental - Brasília, DF",
    cidade: "Brasília / Plano Piloto - DF",
    regiaoDF: "Brasília / Plano Piloto",
    ongId: "ong-001",
    ongNome: "Associação ProAnima DF",
    foto: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=800&q=80",
    descricao: "Mais de 30 cães e gatos castrados, vermifugados e vacinados esperando por você! Teremos lojinha beneficente, veterinários voluntários tirando dúvidas e mimos para todos que adotarem.",
    animaisPresentes: ["Thor", "Max"],
    linkMaps: "https://maps.google.com/?q=Parque+da+Cidade+Brasilia"
  },
  {
    id: "evt-002",
    titulo: "Encontro Pet Solidário Taguatinga: Abrace um Amigo",
    data: "2026-10-20",
    dataExtenso: "Domingo, 20 de Outubro de 2026",
    horario: "11:00 às 17:00",
    local: "Taguatinga Shopping - Área Externa Pet Friendly",
    endereco: "QS 01, Lote 40 - Taguatinga, DF",
    cidade: "Taguatinga - DF",
    regiaoDF: "Taguatinga",
    ongId: "ong-001",
    ongNome: "Associação ProAnima DF",
    foto: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80",
    descricao: "Traga sua família para um dia de muito amor! Espaço com dezenas de peludinhos esperando um lar responsável, com destaque especial para os nossos vovôs dóceis.",
    animaisPresentes: ["Mel", "Barnabé", "Chico"],
    linkMaps: "https://maps.google.com/?q=Taguatinga+Shopping"
  },
  {
    id: "evt-003",
    titulo: "Feira de Adoção e Conscientização Ceilândia",
    data: "2026-10-26",
    dataExtenso: "Sábado, 26 de Outubro de 2026",
    horario: "09:00 às 15:00",
    local: "Praça do Cidadão - Ceilândia Centro",
    endereco: "QNM 13 - Ceilândia, DF",
    cidade: "Ceilândia - DF",
    regiaoDF: "Ceilândia",
    ongId: "ong-001",
    ongNome: "Associação ProAnima DF",
    foto: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=800&q=80",
    descricao: "Feirinha de adoção consciente com orientação sobre guarda responsável e cuidados especiais para pets idosos e filhotes.",
    animaisPresentes: ["Fred", "Bob"],
    linkMaps: "https://maps.google.com/?q=Ceilandia+Centro+Brasilia"
  }
];

/* ==========================================================================
   RIFAS & CAMPANHAS SOLIDÁRIAS
   ========================================================================== */

const DEFAULT_RIFAS = [
  {
    id: "rifa-001",
    titulo: "Rifa Solidária: Cirurgia Ortopédica & Reabilitação do Thor",
    tipo: "dinheiro",
    ongId: "ong-001",
    ongNome: "Associação ProAnima DF",
    foto: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80",
    descricao: "Arrecadação para custear a cirurgia de ligamento e sessões de fisioterapia veterinária do Thor. Com o seu bilhete, ele voltará a correr sem dor no DF!",
    premio: "Cesta Pet Premium (Cama ortopédica + R$ 250 em compras no pet shop + brinquedos)",
    meta: 2500,
    arrecadado: 1950,
    valorBilhete: 15,
    totalBilhetes: 170,
    bilhetesVendidos: 130,
    chavePix: "contato@proanimadf.org.br",
    whatsapp: "5561999998888",
    dataSorteio: "30 de Outubro de 2026"
  },
  {
    id: "rifa-002",
    titulo: "Campanha Emergencial de Ração: 1 Tonelada para o Abrigo Central",
    tipo: "racao",
    ongId: "ong-001",
    ongNome: "Associação ProAnima DF",
    foto: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=800&q=80",
    descricao: "O estoque de ração do abrigo está no fim. Alimentamos mais de 120 cães e gatos resgatados diariamente. Doe 1 saco ou compre cotas para abastecermos as tigelas!",
    premio: "Campanha 100% Solidária (Prestação de contas transparente com fotos e vídeos semanais)",
    meta: 1000,
    arrecadado: 720,
    unidade: "kg",
    precoSaco15kg: 85,
    chavePix: "contato@proanimadf.org.br",
    pontoColeta: "Sede do Abrigo ProAnima DF ou entrega agendada",
    whatsapp: "5561999998888",
    dataSorteio: "Meta Contínua de Outubro"
  },
  {
    id: "rifa-003",
    titulo: "Rifa do Bem: Mutirão de Castração & Vacinas de Filhotes",
    tipo: "dinheiro",
    ongId: "ong-001",
    ongNome: "Associação ProAnima DF",
    foto: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=800&q=80",
    descricao: "Recursos destinados a castrar e vacinar 45 filhotes e mães resgatados de situação de vulnerabilidade no DF. Cada bilhete apoia um futuro saudável e digno!",
    premio: "Vale-Compras Pet de R$ 500 + Ensaio Fotográfico Profissional com seu Pet",
    meta: 3200,
    arrecadado: 2400,
    valorBilhete: 20,
    totalBilhetes: 160,
    bilhetesVendidos: 120,
    chavePix: "contato@proanimadf.org.br",
    whatsapp: "5561999998888",
    dataSorteio: "15 de Novembro de 2026"
  }
];

/* ==========================================================================
   BLOG ATUALIZADO (HISTÓRIAS DE SUCESSO, DICAS DE SAÚDE & NOTÍCIAS)
   ========================================================================== */

const DEFAULT_BLOG_POSTS = [
  {
    id: "blog-001",
    titulo: "O Recomeço de Pipoca: De animal resgatado a membro inseparável da família",
    categoria: "História de Adoção",
    categoriaBadge: "bg-rose-50 text-rose-700 border-rose-200",
    autor: "Mariana & Carlos (Tutores)",
    data: "05 de Setembro de 2026",
    tempoLeitura: "4 min de leitura",
    foto: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80",
    resumo: "Encontrada debilitada em Ceilândia, Pipoca passou por meses de reabilitação e carinho com a ONG parceira e hoje vive uma rotina repleta de amor e passeios no Plano Piloto.",
    conteudo: `
      <p class="mb-3">A história de Pipoca começou em um dia chuvoso de março, quando foi resgatada debilitada e assustada nas proximidades de uma avenida movimentada em Ceilândia. Graças à intervenção rápida de protetores independentes e da ONG parceira ProAnima DF, ela recebeu atendimento veterinário imediato, vacinas e cuidados intensivos.</p>
      <p class="mb-3">Durante dois meses em lar temporário, Pipoca reaprendeu a confiar nos humanos. Quando Mariana e Carlos viram o perfil dela na plataforma MatchPet, foi amor à primeira vista. <em>'O teste de compatibilidade indicou 98% de afinidade com nossa rotina. Quando a conhecemos pessoalmente na feirinha, tivemos a certeza de que ela era nossa filha de quatro patas'</em>, relata Mariana.</p>
      <p>Hoje, Pipoca é cheia de energia, adora passear no Parque da Cidade e enche a casa de alegria. Adotar é dar uma segunda chance e transformar vidas para sempre!</p>
    `
  },
  {
    id: "blog-002",
    titulo: "Guia Prático: Como adaptar seu novo gato em apartamento com total segurança",
    categoria: "Dicas & Saúde",
    categoriaBadge: "bg-teal-50 text-teal-700 border-teal-200",
    autor: "Dra. Patrícia Mendes (Médica Veterinária CRMV-DF)",
    data: "02 de Setembro de 2026",
    tempoLeitura: "5 min de leitura",
    foto: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80",
    resumo: "Telas de proteção resistentes, enriquecimento ambiental com arranhadores e período de acolhimento suave: confira as orientações essenciais para receber seu felino sem estresse.",
    conteudo: `
      <p class="mb-3">Adotar um gatinho para viver em apartamento exige planejamento e cuidados específicos para garantir sua saúde física e emocional. O primeiro passo indispensável é a instalação de redes de proteção em todas as janelas, basculantes e varandas, certificando-se de que a malha seja adequada para felinos.</p>
      <p class="mb-3">Nos primeiros dias, reserve um cômodo calmo e seguro para o felino. Disponibilize caixa de areia distante dos comedouros e bebedouros, além de arranhadores verticais e tocas onde ele possa se abrigar.</p>
      <p>Tenha paciência: cada gato possui seu próprio ritmo para explorar a casa. O segredo é respeitar o espaço do animal, oferecendo petiscos e carinhos sutis à medida que ele demonstrar curiosidade e confiança.</p>
    `
  },
  {
    id: "blog-003",
    titulo: "Vacinação e Castração: O Guia Definitivo da Adoção Responsável",
    categoria: "Saúde Animal",
    categoriaBadge: "bg-[#e6f4f5] text-[#007E82] border-[#b2dedf]",
    autor: "Equipe MatchPet • Saúde Animal",
    data: "28 de Agosto de 2026",
    tempoLeitura: "6 min de leitura",
    foto: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=800&q=80",
    resumo: "Entenda por que manter as vacinas polivalente (V10 para cães, V4 para gatos) e antirrábica rigorosamente em dia salva vidas, além de conhecer os benefícios preventivos da castração.",
    conteudo: `
      <p class="mb-3">A vacinação anual e a castração não são apenas formalidades: são atos de amor e responsabilidade que protegem diretamente a vida do seu animal e de toda a comunidade.</p>
      <p class="mb-3">A vacina polivalente protege contra doenças altamente transmissíveis e potencialmente fatais, como cinomose, parvovirose e leptospirose em cães, e panleucopenia e rinotraqueíte em gatos. A vacina antirrábica, por sua vez, é obrigatória por lei e protege contra a raiva, uma zoonose grave.</p>
      <p>A castração previne infecções uterinas (piometra), tumores de mama e próstata, além de reduzir drasticamente fugas e brigas territoriais. Todos os animais disponíveis na MatchPet passam por avaliação veterinária minuciosa.</p>
    `
  },
  {
    id: "blog-004",
    titulo: "Como Apoiar Nossas ONGs Parceiras Além da Adoção Direta",
    categoria: "Notícias das ONGs",
    categoriaBadge: "bg-amber-50 text-amber-800 border-amber-200",
    autor: "Associação ProAnima DF",
    data: "25 de Agosto de 2026",
    tempoLeitura: "3 min de leitura",
    foto: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80",
    resumo: "Se você ainda não pode adotar, há diversas maneiras de fazer a diferença: doação de sacos de ração, apadrinhamento financeiro e trabalho voluntário em eventos presenciais.",
    conteudo: `
      <p class="mb-3">Nem todo mundo está no momento ideal para acolher um novo pet em casa, mas isso não significa que você não possa salvar vidas! Nossas ONGs parceiras no Distrito Federal dependem continuamente do apoio da comunidade para manter seus abrigos funcionando.</p>
      <p class="mb-3">Você pode participar como voluntário nas feirinhas de adoção, ajudar a transportar animais para consultas veterinárias ou participar das rifas beneficentes que custeiam cirurgias ortopédicas de emergência.</p>
      <p>Doações de ração de boa qualidade, cobertores e medicamentos também são fundamentais. Acesse a aba 'Painéis ONGs' para conhecer as necessidades de cada instituição parceira.</p>
    `
  }
];

/* ==========================================================================
   EXPORTAÇÕES GLOBAIS
   ========================================================================== */

if (typeof window !== "undefined") {
  window.DF_REGIONS = DF_REGIONS;
  window.getDfProximity = getDfProximity;
  window.DEFAULT_ANIMALS = DEFAULT_ANIMALS;
  window.DEFAULT_ONGS = DEFAULT_ONGS;
  window.DEFAULT_EVENTOS = DEFAULT_EVENTOS;
  window.DEFAULT_RIFAS = DEFAULT_RIFAS;
  window.DEFAULT_BLOG_POSTS = DEFAULT_BLOG_POSTS;
}

