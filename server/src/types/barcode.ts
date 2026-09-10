export type BarcodeOffer = {
  url: string;
  retailer: string;
  domain: string;
};

export type BarcodeLookupResult = {
  code: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  imageCandidates: string[];
  asin: string | null;
  urls: BarcodeOffer[];
};

export type UpcItemRecord = {
  title: string;
  brand: string | null;
  imageUrl: string | null;
  images: string[];
  asin: string | null;
  urls: BarcodeOffer[];
};

export type ProductFacts = {
  title: string;
  brand: string | null;
  imageUrl: string | null;
};
