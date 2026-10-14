# 🐾 AdoteAmigo - Plataforma de Catálogo para Adoção de Animais

Uma plataforma web moderna, responsiva e completa com catálogo multimídia (fotos e vídeos) de animais disponíveis para adoção, acompanhada de **fichas médicas detalhadas (porte, vacinas, castração, assistência médica e cuidados)** e um **Painel Administrativo (CRUD)** avançado com upload local de mídias.

---

## 🚀 Como Executar

A plataforma foi desenvolvida utilizando tecnologias web nativas (HTML5, CSS3, Tailwind CSS e JavaScript Moderno), **sem necessidade de instalar Node.js, Python ou qualquer servidor**:

1. Dê um **duplo clique no arquivo `index.html`** para abrir o catálogo público no seu navegador (Google Chrome, Microsoft Edge, Firefox, etc.).
2. Para acessar o painel de cadastro e gerenciamento de pets, clique no botão **"Painel Admin / Cadastro"** no topo da página ou abra diretamente o arquivo **`admin.html`**.

---

## 🛠️ Passo 1 Concluído: Painel Administrativo (CRUD) & Fichas Médicas

O **Passo 1** foi completamente desenvolvido e implementado em `admin.html`, `js/db.js` e `js/admin.js`:

### 1. Upload Real de Fotos e Vídeos (Armazenamento via IndexedDB)
- **Upload de Fotos Locais**:
  - Seleção de múltiplos arquivos (`.jpg`, `.png`, `.webp`) via clique ou **arrastar e soltar (drag & drop)** direto do seu computador.
  - Grade de pré-visualização instantânea com badge indicativo da foto de capa (1ª foto) e botão de exclusão individual.
  - Opção adicional de incluir fotos por links diretos da web (URLs).
- **Upload de Vídeos Locais**:
  - Envio de vídeos (`.mp4`, `.webm`, `.mov`) do computador ou celular.
  - Reprodutor de vídeo de pré-visualização integrado no painel antes e após salvar.
  - Suporte completo a links incorporados do YouTube (`youtu.be` e `youtube.com`).
- **Banco de Dados IndexedDB (`js/db.js`)**:
  - Ao contrário do `localStorage` comum (que trava ao atingir 5MB), o **IndexedDB** permite armazenar fotos em alta resolução e vídeos binários pesados de forma persistente e rápida no navegador.

### 2. Gestão Médica e Veterinária Avançada
- **Porte do Animal**:
  - Mini (até 5kg)
  - Pequeno (5kg a 10kg)
  - Médio (10kg a 25kg)
  - Grande (25kg a 45kg)
  - Gigante (+45kg)
  - Campo complementar para peso estimado (ex: "14 kg") e pelagem/cor.
- **Castração**:
  - Status booleano (Castrado / Não castrado).
  - Campo para data do procedimento, clínica ou observações da ONG (ex: "Castração agendada aos 12 meses").
- **Vermifugação**:
  - Status (Em dia / Pendente).
  - Data da última dose e produto utilizado.
- **Construtor Dinâmico de Vacinas**:
  - **Atalhos rápidos com 1 clique**: Antirrábica, V10 Canina, V8 Canina, Gripe Canina, Giárdia, V4 Felina, V5 Felina.
  - Campo para adicionar vacinas customizadas ou doses de reforço.
  - Chips interativos de vacinas registradas com botão de remoção individual.
- **Assistência Médica & Observações Clínicas**:
  - Área de texto para histórico médico, alergias a medicamentos, restrições alimentares, cirurgias prévias e tratamentos em andamento.
- **Cuidados Especiais & Rotina**:
  - Recomendações de bem-estar (necessidade de espaço, rotina de passeios, enriquecimento ambiental).

### 3. Operações CRUD Completas (Create, Read, Update, Delete)
- **Create**: Formulário organizado em 5 blocos claros com validação e salvamento instantâneo.
- **Read**: Tabela gerencial de animais com busca rápida, filtro por porte e indicadores visuais de saúde.
- **Update**: Ao clicar em **Editar**, todos os campos, fotos enviadas, vídeo e vacinas são recarregados no formulário para alteração imediata.
- **Delete**: Exclusão segura com confirmação e atualização instantânea.
- **Backup JSON**: Exportação e importação completa de todos os dados e mídias para backup e restauração.

---

## 📁 Estrutura dos Arquivos

```
AppAdoção/
│
├── index.html            # Catálogo interativo para os adotantes
├── admin.html            # Painel Administrativo CRUD (Upload de mídias e gestão veterinária)
├── README.md             # Documentação e instruções de uso
│
├── css/
│   └── styles.css        # Dropzones de upload, preview de fotos, players de vídeo e responsividade
│
└── js/
    ├── data.js           # Catálogo padrão com pets de exemplo (fotos, vídeos e dados médicos)
    ├── db.js             # Camada de banco de dados IndexedDB (armazena arquivos de foto e vídeo)
    ├── storage.js        # Camada unificada de persistência e fallback
    ├── app.js            # Lógica do catálogo público, filtros e reprodutor multimídia
    └── admin.js          # Controlador do painel CRUD, leitura de arquivos e fichas médicas
```

