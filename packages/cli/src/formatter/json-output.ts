export function printJson(command: string, data: unknown): void {
  console.log(JSON.stringify({ ok: true, command, data }, null, 2));
}

export function printJsonError(command: string, code: string, message: string): void {
  console.error(JSON.stringify({ ok: false, command, error: { code, message } }, null, 2));
}
