import nextJest from "next/jest.js";

// Dates et heures suivent le fuseau de l'appareil de l'utilisateur
// (2026-10-03). Les tests fixent ce fuseau pour donner le même résultat sur
// toute machine : celui d'un utilisateur au Cameroun (UTC+1). Les
// processus de test héritent de cette variable.
process.env.TZ = "Africa/Douala";

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

export default createJestConfig(config);
