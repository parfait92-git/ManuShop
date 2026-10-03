import {
  CompleteMerchantSignupSchema,
  CreateShopSchema,
  ForgotPasswordSchema,
  InviteSellerSchema,
  LoginSchema,
  RegisterSchema,
  ShopSettingsSchema,
} from "./auth";

describe("RegisterSchema", () => {
  const validInput = {
    displayName: "Awa Diop",
    email: "awa@example.com",
    password: "azerty12",
    confirmPassword: "azerty12",
  };

  it("accepts a valid registration payload", () => {
    expect(RegisterSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = RegisterSchema.safeParse({
      ...validInput,
      confirmPassword: "different1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.path.includes("confirmPassword")
        )
      ).toBe(true);
    }
  });

  it("rejects a password without a digit", () => {
    const result = RegisterSchema.safeParse({
      ...validInput,
      password: "azertyui",
      confirmPassword: "azertyui",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = RegisterSchema.safeParse({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("LoginSchema", () => {
  it("accepts a valid login payload", () => {
    expect(
      LoginSchema.safeParse({ email: "a@b.com", password: "x" }).success
    ).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(
      LoginSchema.safeParse({ email: "a@b.com", password: "" }).success
    ).toBe(false);
  });

  it("accepts an optional rememberMe flag", () => {
    expect(
      LoginSchema.safeParse({
        email: "a@b.com",
        password: "x",
        rememberMe: true,
      }).success
    ).toBe(true);
  });
});

describe("ForgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    expect(
      ForgotPasswordSchema.safeParse({ email: "a@b.com" }).success
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(
      ForgotPasswordSchema.safeParse({ email: "invalid" }).success
    ).toBe(false);
  });
});

describe("InviteSellerSchema", () => {
  it("accepts a valid invite payload", () => {
    expect(
      InviteSellerSchema.safeParse({
        displayName: "Moussa Ba",
        email: "moussa@example.com",
      }).success
    ).toBe(true);
  });

  it("rejects a short display name", () => {
    expect(
      InviteSellerSchema.safeParse({ displayName: "M", email: "a@b.com" })
        .success
    ).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(
      InviteSellerSchema.safeParse({
        displayName: "Moussa Ba",
        email: "invalid",
      }).success
    ).toBe(false);
  });
});

describe("CompleteMerchantSignupSchema", () => {
  it("accepts a valid payload", () => {
    expect(
      CompleteMerchantSignupSchema.safeParse({
        displayName: "Moussa Ba",
      }).success
    ).toBe(true);
  });

  it("rejects a short display name", () => {
    expect(
      CompleteMerchantSignupSchema.safeParse({
        displayName: "M",
      }).success
    ).toBe(false);
  });
});

describe("CreateShopSchema", () => {
  it("accepts a valid shop name", () => {
    expect(
      CreateShopSchema.safeParse({ shopName: "Moussa Boutique" }).success
    ).toBe(true);
  });

  it("rejects a short shop name", () => {
    expect(CreateShopSchema.safeParse({ shopName: "M" }).success).toBe(false);
  });
});

describe("ShopSettingsSchema", () => {
  const validShop = {
    name: "Awa Boutique",
    logo: "https://example.com/logo.png",
    logoMode: "link" as const,
    description: "Une jolie boutique de mode à Dakar.",
    address: "Dakar, Sénégal",
    phone: "+221700000000",
    whatsapp: "+221700000000",
    language: "fr" as const,
    currency: "XAF" as const,
    primarySocialNetwork: "whatsapp" as const,
    facebookUrl: "",
    instagramUrl: "",
    tiktokUrl: "",
    whatsappBusinessUrl: "",
    notifyOrdersByEmail: true,
    notifyOrdersBySocial: true,
    urgentPhoneAlerts: true,
    soundOnNewOrder: true,
    soundOnOrderStatusChange: true,
    soundOnNewMessage: true,
    contactEmail: "contact@awa.example",
    urgentPhone: "+221700000000",
    clientContactMethods: [],
    publicContactEmail: "",
    isPublished: true,
    themeColor: "#3B5BA5",
    vatRate: 0,
    taxId: "",
    tradeRegister: "",
  };

  it("accepts a valid shop settings payload", () => {
    expect(ShopSettingsSchema.safeParse(validShop).success).toBe(true);
  });

  // Facturation (2026-10-03).
  it("checks the invoice colour and VAT rate", () => {
    expect(ShopSettingsSchema.safeParse({ ...validShop, vatRate: 19.25 }).success).toBe(true);
    expect(ShopSettingsSchema.safeParse({ ...validShop, vatRate: -1 }).success).toBe(false);
    expect(ShopSettingsSchema.safeParse({ ...validShop, vatRate: 101 }).success).toBe(false);
    expect(ShopSettingsSchema.safeParse({ ...validShop, vatRate: Number.NaN }).success).toBe(false);
    expect(ShopSettingsSchema.safeParse({ ...validShop, themeColor: "blue" }).success).toBe(false);
    expect(ShopSettingsSchema.safeParse({ ...validShop, taxId: "x".repeat(41) }).success).toBe(false);
  });

  it("accepts an empty logo and empty contact email", () => {
    expect(
      ShopSettingsSchema.safeParse({
        ...validShop,
        logo: "",
        contactEmail: "",
      }).success
    ).toBe(true);
  });

  it("rejects an invalid logo URL", () => {
    expect(
      ShopSettingsSchema.safeParse({ ...validShop, logo: "not-a-url" }).success
    ).toBe(false);
  });

  it("accepts either logo mode and rejects an unknown one", () => {
    expect(
      ShopSettingsSchema.safeParse({ ...validShop, logoMode: "gallery" }).success
    ).toBe(true);
    expect(
      ShopSettingsSchema.safeParse({ ...validShop, logoMode: "upload" }).success
    ).toBe(false);
  });

  it("rejects a short address", () => {
    expect(
      ShopSettingsSchema.safeParse({ ...validShop, address: "a" }).success
    ).toBe(false);
  });

  it("rejects an unknown primary social network", () => {
    expect(
      ShopSettingsSchema.safeParse({
        ...validShop,
        primarySocialNetwork: "snapchat",
      }).success
    ).toBe(false);
  });

  it("rejects an invalid contact email", () => {
    expect(
      ShopSettingsSchema.safeParse({
        ...validShop,
        contactEmail: "not-an-email",
      }).success
    ).toBe(false);
  });

  it("rejects a description over 500 characters", () => {
    expect(
      ShopSettingsSchema.safeParse({
        ...validShop,
        description: "a".repeat(501),
      }).success
    ).toBe(false);
  });

  it("accepts a valid Instagram link and rejects an invalid one", () => {
    expect(
      ShopSettingsSchema.safeParse({
        ...validShop,
        instagramUrl: "https://instagram.com/awaboutique",
      }).success
    ).toBe(true);
    expect(
      ShopSettingsSchema.safeParse({
        ...validShop,
        instagramUrl: "not-a-url",
      }).success
    ).toBe(false);
  });

  it("accepts a list of client contact methods (BF-105)", () => {
    expect(
      ShopSettingsSchema.safeParse({
        ...validShop,
        clientContactMethods: ["whatsapp", "email"],
      }).success
    ).toBe(true);
  });

  it("rejects an unknown client contact method", () => {
    expect(
      ShopSettingsSchema.safeParse({
        ...validShop,
        clientContactMethods: ["telegram"],
      }).success
    ).toBe(false);
  });

  it("rejects an invalid public contact email", () => {
    expect(
      ShopSettingsSchema.safeParse({
        ...validShop,
        publicContactEmail: "not-an-email",
      }).success
    ).toBe(false);
  });
});
