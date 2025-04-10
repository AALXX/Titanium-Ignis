declare module "request-monitor" {
  export interface MonitorOptions {
    projectToken: string;
    serviceName?: string;
    logHeaders?: boolean;
    logBody?: boolean;
    ignorePaths?: string[];
  }

  export interface DatabaseOptions {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    ssl?: boolean;
  }

  export interface ConfigOptions {
    defaultServiceName?: string;
    ignorePaths?: string[];
    logHeaders?: boolean;
    logBody?: boolean;
    db?: DatabaseOptions;
    batch?: {
      enabled?: boolean;
      size?: number;
      interval?: number;
    };
  }

  export function configure(options: ConfigOptions): void;
  export function initDatabase(options?: DatabaseOptions): Promise<boolean>;
  export function createTables(): Promise<boolean>;

  export namespace express {
    function middleware(options?: MonitorOptions): any;
  }

  export namespace fastify {
    function middleware(options?: MonitorOptions): any;
  }

  export namespace koa {
    function middleware(options?: MonitorOptions): any;
  }
}
