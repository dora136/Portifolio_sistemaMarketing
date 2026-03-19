class MarketingQueries:
    HEALTHCHECK = "SELECT 1 AS ok"


class EventoQueries:
    SQL_LIST_EVENTOS = """
    SELECT
      id_evento,
      nome,
      data_inicio,
      data_fim,
      nivel,
      local,
      cidade,
      site,
      permissoe
    FROM db_mkt_eventos
    ORDER BY data_inicio ASC, id_evento ASC
    """

    SQL_UPDATE_EVENTO = """
    UPDATE db_mkt_eventos
    SET
      nome = :nome,
      data_inicio = :data_inicio,
      data_fim = :data_fim,
      nivel = :nivel,
      local = :local,
      cidade = :cidade,
      site = :site,
      permissoe = :permissoe
    WHERE id_evento = :id_evento
    """

    SQL_INSERT_EVENTO = """
    INSERT INTO db_mkt_eventos (
      nome,
      data_inicio,
      data_fim,
      nivel,
      local,
      cidade,
      site,
      permissoe
    )
    OUTPUT
      INSERTED.id_evento,
      INSERTED.nome,
      INSERTED.data_inicio,
      INSERTED.data_fim,
      INSERTED.nivel,
      INSERTED.local,
      INSERTED.cidade,
      INSERTED.site,
      INSERTED.permissoe
    VALUES (
      :nome,
      :data_inicio,
      :data_fim,
      :nivel,
      :local,
      :cidade,
      :site,
      :permissoe
    )
    """

    SQL_DELETE_EVENTO = """
    DELETE FROM db_mkt_eventos
    WHERE id_evento = :id_evento
    """


