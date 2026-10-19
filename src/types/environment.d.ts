// This is called Declaration Merging (or Ambient Declarations).
// .d.ts is: Declaration Merging
// Keyword: declare global, interface

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      JWT_SECRET: string;
      MONGODB_URI: string;
      MONGODB_USERNAME: string;
      MONGODB_PASSWORD: string;
      PORT?: string;
    }
  }
}

export {};
