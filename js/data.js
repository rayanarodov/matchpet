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
    "id": "pet-1793639333432",
    "nome": "Bela",
    "especie": "cachorro",
    "raca": "Vira-lata (SRD)",
    "porte": "medio",
    "peso": "12kg",
    "pelagem": "Curta, tigrada",
    "idade": "1 ano",
    "sexo": "femea",
    "descricao": "Adora passeios e ama brincar",
    "historiaResgate": "Eu vivia do lado de fora de um barraquinho de madeira, amarrada, sem poder ir embora. Meu antigo tutor bebia muito e usava drogas, e muitas vezes descontava em mim aquilo que carregava dentro dele. Eu apanhava e, mesmo assim, continuava esperando que algum dia alguém olhasse para mim e percebesse que eu só queria ser amada.\n\nAté que um dia eu fiquei muito doente. A cinomose tomou conta de mim e eu estava quase morrendo. Pediram que ele me entregasse para que pudessem cuidar de mim, mas ele não deixou.\n\nEntão, para me salvar, precisaram me \"roubar\".\n\nTalvez, para alguns, isso tenha sido errado. Para mim, foi a primeira vez que alguém escolheu a minha vida.\n\nEu recebi tratamento, cuidado e, principalmente, a chance de descobrir que nem todo ser humano machuca. Eu lutei muito e me recuperei. Hoje estou aqui, saudável, carinhosa e pronta para viver tudo aquilo que eu nunca pude viver.\n\nSou uma menina de porte médio. Eu amo estar perto, ganhar atenção e sentir que estou segura.\n\nDepois de tudo que passei, eu não quero muito. Quero uma família que entenda que eu sou uma vida, não uma coisa. Que tenha paciência, responsabilidade e que nunca mais me faça sentir medo.\n\nEu sobrevivi ao pior. Agora só falta encontrar quem esteja disposto a me mostrar como é ser amada para sempre.",
    "fotos": [
      "img/pets/bela-1.png",
      "img/pets/bela-2.png",
      "img/pets/bela-3.png",
      "img/pets/bela-4.png"
    ],
    "videos": [],
    "saude": {
      "castrado": true,
      "castracaoObs": "",
      "vermifugado": false,
      "vermifugoObs": "",
      "vacinas": [],
      "possuiEnfermidades": true,
      "enfermidadesDescricao": "Possui uma leve mioclonia (tique em decorrência da sequela da cinomose- não a atrapalha em absolutamente nada)",
      "medicamentosContinuos": "",
      "cuidadosExtras": "",
      "assistenciaMedica": "Possui uma leve mioclonia (tique em decorrência da sequela da cinomose- não a atrapalha em absolutamente nada)",
      "cuidadosEspeciais": ""
    },
    "temperamento": [
      "Carinhosa",
      "dócil",
      "brincalhona e companheira"
    ],
    "nivelEnergia": "moderada",
    "tipoDomicilio": "qualquer",
    "tempoSozinho": "independente",
    "conviveCriancas": "supervisao",
    "conviveCaes": "adaptacao",
    "conviveGatos": "adaptacao",
    "compatibilidade": {
      "nivelEnergia": "moderada",
      "tipoDomicilio": "qualquer",
      "tempoSozinho": "independente",
      "conviveCriancas": "supervisao",
      "conviveCaes": "adaptacao",
      "conviveGatos": "adaptacao"
    },
    "status": "disponivel",
    "ongId": "ong-001",
    "ongNome": "Lar dos Anjos",
    "cidade": "Brasília / Plano Piloto - DF",
    "regiaoDF": "Brasília / Plano Piloto",
    "contatoWhatsapp": "5561985832237"
  },
  {
    "id": "pet-1793639793803",
    "nome": "Pipa e Wandinha",
    "especie": "cachorro",
    "raca": "Vira-lata (SRD)",
    "porte": "pequeno",
    "peso": "9kg",
    "pelagem": "Curta, preta e marrom",
    "idade": "2 anos e a outra 1 ano e alguns meses",
    "sexo": "femea",
    "descricao": "Dormir e Brincar",
    "historiaResgate": "Nós somos a Wandinha e a Pipa.\n\nNinguém sabe ao certo de onde viemos, mas sabemos exatamente quem somos uma para a outra. Fomos abandonadas juntas e imaginam que possamos ser mãe e filha. Talvez seja verdade. Talvez a vida apenas tenha escolhido nossos caminhos para que nunca precisássemos enfrentar o mundo sozinhas.\n\nQuando chegamos ao abrigo, o medo tomava conta de nós. Não confiávamos em ninguém. Evitávamos qualquer aproximação, nos escondíamos e fazíamos de tudo para passar despercebidas. Depois de tudo o que vivemos, acreditar nas pessoas parecia impossível.\n\nEu, Wandinha, sou a mais velha e também a mais gordinha. Sem perceber, me tornei o porto seguro da Pipa. Quando ela está ao meu lado, encontra coragem para respirar mais tranquila, observar o mundo e dar pequenos passos. Ela se sente protegida comigo. E eu também encontro força nela.\n\nCom o tempo, estamos aprendendo que nem toda mão machuca e que existem pessoas dispostas a oferecer amor sem pedir nada em troca. Ainda estamos descobrindo como é confiar, mas fazemos isso do nosso jeitinho: sempre juntas.\n\nÉ por isso que nosso maior sonho é encontrar uma família que acolha nós duas. Não porque não consigamos amar separadas, mas porque nossa história foi construída lado a lado. Foi esse vínculo que nos ajudou a sobreviver ao abandono, ao medo e à insegurança. Separar nossos caminhos agora seria levar embora o pedaço de coragem que existe dentro de cada uma de nós.\n\nTalvez você não esteja adotando apenas duas cadelinhas. Talvez esteja acolhendo uma história de amor, cuidado e companheirismo que resistiu quando tudo parecia perdido.\n\nSe houver um cantinho na sua casa e no seu coração para nós, prometemos retribuir no nosso tempo, do nosso jeitinho, com o amor mais sincero que existe: aquele de quem finalmente descobriu que está, enfim, em casa.",
    "fotos": [
      "img/pets/pipa-e-wandinha-1.png",
      "img/pets/pipa-e-wandinha-2.png",
      "img/pets/pipa-e-wandinha-3.png",
      "img/pets/pipa-e-wandinha-4.png"
    ],
    "videos": [],
    "saude": {
      "castrado": true,
      "castracaoObs": "Wandinha castrada, Pipa castração garantida",
      "vermifugado": false,
      "vermifugoObs": "",
      "vacinas": [],
      "possuiEnfermidades": true,
      "enfermidadesDescricao": "ADOÇÃO CONJUNTA APENAS",
      "medicamentosContinuos": "",
      "cuidadosExtras": "",
      "assistenciaMedica": "ADOÇÃO CONJUNTA APENAS",
      "cuidadosEspeciais": ""
    },
    "temperamento": [
      "Dóceis e inseparáveis",
      "muito companheiras e carinhosas"
    ],
    "nivelEnergia": "baixa",
    "tipoDomicilio": "qualquer",
    "tempoSozinho": "independente",
    "conviveCriancas": "supervisao",
    "conviveCaes": "sim",
    "conviveGatos": "adaptacao",
    "compatibilidade": {
      "nivelEnergia": "baixa",
      "tipoDomicilio": "qualquer",
      "tempoSozinho": "independente",
      "conviveCriancas": "supervisao",
      "conviveCaes": "sim",
      "conviveGatos": "adaptacao"
    },
    "status": "disponivel",
    "ongId": "ong-001",
    "ongNome": "Lar dos Anjos",
    "cidade": "Brasília / Plano Piloto - DF",
    "regiaoDF": "Brasília / Plano Piloto",
    "contatoWhatsapp": "5561985832237"
  },
  {
    "id": "pet-1793640282389",
    "nome": "Isabela",
    "especie": "cachorro",
    "raca": "Vira-lata (SRD)",
    "porte": "medio",
    "peso": "12kg",
    "pelagem": "Longa, Fiapo de manga",
    "idade": "Aprox. 2 anos",
    "sexo": "femea",
    "descricao": "Atenciosa, brincalhona e ama passeios!",
    "historiaResgate": "Oi, eu sou a Isabela.\n\nNem sempre a minha história foi bonita de contar. Um dia, quando eu mais precisava de cuidado, fui deixada para trás. Estava muito doente, fraca e sem forças, como se a minha vida não tivesse mais importância.\n\nMas alguém olhou para mim e decidiu que eu merecia uma segunda chance.\n\nRecebi tratamento, carinho, paciência e, aos poucos, fui voltando a acreditar. Meu corpinho se recuperou, minhas forças voltaram e hoje posso dizer que estou saudável, pronta para recomeçar.\n\nAgora só falta encontrar o que sempre sonhei: uma família que me ame de verdade. Alguém que entenda que um cachorro não deve ser abandonado quando adoece, mas acolhido com ainda mais amor.\n\nPrometo retribuir cada gesto de carinho com toda a lealdade que existe no meu coração. Só preciso que alguém olhe para mim e enxergue não o meu passado, mas a linda história que ainda podemos escrever juntos.",
    "fotos": [
      "img/pets/isabela-1.png",
      "img/pets/isabela-2.png",
      "img/pets/isabela-3.png",
      "img/pets/isabela-4.png",
      "img/pets/isabela-5.png"
    ],
    "videos": [
      "img/pets/isabela-video-1.mp4"
    ],
    "saude": {
      "castrado": true,
      "castracaoObs": "",
      "vermifugado": false,
      "vermifugoObs": "",
      "vacinas": [],
      "possuiEnfermidades": false,
      "enfermidadesDescricao": "",
      "medicamentosContinuos": "",
      "cuidadosExtras": "",
      "assistenciaMedica": "",
      "cuidadosEspeciais": ""
    },
    "temperamento": [
      "Muito carinhosa",
      "Calma",
      "Companheira"
    ],
    "nivelEnergia": "moderada",
    "tipoDomicilio": "qualquer",
    "tempoSozinho": "independente",
    "conviveCriancas": "sim",
    "conviveCaes": "sim",
    "conviveGatos": "adaptacao",
    "compatibilidade": {
      "nivelEnergia": "moderada",
      "tipoDomicilio": "qualquer",
      "tempoSozinho": "independente",
      "conviveCriancas": "sim",
      "conviveCaes": "sim",
      "conviveGatos": "adaptacao"
    },
    "status": "disponivel",
    "ongId": "ong-001",
    "ongNome": "Lar dos Anjos",
    "cidade": "Brasília / Plano Piloto - DF",
    "regiaoDF": "Brasília / Plano Piloto",
    "contatoWhatsapp": "5561985832237"
  },
  {
    "id": "pet-1793640540570",
    "nome": "Jack",
    "especie": "cachorro",
    "raca": "Vira-lata (SRD)",
    "porte": "medio",
    "peso": "17kg",
    "pelagem": "Curta, caramelo",
    "idade": "2 anos e alguns meses",
    "sexo": "macho",
    "descricao": "Amoroso, calmo e ama um bom sol!",
    "historiaResgate": "Oi, eu sou o Jack! ❤️\n\nCheguei ao abrigo quando ainda era um filhotinho de 3 meses. Não demorou muito para que fosse adotado, acreditando que aquele seria o começo de uma vida incrível.\n\nQuase dois anos depois, voltei para o abrigo. Quando voltei já não era mais aquele filhote que encantava todo mundo. Tinha crescido.\n\nE talvez seja justamente aí que minha história tenha ficado parada no tempo. Os anos passaram, e aquela segunda chance que eu tanto sonhava nunca chegou.\n\nHoje, sou um cão calmo, dócil e muito carinhoso. Também sou castrado, tenho meus quilinhos extras e adoro a companhia de pessoas. Não peço muito. Na verdade, depois de tantos anos, meu maior desejo continua sendo o mais simples de todos: ter um lar.\n\nInfelizmente, não tenho o perfil que a maioria das pessoas procura. Já não sou mais filhote, sou grande e os anos começaram a aparecer no meu rostinho. Mas isso não me torna menos capaz de amar.\n\nPorque o amor não tem idade, não tem porte e não deveria ter prazo de validade.",
    "fotos": [
      "img/pets/jack-1.png",
      "img/pets/jack-2.png",
      "img/pets/jack-3.png",
      "img/pets/jack-4.png",
      "img/pets/jack-5.png"
    ],
    "videos": [],
    "saude": {
      "castrado": true,
      "castracaoObs": "",
      "vermifugado": false,
      "vermifugoObs": "",
      "vacinas": [],
      "possuiEnfermidades": false,
      "enfermidadesDescricao": "",
      "medicamentosContinuos": "",
      "cuidadosExtras": "",
      "assistenciaMedica": "",
      "cuidadosEspeciais": ""
    },
    "temperamento": [
      "Tranquilo",
      "dócil e amoroso"
    ],
    "nivelEnergia": "moderada",
    "tipoDomicilio": "qualquer",
    "tempoSozinho": "independente",
    "conviveCriancas": "sim",
    "conviveCaes": "sim",
    "conviveGatos": "adaptacao",
    "compatibilidade": {
      "nivelEnergia": "moderada",
      "tipoDomicilio": "qualquer",
      "tempoSozinho": "independente",
      "conviveCriancas": "sim",
      "conviveCaes": "sim",
      "conviveGatos": "adaptacao"
    },
    "status": "disponivel",
    "ongId": "ong-001",
    "ongNome": "Lar dos Anjos",
    "cidade": "Brasília / Plano Piloto - DF",
    "regiaoDF": "Brasília / Plano Piloto",
    "contatoWhatsapp": "5561985832237"
  },
  {
    "id": "pet-1793640747179",
    "nome": "Fefê",
    "especie": "cachorro",
    "raca": "Vira-lata (SRD)",
    "porte": "medio",
    "peso": "12kg",
    "pelagem": "Curta, caramelo e preto",
    "idade": "Aprox. 1 ano",
    "sexo": "macho",
    "descricao": "Super alegre, extremamente amoroso, dócil e companheiro para todas as horas.",
    "historiaResgate": "Oii, eu sou o Fefê! 🐾\n\nO Fefê é aquele cachorrinho que parece agradecer todos os dias por estar seguro, abraçando todo mundo com os olhos e abanando o rabo com tanta força que o corpinho todo balança!\n\nEle tem um superpoder: transformar qualquer dia cinzento em uma festa de carinho. O Fefê não quer apenas um teto; ele quer ser o companheiro leal de alguém, o motivo do seu sorriso ao chegar em casa e o dono dos momentos mais doces da sua rotina. ✨",
    "fotos": [
      "img/pets/fefe-1.png",
      "img/pets/fefe-2.png",
      "img/pets/fefe-3.png",
      "img/pets/fefe-4.png",
      "img/pets/fefe-5.png",
      "img/pets/fefe-6.png"
    ],
    "videos": [],
    "saude": {
      "castrado": true,
      "castracaoObs": "",
      "vermifugado": false,
      "vermifugoObs": "",
      "vacinas": [],
      "possuiEnfermidades": false,
      "enfermidadesDescricao": "",
      "medicamentosContinuos": "",
      "cuidadosExtras": "",
      "assistenciaMedica": "",
      "cuidadosEspeciais": ""
    },
    "temperamento": [
      "Super alegre",
      "extremamente amoroso",
      "dócil"
    ],
    "nivelEnergia": "moderada",
    "tipoDomicilio": "qualquer",
    "tempoSozinho": "independente",
    "conviveCriancas": "sim",
    "conviveCaes": "sim",
    "conviveGatos": "sim",
    "compatibilidade": {
      "nivelEnergia": "moderada",
      "tipoDomicilio": "qualquer",
      "tempoSozinho": "independente",
      "conviveCriancas": "sim",
      "conviveCaes": "sim",
      "conviveGatos": "sim"
    },
    "status": "disponivel",
    "ongId": "ong-001",
    "ongNome": "Lar dos Anjos",
    "cidade": "Brasília / Plano Piloto - DF",
    "regiaoDF": "Brasília / Plano Piloto",
    "contatoWhatsapp": "5561985832237"
  },
  {
    "id": "pet-1793640950820",
    "nome": "Jonny",
    "especie": "cachorro",
    "raca": "Pit Monster",
    "porte": "grande",
    "peso": "20kg",
    "pelagem": "Curta, preto e branco",
    "idade": "2 anos",
    "sexo": "macho",
    "descricao": "Doce, brincalhão e cheio de amor para dar.",
    "historiaResgate": "Oi, eu sou o Jonny! 🐾\n\nDizem por aí que porque eu sou um Pit Monster eu sou bravo. Será?\n\nAqui no abrigo eu conquistei todo mundo com meu jeitinho animado, mas o que eu quero mesmo é uma família só minha… alguém pra dividir minhas brincadeiras, meus pulinhos de felicidade e meus momentos de carinho.\n\nSou um cãozinho doce, brincalhão e cheio de amor para dar. Se você precisa de mais alegria na sua vida, pode ter certeza que eu sou o doguinho certo! ✨",
    "fotos": [
      "img/pets/jonny-1.png",
      "img/pets/jonny-2.png",
      "img/pets/jonny-3.png"
    ],
    "videos": [
      "img/pets/jonny-video-1.mp4"
    ],
    "saude": {
      "castrado": true,
      "castracaoObs": "",
      "vermifugado": false,
      "vermifugoObs": "",
      "vacinas": [],
      "possuiEnfermidades": false,
      "enfermidadesDescricao": "",
      "medicamentosContinuos": "",
      "cuidadosExtras": "",
      "assistenciaMedica": "",
      "cuidadosEspeciais": ""
    },
    "temperamento": [
      "Dócil",
      "brincalhão e cheio de energia"
    ],
    "nivelEnergia": "moderada",
    "tipoDomicilio": "qualquer",
    "tempoSozinho": "independente",
    "conviveCriancas": "sim",
    "conviveCaes": "adaptacao",
    "conviveGatos": "adaptacao",
    "compatibilidade": {
      "nivelEnergia": "moderada",
      "tipoDomicilio": "qualquer",
      "tempoSozinho": "independente",
      "conviveCriancas": "sim",
      "conviveCaes": "adaptacao",
      "conviveGatos": "adaptacao"
    },
    "status": "disponivel",
    "ongId": "ong-001",
    "ongNome": "Lar dos Anjos",
    "cidade": "Brasília / Plano Piloto - DF",
    "regiaoDF": "Brasília / Plano Piloto",
    "contatoWhatsapp": "5561985832237"
  },
  {
    "id": "pet-1793641837747",
    "nome": "Eros",
    "especie": "cachorro",
    "raca": "Vira-lata (SRD)",
    "porte": "medio",
    "peso": "12kg",
    "pelagem": "Curta, Branco e marrom",
    "idade": "1 ano",
    "sexo": "macho",
    "descricao": "Calmo, carinhoso e muito companheiro",
    "historiaResgate": "Oi, eu sou o Eros! 🤎\n\nSe tem uma coisa que eu amo nessa vida, é estar pertinho… carinho pra mim nunca é demais! Sou daquele tipo que encosta, pede colo com o olhar e fica feliz só de ter alguém por perto 🥹\n\nTenho um jeitinho doce e tranquilo, gosto de companhia e faço questão de retribuir todo amor que recebo. Sabe aquele cão que vira sombra? Sou eu!",
    "fotos": [
      "img/pets/eros-1.png",
      "img/pets/eros-2.png",
      "img/pets/eros-3.png"
    ],
    "videos": [
      "img/pets/eros-video-1.mp4"
    ],
    "saude": {
      "castrado": false,
      "castracaoObs": "",
      "vermifugado": false,
      "vermifugoObs": "",
      "vacinas": [],
      "possuiEnfermidades": false,
      "enfermidadesDescricao": "",
      "medicamentosContinuos": "",
      "cuidadosExtras": "",
      "assistenciaMedica": "",
      "cuidadosEspeciais": ""
    },
    "temperamento": [
      "Dócil",
      "muito carinhoso"
    ],
    "nivelEnergia": "moderada",
    "tipoDomicilio": "casa",
    "tempoSozinho": "independente",
    "conviveCriancas": "supervisao",
    "conviveCaes": "adaptacao",
    "conviveGatos": "adaptacao",
    "compatibilidade": {
      "nivelEnergia": "moderada",
      "tipoDomicilio": "casa",
      "tempoSozinho": "independente",
      "conviveCriancas": "supervisao",
      "conviveCaes": "adaptacao",
      "conviveGatos": "adaptacao"
    },
    "status": "disponivel",
    "ongId": "ong-001",
    "ongNome": "Lar dos Anjos",
    "cidade": "Brasília / Plano Piloto - DF",
    "regiaoDF": "Brasília / Plano Piloto",
    "contatoWhatsapp": "5561985832237"
  },
  {
    "id": "pet-1793642198400",
    "nome": "Joana",
    "especie": "cachorro",
    "raca": "Vira-lata (SRD)",
    "porte": "pequeno",
    "peso": "9kg",
    "pelagem": "Curta, marrom",
    "idade": "1 ano",
    "sexo": "femea",
    "descricao": "Muito calma, adora ficar deitada e ama uma caminha confortável",
    "historiaResgate": "Oii, eu sou a Joana! 🩷\n\nEntre tantos dias iguais, eu sigo esperando aquele diferente… o dia em que vou encontrar minha família 🥹\n\nSou daquelas que ama estar por perto, recebendo carinho e distribuindo amor com esse jeitinho doce que só eu tenho !\n\nQuero muito ter uma família pra chamar de minha e viver dias cheios de carinho!!",
    "fotos": [
      "img/pets/joana-1.png",
      "img/pets/joana-2.png",
      "img/pets/joana-3.png",
      "img/pets/joana-4.png",
      "img/pets/joana-5.png"
    ],
    "videos": [
      "img/pets/joana-video-1.mp4"
    ],
    "saude": {
      "castrado": true,
      "castracaoObs": "",
      "vermifugado": false,
      "vermifugoObs": "",
      "vacinas": [],
      "possuiEnfermidades": false,
      "enfermidadesDescricao": "",
      "medicamentosContinuos": "",
      "cuidadosExtras": "",
      "assistenciaMedica": "",
      "cuidadosEspeciais": ""
    },
    "temperamento": [
      "Dócil",
      "Amorosa"
    ],
    "nivelEnergia": "moderada",
    "tipoDomicilio": "qualquer",
    "tempoSozinho": "independente",
    "conviveCriancas": "sim",
    "conviveCaes": "sim",
    "conviveGatos": "sim",
    "compatibilidade": {
      "nivelEnergia": "moderada",
      "tipoDomicilio": "qualquer",
      "tempoSozinho": "independente",
      "conviveCriancas": "sim",
      "conviveCaes": "sim",
      "conviveGatos": "sim"
    },
    "status": "disponivel",
    "ongId": "ong-001",
    "ongNome": "Lar dos Anjos",
    "cidade": "Brasília / Plano Piloto - DF",
    "regiaoDF": "Brasília / Plano Piloto",
    "contatoWhatsapp": "5561985832237"
  }
];