class ConteudoQueries:
    SQL_LIST_NOTICIAS = """
    SELECT
      id_noticia,
      titulo,
      descricao,
      link,
      status_post,
      observacao,
      CASE WHEN img_video IS NULL THEN 0 ELSE 1 END AS possui_midia
    FROM db_conteudo
    ORDER BY id_noticia DESC
    """

    SQL_LIST_NOTICIAS_V2 = """
    SELECT
      id_noticia,
      titulo,
      descricao,
      link,
      status_post,
      observacao,
      area,
      CASE WHEN img_video IS NULL THEN 0 ELSE 1 END AS possui_midia
    FROM db_conteudo
    WHERE LOWER(LTRIM(RTRIM(area))) = 'marketing'
    ORDER BY id_noticia DESC
    """

    SQL_LIST_NOTICIAS_V3 = """
    SELECT
      id_noticia,
      titulo,
      descricao,
      link,
      status_post,
      observacao,
      area,
      importancia,
      CASE WHEN img_video IS NULL THEN 0 ELSE 1 END AS possui_midia
    FROM db_conteudo
    WHERE LOWER(LTRIM(RTRIM(area))) = 'marketing'
    ORDER BY id_noticia DESC
    """

    SQL_SELECT_NOTICIA_BY_ID = """
    SELECT
      id_noticia,
      titulo,
      descricao,
      link,
      status_post,
      observacao,
      CASE WHEN img_video IS NULL THEN 0 ELSE 1 END AS possui_midia
    FROM db_conteudo
    WHERE id_noticia = :id_noticia
    """

    SQL_SELECT_NOTICIA_BY_ID_V2 = """
    SELECT
      id_noticia,
      titulo,
      descricao,
      link,
      status_post,
      observacao,
      area,
      CASE WHEN img_video IS NULL THEN 0 ELSE 1 END AS possui_midia
    FROM db_conteudo
    WHERE id_noticia = :id_noticia
    """

    SQL_SELECT_NOTICIA_BY_ID_V3 = """
    SELECT
      id_noticia,
      titulo,
      descricao,
      link,
      status_post,
      observacao,
      area,
      importancia,
      CASE WHEN img_video IS NULL THEN 0 ELSE 1 END AS possui_midia
    FROM db_conteudo
    WHERE id_noticia = :id_noticia
    """

    SQL_INSERT_NOTICIA = """
    INSERT INTO db_conteudo (
      titulo,
      descricao,
      img_video,
      link,
      status_post,
      observacao
    )
    OUTPUT INSERTED.id_noticia
    VALUES (
      :titulo,
      :descricao,
      :img_video,
      :link,
      :status_post,
      :observacao
    )
    """

    SQL_INSERT_NOTICIA_V2 = """
    INSERT INTO db_conteudo (
      titulo,
      descricao,
      img_video,
      link,
      status_post,
      observacao,
      importancia
    )
    OUTPUT INSERTED.id_noticia
    VALUES (
      :titulo,
      :descricao,
      :img_video,
      :link,
      :status_post,
      :observacao,
      :importancia
    )
    """

    SQL_UPDATE_NOTICIA = """
    UPDATE db_conteudo
    SET
      titulo = :titulo,
      descricao = :descricao,
      link = :link,
      status_post = :status_post,
      observacao = :observacao
    WHERE id_noticia = :id_noticia
    """

    SQL_UPDATE_NOTICIA_V2 = """
    UPDATE db_conteudo
    SET
      titulo = :titulo,
      descricao = :descricao,
      link = :link,
      status_post = :status_post,
      observacao = :observacao,
      importancia = CASE WHEN :importancia IS NULL THEN importancia ELSE :importancia END
    WHERE id_noticia = :id_noticia
    """

    SQL_MARK_NOTICIA_ENVIADA = """
    UPDATE db_conteudo
    SET
      status_post = 'enviado'
    WHERE id_noticia = :id_noticia
    """

    SQL_TOUCH_NOTICIA_AREA_MARKETING = """
    UPDATE db_conteudo
    SET area = 'Marketing'
    WHERE id_noticia = :id_noticia
      AND (area IS NULL OR LTRIM(RTRIM(CAST(area AS varchar(255)))) = '')
    """

    SQL_SET_NOTICIA_IMPORTANCIA = """
    UPDATE db_conteudo
    SET importancia = CASE
      WHEN :importancia IS NULL THEN CASE WHEN ISNULL(importancia, 0) = 1 THEN 0 ELSE 1 END
      ELSE :importancia
    END
    WHERE id_noticia = :id_noticia
    """

    SQL_SELECT_NOTICIA_IMPORTANCIA = """
    SELECT importancia
    FROM db_conteudo
    WHERE id_noticia = :id_noticia
    """

    SQL_UPDATE_NOTICIA_WITH_MEDIA = """
    UPDATE db_conteudo
    SET
      titulo = :titulo,
      descricao = :descricao,
      img_video = :img_video,
      link = :link,
      status_post = :status_post,
      observacao = :observacao
    WHERE id_noticia = :id_noticia
    """

    SQL_UPDATE_NOTICIA_WITH_MEDIA_V2 = """
    UPDATE db_conteudo
    SET
      titulo = :titulo,
      descricao = :descricao,
      img_video = :img_video,
      link = :link,
      status_post = :status_post,
      observacao = :observacao,
      importancia = CASE WHEN :importancia IS NULL THEN importancia ELSE :importancia END
    WHERE id_noticia = :id_noticia
    """

    SQL_GET_NOTICIA_MEDIA = """
    SELECT img_video FROM db_conteudo WHERE id_noticia = :id_noticia
    """

    SQL_CLEAR_NOTICIA_MEDIA = """
    UPDATE db_conteudo SET img_video = NULL WHERE id_noticia = :id_noticia
    """

    SQL_DELETE_NOTICIA = """
    DELETE FROM db_conteudo
    WHERE id_noticia = :id_noticia
    """


class KanbanQueries:
    SQL_LIST_ATIVIDADES = """
    SELECT
      id_atividade,
      id_kanban,
      id_responsavel,
      titulo,
      descricao,
      observacao,
      data_criacao,
      data_prazo,
      data_finalizado,
      finalizado,
      urgencia,
      prioridade
    FROM db_mkt_kanban_registros
    ORDER BY id_atividade DESC
    """

    SQL_SELECT_ATIVIDADE_BY_ID = """
    SELECT
      id_atividade,
      id_kanban,
      id_responsavel,
      titulo,
      descricao,
      observacao,
      data_criacao,
      data_prazo,
      data_finalizado,
      finalizado,
      urgencia,
      prioridade
    FROM db_mkt_kanban_registros
    WHERE id_atividade = :id_atividade
    """

    SQL_INSERT_ATIVIDADE = """
    INSERT INTO db_mkt_kanban_registros (
      id_kanban,
      id_responsavel,
      titulo,
      descricao,
      observacao,
      data_criacao,
      data_prazo,
      data_finalizado,
      finalizado,
      urgencia,
      prioridade
    )
    OUTPUT INSERTED.id_atividade
    VALUES (
      :id_kanban,
      :id_responsavel,
      :titulo,
      :descricao,
      :observacao,
      :data_criacao,
      :data_prazo,
      :data_finalizado,
      :finalizado,
      :urgencia,
      :prioridade
    )
    """

    SQL_UPDATE_ATIVIDADE = """
    UPDATE db_mkt_kanban_registros
    SET
      id_kanban = :id_kanban,
      id_responsavel = :id_responsavel,
      titulo = :titulo,
      descricao = :descricao,
      observacao = :observacao,
      data_criacao = :data_criacao,
      data_prazo = :data_prazo,
      data_finalizado = :data_finalizado,
      finalizado = :finalizado,
      urgencia = :urgencia,
      prioridade = :prioridade
    WHERE id_atividade = :id_atividade
    """

    SQL_UPDATE_ATIVIDADE_STATUS = """
    UPDATE db_mkt_kanban_registros
    SET
      id_kanban = :id_kanban,
      finalizado = :finalizado,
      data_finalizado = :data_finalizado
    WHERE id_atividade = :id_atividade
    """

    SQL_DELETE_ATIVIDADE = """
    DELETE FROM db_mkt_kanban_registros
    WHERE id_atividade = :id_atividade
    """

    SQL_INSERT_LOG = """
    INSERT INTO dlog_mkt_kanban (
      id_responsavel,
      [data],
      json_registro
    )
    VALUES (
      :id_responsavel,
      :data,
      :json_registro
    )
    """

    SQL_LIST_LOGS_RECENT = """
    SELECT TOP 300
      id_registro,
      id_responsavel,
      [data] AS data,
      json_registro
    FROM dlog_mkt_kanban
    ORDER BY id_registro DESC
    """

    SQL_LIST_HISTORY = """
    SELECT TOP 300
      id_registro,
      id_responsavel,
      [data] AS data,
      json_registro
    FROM dlog_mkt_kanban
    WHERE [data] >= DATEADD(day, -7, CAST(GETDATE() AS date))
    ORDER BY id_registro DESC
    """


