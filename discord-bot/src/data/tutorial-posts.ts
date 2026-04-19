export interface TutorialPost {
  slug: string;
  title: string;
  description: string;
  code?: string;
  tip: string;
}

export const TUTORIAL_POSTS: TutorialPost[] = [
  {
    slug: 'o-que-e-programacao',
    title: '💻 O que é programação?',
    description:
      'Programar é escrever instruções para o computador seguir — como uma receita de bolo, mas para máquinas.\n\n' +
      'O computador não pensa. Ele executa exatamente o que você manda, na ordem que você escrever.\n\n' +
      '**Por que aprender?**\n' +
      '→ Você automatiza tarefas chatas\n' +
      '→ Resolve problemas reais com lógica\n' +
      '→ Constrói coisas do zero\n\n' +
      'Qualquer pessoa pode aprender. Não precisa ser "bom em matemática". Precisa de lógica e persistência.',
    tip: 'Comece pequeno. Um "Hello, World!" já é programação real.',
  },
  {
    slug: 'frontend-vs-backend',
    title: '🖥️ Frontend vs Backend',
    description:
      '**Frontend** é tudo que o usuário vê e interage — botões, cores, animações, formulários.\n\n' +
      '**Backend** é o que roda nos servidores — lógica de negócio, banco de dados, autenticação.\n\n' +
      'Pense num restaurante:\n' +
      '→ Frontend = salão, cardápio, garçom\n' +
      '→ Backend = cozinha, estoque, caixa\n\n' +
      'Um não funciona sem o outro. E quem domina os dois é chamado de **Fullstack**.',
    tip: 'Iniciantes devem escolher um lado primeiro. Frontend costuma ser mais visual e motivador.',
  },
  {
    slug: 'o-que-e-html',
    title: '🏗️ O que é HTML?',
    description:
      'HTML (HyperText Markup Language) é a estrutura de toda página web. É o esqueleto.\n\n' +
      'Sem HTML não existe site. Ele define o que é título, parágrafo, imagem, link, botão.',
    code:
      '<!-- Estrutura básica de um HTML -->\n' +
      '<!DOCTYPE html>\n' +
      '<html>\n' +
      '  <head>\n' +
      '    <title>Meu Site</title>\n' +
      '  </head>\n' +
      '  <body>\n' +
      '    <h1>Olá, mundo!</h1>\n' +
      '    <p>Meu primeiro parágrafo.</p>\n' +
      '  </body>\n' +
      '</html>',
    tip: 'HTML não é linguagem de programação — é marcação. Mas é o ponto de partida de todo dev web.',
  },
  {
    slug: 'o-que-e-css',
    title: '🎨 O que é CSS?',
    description:
      'CSS (Cascading Style Sheets) cuida do visual: cores, fontes, espaçamentos, layouts.\n\n' +
      'Se HTML é o esqueleto, CSS é a roupa e o estilo.',
    code:
      '/* Deixando um título roxo e centralizado */\n' +
      'h1 {\n' +
      '  color: #D12BF2;\n' +
      '  text-align: center;\n' +
      '  font-size: 2rem;\n' +
      '}',
    tip: 'CSS parece simples no começo, mas centralizar um div vai te testar. É normal.',
  },
  {
    slug: 'o-que-e-javascript',
    title: '⚡ O que é JavaScript?',
    description:
      'JavaScript é a linguagem que traz vida às páginas web. Com ele você faz:\n\n' +
      '→ Botões que fazem coisas ao clicar\n' +
      '→ Dados carregados sem recarregar a página\n' +
      '→ Validações em formulários\n' +
      '→ Animações e interações\n\n' +
      'É a única linguagem nativa dos navegadores. E também roda no servidor com Node.js.',
    code:
      '// Exibindo uma mensagem ao clicar no botão\n' +
      'document.querySelector("#btn").addEventListener("click", () => {\n' +
      '  alert("Você clicou!");\n' +
      '});',
    tip: 'JS é a linguagem mais usada no mundo. Aprender JS abre portas para front, back, mobile e muito mais.',
  },
  {
    slug: 'o-que-e-uma-api',
    title: '🔌 O que é uma API?',
    description:
      'API (Application Programming Interface) é uma ponte entre sistemas.\n\n' +
      'Quando você abre um app de clima e ele mostra a temperatura da sua cidade, ele não tem esses dados — ele pediu para uma API.\n\n' +
      '**Como funciona:**\n' +
      '→ Seu app manda um pedido (requisição)\n' +
      '→ A API processa\n' +
      '→ Devolve a resposta\n\n' +
      'Spotify, iFood, Instagram — todos consomem e expõem APIs.',
    tip: 'API é um dos conceitos mais importantes do desenvolvimento moderno. Dominar APIs = dominar integração.',
  },
  {
    slug: 'o-que-e-json',
    title: '📦 O que é JSON?',
    description:
      'JSON (JavaScript Object Notation) é o formato mais usado para trocar dados entre sistemas.\n\n' +
      'É simples, legível e entendido por praticamente toda linguagem de programação.',
    code:
      '// Resposta de uma API de usuário em JSON\n' +
      '{\n' +
      '  "id": 1,\n' +
      '  "nome": "Ricardo",\n' +
      '  "email": "ricardo@exemplo.com",\n' +
      '  "ativo": true\n' +
      '}',
    tip: 'Sempre que uma API responde dados, provavelmente é JSON. Aprenda a ler e escrever JSON.',
  },
  {
    slug: 'o-que-e-http',
    title: '🌐 O que é HTTP?',
    description:
      'HTTP (HyperText Transfer Protocol) é o protocolo de comunicação da web.\n\n' +
      'Toda vez que você acessa um site, seu navegador manda uma requisição HTTP e o servidor responde.\n\n' +
      '**Códigos de resposta mais comuns:**\n' +
      '→ `200` OK — deu certo\n' +
      '→ `404` Not Found — não encontrou\n' +
      '→ `401` Unauthorized — precisa de login\n' +
      '→ `500` Server Error — erro no servidor',
    tip: 'HTTPS é o HTTP com criptografia. Todo site sério usa HTTPS.',
  },
  {
    slug: 'metodos-http',
    title: '📮 GET, POST, PUT e DELETE',
    description:
      'São os métodos HTTP. Cada um tem uma intenção diferente:\n\n' +
      '→ `GET` — buscar dados\n' +
      '→ `POST` — criar algo novo\n' +
      '→ `PUT` — atualizar algo existente\n' +
      '→ `DELETE` — apagar\n\n' +
      'Pense como um CRUD (Create, Read, Update, Delete) que toda aplicação precisa ter.',
    code:
      '// Buscando usuários com fetch\n' +
      'const resposta = await fetch("/api/usuarios");\n' +
      'const usuarios = await resposta.json();\n\n' +
      '// Criando um novo usuário\n' +
      'await fetch("/api/usuarios", {\n' +
      '  method: "POST",\n' +
      '  body: JSON.stringify({ nome: "Ana" }),\n' +
      '});',
    tip: 'Qualquer API REST usa esses 4 métodos. Entendeu isso, entendeu APIs.',
  },
  {
    slug: 'o-que-e-banco-de-dados',
    title: '🗄️ O que é um banco de dados?',
    description:
      'Banco de dados é onde as informações ficam salvas de forma organizada e persistente.\n\n' +
      'Sem banco de dados, quando o servidor reinicia, tudo some.\n\n' +
      '**Tipos principais:**\n' +
      '→ **Relacional** (SQL): dados em tabelas — MySQL, PostgreSQL\n' +
      '→ **Não relacional** (NoSQL): documentos, chave-valor — MongoDB, Redis\n\n' +
      'A maioria das aplicações usa banco relacional.',
    tip: 'Aprenda SQL primeiro. É a base que nunca sai de moda.',
  },
  {
    slug: 'sql-basico',
    title: '🔍 SQL básico',
    description:
      'SQL (Structured Query Language) é a linguagem para conversar com bancos de dados relacionais.',
    code:
      '-- Buscar todos os usuários\n' +
      'SELECT * FROM usuarios;\n\n' +
      '-- Buscar por condição\n' +
      'SELECT nome, email FROM usuarios WHERE ativo = true;\n\n' +
      '-- Inserir um novo registro\n' +
      'INSERT INTO usuarios (nome, email) VALUES ("Ana", "ana@mail.com");\n\n' +
      '-- Atualizar\n' +
      'UPDATE usuarios SET nome = "Ana Paula" WHERE id = 1;\n\n' +
      '-- Deletar\n' +
      'DELETE FROM usuarios WHERE id = 1;',
    tip: 'SELECT, INSERT, UPDATE e DELETE são os 4 comandos que você usa 90% do tempo.',
  },
  {
    slug: 'o-que-e-git',
    title: '📝 O que é Git?',
    description:
      'Git é um sistema de controle de versão. Ele salva o histórico de tudo que você fez no código.\n\n' +
      '**Por que usar?**\n' +
      '→ Volta no tempo se você quebrar algo\n' +
      '→ Trabalha em equipe sem sobrescrever o código do outro\n' +
      '→ Mantém o histórico completo do projeto\n\n' +
      'Git não é GitHub. Git roda local. GitHub é onde você hospeda o código online.',
    code:
      '# Iniciar um repositório\n' +
      'git init\n\n' +
      '# Salvar mudanças\n' +
      'git add .\n' +
      'git commit -m "primeiro commit"\n\n' +
      '# Ver histórico\n' +
      'git log --oneline',
    tip: 'Git é obrigatório para qualquer dev. Aprenda hoje mesmo.',
  },
  {
    slug: 'github-na-pratica',
    title: '🐙 GitHub na prática',
    description:
      'GitHub é onde você hospeda seu código Git online e colabora com outros devs.\n\n' +
      '**Fluxo básico:**\n' +
      '→ Cria um repositório no GitHub\n' +
      '→ Conecta com seu projeto local\n' +
      '→ Faz push para enviar seu código\n' +
      '→ Faz pull para puxar atualizações',
    code:
      '# Conectar repositório local ao GitHub\n' +
      'git remote add origin https://github.com/seu-user/seu-repo.git\n\n' +
      '# Enviar código\n' +
      'git push origin main\n\n' +
      '# Puxar atualizações\n' +
      'git pull origin main',
    tip: 'Seu GitHub é seu portfólio. Mantenha projetos ativos lá.',
  },
  {
    slug: 'o-que-e-terminal',
    title: '⌨️ Por que usar o terminal?',
    description:
      'O terminal (linha de comando) parece assustador no começo, mas é a ferramenta mais poderosa do dev.\n\n' +
      'Você instala pacotes, roda servidores, usa Git, faz deploy — tudo pelo terminal.\n\n' +
      '**Comandos essenciais:**\n' +
      '→ `ls` / `dir` — listar arquivos\n' +
      '→ `cd pasta` — entrar em uma pasta\n' +
      '→ `mkdir nome` — criar pasta\n' +
      '→ `rm arquivo` — deletar arquivo',
    tip: 'Quanto mais você usa o terminal, mais rápido e eficiente você fica.',
  },
  {
    slug: 'o-que-e-nodejs',
    title: '🟢 O que é Node.js?',
    description:
      'Node.js permite rodar JavaScript no servidor — fora do navegador.\n\n' +
      'Antes do Node, JS só rodava no browser. Com ele, você usa JavaScript tanto no front quanto no back.\n\n' +
      '**O que dá para fazer:**\n' +
      '→ APIs REST\n' +
      '→ Servidores web\n' +
      '→ Scripts de automação\n' +
      '→ Bots (como este aqui! 👀)',
    code:
      '// servidor HTTP simples com Node.js\n' +
      'const http = require("http");\n\n' +
      'http.createServer((req, res) => {\n' +
      '  res.end("Olá, mundo!");\n' +
      '}).listen(3000);\n\n' +
      'console.log("Servidor rodando em localhost:3000");',
    tip: 'Node.js é a base do ecossistema JavaScript moderno. Essencial para devs JS.',
  },
  {
    slug: 'o-que-e-npm',
    title: '📦 O que é NPM?',
    description:
      'NPM (Node Package Manager) é o gerenciador de pacotes do Node.js.\n\n' +
      'Em vez de escrever tudo do zero, você instala bibliotecas prontas que outros devs já criaram.\n\n' +
      '**Comandos mais usados:**\n' +
      '→ `npm install` — instala dependências do projeto\n' +
      '→ `npm install express` — instala um pacote específico\n' +
      '→ `npm run dev` — roda o projeto em desenvolvimento\n' +
      '→ `npm run build` — gera a versão para produção',
    tip: 'O arquivo `package.json` é o coração do projeto Node. Ele lista todas as dependências.',
  },
  {
    slug: 'o-que-e-react',
    title: '⚛️ O que é React?',
    description:
      'React é uma biblioteca JavaScript para construir interfaces de usuário com **componentes**.\n\n' +
      'Em vez de manipular HTML direto, você cria componentes reutilizáveis — como peças de LEGO.',
    code:
      '// Componente simples em React\n' +
      'function Saudacao({ nome }) {\n' +
      '  return <h1>Olá, {nome}! 👋</h1>;\n' +
      '}\n\n' +
      '// Usando o componente\n' +
      '<Saudacao nome="Ricardo" />',
    tip: 'React é a biblioteca frontend mais popular do mundo. Aprendeu React, o mercado está aberto.',
  },
  {
    slug: 'o-que-e-typescript',
    title: '🔷 O que é TypeScript?',
    description:
      'TypeScript é JavaScript com tipos. Você define o formato dos dados, e o editor te avisa quando você errar antes de rodar o código.\n\n' +
      '**Por que usar?**\n' +
      '→ Pega erros antes de rodar\n' +
      '→ Código mais legível e documentado\n' +
      '→ Autocomplete muito melhor no editor',
    code:
      '// JavaScript\n' +
      'function soma(a, b) { return a + b; }\n' +
      'soma("oi", 5); // retorna "oi5" — bug silencioso!\n\n' +
      '// TypeScript\n' +
      'function soma(a: number, b: number): number {\n' +
      '  return a + b;\n' +
      '}\n' +
      'soma("oi", 5); // ERRO antes de rodar!',
    tip: 'A maioria das empresas usa TypeScript. Aprender TS é um diferencial no mercado.',
  },
  {
    slug: 'o-que-e-rest',
    title: '📐 O que é REST?',
    description:
      'REST é um estilo de arquitetura para APIs. Uma API REST segue algumas regras:\n\n' +
      '→ Usa os métodos HTTP certos (GET, POST...)\n' +
      '→ URLs representam recursos: `/usuarios`, `/produtos/5`\n' +
      '→ Responde em JSON\n' +
      '→ Stateless: cada requisição é independente\n\n' +
      'Quando alguém fala "API REST", é isso que significia.',
    tip: 'Praticamente toda API que você vai consumir ou criar no mercado segue REST.',
  },
  {
    slug: 'variaveis-de-ambiente',
    title: '🔑 Variáveis de ambiente (.env)',
    description:
      'Variáveis de ambiente guardam informações sensíveis fora do código — senhas, chaves de API, URLs.\n\n' +
      'Você nunca coloca essas informações direto no código porque se você enviar pro GitHub, todo mundo vê.',
    code:
      '# Arquivo .env (nunca commitar!)\n' +
      'DATABASE_URL=mysql://usuario:senha@localhost/meubd\n' +
      'JWT_SECRET=minha-chave-super-secreta\n' +
      'API_KEY=sk-xxxxxxxxxxxxx\n\n' +
      '// Usando no código\n' +
      'const db = process.env.DATABASE_URL;',
    tip: 'Sempre adicione `.env` no `.gitignore`. É um erro comum de iniciantes vazar credenciais no GitHub.',
  },
  {
    slug: 'autenticacao-e-jwt',
    title: '🔐 Autenticação e JWT',
    description:
      'Autenticação é provar quem você é. Autorização é saber o que você pode fazer.\n\n' +
      '**JWT (JSON Web Token)** é o método mais comum de autenticação em APIs:\n\n' +
      '→ Usuário faz login → servidor gera um token JWT\n' +
      '→ Usuário envia o token em cada requisição\n' +
      '→ Servidor valida o token e sabe quem é\n\n' +
      'O token tem 3 partes: header, payload e signature — separados por ponto.',
    tip: 'Nunca guarde a senha do usuário em texto puro. Sempre use hash (bcrypt).',
  },
  {
    slug: 'o-que-e-orm',
    title: '🗺️ O que é um ORM?',
    description:
      'ORM (Object-Relational Mapper) traduz código JavaScript/TypeScript para SQL automaticamente.\n\n' +
      'Em vez de escrever SQL na mão, você usa objetos e métodos.',
    code:
      '// Sem ORM (SQL puro)\n' +
      'SELECT * FROM usuarios WHERE id = 1;\n\n' +
      '// Com ORM (Prisma)\n' +
      'const usuario = await prisma.user.findUnique({\n' +
      '  where: { id: 1 }\n' +
      '});',
    tip: 'Prisma é o ORM mais moderno para Node.js. Altamente recomendado para projetos novos.',
  },
  {
    slug: 'como-ler-um-erro',
    title: '🐛 Como ler um erro?',
    description:
      'Erros são normais e fazem parte do desenvolvimento. Saber ler mensagens de erro é uma habilidade essencial.\n\n' +
      '**Quando aparecer um erro:**\n' +
      '→ Leia a primeira linha — ela diz o tipo do erro\n' +
      '→ Olhe o arquivo e linha indicados\n' +
      '→ Leia a mensagem completa antes de buscar no Google\n' +
      '→ Copie o erro e pesquise no Stack Overflow ou ChatGPT',
    tip: 'O erro mais comum de iniciante é não ler a mensagem de erro. Leia sempre com calma.',
  },
  {
    slug: 'debugging-basico',
    title: '🔦 Debugging básico',
    description:
      'Debug é o processo de encontrar e corrigir erros no código.\n\n' +
      '**Ferramentas básicas:**\n' +
      '→ `console.log()` — imprime valores para entender o que está acontecendo\n' +
      '→ Breakpoints no VS Code — para o código em um ponto para inspecionar\n' +
      '→ DevTools do navegador — inspeciona frontend\n\n' +
      '**Técnica do pato de borracha:** explique seu código em voz alta, linha por linha. Funciona de verdade.',
    code:
      '// Debugando com console.log\n' +
      'function calcularTotal(itens) {\n' +
      '  console.log("itens recebidos:", itens); // verifique o input\n' +
      '  const total = itens.reduce((acc, item) => acc + item.preco, 0);\n' +
      '  console.log("total calculado:", total); // verifique o output\n' +
      '  return total;\n' +
      '}',
    tip: 'Debugar é mais importante que escrever código novo. É uma habilidade que se desenvolve com prática.',
  },
  {
    slug: 'o-que-e-deploy',
    title: '🚀 O que é deploy?',
    description:
      'Deploy é o processo de publicar seu código para que outras pessoas possam acessar.\n\n' +
      '**Fluxo básico:**\n' +
      '→ Você escreve o código localmente\n' +
      '→ Faz build (transforma pra produção)\n' +
      '→ Envia para um servidor na nuvem\n' +
      '→ O servidor roda o código 24/7\n\n' +
      '**Plataformas populares para iniciantes:**\n' +
      '→ Vercel — ideal para frontend React\n' +
      '→ Render — backend Node.js gratuito\n' +
      '→ Railway — banco + backend fácil',
    tip: 'Fazer deploy do primeiro projeto é um marco. Faz isso logo — vai te motivar muito.',
  },
  {
    slug: 'o-que-e-servidor',
    title: '🖥️ O que é um servidor?',
    description:
      'Servidor é um computador que fica ligado 24 horas respondendo requisições.\n\n' +
      'Quando você acessa codecraftgenz.com.br, seu navegador faz uma requisição para um servidor que responde com o site.\n\n' +
      '**Tipos:**\n' +
      '→ **VPS** — servidor virtual privado (você controla tudo)\n' +
      '→ **Shared hosting** — servidor compartilhado (mais barato, menos controle)\n' +
      '→ **Cloud** — AWS, GCP, Azure (escala automático)',
    tip: 'Você não precisa de servidor próprio pra começar. Use Vercel ou Render gratuitamente.',
  },
  {
    slug: 'o-que-e-docker-intro',
    title: '🐳 Docker — a ideia básica',
    description:
      'Docker empacota sua aplicação com tudo que ela precisa para rodar — código, dependências, configurações — em um **container**.\n\n' +
      'Isso resolve o clássico problema: *"funciona na minha máquina"*.\n\n' +
      'Com Docker:\n' +
      '→ Ambiente igual em todo lugar\n' +
      '→ Deploy mais simples e previsível\n' +
      '→ Isola aplicações',
    tip: 'Docker é essencial para DevOps e backend. Vale a pena aprender após dominar o básico.',
  },
  {
    slug: 'performance-basica',
    title: '⚡ Performance básica',
    description:
      'Uma aplicação lenta perde usuários. Alguns princípios básicos de performance:\n\n' +
      '→ **Lazy loading** — carregue só o que precisa agora\n' +
      '→ **Cache** — evite buscar os mesmos dados sempre\n' +
      '→ **Índices no banco** — aceleram buscas em tabelas grandes\n' +
      '→ **Minificação** — código JS/CSS menor = download mais rápido\n' +
      '→ **Imagens otimizadas** — use WebP, comprima antes de subir',
    tip: 'Não otimize antes de medir. Use as ferramentas do navegador (Lighthouse) para saber onde está o problema.',
  },
  {
    slug: 'o-que-e-teste-automatizado',
    title: '🧪 O que é um teste automatizado?',
    description:
      'Teste automatizado é código que verifica se o seu código funciona.\n\n' +
      'Em vez de testar na mão toda vez, você escreve um teste que roda automaticamente.',
    code:
      '// Função\n' +
      'function soma(a, b) { return a + b; }\n\n' +
      '// Teste com Jest\n' +
      'test("soma 2 + 3 deve ser 5", () => {\n' +
      '  expect(soma(2, 3)).toBe(5);\n' +
      '});',
    tip: 'Testes parecem trabalho extra, mas economizam horas de bug hunting no futuro.',
  },
  {
    slug: 'boas-praticas-de-codigo',
    title: '✨ Boas práticas de código',
    description:
      'Código limpo é código que outros (e você no futuro) conseguem entender.\n\n' +
      '**Regras de ouro:**\n' +
      '→ Nomes descritivos: `calcularTotal()` > `ct()`\n' +
      '→ Funções pequenas que fazem uma coisa só\n' +
      '→ Evite código duplicado (DRY: Don\'t Repeat Yourself)\n' +
      '→ Comentários para o "por quê", não o "o quê"\n' +
      '→ Consistência: siga o padrão do projeto',
    tip: '"Escreva código como se quem fosse mantê-lo depois fosse um serial killer que sabe onde você mora."',
  },
  {
    slug: 'proximos-passos',
    title: '🗺️ Seus próximos passos como dev',
    description:
      'Você chegou até aqui — parabéns! Mas essa é só a fundação.\n\n' +
      '**Caminho recomendado para iniciantes:**\n' +
      '→ HTML + CSS + JS básico\n' +
      '→ Git e GitHub\n' +
      '→ Node.js + API REST simples\n' +
      '→ Banco de dados (MySQL ou PostgreSQL)\n' +
      '→ React ou Vue\n' +
      '→ Deploy do primeiro projeto\n' +
      '→ Primeiro portfólio no GitHub\n\n' +
      'O segredo é **construir projetos reais**. Tutoriais ensinam, projetos formam.',
    tip: 'Entre nos desafios da CodeCraft Gen-Z e coloque em prática tudo que aprendeu aqui 🚀',
  },
];