/* ==========================================================================
   ONGs PARCEIRAS DO DISTRITO FEDERAL
   ========================================================================== */

const DEFAULT_ONGS = [
  {
    id: "ong-001",
    nome: "Lar dos Anjos",
    sigla: "LAR DOS ANJOS",
    cidade: "Brasília / Plano Piloto - DF",
    regiao: "Brasília / Plano Piloto",
    anoFundacao: 2003,
    foto: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
    descricao: "Pioneira na proteção e bem-estar animal no Distrito Federal há mais de 23 anos. Atuamos com resgate ético, reabilitação veterinária completa, acolhimento em abrigo estruturado e intermediação de adoções conscientes em Brasília e regiões administrativas.",
    chavePix: "contato@lardosanjos.org.br",
    whatsapp: "5561985832237",
    instagram: "@lardosanjos_df",
    totalAdotados: 540,
    baseDisponiveis: 16,
    historiaTitulo: "A História da Lar dos Anjos",
    historiaBadge: "Nossa Trajetória & Memória Viva • 2003 - 2026",
    historiaSubtitulo: "Mais de 23 anos dedicados ao resgate ético, à reabilitação clínica e ao acolhimento com dignidade de animais vulneráveis no Distrito Federal. Conheça os pilares que constroem nossa história dia após dia.",
    historia: "Fundada em 2003 no coração de Brasília por uma aliança pioneira de médicos veterinários, biólogos e voluntários apaixonados pela causa, a ONG Lar dos Anjos nasceu com um propósito claro e inegociável: construir uma resposta ética, estruturada e permanente contra o abandono e os maus-tratos de animais no Distrito Federal.\n\nAo longo de mais de 23 anos de dedicação ininterrupta, nossa instituição já transformou a história de mais de 1.500 cães e gatos vulneráveis acolhidos, reabilitados e encaminhados para lares responsáveis. Atuamos com resgates prioritários em diversas regiões administrativas do DF — de Ceilândia, Samambaia e Taguatinga ao Plano Piloto, Guará e Sobradinho —, priorizando animais doentes, atropelados, vítimas de negligência severa ou ninhadas sem amparo maternal.\n\nNosso protocolo de acolhimento é conduzido sob os mais rigorosos padrões da medicina veterinária ética. Todo animal que chega ao abrigo é imediatamente recebido em nossa enfermaria para triagem clínica geral, testagem sorológica para zoonoses, coleta de exames laboratoriais, banho terapêutico, vermifugação e início do esquema vacinal com imunizantes importados polivalentes. Para preservar a saúde coletiva de todos os residentes, os recém-chegados cumprem período de quarentena monitorado antes de sua integração aos espaços de convivência.\n\nA infraestrutura do nosso abrigo no Distrito Federal foi planejada exclusivamente para devolver a dignidade, a segurança e a alegria aos resgatados. Dispomos de solários amplos e ensolarados, canis higienizados com isolamento térmico e piso antiderrapante, além de um gatil vertical enriquecido com pontes suspensas, tocas confortáveis e telas de proteção completas. Nossos cuidadores e adestradores voluntários realizam atividades diárias de enriquecimento comportamental e passeios guiados, restaurando a autoconfiança de pets que sofreram traumas no passado.\n\nAcreditamos firmemente que a castração é a única medida humanitária eficaz para combater a superpopulação e prevenir doenças graves. Por essa razão, 100% dos animais adultos acolhidos pelo Lar dos Anjos são castrados e microchipados antes de serem liberados para adoção. No caso de filhotes resgatados que encontram um lar antes da idade mínima cirúrgica, o Lar dos Anjos assegura e financia o procedimento gratuitamente em nossa rede veterinária credenciada assim que atingem o desenvolvimento necessário.\n\nA adoção responsável no Lar dos Anjos é um pacto de amor e cidadania: realizamos entrevistas criteriosas de alinhamento com a família, visitas acompanhadas ao abrigo e assinatura do termo de tutela responsável, mantendo um canal permanente de suporte e acompanhamento no pós-adoção. Mantida unicamente pelo amor de voluntários, doações voluntárias e feirinhas solidárias, o Lar dos Anjos reafirma todos os dias que adotar não é apenas salvar uma vida — é transformar uma família inteira.",
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
    "id": "evt-1793309306312",
    "titulo": "Hallowau do Lar dos Anjos",
    "data": "2026-10-31",
    "dataExtenso": "Sábado, Dia 31 de Outubro",
    "horario": "10:00 às 16:00",
    "local": "Pegada Animal da EPTG",
    "endereco": "EPTG, St. Hab. Vicente Pires - Vicente Pires, Brasília - DF, 72005-305",
    "ongId": "ong-001",
    "ongNome": "Lar dos Anjos",
    "linkMaps": "https://share.google/TTjFPmZQQeLj5LRqM",
    "foto": "img/eventos/hallowau-lar-dos-anjos.png",
    "animaisPresentes": [
      "Joana",
      "Jack",
      "Astrid",
      "Pituca",
      "filhotes de gato e cachorro"
    ],
    "descricao": "Animais esperando um novo lar!",
    "cidade": "Vicente Pires - DF",
    "regiaoDF": "Vicente Pires"
  }
];

