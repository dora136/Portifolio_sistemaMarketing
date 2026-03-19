"""
Demo Data Provider - Dados fictícios para modo demonstração.
Retorna dados realistas porém 100% fictícios para todas as APIs do sistema.
"""

from datetime import datetime, timedelta
import random

def get_demo_acessos():
    """Assinaturas/acessos de plataformas fictícias."""
    return [
        {"id_assinatura": 1, "plataforma": "Canva Pro", "valor": 54.99, "data_referencia": "2026-01-15", "data_criacao": "2025-06-10", "link": "https://canva.com", "email": "marketing@oriontech.com", "senha": "••••••••"},
        {"id_assinatura": 2, "plataforma": "Adobe Creative Cloud", "valor": 289.90, "data_referencia": "2026-02-01", "data_criacao": "2025-03-20", "link": "https://adobe.com", "email": "design@oriontech.com", "senha": "••••••••"},
        {"id_assinatura": 3, "plataforma": "Semrush", "valor": 499.00, "data_referencia": "2026-03-10", "data_criacao": "2025-08-01", "link": "https://semrush.com", "email": "seo@oriontech.com", "senha": "••••••••"},
        {"id_assinatura": 4, "plataforma": "HubSpot Marketing", "valor": 800.00, "data_referencia": "2026-01-20", "data_criacao": "2025-04-15", "link": "https://hubspot.com", "email": "inbound@oriontech.com", "senha": "••••••••"},
        {"id_assinatura": 5, "plataforma": "Mailchimp", "valor": 120.00, "data_referencia": "2026-02-28", "data_criacao": "2025-09-05", "link": "https://mailchimp.com", "email": "email@oriontech.com", "senha": "••••••••"},
        {"id_assinatura": 6, "plataforma": "Hootsuite", "valor": 199.00, "data_referencia": "2026-03-15", "data_criacao": "2025-07-12", "link": "https://hootsuite.com", "email": "social@oriontech.com", "senha": "••••••••"},
        {"id_assinatura": 7, "plataforma": "Google Workspace", "valor": 69.00, "data_referencia": "2026-01-01", "data_criacao": "2024-11-20", "link": "https://workspace.google.com", "email": "admin@oriontech.com", "senha": "••••••••"},
        {"id_assinatura": 8, "plataforma": "Figma Professional", "valor": 75.00, "data_referencia": "2026-02-10", "data_criacao": "2025-05-30", "link": "https://figma.com", "email": "ux@oriontech.com", "senha": "••••••••"},
    ]

def get_demo_eventos():
    """Eventos de marketing fictícios."""
    return [
        {"id_evento": 1, "nome": "Web Summit Rio", "data_inicio": "2026-04-28", "data_fim": "2026-05-01", "nivel": "Internacional", "local": "Riocentro", "cidade": "Rio de Janeiro", "site": "https://websummit.com/rio", "permissoe": "Todos"},
        {"id_evento": 2, "nome": "RD Summit", "data_inicio": "2026-10-15", "data_fim": "2026-10-17", "nivel": "Nacional", "local": "Expo Center Norte", "cidade": "São Paulo", "site": "https://rdsummit.com", "permissoe": "Marketing"},
        {"id_evento": 3, "nome": "Fórum de Marketing Digital", "data_inicio": "2026-06-20", "data_fim": "2026-06-20", "nivel": "Regional", "local": "Centro de Convenções", "cidade": "Curitiba", "site": "#", "permissoe": "Marketing"},
        {"id_evento": 4, "nome": "VTEX Day", "data_inicio": "2026-05-12", "data_fim": "2026-05-13", "nivel": "Nacional", "local": "São Paulo Expo", "cidade": "São Paulo", "site": "https://vtexday.com", "permissoe": "Todos"},
        {"id_evento": 5, "nome": "Meetup Growth Hacking", "data_inicio": "2026-03-25", "data_fim": "2026-03-25", "nivel": "Local", "local": "WeWork Paulista", "cidade": "São Paulo", "site": "#", "permissoe": "Growth"},
        {"id_evento": 6, "nome": "SEO Conference Brasil", "data_inicio": "2026-08-08", "data_fim": "2026-08-09", "nivel": "Nacional", "local": "Blue Tree Premium", "cidade": "Brasília", "site": "#", "permissoe": "SEO"},
    ]

