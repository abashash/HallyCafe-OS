import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type SiteLink = {
  label: string;
  url: string;
};

export type PublicSiteSettings = {
  id: string;
  cafe_name: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  primary_color: string | null;
  surface_color: string | null;
  accent_color: string | null;
  home_title: string | null;
  home_summary: string | null;
  about_title: string | null;
  about_body: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  opening_hours: string | null;
  map_url: string | null;
  instagram_url: string | null;
  telegram_url: string | null;
  whatsapp_url: string | null;
  youtube_url: string | null;
  facebook_url: string | null;
  x_url: string | null;
  linkedin_url: string | null;
  google_maps_url: string | null;
  waze_url: string | null;
  neshan_url: string | null;
  balad_url: string | null;
  custom_links: SiteLink[];
};

export const DEFAULT_SITE_COLORS = {
  primary: "#0e4a4a",
  surface: "#3e4b5c",
  accent: "#f2a03d",
} as const;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function safeColor(value: string | null | undefined, fallback: string) {
  return value && HEX_COLOR.test(value) ? value : fallback;
}

function parseLinks(value: unknown): SiteLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as { label?: unknown; url?: unknown };
    if (typeof candidate.label !== "string" || typeof candidate.url !== "string") return [];
    const label = candidate.label.trim();
    const url = candidate.url.trim();
    return label && url ? [{ label, url }] : [];
  });
}

export async function fetchPublicSiteSettings(): Promise<PublicSiteSettings | null> {
  const { data, error } = await supabase
    .from("public_site_settings")
    .select(
      "id,cafe_name,logo_url,cover_image_url,primary_color,surface_color,accent_color,home_title,home_summary,about_title,about_body,phone,mobile,email,address,opening_hours,map_url,instagram_url,telegram_url,whatsapp_url,youtube_url,facebook_url,x_url,linkedin_url,google_maps_url,waze_url,neshan_url,balad_url,custom_links",
    )
    .eq("singleton", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { ...data, custom_links: parseLinks(data.custom_links) };
}

export function usePublicSiteSettings() {
  return useQuery({
    queryKey: ["public-site-settings"],
    queryFn: fetchPublicSiteSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBrandingImage(path: string | null | undefined) {
  return useQuery({
    queryKey: ["branding-image", path],
    enabled: Boolean(path),
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      if (!path) return null;
      if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
      const { data, error } = await supabase.storage
        .from("public-branding")
        .createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function isSafePublicUrl(value: string) {
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      url.protocol === "http:" ||
      url.protocol === "tel:" ||
      url.protocol === "mailto:"
    );
  } catch {
    return false;
  }
}
