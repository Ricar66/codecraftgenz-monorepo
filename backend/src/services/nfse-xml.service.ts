// src/services/nfse-xml.service.ts
// Geracao de XML no padrao ABRASF para NFS-e

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

interface InvoiceData {
  rpsNumero: number;
  rpsSerie: string;
  dataEmissao: string; // YYYY-MM-DD
  competencia: string; // YYYY-MM-DD

  prestadorCnpj: string;
  prestadorIm: string;

  tomadorTipo: string;
  tomadorDocumento: string;
  tomadorRazaoSocial?: string;
  tomadorEmail?: string;
  tomadorLogradouro?: string;
  tomadorNumero?: string;
  tomadorBairro?: string;
  tomadorCodMunicipio?: string;
  tomadorUf?: string;
  tomadorCep?: string;

  descricaoServico: string;
  itemListaServico: string;
  codTributacao?: string;
  valorServicos: number;
  aliquotaIss?: number;
  valorIss?: number;
  issRetido: boolean;

  simplesNacional: boolean;
  incentivoFiscal: boolean;
  naturezaOperacao: number;
}

const NAMESPACE = 'http://www.abrasf.org.br/nfse.xsd';
const COD_MUNICIPIO = env.NFSE_COD_MUNICIPIO || '3543402';

/**
 * Gera o XML de um RPS no formato ABRASF v2.01
 */
