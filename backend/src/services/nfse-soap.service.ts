// src/services/nfse-soap.service.ts
// Cliente SOAP para comunicacao com WebService ABRASF (Ribeirao Preto / ISSNet)

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import * as xml2js from 'xml2js';

const WSDL_URL = 'https://www.issnetonline.com.br/webserviceabrasf/ribeiraopreto/servicos.asmx?wsdl';

interface SoapResponse {
  success: boolean;
  protocolo?: string;
  nfseNumero?: string;
  codigoVerificacao?: string;
  xmlRetorno?: string;
  mensagemErro?: string;
}

/**
 * Envia lote de RPS para a prefeitura
 */
export async function enviarLoteRps(xmlAssinado: string): Promise<SoapResponse> {
  if (env.NFSE_ENVIRONMENT === 'sandbox') {
    logger.info('NFS-e em modo sandbox - simulando envio de lote');
    return {
      success: true,
      protocolo: `SANDBOX-${Date.now()}`,
      xmlRetorno: '<SimulacaoSandbox>Lote recebido com sucesso (sandbox)</SimulacaoSandbox>',
    };
  }

  try {
    const soap = await import('soap');
    const client = await soap.createClientAsync(WSDL_URL);

    const args = {
      xml: xmlAssinado,
    };

    const [result] = await client.RecepcionarLoteRpsAsync(args);
    const xmlRetorno = typeof result === 'string' ? result : JSON.stringify(result);

    logger.info({ result: xmlRetorno.substring(0, 500) }, 'Resposta EnviarLoteRps');

    const parsed = await parseXmlResponse(xmlRetorno);

    return {
      success: !parsed.mensagemErro,
      protocolo: parsed.protocolo,
      xmlRetorno,
      mensagemErro: parsed.mensagemErro,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg }, 'Erro ao enviar lote RPS via SOAP');
    return {
      success: false,
      mensagemErro: `Erro SOAP: ${msg}`,
    };
  }
}

/**
 * Consulta status de um lote pelo protocolo
 */
export async function consultarLoteRps(
  xmlConsulta: string,
): Promise<SoapResponse> {
  if (env.NFSE_ENVIRONMENT === 'sandbox') {
    logger.info('NFS-e em modo sandbox - simulando consulta de lote');
    return {
      success: true,
      nfseNumero: `NF-SANDBOX-${Date.now()}`,
      codigoVerificacao: 'SANDBOX-VERIFY',
      xmlRetorno: '<SimulacaoSandbox>NFS-e aprovada (sandbox)</SimulacaoSandbox>',
    };
  }

  try {
    const soap = await import('soap');
    const client = await soap.createClientAsync(WSDL_URL);

    const [result] = await client.ConsultarLoteRpsAsync({ xml: xmlConsulta });
    const xmlRetorno = typeof result === 'string' ? result : JSON.stringify(result);

    logger.info({ result: xmlRetorno.substring(0, 500) }, 'Resposta ConsultarLoteRps');

    const parsed = await parseXmlResponse(xmlRetorno);

    return {
      success: !parsed.mensagemErro,
      nfseNumero: parsed.nfseNumero,
      codigoVerificacao: parsed.codigoVerificacao,
      xmlRetorno,
      mensagemErro: parsed.mensagemErro,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg }, 'Erro ao consultar lote RPS');
    return {
      success: false,
      mensagemErro: `Erro SOAP: ${msg}`,
    };
  }
}

/**
 * Cancela uma NFS-e
 */
export async function cancelarNfse(xmlCancelamento: string): Promise<SoapResponse> {
  if (env.NFSE_ENVIRONMENT === 'sandbox') {
    logger.info('NFS-e em modo sandbox - simulando cancelamento');
    return {
      success: true,
      xmlRetorno: '<SimulacaoSandbox>NFS-e cancelada (sandbox)</SimulacaoSandbox>',
    };
  }

  try {
    const soap = await import('soap');
    const client = await soap.createClientAsync(WSDL_URL);

    const [result] = await client.CancelarNfseAsync({ xml: xmlCancelamento });
    const xmlRetorno = typeof result === 'string' ? result : JSON.stringify(result);

    logger.info({ result: xmlRetorno.substring(0, 500) }, 'Resposta CancelarNfse');

    const parsed = await parseXmlResponse(xmlRetorno);

    return {
      success: !parsed.mensagemErro,
      xmlRetorno,
      mensagemErro: parsed.mensagemErro,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg }, 'Erro ao cancelar NFS-e');
    return {
      success: false,
      mensagemErro: `Erro SOAP: ${msg}`,
    };
  }
}

/**
 * Parse da resposta XML da prefeitura para extrair dados relevantes
 */
async function parseXmlResponse(xmlString: string): Promise<{
  protocolo?: string;
  nfseNumero?: string;
  codigoVerificacao?: string;
  mensagemErro?: string;
}> {
  try {
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: true,
      tagNameProcessors: [xml2js.processors.stripPrefix],
    });

    const result = await parser.parseStringPromise(xmlString);
    const json = JSON.stringify(result);

    // Busca protocolo
    const protocoloMatch = json.match(/"Protocolo":"(\d+)"/);
    const protocolo = protocoloMatch?.[1];

    // Busca numero NFS-e
    const nfseMatch = json.match(/"Numero":"(\d+)"/);
    const nfseNumero = nfseMatch?.[1];

    // Busca codigo verificacao
    const verificacaoMatch = json.match(/"CodigoVerificacao":"([^"]+)"/);
    const codigoVerificacao = verificacaoMatch?.[1];

    // Busca mensagem de erro
    const erroMatch = json.match(/"Mensagem":"([^"]+)"/);
    const mensagemErro = erroMatch?.[1];

    return { protocolo, nfseNumero, codigoVerificacao, mensagemErro };
  } catch {
    logger.warn('Nao foi possivel parsear resposta XML');
    return {};
  }
}