---

## ✨ Recursos Implementados

### 1. Sistema de Teste de Compatibilidade com Peso de Notas (Média Ponderada)
- **Questionário Completo para Adotantes**: 9 perguntas cobrindo tipo de moradia, tempo sozinho, crianças, outros pets, tempo para exercícios/passeios, cuidados de saúde especiais, preferência de espécie e porte.
- **Sistema de Pesos Configuráveis**:
  - **Energia & Passeios (Peso 30% ou 45% com prioridade)**: Identifica perfis sem tempo para exercícios físicos que necessitam de animais calmos/idosos/gatos e penaliza cães hiperativos/filhotes.
  - **Moradia & Espaço (Peso 25% ou 45% com prioridade)**: Avalia se o animal de grande porte é viável para apartamento e exige telas de proteção obrigatórias para felinos.
  - **Rotina & Horas Sozinho (Peso 15%)**.
  - **Convivência Familiar & Outros Pets (Peso 15% ou 35% com prioridade)**.
  - **Saúde & Cuidados Extras (Peso 15% ou 35% com prioridade)**.
- **Boletim de Notas no Modal**:
  - Média ponderada com nota decimal de 0 a 10 e percentual (0-100%).
  - Grade visual com mini barras de progresso para cada uma das 5 dimensões com suas respectivas sub-notas, pesos e justificativas qualitativas.
  - Destaque para Pontos Fortes e Pontos de Atenção antes de adotar.
  - Mensagem personalizada no WhatsApp já com a pontuação de afinidade obtida.

### 3. Banco de Dados de Analytics & Painel do Moderador (Pesquisa e Extensão)
- **Rastreamento Silencioso no Catálogo (`index.html`)**:
  - 👁️ **Visitas a Fichas**: Registra cada abertura detalhada da ficha do pet ("Ficha & Mídias").
  - 📋 **Questionários de Compatibilidade**: Armazena as notas calculadas, o ranqueamento gerado e todos os dados demográficos do interessado.
  - 💬 **Conversão / Contatos via WhatsApp**: Rastreia cliques com intenção real de adoção junto à ONG.
- **Painel Exclusivo do Moderador (`admin.html`)**:
  - Abas superiores para alternância rápida entre **Gestão de Animais (CRUD)** e **Métricas & Pesquisa (Analytics)**.
  - **4 KPIs em Tempo Real**: Total de visitas a fichas, questionários concluídos, contatos via WhatsApp e Taxa Global de Conversão (%).
  - **Tabela Analítica por Animal**: Visitas recebidas, frequência no Top 1 Match, frequência no Top 5, nota média de afinidade e taxa de conversão individual.
  - **Painel Demográfico & Científico (Pesquisa Universitária & Extensão)**:
    - Distribuição estatística do tipo de moradia (apartamento com tela, casa com quintal, etc.).
    - Horas que o animal ficaria sozinho por dia.
    - Presença de crianças e outros animais no domicílio.
    - Nível de energia demandado pelo estilo de vida do adotante.
    - Disposição para acolher animais com necessidades ou cuidados médicos especiais.
    - Funil de elegibilidade (adotantes aptos vs desclassificados por critérios impeditivos).
- **Exportação Acadêmica**:
  - `Exportar CSV (Pesquisa)`: Gera arquivo compatível com Excel, SPSS e R para artigos e relatórios de extensão.
  - `Backup JSON`: Exportação bruta de todos os eventos e questionários.
  - `Simular Dados Demo`: Popula instantaneamente o painel com 40+ questionários e centenas de visitas para testes.
  - `Zerar`: Limpeza completa das métricas.

---

## 📁 Estrutura dos Arquivos

```
AppAdoção/
│
├── index.html            # Catálogo público, questionário de compatibilidade e rastreamento
├── admin.html            # Painel do Moderador (CRUD de pets + Dashboard Analítico & Pesquisa)
├── README.md             # Documentação e instruções de uso
│
├── css/
│   └── styles.css        # Dropzones de upload, preview, players de vídeo e responsividade
│
└── js/
    ├── data.js           # Catálogo padrão com pets de exemplo (fotos, vídeos e dados médicos)
    ├── db.js             # Banco de dados IndexedDB (armazenamento de fotos e vídeos em alta resolução)
    ├── cloudinary.js     # Cliente de integração com a API REST do Cloudinary
    ├── match.js          # Motor matemático de compatibilidade com média ponderada e pesos
    ├── analytics.js      # Banco de dados analítico (IndexedDB/LocalStorage) e agregação de métricas
    ├── storage.js        # Camada unificada de persistência e fallback
    ├── app.js            # Lógica do catálogo público, filtros, modais e questionário
    └── admin.js          # Controlador do CRUD, alternância de abas e renderização do Analytics
```
