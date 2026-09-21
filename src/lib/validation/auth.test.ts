import {
  CompleteMerchantSignupSchema,
  ForgotPasswordSchema,
  InviteSellerSchema,
  LoginSchema,
  PhoneCodeSchema,
  PhoneLoginSchema,
  RegisterSchema,
  ShopProfileSchema,
} from "./auth";

describe("RegisterSchema", () => {
  const validInput = {
    displayName: "Awa Diop",
    shopName: "Awa Boutique",
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
        shopName: "Moussa Boutique",
      }).success
    ).toBe(true);
  });

  it("rejects a short shop name", () => {
    expect(
      CompleteMerchantSignupSchema.safeParse({
        displayName: "Moussa Ba",
        shopName: "M",
      }).success
    ).toBe(false);
  });
});

describe("ShopProfileSchema", () => {
  const validShop = {
    name: "Awa Boutique",
    logo: "https://example.com/logo.png",
    address: "Dakar, Sénégal",
    phone: "+221700000000",
    whatsapp: "+221700000000",
  };

  it("accepts a valid shop profile", () => {
    expect(ShopProfileSchema.safeParse(validShop).success).toBe(true);
  });

  it("accepts an empty logo", () => {
    expect(
      ShopProfileSchema.safeParse({ ...validShop, logo: "" }).success
    ).toBe(true);
  });

  it("rejects an invalid logo URL", () => {
    expect(
      ShopProfileSchema.safeParse({ ...validShop, logo: "not-a-url" }).success
    ).toBe(false);
  });

  it("rejects a short address", () => {
    expect(
      ShopProfileSchema.safeParse({ ...validShop, address: "a" }).success
    ).toBe(false);
  });
});
