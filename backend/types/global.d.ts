// Global type definitions for Node.js environment
declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    DATABASE_HOST?: string;
    DATABASE_PORT?: string;
    DATABASE_NAME?: string;
    DATABASE_USER?: string;
    DATABASE_PASSWORD?: string;
    NODE_ENV?: 'development' | 'production' | 'test';
    SERVER_IP?: string;
    JWT_SECRET?: string;
    SESSION_SECRET?: string;
    UPLOAD_DIR?: string;
    MAX_FILE_SIZE?: string;
  }

  interface Process {
    env: ProcessEnv;
    exit(code?: number): never;
    on(event: 'SIGTERM', listener: () => void): void;
    on(event: 'SIGINT', listener: () => void): void;
  }

  var process: Process;
}

declare var process: NodeJS.Process;
declare var __dirname: string;
declare var console: Console;