class AcessosQueries:
    SQL_LIST_ACESSOS_V1 = """
    SELECT
      id_assinatura,
      plataforma,
      valor,
      data_referencia,
      link,
      email,
      senha
    FROM db_mkt_acessos
    ORDER BY plataforma ASC, id_assinatura ASC
    """

    SQL_LIST_ACESSOS_V2 = """
    SELECT
      id_assinatura,
      plataforma,
      valor,
      data_referencia,
      data_criacao,
      link,
      email,
      senha
    FROM db_mkt_acessos
    ORDER BY plataforma ASC, id_assinatura ASC
    """

    SQL_SELECT_ACESSO_BY_ID_V1 = """
    SELECT
      id_assinatura,
      plataforma,
      valor,
      data_referencia,
      link,
      email,
      senha
    FROM db_mkt_acessos
    WHERE id_assinatura = :id_assinatura
    """

    SQL_SELECT_ACESSO_BY_ID_V2 = """
    SELECT
      id_assinatura,
      plataforma,
      valor,
      data_referencia,
      data_criacao,
      link,
      email,
      senha
    FROM db_mkt_acessos
    WHERE id_assinatura = :id_assinatura
    """

    SQL_INSERT_ACESSO_V1 = """
    INSERT INTO db_mkt_acessos (
      plataforma,
      valor,
      data_referencia,
      link,
      email,
      senha
    )
    OUTPUT
      INSERTED.id_assinatura,
      INSERTED.plataforma,
      INSERTED.valor,
      INSERTED.data_referencia,
      INSERTED.link,
      INSERTED.email,
      INSERTED.senha
    VALUES (
      :plataforma,
      :valor,
      :data_referencia,
      :link,
      :email,
      :senha
    )
    """

    SQL_INSERT_ACESSO_V2 = """
    INSERT INTO db_mkt_acessos (
      plataforma,
      valor,
      data_referencia,
      link,
      email,
      senha
    )
    OUTPUT
      INSERTED.id_assinatura,
      INSERTED.plataforma,
      INSERTED.valor,
      INSERTED.data_referencia,
      INSERTED.data_criacao,
      INSERTED.link,
      INSERTED.email,
      INSERTED.senha
    VALUES (
      :plataforma,
      :valor,
      :data_referencia,
      :link,
      :email,
      :senha
    )
    """

    SQL_INSERT_ACESSO_V2_WITH_DATE = """
    INSERT INTO db_mkt_acessos (
      plataforma,
      valor,
      data_referencia,
      data_criacao,
      link,
      email,
      senha
    )
    OUTPUT
      INSERTED.id_assinatura,
      INSERTED.plataforma,
      INSERTED.valor,
      INSERTED.data_referencia,
      INSERTED.data_criacao,
      INSERTED.link,
      INSERTED.email,
      INSERTED.senha
    VALUES (
      :plataforma,
      :valor,
      :data_referencia,
      GETDATE(),
      :link,
      :email,
      :senha
    )
    """

    SQL_UPDATE_ACESSO = """
    UPDATE db_mkt_acessos
    SET
      plataforma = :plataforma,
      valor = :valor,
      data_referencia = :data_referencia,
      link = :link,
      email = :email,
      senha = :senha
    WHERE id_assinatura = :id_assinatura
    """

    SQL_UPDATE_ACESSO_V2 = """
    UPDATE db_mkt_acessos
    SET
      plataforma = :plataforma,
      valor = :valor,
      data_referencia = :data_referencia,
      link = :link,
      email = :email,
      senha = :senha
    WHERE id_assinatura = :id_assinatura
    """

    SQL_DELETE_ACESSO = """
    DELETE FROM db_mkt_acessos
    WHERE id_assinatura = :id_assinatura
    """

    SQL_DELETE_ACESSO_V2 = """
    DELETE FROM db_mkt_acessos
    WHERE id_assinatura = :id_assinatura
    """

    SQL_TOUCH_DATA_CRIACAO_IF_NULL = """
    UPDATE db_mkt_acessos
    SET data_criacao = GETDATE()
    WHERE id_assinatura = :id_assinatura
      AND data_criacao IS NULL
    """


