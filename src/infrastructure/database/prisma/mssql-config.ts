export type MssqlEnvironmentPrefix =
  | "DATABASE"
  | "TEST_DATABASE"
  | "E2E_DATABASE";

type MssqlEnvironment = Readonly<Record<string, string | undefined>>;

function getRequiredEnvironmentValue(
  environment: MssqlEnvironment,
  variableName: string,
): string {
  const value = environment[variableName]?.trim();

  if (!value) {
    throw new Error(`${variableName} is required to connect to SQL Server.`);
  }

  return value;
}

function getPort(
  environment: MssqlEnvironment,
  variableName: string,
): number {
  const value = environment[variableName]?.trim();

  if (!value) {
    return 1433;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${variableName} must be a valid TCP port.`);
  }

  return port;
}

function getBoolean(
  environment: MssqlEnvironment,
  variableName: string,
  defaultValue: boolean,
): boolean {
  const value = environment[variableName]?.trim().toLowerCase();

  if (!value) {
    return defaultValue;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${variableName} must be either true or false.`);
}

export function createMssqlConfigFromEnvironment(
  prefix: MssqlEnvironmentPrefix,
  environment: MssqlEnvironment = process.env,
) {
  return {
    server: getRequiredEnvironmentValue(environment, `${prefix}_SERVER`),
    port: getPort(environment, `${prefix}_PORT`),
    database: getRequiredEnvironmentValue(environment, `${prefix}_NAME`),
    user: getRequiredEnvironmentValue(environment, `${prefix}_USER`),
    password: getRequiredEnvironmentValue(environment, `${prefix}_PASSWORD`),
    options: {
      encrypt: getBoolean(environment, `${prefix}_ENCRYPT`, true),
      trustServerCertificate: getBoolean(
        environment,
        `${prefix}_TRUST_SERVER_CERTIFICATE`,
        false,
      ),
    },
  };
}
