import {
  clearProductDraft,
  loadProductDraft,
  saveProductDraft,
  type ProductDraft,
} from "./productDraft";

const draft: ProductDraft = {
  values: {
    name: "Ensemble Wax",
    description: "Ensemble deux pièces.",
    price: "10000",
    category: "Mode",
    stock: "5",
    stockThreshold: "2",
    isPromo: false,
  },
  images: ["https://res.cloudinary.com/demo/image/upload/x.jpg"],
};

describe("productDraft", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null when no draft is stored", () => {
    expect(loadProductDraft()).toBeNull();
  });

  it("round-trips a saved draft", () => {
    saveProductDraft(draft);
    expect(loadProductDraft()).toEqual(draft);
  });

  it("clears a stored draft", () => {
    saveProductDraft(draft);
    clearProductDraft();
    expect(loadProductDraft()).toBeNull();
  });

  it("returns null instead of throwing on corrupted stored JSON", () => {
    window.localStorage.setItem("manushop:product-draft", "{not json");
    expect(loadProductDraft()).toBeNull();
  });
});