def get_demo_noticias():
    """Notícias/conteúdo do canal de marketing fictício."""
    return [
        {"id_noticia": 1, "titulo": "Lançamento da nova campanha de branding Q2", "descricao": "Nova identidade visual para redes sociais com foco em engajamento orgânico.", "link": "#", "status_post": "enviado", "observacao": "Performance acima do esperado", "area": "Marketing", "importancia": 1, "possui_midia": 1},
        {"id_noticia": 2, "titulo": "Relatório de performance - Janeiro/2026", "descricao": "Análise completa de métricas de tráfego, conversão e engajamento do mês.", "link": "#", "status_post": "rascunho", "observacao": "", "area": "Marketing", "importancia": 0, "possui_midia": 0},
        {"id_noticia": 3, "titulo": "Nova landing page para produto Cloud", "descricao": "LP desenvolvida com foco em conversão para o segmento enterprise.", "link": "#", "status_post": "enviado", "observacao": "Taxa de conversão: 4.2%", "area": "Marketing", "importancia": 1, "possui_midia": 1},
        {"id_noticia": 4, "titulo": "Parceria com influenciadores tech", "descricao": "Estratégia de marketing de influência para alcançar público B2B.", "link": "#", "status_post": "rascunho", "observacao": "Aguardando aprovação do budget", "area": "Marketing", "importancia": 0, "possui_midia": 0},
        {"id_noticia": 5, "titulo": "Webinar: Tendências de Marketing 2026", "descricao": "Evento online com participação de 500+ inscritos sobre tendências do mercado.", "link": "#", "status_post": "enviado", "observacao": "Gravação disponível no YouTube", "area": "Marketing", "importancia": 1, "possui_midia": 1},
        {"id_noticia": 6, "titulo": "Atualização do blog corporativo", "descricao": "Publicação de 8 novos artigos sobre transformação digital e inovação.", "link": "#", "status_post": "enviado", "observacao": "", "area": "Marketing", "importancia": 0, "possui_midia": 0},
        {"id_noticia": 7, "titulo": "Campanha de email marketing - Black Friday", "descricao": "Sequência de 5 emails segmentados com desconto progressivo.", "link": "#", "status_post": "rascunho", "observacao": "A/B test em andamento", "area": "Marketing", "importancia": 0, "possui_midia": 0},
    ]

def get_demo_kanban_data():
    """Atividades do kanban com etapas e colaboradores fictícios."""
    colaboradores = get_demo_colaboradores()
    etapas = get_demo_kanban_etapas()

    atividades = [
        {"id_atividade": 1, "id_kanban": 1, "id_responsavel": 1, "titulo": "Criar briefing campanha Q2", "descricao": "Definir público-alvo, canais e KPIs da campanha do segundo trimestre.", "observacao": "", "data_criacao": "2026-03-01", "data_prazo": "2026-03-20", "data_finalizado": None, "finalizado": False, "urgencia": True, "prioridade": "alta"},
        {"id_atividade": 2, "id_kanban": 2, "id_responsavel": 2, "titulo": "Redesign do email template", "descricao": "Atualizar templates de email marketing com nova paleta de cores.", "observacao": "Usar Figma", "data_criacao": "2026-03-05", "data_prazo": "2026-03-25", "data_finalizado": None, "finalizado": False, "urgencia": False, "prioridade": "media"},
        {"id_atividade": 3, "id_kanban": 1, "id_responsavel": 3, "titulo": "Análise de concorrência SEO", "descricao": "Mapear palavras-chave dos 5 principais concorrentes.", "observacao": "Usar Semrush", "data_criacao": "2026-02-28", "data_prazo": "2026-03-15", "data_finalizado": None, "finalizado": False, "urgencia": False, "prioridade": "media"},
        {"id_atividade": 4, "id_kanban": 3, "id_responsavel": 1, "titulo": "Produzir vídeo institucional", "descricao": "Roteiro aprovado, gravar e editar vídeo de 2min para LinkedIn.", "observacao": "Orçamento aprovado", "data_criacao": "2026-02-15", "data_prazo": "2026-03-30", "data_finalizado": None, "finalizado": False, "urgencia": False, "prioridade": "alta"},
        {"id_atividade": 5, "id_kanban": 4, "id_responsavel": 4, "titulo": "Setup Google Ads - Remarketing", "descricao": "Configurar campanhas de remarketing no Google Ads.", "observacao": "Budget: R$5.000/mês", "data_criacao": "2026-02-10", "data_prazo": "2026-02-28", "data_finalizado": "2026-02-27", "finalizado": True, "urgencia": False, "prioridade": "alta"},
        {"id_atividade": 6, "id_kanban": 2, "id_responsavel": 5, "titulo": "Criar posts para Instagram - Março", "descricao": "Grade de 12 posts para o mês com copy e arte.", "observacao": "Feed + Stories", "data_criacao": "2026-03-01", "data_prazo": "2026-03-10", "data_finalizado": None, "finalizado": False, "urgencia": True, "prioridade": "alta"},
        {"id_atividade": 7, "id_kanban": 3, "id_responsavel": 2, "titulo": "Otimizar landing pages", "descricao": "Melhorar velocidade de carregamento e CTA das 3 principais LPs.", "observacao": "", "data_criacao": "2026-03-08", "data_prazo": "2026-04-01", "data_finalizado": None, "finalizado": False, "urgencia": False, "prioridade": "baixa"},
        {"id_atividade": 8, "id_kanban": 4, "id_responsavel": 3, "titulo": "Relatório mensal de redes sociais", "descricao": "Consolidar métricas de todas as redes do mês de fevereiro.", "observacao": "Entregue no prazo", "data_criacao": "2026-03-01", "data_prazo": "2026-03-05", "data_finalizado": "2026-03-04", "finalizado": True, "urgencia": False, "prioridade": "media"},
        {"id_atividade": 9, "id_kanban": 1, "id_responsavel": 5, "titulo": "Pesquisa de satisfação NPS", "descricao": "Criar e distribuir pesquisa NPS para base de clientes ativos.", "observacao": "Usar Typeform", "data_criacao": "2026-03-10", "data_prazo": "2026-03-28", "data_finalizado": None, "finalizado": False, "urgencia": False, "prioridade": "media"},
        {"id_atividade": 10, "id_kanban": 2, "id_responsavel": 4, "titulo": "Configurar UTMs para campanha", "descricao": "Criar parâmetros UTM para todas as peças da campanha Q2.", "observacao": "", "data_criacao": "2026-03-12", "data_prazo": "2026-03-18", "data_finalizado": None, "finalizado": False, "urgencia": False, "prioridade": "baixa"},
    ]

    return {
        "atividades": atividades,
        "colaboradores": colaboradores,
        "etapas": etapas,
    }

