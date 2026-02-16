// src/services/nfse.service.ts
// Logica de negocio principal para NFS-e

import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { gerarXmlRps, gerarXmlLoteRps, gerarXmlCancelamento, gerarXmlConsultaLote, assinarXml } from './nfse-xml.service.js';
import { enviarLoteRps, consultarLoteRps, cancelarNfse as soapCancelarNfse } from './nfse-soap.service.js';
import type { CreateNfseInput, SearchNfseQuery } from '../schemas/nfse.schema.js';

export const nfseService = {
  /**
   * Gera uma invoice (NFS-e) a partir dos dados da venda
   */
  async gerarInvoice(data: CreateNfseInput) {
    // Verifica se ja existe invoice para essa venda
    if (data.venda_id) {
      const existing = await prisma.invoice.findUnique({
        where: { vendaId: data.venda_id },
      });

      if (existing) {
        throw AppError.conflict(`Ja existe uma NFS-e para a venda ${data.venda_id}`);
      }
    }

    // Gera numero RPS sequencial
    const lastInvoice = await prisma.invoice.findFirst({
      where: { rpsNumero: { not: null } },
      orderBy: { rpsNumero: 'desc' },
      select: { rpsNumero: true },
    });
    const rpsNumero = (lastInvoice?.rpsNumero ?? 0) + 1;

    // Calcula valor do ISS se aliquota informada
    const aliquotaIss = data.servico.aliquota_iss ?? null;
    const valorIss = aliquotaIss
      ? Number((data.servico.valor_servicos * aliquotaIss / 100).toFixed(2))
      : null;

    const invoice = await prisma.invoice.create({
      data: {
        vendaId: data.venda_id,
        rpsNumero,
        rpsSerie: '1',
        status: 'pending',

        dataEmissao: new Date(data.data_venda),
        competencia: new Date(data.competencia),

        prestadorCnpj: data.prestador.cnpj,
        prestadorIm: data.prestador.inscricao_municipal,

        tomadorTipo: data.tomador.tipo,
        tomadorDocumento: data.tomador.documento,
        tomadorRazaoSocial: data.tomador.razao_social ?? null,
        tomadorEmail: data.tomador.email ?? null,
        tomadorLogradouro: data.tomador.endereco?.logradouro ?? null,
        tomadorNumero: data.tomador.endereco?.numero ?? null,
        tomadorBairro: data.tomador.endereco?.bairro ?? null,
        tomadorCodMunicipio: data.tomador.endereco?.codigo_municipio ?? null,
        tomadorUf: data.tomador.endereco?.uf ?? null,
        tomadorCep: data.tomador.endereco?.cep ?? null,

        descricaoServico: data.servico.descricao,
        itemListaServico: data.servico.item_lista_servico,
        codTributacao: data.servico.codigo_tributacao_municipio ?? null,
        valorServicos: data.servico.valor_servicos,
        aliquotaIss,
        valorIss,
        issRetido: data.servico.iss_retido,

        simplesNacional: data.tributacao?.optante_simples_nacional ?? true,
        incentivoFiscal: data.tributacao?.incentivo_fiscal ?? false,
        naturezaOperacao: data.tributacao?.natureza_operacao ?? 1,
      },
    });

    logger.info({ invoiceId: invoice.id, rpsNumero, vendaId: data.venda_id }, 'Invoice criada');

    return mapInvoice(invoice);
  },

  /**
   * Envia RPS para a prefeitura via SOAP
   */
  async enviarParaPrefeitura(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw AppError.notFound('Invoice');
    }

    if (invoice.status !== 'pending' && invoice.status !== 'error') {
      throw AppError.badRequest(`Invoice com status '${invoice.status}' nao pode ser enviada`);
    }

    if (!invoice.rpsNumero) {
      throw AppError.badRequest('Invoice sem numero de RPS');
    }

    // Gera XML do RPS
    const xmlRps = gerarXmlRps({
      rpsNumero: invoice.rpsNumero,
      rpsSerie: invoice.rpsSerie || '1',
      dataEmissao: invoice.dataEmissao.toISOString().split('T')[0],
      competencia: invoice.competencia.toISOString().split('T')[0],
      prestadorCnpj: invoice.prestadorCnpj,
      prestadorIm: invoice.prestadorIm,
      tomadorTipo: invoice.tomadorTipo,
      tomadorDocumento: invoice.tomadorDocumento,
      tomadorRazaoSocial: invoice.tomadorRazaoSocial ?? undefined,
      tomadorEmail: invoice.tomadorEmail ?? undefined,
      tomadorLogradouro: invoice.tomadorLogradouro ?? undefined,
      tomadorNumero: invoice.tomadorNumero ?? undefined,
      tomadorBairro: invoice.tomadorBairro ?? undefined,
      tomadorCodMunicipio: invoice.tomadorCodMunicipio ?? undefined,
      tomadorUf: invoice.tomadorUf ?? undefined,
      tomadorCep: invoice.tomadorCep ?? undefined,
      descricaoServico: invoice.descricaoServico,
      itemListaServico: invoice.itemListaServico,
      codTributacao: invoice.codTributacao ?? undefined,
      valorServicos: Number(invoice.valorServicos),
      aliquotaIss: invoice.aliquotaIss ? Number(invoice.aliquotaIss) : undefined,
      valorIss: invoice.valorIss ? Number(invoice.valorIss) : undefined,
      issRetido: invoice.issRetido,
      simplesNacional: invoice.simplesNacional,
      incentivoFiscal: invoice.incentivoFiscal,
      naturezaOperacao: invoice.naturezaOperacao,
    });

    // Empacota em lote
    const loteId = String(invoice.rpsNumero);
    const xmlLote = gerarXmlLoteRps(
      [xmlRps],
      loteId,
      invoice.prestadorCnpj,
      invoice.prestadorIm,
      1,
    );

    // Assina XML
    const xmlAssinado = await assinarXml(xmlLote);

    // Envia via SOAP
    const resultado = await enviarLoteRps(xmlAssinado);

    // Atualiza invoice no DB
    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: resultado.success ? 'submitted' : 'error',
        protocolo: resultado.protocolo ?? null,
        xmlEnvio: xmlAssinado,
        xmlRetorno: resultado.xmlRetorno ?? null,
        mensagemErro: resultado.mensagemErro ?? null,
      },
    });

    logger.info(
      { invoiceId, protocolo: resultado.protocolo, success: resultado.success },
      'RPS enviado para prefeitura',
    );

    return mapInvoice(updated);
  },

  /**
   * Consulta status do lote na prefeitura
   */
  async consultarLote(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw AppError.notFound('Invoice');
    }

    if (!invoice.protocolo) {
      throw AppError.badRequest('Invoice sem protocolo - envie para a prefeitura primeiro');
    }

    // Gera XML de consulta
    const xmlConsulta = gerarXmlConsultaLote(
      invoice.protocolo,
      invoice.prestadorCnpj,
      invoice.prestadorIm,
    );

    // Consulta via SOAP
    const resultado = await consultarLoteRps(xmlConsulta);

    // Determina novo status
    let novoStatus = invoice.status;
    if (resultado.nfseNumero) {
      novoStatus = 'approved';
    } else if (resultado.mensagemErro) {
      novoStatus = 'rejected';
    }

    // Atualiza invoice
    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: novoStatus,
        nfseNumero: resultado.nfseNumero ?? invoice.nfseNumero,
        codigoVerificacao: resultado.codigoVerificacao ?? invoice.codigoVerificacao,
        xmlRetorno: resultado.xmlRetorno ?? invoice.xmlRetorno,
        mensagemErro: resultado.mensagemErro ?? null,
      },
    });

    logger.info(
      { invoiceId, nfseNumero: resultado.nfseNumero, status: novoStatus },
      'Consulta de lote realizada',
    );

    return mapInvoice(updated);
  },

  /**
   * Cancela uma NFS-e na prefeitura
   */
  async cancelarNfse(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw AppError.notFound('Invoice');
    }

    if (invoice.status !== 'approved') {
      throw AppError.badRequest('Somente NFS-e aprovadas podem ser canceladas');
    }

    if (!invoice.nfseNumero) {
      throw AppError.badRequest('Invoice sem numero de NFS-e');
    }

    // Gera XML de cancelamento
    const xmlCancelamento = gerarXmlCancelamento(
      invoice.nfseNumero,
      invoice.prestadorCnpj,
      invoice.prestadorIm,
      env.NFSE_COD_MUNICIPIO,
      invoice.codigoVerificacao ?? undefined,
    );

    // Envia via SOAP
    const resultado = await soapCancelarNfse(xmlCancelamento);

    // Atualiza invoice
    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: resultado.success ? 'cancelled' : 'error',
        xmlRetorno: resultado.xmlRetorno ?? invoice.xmlRetorno,
        mensagemErro: resultado.mensagemErro ?? null,
      },
    });

    logger.info(
      { invoiceId, nfseNumero: invoice.nfseNumero, success: resultado.success },
      'Cancelamento de NFS-e',
    );

    return mapInvoice(updated);
  },

  /**
   * Busca invoice por ID
   */
  async buscarPorId(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw AppError.notFound('Invoice');
    }

    return mapInvoice(invoice);
  },

  /**
   * Retorna XML de envio da invoice
   */
  async buscarXml(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, xmlEnvio: true, xmlRetorno: true, status: true },
    });

    if (!invoice) {
      throw AppError.notFound('Invoice');
    }

    return {
      id: invoice.id,
      status: invoice.status,
      xmlEnvio: invoice.xmlEnvio,
      xmlRetorno: invoice.xmlRetorno,
    };
  },

  /**
   * Lista invoices com paginacao e filtros
   */
  async listar(query: SearchNfseQuery) {
    const { page, limit, status, cnpj, dataInicio, dataFim } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (cnpj) {
      where.prestadorCnpj = cnpj;
    }

    if (dataInicio || dataFim) {
      const dataFilter: Record<string, Date> = {};
      if (dataInicio) dataFilter.gte = new Date(dataInicio);
      if (dataFim) dataFilter.lte = new Date(dataFim);
      where.dataEmissao = dataFilter;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      items: invoices.map(mapInvoice),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Emissao automatica de NFS-e apos aprovacao de pagamento.
   * Non-blocking: erros sao logados mas nao propagados.
   * Nao gera NFS-e para compras gratuitas (amount = 0).
   */
  async emitirAutomatica(params: {
    paymentId: string;
    appId: number;
    appName: string;
    amount: number;
    payerEmail?: string;
    payerName?: string;
    payerDocument?: string;
    payerDocumentType?: string;
  }) {
    try {
      // Nao emitir NFS-e para apps gratuitos
      if (params.amount <= 0) {
        logger.info({ paymentId: params.paymentId }, 'NFS-e ignorada - app gratuito');
        return;
      }

      // Verificar se prestador esta configurado
      const cnpj = env.NFSE_PRESTADOR_CNPJ;
      const im = env.NFSE_PRESTADOR_IM;
      if (!cnpj || !im) {
        logger.warn({ paymentId: params.paymentId }, 'NFS-e ignorada - prestador nao configurado (NFSE_PRESTADOR_CNPJ/NFSE_PRESTADOR_IM)');
        return;
      }

      // Verificar se ja existe invoice para este pagamento
      const existing = await prisma.invoice.findFirst({
        where: { paymentId: params.paymentId },
      });
      if (existing) {
        logger.info({ paymentId: params.paymentId, invoiceId: existing.id }, 'NFS-e ja existe para este pagamento');
        return;
      }

      const hoje = new Date().toISOString().split('T')[0];
      const tomadorTipo = params.payerDocumentType === 'CNPJ' ? 'PJ' : 'PF';
      const tomadorDocumento = params.payerDocument || '00000000000';

      // Gerar invoice
      const invoice = await this.gerarInvoice({
        venda_id: params.paymentId,
        data_venda: hoje,
        competencia: hoje,
        prestador: {
          cnpj,
          inscricao_municipal: im,
        },
        tomador: {
          tipo: tomadorTipo as 'PF' | 'PJ',
          documento: tomadorDocumento,
          razao_social: params.payerName,
          email: params.payerEmail,
        },
        servico: {
          descricao: `Licenca de software - ${params.appName}`,
          item_lista_servico: '01.05',
          valor_servicos: params.amount,
          iss_retido: false,
        },
        tributacao: {
          optante_simples_nacional: true,
          incentivo_fiscal: false,
          natureza_operacao: 1,
        },
      });

      logger.info({ paymentId: params.paymentId, invoiceId: invoice.id }, 'NFS-e gerada automaticamente');

      // Tentar enviar para prefeitura
      try {
        await this.enviarParaPrefeitura(invoice.id);
        logger.info({ paymentId: params.paymentId, invoiceId: invoice.id }, 'NFS-e enviada para prefeitura automaticamente');
      } catch (envioError) {
        logger.error({ error: envioError, invoiceId: invoice.id }, 'Erro ao enviar NFS-e automaticamente - pode ser enviada manualmente');
      }
    } catch (error) {
      logger.error({ error, paymentId: params.paymentId }, 'Erro ao emitir NFS-e automaticamente');
    }
  },
};

/**
 * Mapeia invoice do Prisma para formato de resposta da API
 */
function mapInvoice(invoice: {
  id: string;
  vendaId: string | null;
  paymentId: string | null;
  rpsNumero: number | null;
  rpsSerie: string | null;
  nfseNumero: string | null;
  codigoVerificacao: string | null;
  status: string;
  dataEmissao: Date;
  competencia: Date;
  prestadorCnpj: string;
  prestadorIm: string;
  tomadorTipo: string;
  tomadorDocumento: string;
  tomadorRazaoSocial: string | null;
  tomadorEmail: string | null;
  valorServicos: unknown;
  aliquotaIss: unknown;
  valorIss: unknown;
  issRetido: boolean;
  descricaoServico: string;
  itemListaServico: string;
  protocolo: string | null;
  mensagemErro: string | null;
  pdfUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: invoice.id,
    venda_id: invoice.vendaId,
    payment_id: invoice.paymentId,
    rps_numero: invoice.rpsNumero,
    rps_serie: invoice.rpsSerie,
    nfse_numero: invoice.nfseNumero,
    codigo_verificacao: invoice.codigoVerificacao,
    status: invoice.status,
    data_emissao: invoice.dataEmissao.toISOString().split('T')[0],
    competencia: invoice.competencia.toISOString().split('T')[0],
    prestador: {
      cnpj: invoice.prestadorCnpj,
      inscricao_municipal: invoice.prestadorIm,
    },
    tomador: {
      tipo: invoice.tomadorTipo,
      documento: invoice.tomadorDocumento,
      razao_social: invoice.tomadorRazaoSocial,
      email: invoice.tomadorEmail,
    },
    servico: {
      descricao: invoice.descricaoServico,
      item_lista_servico: invoice.itemListaServico,
      valor_servicos: Number(invoice.valorServicos),
      aliquota_iss: invoice.aliquotaIss ? Number(invoice.aliquotaIss) : null,
      valor_iss: invoice.valorIss ? Number(invoice.valorIss) : null,
      iss_retido: invoice.issRetido,
    },
    protocolo: invoice.protocolo,
    mensagem_erro: invoice.mensagemErro,
    pdf_url: invoice.pdfUrl,
    created_at: invoice.createdAt.toISOString(),
    updated_at: invoice.updatedAt.toISOString(),
  };
}
