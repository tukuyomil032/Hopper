export class HopperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HopperError";
  }
}

export class UserError extends HopperError {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

export class NetworkError extends HopperError {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class ResolveError extends HopperError {
  constructor(message: string) {
    super(message);
    this.name = "ResolveError";
  }
}

export class FileSystemError extends HopperError {
  constructor(message: string) {
    super(message);
    this.name = "FileSystemError";
  }
}

export class RegistryError extends HopperError {
  constructor(message: string) {
    super(message);
    this.name = "RegistryError";
  }
}
