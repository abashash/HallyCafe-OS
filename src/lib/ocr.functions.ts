import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OcrItem = {
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
};

export type OcrResult = {
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  vat_amount: number | null;
  total_amount: number | null;
  items: OcrItem[];
};

const SYSTEM = `تو یک دستیار استخراج اطلاعات فاکتور خرید فارسی هستی.
از تصویر فاکتور، اطلاعات را استخراج کن و فقط JSON معتبر برگردان.
قیمت‌ها را به عدد ریال (بدون جداکننده) برگردان.
تاریخ را در صورت امکان به میلادی ISO (YYYY-MM-DD) تبدیل کن؛ اگر ممکن نبود null بگذار.
واحدها را با این کدها برگردان: mg,g,kg,ml,L,pcs,pack,pouch,box,carton,roll,sheet,pair,set,bottle,can,container,bucket,gallon,jerrycan`;

const SCHEMA = {
  type: "object",
  properties: {
    supplier_name: { type: ["string", "null"] },
    invoice_number: { type: ["string", "null"] },
    invoice_date: { type: ["string", "null"] },
    vat_amount: { type: ["number", "null"] },
    total_amount: { type: ["number", "null"] },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string" },
          unit_price: { type: "number" },
          total_price: { type: "number" },
        },
        required: ["name", "quantity", "unit", "unit_price", "total_price"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "supplier_name",
    "invoice_number",
    "invoice_date",
    "vat_amount",
    "total_amount",
    "items",
  ],
  additionalProperties: false,
} as const;

export const extractInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { images: string[] }) => {
    if (!Array.isArray(input?.images) || input.images.length === 0) {
      throw new Error("تصویری ارسال نشده است");
    }
    return { images: input.images.slice(0, 4) };
  })
  .handler(async ({ data }): Promise<OcrResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("سرویس هوش مصنوعی در دسترس نیست");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "اطلاعات این فاکتور خرید را استخراج کن." },
              ...data.images.map((url) => ({ type: "image_url", image_url: { url } })),
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "invoice", strict: true, schema: SCHEMA },
        },
      }),
    });

    if (res.status === 429) throw new Error("محدودیت درخواست؛ کمی بعد دوباره تلاش کنید");
    if (res.status === 402) throw new Error("اعتبار سرویس هوش مصنوعی کافی نیست");
    if (!res.ok) throw new Error("خطا در پردازش تصویر فاکتور");

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: Partial<OcrResult>;
    try {
      parsed = JSON.parse(content) as Partial<OcrResult>;
    } catch {
      throw new Error("پاسخ نامعتبر از سرویس هوش مصنوعی");
    }

    return {
      supplier_name: parsed.supplier_name ?? null,
      invoice_number: parsed.invoice_number ?? null,
      invoice_date: parsed.invoice_date ?? null,
      vat_amount: parsed.vat_amount ?? null,
      total_amount: parsed.total_amount ?? null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  });
