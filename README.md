# Portfolio Marketing Hub

Sistema completo de gestão de marketing desenvolvido como projeto de portfólio. Demonstra arquitetura full-stack com **FastAPI** (backend) e **React/Vite** (frontend), incluindo dashboards, kanban, gestão de conteúdo, calendário de eventos e analytics.

> Todos os dados, nomes e credenciais são fictícios. Este projeto foi adaptado para apresentação pública.

## Funcionalidades

- **Dashboard** — Visão geral com KPIs e métricas
- **Canal de Notícias** — CRUD de conteúdo com mídia (imagem/vídeo)
- **Kanban** — Quadro de atividades com drag & drop, prioridade e urgência
- **Calendário** — Gestão de eventos com datas, níveis e localização
- **Analytics** — Integração com Google Analytics 4 (sessões, comportamento, blog)
- **Formulários & Leads** — Captura e direcionamento de leads via webhook
- **Gestão de Acessos** — Controle de assinaturas e plataformas
- **Templates & Blob Storage** — Upload e organização de arquivos na nuvem

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Python 3.10+, FastAPI, Uvicorn, SQLAlchemy |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Shadcn/UI |
| Banco de Dados | SQL Server (multi-database) |
| Storage | Azure Blob Storage |
| Analytics | Google Analytics 4 API |

## Execução Local

```bash
# 1. Instalar dependências Python
pip install -r requirements.txt

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Preencha as variáveis no .env

# 3. Iniciar o servidor
python main.py
# ou
uvicorn main:app --reload --port 9000
```

Acesse: **http://localhost:9000/portifolio/home**

## Variáveis de Ambiente

O sistema roda em **modo demo** por padrão (`PORTIFOLIO_DEMO_MODE=true`), retornando dados fictícios sem necessidade de banco de dados.

Para conexão real, configure no `.env`:

```env
# Banco de dados
DB_SERVER=localhost
DB_DATABASE_PRIMARY=meu_banco
DB_PRIMARY_READER_UID=usuario
DB_PRIMARY_READER_PWD=senha

# Google Analytics 4 (opcional)
GA4_PROPERTY_ID=123456789
GA4_CREDENTIALS_PATH=config/ga4_credentials.json

# Forms API (opcional)
FORMS_API_KEY=sua-chave
FORMS_SITE_ID=seu-site-id
```

## Estrutura do Projeto

```
├── config/          # Configurações e variáveis de ambiente
├── database/        # Conexão e queries SQL
├── domain/          # Modelos de dados (Pydantic)
├── infrastructure/
│   ├── db/          # Repositórios (padrão Repository)
│   └── frontend/    # Código-fonte React/Vite
├── routes/          # Endpoints FastAPI
├── services/        # Lógica de negócio e integrações
├── static/          # Assets compilados do frontend
├── templates/       # Templates Jinja2 (server-side)
├── main.py          # Entry point
└── requirements.txt
```

## Rotas Principais

| Rota | Descrição |
|------|-----------|
| `/portifolio/home` | Dashboard principal |
| `/portifolio/noticias` | Canal de notícias |
| `/portifolio/kanban` | Quadro de atividades |
| `/portifolio/calendario` | Calendário de eventos |
| `/portifolio/analytics` | Dashboard de analytics |
| `/portifolio/direcionamento` | Leads e formulários |
| `/portifolio/custos` | Gestão de custos |
| `/portifolio/templates` | Templates e arquivos |

## Paleta de Cores

| Cor | Hex | Uso |
|-----|-----|-----|
| Gramado | `#2C6E49` | Primary / sidebar / texto |
| Verde-mar | `#4C956C` | Accent / success |
| Amarelo claro | `#FEEEC3` | Secondary / fundos suaves |
| Blush em pó | `#FFC9B9` | Muted / cards |
| Amêndoa torrada | `#D68C45` | Warning / destaque |

## Observações

- Identidade visual fictícia — nenhuma referência a empresa real
- Modo demo habilitado por padrão — funciona sem banco de dados
- Prefixo `/portifolio` em todas as rotas
- Credenciais GA4 não incluídas (template em `config/ga4_credentials.json`)