def get_demo_kanban_etapas():
    """Etapas do kanban."""
    return [
        {"id": 1, "nome": "Backlog", "cor": "#6B7280"},
        {"id": 2, "nome": "Em andamento", "cor": "#3B82F6"},
        {"id": 3, "nome": "Revisão", "cor": "#F59E0B"},
        {"id": 4, "nome": "Concluído", "cor": "#10B981"},
    ]

def get_demo_kanban_historico():
    """Histórico de movimentações do kanban."""
    return [
        {"id_registro": 1, "id_responsavel": 1, "data": "2026-03-18T14:30:00", "json_registro": '{"acao": "moveu", "atividade": "Setup Google Ads", "de": "Revisão", "para": "Concluído"}'},
        {"id_registro": 2, "id_responsavel": 2, "data": "2026-03-17T10:15:00", "json_registro": '{"acao": "criou", "atividade": "Configurar UTMs para campanha"}'},
        {"id_registro": 3, "id_responsavel": 3, "data": "2026-03-16T16:45:00", "json_registro": '{"acao": "moveu", "atividade": "Relatório mensal de redes sociais", "de": "Em andamento", "para": "Concluído"}'},
    ]

def get_demo_colaboradores():
    """Colaboradores fictícios do marketing."""
    return [
        {"id_col": 1, "nome": "Ana Beatriz Costa", "area": "Marketing"},
        {"id_col": 2, "nome": "Lucas Ferreira", "area": "Marketing"},
        {"id_col": 3, "nome": "Mariana Silva", "area": "Marketing"},
        {"id_col": 4, "nome": "Pedro Henrique Souza", "area": "Growth"},
        {"id_col": 5, "nome": "Juliana Oliveira", "area": "Conteúdo"},
    ]

def get_demo_areas():
    """Áreas/departamentos fictícios."""
    return [
        {"area": "Marketing"},
        {"area": "Growth"},
        {"area": "Conteúdo"},
        {"area": "Design"},
        {"area": "Produto"},
    ]