/* ==========================================================================
   RIFAS & CAMPANHAS SOLIDÁRIAS
   ========================================================================== */

const DEFAULT_RIFAS = [
  {
    "id": "rifa-1793309771117",
    "titulo": "Reforma do Abrigo",
    "tipo": "dinheiro",
    "ongId": "ong-001",
    "ongNome": "Lar dos Anjos",
    "meta": 7500,
    "arrecadado": 3375,
    "chavePix": "54.922.388/0001-07",
    "whatsapp": "5561985832237",
    "dataSorteio": "Assim que todos forem vendidos",
    "foto": "img/rifas/reforma-do-abrigo.png",
    "descricao": "Estamos realizando uma rifa solidária para arrecadar recursos para a reforma do nosso abrigo e proporcionar um espaço mais seguro, confortável e digno para os nossos anjinhos de quatro patas!",
    "valorBilhete": 15,
    "totalBilhetes": 500,
    "bilhetesVendidos": 225,
    "premio": "(1 lugar) Parafusadeira e furadeira de impacto WAP 12V + kit; (2 lugar) Vale compra de R$300 em roupinha na Pet Da Dog's; (3 lugar) Café colonial para duas pessoas no Rota Bistrô"
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
      <p class="mb-3">A história de Pipoca começou em um dia chuvoso de março, quando foi resgatada debilitada e assustada nas proximidades de uma avenida movimentada em Ceilândia. Graças à intervenção rápida de protetores independentes e da ONG parceira Lar dos Anjos, ela recebeu atendimento veterinário imediato, vacinas e cuidados intensivos.</p>
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
    autor: "Lar dos Anjos",
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

