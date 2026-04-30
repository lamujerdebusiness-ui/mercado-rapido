import { NextRequest, NextResponse } from "next/server";
import { suggestItemDefaults } from "@/lib/itemInput";

type ImportedInvoiceItem = {
  name: string;
  quantity: string | null;
  unit_price: number | null;
};

const ALLOWED_HOSTS = [
  "sefaz.rs.gov.br",
  "www.sefaz.rs.gov.br",
  "dfe-portal.svrs.rs.gov.br",
  "www.dfe-portal.svrs.rs.gov.br",
];

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { qrCode?: string };
    const source = body.qrCode?.trim();

    if (!source) {
      return NextResponse.json({ error: "Informe o QR Code ou link da NFC-e." }, { status: 400 });
    }

    const url = getInvoiceUrl(source);

    if (!url) {
      return NextResponse.json(
        { error: "Não reconheci esse QR Code. Use o QR Code da NFC-e ou cole o link completo da consulta." },
        { status: 400 },
      );
    }

    if (!isAllowedUrl(url)) {
      return NextResponse.json(
        { error: "Por segurança, este importador aceita apenas links públicos da SEFAZ-RS/SVRS." },
        { status: 400 },
      );
    }

    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "pt-BR,pt;q=0.9",
        "user-agent":
          "Mozilla/5.0 (compatible; MercadoRapido/1.0; +https://mercado-rapido.vercel.app)",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "A SEFAZ não retornou a nota agora. Tente novamente em alguns instantes." },
        { status: 502 },
      );
    }

    const html = await decodeResponse(response);
    const items = parseInvoiceItems(html);

    if (items.length === 0) {
      return NextResponse.json(
        {
          error:
            "Não consegui encontrar os itens nessa nota. A página da SEFAZ pode ter mudado ou exigido validação manual.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      sourceUrl: url.toString(),
      items: items.map((item) => ({
        ...item,
        category: suggestItemDefaults(item.name).category,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível importar essa NFC-e. Verifique o QR Code e tente novamente." },
      { status: 500 },
    );
  }
}

function getInvoiceUrl(source: string) {
  const embeddedUrl = source.match(/https?:\/\/\S+/i)?.[0] ?? source;

  try {
    return new URL(embeddedUrl);
  } catch {
    return null;
  }
}

function isAllowedUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  return ALLOWED_HOSTS.some((allowedHost) => hostname === allowedHost || hostname.endsWith(`.${allowedHost}`));
}

async function decodeResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const charset = contentType.match(/charset=([^;]+)/i)?.[1]?.trim().toLowerCase();
  const buffer = await response.arrayBuffer();

  if (charset && charset !== "utf-8" && charset !== "utf8") {
    return new TextDecoder(charset).decode(buffer);
  }

  return new TextDecoder("utf-8").decode(buffer);
}

function parseInvoiceItems(html: string): ImportedInvoiceItem[] {
  const normalizedHtml = html.replace(/\r?\n/g, " ");
  const itemBlocks = [
    ...normalizedHtml.matchAll(/<tr[^>]*(?:id=["']?Item[^"'>]*["']?|class=["'][^"']*item[^"']*["'])[^>]*>(.*?)<\/tr>/gi),
  ].map((match) => match[1]);

  const blocks = itemBlocks.length > 0 ? itemBlocks : splitByItemTitle(normalizedHtml);

  return blocks
    .map(parseItemBlock)
    .filter((item): item is ImportedInvoiceItem => Boolean(item?.name))
    .filter((item, index, current) => {
      const key = `${item.name}|${item.quantity}|${item.unit_price}`;
      return current.findIndex((candidate) => `${candidate.name}|${candidate.quantity}|${candidate.unit_price}` === key) === index;
    });
}

function splitByItemTitle(html: string) {
  const parts = html.split(/(?=<[^>]+class=["'][^"']*txtTit[^"']*["'][^>]*>)/gi);
  return parts.filter((part) => /txtTit/i.test(part));
}

function parseItemBlock(block: string): ImportedInvoiceItem | null {
  const name =
    extractByClass(block, "txtTit") ??
    extractLabelValue(block, ["Produto", "Descricao", "Descrição"]) ??
    "";

  const quantity = extractLabelValue(block, ["Qtde.", "Qtde", "Qtd.", "Qtd", "Quantidade"]);
  const unit = extractLabelValue(block, ["UN", "Un", "Unid.", "Unidade"]);
  const unitPrice = parseBrazilianMoney(
    extractLabelValue(block, ["Vl. Unit.", "Vlr. Unit.", "Valor Unit.", "Valor Unitário", "Unitario"]),
  );
  const totalPrice = parseBrazilianMoney(
    extractByClass(block, "valor") ??
      extractLabelValue(block, ["Valor total", "Vl. Total", "Total"]),
  );
  const normalizedQuantity = normalizeQuantity(quantity, unit);
  const quantityNumber = parseBrazilianNumber(quantity);

  if (!name) {
    return null;
  }

  return {
    name: cleanText(name),
    quantity: normalizedQuantity,
    unit_price: unitPrice ?? calculateUnitPrice(totalPrice, quantityNumber),
  };
}

function extractByClass(block: string, className: string) {
  const match = block.match(
    new RegExp(`<[^>]+class=["'][^"']*${escapeRegExp(className)}[^"']*["'][^>]*>(.*?)<\\/[^>]+>`, "i"),
  );

  return match ? cleanText(match[1]) : null;
}

function extractLabelValue(block: string, labels: string[]) {
  const text = cleanText(block);

  for (const label of labels) {
    const escapedLabel = escapeRegExp(label);
    const match = text.match(new RegExp(`${escapedLabel}\\s*:?\\s*([^|;•]+?)(?=\\s+(?:Qtde|Qtd|UN|Un|Vl|Valor|Total)\\b|$)`, "i"));

    if (match?.[1]) {
      return cleanText(match[1]);
    }
  }

  return null;
}

function normalizeQuantity(quantity: string | null, unit: string | null) {
  const cleanQuantity = quantity ? normalizeNumberText(quantity) : "";
  const cleanUnit = unit ? normalizeUnit(unit) : "";

  if (!cleanQuantity) {
    return null;
  }

  return cleanUnit ? `${cleanQuantity} ${cleanUnit}` : cleanQuantity;
}

function normalizeUnit(value: string) {
  const normalized = value.trim().toLowerCase();
  const normalizedAscii = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const aliases: Record<string, string> = {
    unidade: "un",
    unid: "un",
    und: "un",
    un: "un",
    kg: "kg",
    kilo: "kg",
    quilo: "kg",
    g: "g",
    gr: "g",
    l: "l",
    lt: "l",
    litro: "l",
    ml: "ml",
    pct: "pct",
    pacote: "pct",
    garrafa: "gar",
    gar: "gar",
    caixa: "cx",
    cx: "cx",
    saco: "sc",
    sc: "sc",
    dz: "dz",
  };

  return aliases[normalizedAscii] ?? normalizedAscii.slice(0, 8);
}

function parseBrazilianMoney(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/-?\d{1,3}(?:\.\d{3})*(?:,\d{2,4})|-?\d+(?:,\d{2,4})/);
  return match ? parseBrazilianNumber(match[0]) : null;
}

function parseBrazilianNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function calculateUnitPrice(totalPrice: number | null, quantity: number | null) {
  if (!totalPrice || !quantity || quantity <= 0) {
    return null;
  }

  return Math.round((totalPrice / quantity) * 100) / 100;
}

function normalizeNumberText(value: string) {
  const parsed = parseBrazilianNumber(value);

  if (parsed === null) {
    return "";
  }

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 3,
  }).format(parsed);
}

function cleanText(value: string) {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    if (entity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }

    return namedEntities[entity.toLowerCase()] ?? `&${entity};`;
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