def get_demo_leads():
    """Leads capturados via formulários fictícios."""
    return [
        {"id_lead": 1, "nome_contato": "Ricardo Mendes", "nome_formulario": "Contato Site", "data_submissao": "2026-03-18T09:30:00", "dados": {"empresa": "TechFlow Ltda", "email": "ricardo@techflow.com", "telefone": "(11) 98765-4321", "interesse": "Cloud Computing"}, "area_responsavel": "Growth", "id_colaborador_responsavel": 4},
        {"id_lead": 2, "nome_contato": "Fernanda Alves", "nome_formulario": "Download E-book", "data_submissao": "2026-03-17T14:20:00", "dados": {"empresa": "Innovate Corp", "email": "fernanda@innovate.com", "telefone": "(21) 99876-5432", "interesse": "Marketing Digital"}, "area_responsavel": "Conteúdo", "id_colaborador_responsavel": 5},
        {"id_lead": 3, "nome_contato": "Carlos Eduardo Silva", "nome_formulario": "Orçamento", "data_submissao": "2026-03-16T11:45:00", "dados": {"empresa": "DataPrime SA", "email": "carlos@dataprime.demo", "telefone": "(31) 91234-5678", "interesse": "Analytics"}, "area_responsavel": "Marketing", "id_colaborador_responsavel": 1},
        {"id_lead": 4, "nome_contato": "Patrícia Rocha", "nome_formulario": "Contato Site", "data_submissao": "2026-03-15T16:00:00", "dados": {"empresa": "GreenBridge Soluções", "email": "patricia@greenbridge.com", "telefone": "(41) 98765-1234", "interesse": "Consultoria"}, "area_responsavel": "Growth", "id_colaborador_responsavel": 4},
        {"id_lead": 5, "nome_contato": "Thiago Santos", "nome_formulario": "Newsletter", "data_submissao": "2026-03-14T08:30:00", "dados": {"empresa": "Nexus Digital", "email": "thiago@nexusdigital.com", "telefone": "(51) 99887-6543", "interesse": "SEO"}, "area_responsavel": "Conteúdo", "id_colaborador_responsavel": 5},
        {"id_lead": 6, "nome_contato": "Isabela Martins", "nome_formulario": "Orçamento", "data_submissao": "2026-03-13T13:15:00", "dados": {"empresa": "BlueStar Tech", "email": "isabela@bluestar.tech", "telefone": "(19) 98234-5678", "interesse": "Cloud + Security"}, "area_responsavel": "Marketing", "id_colaborador_responsavel": 1},
        {"id_lead": 7, "nome_contato": "Rafael Oliveira", "nome_formulario": "Webinar Inscrição", "data_submissao": "2026-03-12T10:00:00", "dados": {"empresa": "Vertex Sistemas", "email": "rafael@vertex.demo", "telefone": "(48) 99765-4321", "interesse": "Transformação Digital"}, "area_responsavel": "Marketing", "id_colaborador_responsavel": 3},
        {"id_lead": 8, "nome_contato": "Amanda Ribeiro", "nome_formulario": "Download E-book", "data_submissao": "2026-03-11T15:30:00", "dados": {"empresa": "Quantum Labs", "email": "amanda@quantumlabs.io", "telefone": "(85) 98765-9876", "interesse": "Data Science"}, "area_responsavel": "Conteúdo", "id_colaborador_responsavel": 5},
    ]

def get_demo_ga4_sessions():
    """Dados fictícios de sessões GA4."""
    today = datetime.now()
    data = []
    for i in range(30):
        day = today - timedelta(days=29 - i)
        sessions = random.randint(120, 450)
        users = int(sessions * random.uniform(0.6, 0.85))
        new_users = int(users * random.uniform(0.3, 0.5))
        data.append({
            "date": day.strftime("%Y-%m-%d"),
            "sessions": sessions,
            "totalUsers": users,
            "newUsers": new_users,
        })
    return {
        "rows": data,
        "totals": {
            "sessions": sum(d["sessions"] for d in data),
            "totalUsers": sum(d["totalUsers"] for d in data),
            "newUsers": sum(d["newUsers"] for d in data),
        }
    }

def get_demo_ga4_behavior():
    """Dados fictícios de comportamento GA4."""
    pages = [
        {"pagePath": "/", "pageTitle": "Home", "screenPageViews": 3420, "averageSessionDuration": 125.5, "bounceRate": 0.42},
        {"pagePath": "/produtos", "pageTitle": "Produtos", "screenPageViews": 1850, "averageSessionDuration": 98.2, "bounceRate": 0.35},
        {"pagePath": "/blog", "pageTitle": "Blog", "screenPageViews": 2100, "averageSessionDuration": 180.0, "bounceRate": 0.28},
        {"pagePath": "/contato", "pageTitle": "Contato", "screenPageViews": 890, "averageSessionDuration": 65.3, "bounceRate": 0.55},
        {"pagePath": "/sobre", "pageTitle": "Sobre Nós", "screenPageViews": 650, "averageSessionDuration": 45.0, "bounceRate": 0.60},
        {"pagePath": "/cloud", "pageTitle": "Cloud Computing", "screenPageViews": 1200, "averageSessionDuration": 110.8, "bounceRate": 0.38},
        {"pagePath": "/cases", "pageTitle": "Cases de Sucesso", "screenPageViews": 780, "averageSessionDuration": 150.2, "bounceRate": 0.30},
    ]
    return {"rows": pages}