export function gerarXmlRps(data: InvoiceData): string {
  const valorIss = data.valorIss ?? (data.aliquotaIss
    ? Number((data.valorServicos * data.aliquotaIss / 100).toFixed(2))
    : 0);

  const issRetido = data.issRetido ? 1 : 2; // 1=Sim, 2=Nao

  const tomadorCpfCnpj = data.tomadorTipo === 'PF'
    ? `<Cpf>${data.tomadorDocumento}</Cpf>`
    : `<Cnpj>${data.tomadorDocumento}</Cnpj>`;

  let tomadorEnderecoXml = '';
  if (data.tomadorLogradouro) {
    tomadorEnderecoXml = `
        <Endereco>
          <Endereco>${escapeXml(data.tomadorLogradouro)}</Endereco>
          <Numero>${escapeXml(data.tomadorNumero || 'S/N')}</Numero>
          <Bairro>${escapeXml(data.tomadorBairro || '')}</Bairro>
          <CodigoMunicipio>${data.tomadorCodMunicipio || COD_MUNICIPIO}</CodigoMunicipio>
          <Uf>${data.tomadorUf || 'SP'}</Uf>
          <Cep>${(data.tomadorCep || '').replace(/\D/g, '')}</Cep>
        </Endereco>`;
  }

  let tomadorContatoXml = '';
  if (data.tomadorEmail) {
    tomadorContatoXml = `
        <Contato>
          <Email>${escapeXml(data.tomadorEmail)}</Email>
        </Contato>`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Rps xmlns="${NAMESPACE}">
  <InfDeclaracaoPrestacaoServico Id="rps_${data.rpsNumero}">
    <Rps>
      <IdentificacaoRps>
        <Numero>${data.rpsNumero}</Numero>
        <Serie>${escapeXml(data.rpsSerie)}</Serie>
        <Tipo>1</Tipo>
      </IdentificacaoRps>
      <DataEmissao>${data.dataEmissao}T00:00:00</DataEmissao>
      <Status>1</Status>
    </Rps>
    <Competencia>${data.competencia}</Competencia>
    <Servico>
      <Valores>
        <ValorServicos>${data.valorServicos.toFixed(2)}</ValorServicos>
        <ValorIss>${valorIss.toFixed(2)}</ValorIss>
        <Aliquota>${(data.aliquotaIss || 0).toFixed(4)}</Aliquota>
      </Valores>
      <IssRetido>${issRetido}</IssRetido>
      <ItemListaServico>${escapeXml(data.itemListaServico)}</ItemListaServico>
      <CodigoTributacaoMunicipio>${escapeXml(data.codTributacao || data.itemListaServico.replace('.', ''))}</CodigoTributacaoMunicipio>
      <Discriminacao>${escapeXml(data.descricaoServico)}</Discriminacao>
      <CodigoMunicipio>${COD_MUNICIPIO}</CodigoMunicipio>
    </Servico>
    <Prestador>
      <CpfCnpj>
        <Cnpj>${data.prestadorCnpj}</Cnpj>
      </CpfCnpj>
      <InscricaoMunicipal>${data.prestadorIm}</InscricaoMunicipal>
    </Prestador>
    <Tomador>
      <IdentificacaoTomador>
        <CpfCnpj>
          ${tomadorCpfCnpj}
        </CpfCnpj>
      </IdentificacaoTomador>
      <RazaoSocial>${escapeXml(data.tomadorRazaoSocial || '')}</RazaoSocial>${tomadorEnderecoXml}${tomadorContatoXml}
    </Tomador>
    <OptanteSimplesNacional>${data.simplesNacional ? 1 : 2}</OptanteSimplesNacional>
    <IncentivoFiscal>${data.incentivoFiscal ? 1 : 2}</IncentivoFiscal>
  </InfDeclaracaoPrestacaoServico>
</Rps>`;

  return xml;
}

/**
 * Empacota RPSs em um lote para envio
 */
export function gerarXmlLoteRps(
  rpsXmls: string[],
  loteId: string,
  cnpj: string,
  im: string,
  qtdRps: number,
): string {
  // Remove headers XML individuais dos RPSs
  const rpsContents = rpsXmls.map(xml =>
    xml.replace(/<\?xml[^?]*\?>/, '').trim()
  ).join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio xmlns="${NAMESPACE}">
  <LoteRps Id="lote_${loteId}" versao="2.01">
    <NumeroLote>${loteId}</NumeroLote>
    <CpfCnpj>
      <Cnpj>${cnpj}</Cnpj>
    </CpfCnpj>
    <InscricaoMunicipal>${im}</InscricaoMunicipal>
    <QuantidadeRps>${qtdRps}</QuantidadeRps>
    <ListaRps>
      ${rpsContents}
    </ListaRps>
  </LoteRps>
</EnviarLoteRpsEnvio>`;
}

/**
 * Gera XML de cancelamento de NFS-e
 */
export function gerarXmlCancelamento(
  nfseNumero: string,
  cnpj: string,
  im: string,
  codMunicipio: string,
  _codigoVerificacao?: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<CancelarNfseEnvio xmlns="${NAMESPACE}">
  <Pedido>
    <InfPedidoCancelamento Id="cancel_${nfseNumero}">
      <IdentificacaoNfse>
        <Numero>${nfseNumero}</Numero>
        <CpfCnpj>
          <Cnpj>${cnpj}</Cnpj>
        </CpfCnpj>
        <InscricaoMunicipal>${im}</InscricaoMunicipal>
        <CodigoMunicipio>${codMunicipio}</CodigoMunicipio>
      </IdentificacaoNfse>
      <CodigoCancelamento>1</CodigoCancelamento>
    </InfPedidoCancelamento>
  </Pedido>
</CancelarNfseEnvio>`;
}

/**
 * Gera XML para consulta de lote por protocolo
 */
export function gerarXmlConsultaLote(
  protocolo: string,
  cnpj: string,
  im: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ConsultarLoteRpsEnvio xmlns="${NAMESPACE}">
  <Prestador>
    <CpfCnpj>
      <Cnpj>${cnpj}</Cnpj>
    </CpfCnpj>
    <InscricaoMunicipal>${im}</InscricaoMunicipal>
  </Prestador>
  <Protocolo>${protocolo}</Protocolo>
</ConsultarLoteRpsEnvio>`;
}

/**
 * Assina XML com certificado digital A1 (quando disponivel)
 */
export async function assinarXml(xml: string): Promise<string> {
  const certPath = env.NFSE_CERT_PATH;
  const certPassword = env.NFSE_CERT_PASSWORD;

  if (!certPath || !certPassword) {
    logger.warn('Certificado A1 nao configurado - XML sera enviado sem assinatura');
    return xml;
  }

  try {
    // TODO: Implementar assinatura com certificado A1 quando disponivel
    // Requer: extrair chave privada do PFX, usar xml-crypto SignedXml
    logger.info('Assinatura XML com certificado A1 sera implementada quando certificado estiver disponivel');
    return xml;
  } catch (error) {
    logger.error({ error }, 'Erro ao assinar XML');
    throw error;
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