class BlobStorageQueries:
    SQL_LIST_ALL = """
    SELECT id, origem, caminho, nome_arquivo, tipo_arquivo, id_responsavel, descricao, categoria, versao, data_criacao
    FROM db_blob_storage
    WHERE origem = :origem
    ORDER BY categoria ASC, nome_arquivo ASC
    """

    SQL_LIST_BY_CATEGORIA = """
    SELECT id, origem, caminho, nome_arquivo, tipo_arquivo, id_responsavel, descricao, categoria, versao, data_criacao
    FROM db_blob_storage
    WHERE origem = :origem AND categoria = :categoria
    ORDER BY nome_arquivo ASC
    """

    SQL_SELECT_BY_CAMINHO = """
    SELECT id, origem, caminho, nome_arquivo, tipo_arquivo, id_responsavel, descricao, categoria, versao, data_criacao
    FROM db_blob_storage
    WHERE caminho = :caminho AND origem = :origem
    """

    SQL_UPSERT = """
    MERGE db_blob_storage AS target
    USING (SELECT :caminho AS caminho, :origem AS origem) AS source
    ON target.caminho = source.caminho AND target.origem = source.origem
    WHEN MATCHED THEN
        UPDATE SET
            nome_arquivo = :nome_arquivo,
            tipo_arquivo = :tipo_arquivo,
            id_responsavel = :id_responsavel,
            descricao = :descricao,
            categoria = :categoria,
            versao = :versao,
            data_criacao = :data_criacao
    WHEN NOT MATCHED THEN
        INSERT (origem, caminho, nome_arquivo, tipo_arquivo, id_responsavel, descricao, categoria, versao, data_criacao)
        VALUES (:origem, :caminho, :nome_arquivo, :tipo_arquivo, :id_responsavel, :descricao, :categoria, :versao, :data_criacao);
    """

    SQL_DELETE_BY_CAMINHO = """
    DELETE FROM db_blob_storage WHERE caminho = :caminho AND origem = :origem
    """

    SQL_DELETE_NOT_IN = """
    DELETE FROM db_blob_storage WHERE origem = :origem AND caminho NOT IN ({placeholders})
    """

    SQL_LIST_CATEGORIAS = """
    SELECT
        categoria,
        COUNT(*) AS total_arquivos,
        MAX(data_criacao) AS ultima_atualizacao
    FROM db_blob_storage
    WHERE origem = :origem
    GROUP BY categoria
    ORDER BY categoria ASC
    """

    SQL_SEARCH = """
    SELECT id, origem, caminho, nome_arquivo, tipo_arquivo, id_responsavel, descricao, categoria, versao, data_criacao
    FROM db_blob_storage
    WHERE origem = :origem AND (nome_arquivo LIKE :termo OR categoria LIKE :termo OR descricao LIKE :termo)
    ORDER BY categoria ASC, nome_arquivo ASC
    """

    SQL_LIST_ALL_CAMINHOS = """
    SELECT caminho FROM db_blob_storage WHERE origem = :origem ORDER BY caminho ASC
    """

    SQL_DELETE_FOLDER = """
    DELETE FROM db_blob_storage WHERE origem = :origem AND caminho LIKE :prefix_like
    """

    SQL_RENAME_FOLDER = """
    UPDATE db_blob_storage
    SET caminho = CONCAT(:new_prefix, SUBSTRING(caminho, LEN(:old_prefix) + 1, LEN(caminho))),
        categoria = :new_categoria
    WHERE origem = :origem AND caminho LIKE :old_like
    """