def get_demo_ga4_blog():
    """Dados fictícios de analytics do blog."""
    posts = [
        {"pagePath": "/blog/tendencias-marketing-2026", "pageTitle": "10 Tendências de Marketing para 2026", "screenPageViews": 890, "averageSessionDuration": 240.5},
        {"pagePath": "/blog/guia-seo-completo", "pageTitle": "Guia Completo de SEO para Empresas", "screenPageViews": 750, "averageSessionDuration": 310.2},
        {"pagePath": "/blog/automacao-marketing", "pageTitle": "Automação de Marketing: Por Onde Começar", "screenPageViews": 620, "averageSessionDuration": 195.0},
        {"pagePath": "/blog/roi-redes-sociais", "pageTitle": "Como Calcular ROI em Redes Sociais", "screenPageViews": 540, "averageSessionDuration": 180.3},
        {"pagePath": "/blog/ia-marketing-digital", "pageTitle": "IA no Marketing Digital: Guia Prático", "screenPageViews": 480, "averageSessionDuration": 220.1},
    ]
    return {"rows": posts}

def get_demo_ga4_kpi():
    """KPIs resumidos fictícios."""
    return {
        "sessions_total": 8540,
        "sessions_change": 12.5,
        "users_total": 5230,
        "users_change": 8.3,
        "bounce_rate": 38.2,
        "bounce_rate_change": -3.1,
        "avg_session_duration": 142.5,
        "duration_change": 5.7,
        "conversions": 186,
        "conversions_change": 22.0,
    }

def get_demo_forms_analytics(metric_type: str):
    """Dados fictícios de analytics de formulários."""
    if metric_type == "submissions":
        return {"total": 156, "change": 18.5, "data": [
            {"date": "2026-03-01", "count": 5}, {"date": "2026-03-02", "count": 8},
            {"date": "2026-03-03", "count": 3}, {"date": "2026-03-04", "count": 7},
            {"date": "2026-03-05", "count": 12}, {"date": "2026-03-06", "count": 4},
            {"date": "2026-03-07", "count": 6}, {"date": "2026-03-08", "count": 9},
        ]}
    if metric_type == "conversion":
        return {"rate": 4.2, "change": 0.8, "data": [
            {"source": "Google", "conversions": 65},
            {"source": "Direct", "conversions": 42},
            {"source": "LinkedIn", "conversions": 28},
            {"source": "Instagram", "conversions": 15},
            {"source": "Email", "conversions": 6},
        ]}
    return {"message": "Métrica não encontrada", "data": []}

def get_demo_webhook_events():
    """Eventos de webhook fictícios."""
    return [
        {"id": 1, "event_type": "form_submission", "form_name": "Contato Site", "received_at": "2026-03-18T09:30:00", "payload_preview": '{"nome": "Ricardo Mendes", "empresa": "TechFlow"}'},
        {"id": 2, "event_type": "form_submission", "form_name": "Download E-book", "received_at": "2026-03-17T14:20:00", "payload_preview": '{"nome": "Fernanda Alves", "empresa": "Innovate Corp"}'},
        {"id": 3, "event_type": "form_submission", "form_name": "Orçamento", "received_at": "2026-03-16T11:45:00", "payload_preview": '{"nome": "Carlos Eduardo", "empresa": "DataPrime"}'},
    ]

def get_demo_blog_posts():
    """Posts de blog fictícios."""
    return [
        {"id": "1", "title": "10 Tendências de Marketing para 2026", "slug": "tendencias-marketing-2026", "excerpt": "Descubra as principais tendências que vão dominar o marketing digital.", "published": True, "publishedDate": "2026-03-10"},
        {"id": "2", "title": "Guia Completo de SEO para Empresas", "slug": "guia-seo-completo", "excerpt": "Tudo que você precisa saber para ranquear no Google.", "published": True, "publishedDate": "2026-03-05"},
        {"id": "3", "title": "Automação de Marketing: Por Onde Começar", "slug": "automacao-marketing", "excerpt": "Guia prático para implementar automação na sua empresa.", "published": True, "publishedDate": "2026-02-28"},
        {"id": "4", "title": "IA no Marketing Digital: Guia Prático", "slug": "ia-marketing-digital", "excerpt": "Como usar inteligência artificial para potencializar suas campanhas.", "published": True, "publishedDate": "2026-02-20"},
    ]

def get_demo_site_info():
    """Info do site fictícia."""
    return {
        "site_name": "Orion Tech",
        "site_url": "https://oriontech.com.br",
        "description": "Tecnologia e inovação para o seu negócio",
    }
