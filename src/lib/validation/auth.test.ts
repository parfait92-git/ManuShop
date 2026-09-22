import {
  CompleteMerchantSignupSchema,
  CreateShopSchema,
  ForgotPasswordSchema,
  InviteSellerSchema,
  LoginSchema,
  PhoneCodeSchema,
  PhoneLoginSchema,
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

describe("PhoneLoginSchema", () => {
  it("accepts a valid E.164 phone number", () => {
    expect(
      PhoneLoginSchema.safeParse({ phone: "+237600000000" }).success
    ).toBe(true);
  });

  it("rejects a number without the country code prefix", () => {
    expect(
      PhoneLoginSchema.safeParse({ phone: "0600000000" }).success
    ).toBe(false);
  });
});

describe("PhoneCodeSchema", () => {
  it("accepts a 6-digit code", () => {
    expect(PhoneCodeSchema.safeParse({ code: "123456" }).success).toBe(true);
  });

  it("rejects a code with the wrong length", () => {
    expect(PhoneCodeSchema.safeParse({ code: "123" }).success).toBe(false);
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
    address: "Dakar, Sénégal",
    phone: "+221700000000",
    whatsapp: "+221700000000",
    language: "fr" as const,
    currency: "XAF" as const,
    primarySocialNetwork: "whatsapp" as const,
    notifyOrdersByEmail: true,
    notifyOrdersBySocial: true,
    urgentPhoneAlerts: true,
    contactEmail: "contact@awa.example",
    urgentPhone: "+221700000000",
  };

  it("accepts a valid shop settings payload", () => {
    expect(ShopSettingsSchema.safeParse(validShop).success).toBe(true);
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
});
