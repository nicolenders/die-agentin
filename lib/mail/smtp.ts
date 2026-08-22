import net from "node:net";
import tls from "node:tls";

// Minimaler SMTP-Client. Absichtlich keine Bibliothek: verschickt werden reine
// Textmails an genau eine Adresse, dafür lohnt keine Abhängigkeit, die
// mitgepflegt werden will. Unterstützt implizites TLS (Port 465) und STARTTLS
// (Port 587) mit AUTH LOGIN bzw. AUTH PLAIN.

export interface SmtpConfig {
  host: string;
  port: number;
  /** true = Verbindung startet direkt verschlüsselt (Port 465). */
  secure: boolean;
  user?: string;
  password?: string;
  /** Zeit ohne Antwort, nach der abgebrochen wird. */
  timeoutMs?: number;
}

export interface SmtpEnvelope {
  from: string; // reine Adresse
  to: string; // reine Adresse
  data: string; // vollständige Nachricht mit CRLF
}

export interface SmtpReply {
  code: number;
  lines: string[];
}

/** Ist das die letzte Zeile einer Antwort? Fortsetzungen tragen „250-". */
export function isFinalReplyLine(line: string): boolean {
  return /^\d{3}(?: |$)/.test(line);
}

/** Zerlegt die Zeilen einer Serverantwort in Code und Text. */
export function parseReply(lines: string[]): SmtpReply {
  const last = lines[lines.length - 1] ?? "";
  const code = Number.parseInt(last.slice(0, 3), 10);
  return { code: Number.isFinite(code) ? code : 0, lines };
}

/** Ist der Antwortcode ein Erfolg (2xx/3xx)? */
export function isPositive(code: number): boolean {
  return code >= 200 && code < 400;
}

/** Bietet der Server STARTTLS an? Wird aus den EHLO-Zeilen gelesen. */
export function supportsStartTls(ehloLines: string[]): boolean {
  return ehloLines.some((l) => /^\d{3}[ -]STARTTLS\b/i.test(l.trim()));
}

class SmtpSession {
  private socket: net.Socket;
  private buffer = "";
  private pending: { resolve: (r: SmtpReply) => void; reject: (e: Error) => void } | null = null;
  private lines: string[] = [];
  private failure: Error | null = null;

  constructor(socket: net.Socket) {
    this.socket = socket;
    this.attach(socket);
  }

  private attach(socket: net.Socket): void {
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => this.onData(chunk));
    socket.on("error", (error: Error) => this.fail(error));
    socket.on("close", () => this.fail(new Error("Verbindung zum Mailserver wurde beendet.")));
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    let index: number;
    while ((index = this.buffer.indexOf("\r\n")) >= 0) {
      const line = this.buffer.slice(0, index);
      this.buffer = this.buffer.slice(index + 2);
      this.lines.push(line);
      if (isFinalReplyLine(line)) {
        const reply = parseReply(this.lines);
        this.lines = [];
        const waiter = this.pending;
        this.pending = null;
        waiter?.resolve(reply);
      }
    }
  }

  private fail(error: Error): void {
    this.failure = error;
    const waiter = this.pending;
    this.pending = null;
    waiter?.reject(error);
  }

  read(): Promise<SmtpReply> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
    });
  }

  write(line: string): void {
    this.socket.write(`${line}\r\n`);
  }

  /** Befehl senden und auf die Antwort warten; nicht-2xx/3xx wird zum Fehler. */
  async command(line: string, expected = isPositive): Promise<SmtpReply> {
    this.write(line);
    const reply = await this.read();
    if (!expected(reply.code)) {
      throw new Error(`Mailserver antwortete: ${reply.lines.join(" ")}`);
    }
    return reply;
  }

  /** Verbindung auf TLS heben (STARTTLS) und den neuen Socket übernehmen. */
  upgrade(host: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.removeAllListeners("data");
      this.socket.removeAllListeners("error");
      this.socket.removeAllListeners("close");
      const secure = tls.connect({ socket: this.socket, servername: host }, () => {
        this.socket = secure;
        this.buffer = "";
        this.lines = [];
        this.attach(secure);
        resolve();
      });
      secure.once("error", reject);
    });
  }

  end(): void {
    this.socket.removeAllListeners("close");
    this.socket.end();
    this.socket.destroy();
  }
}

function connect(config: SmtpConfig): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = config.secure
      ? tls.connect({ host: config.host, port: config.port, servername: config.host })
      : net.connect({ host: config.host, port: config.port });
    const timeout = config.timeoutMs ?? 15_000;
    socket.setTimeout(timeout, () => {
      socket.destroy();
      reject(new Error("Mailserver antwortet nicht."));
    });
    socket.once(config.secure ? "secureConnect" : "connect", () => resolve(socket));
    socket.once("error", reject);
  });
}

/**
 * Verschickt EINE Nachricht. Wirft mit einer Meldung, die sagt, was schiefging —
 * ohne Zugangsdaten darin, die Meldung landet in der Oberfläche.
 */
export async function sendViaSmtp(config: SmtpConfig, envelope: SmtpEnvelope): Promise<void> {
  const socket = await connect(config);
  const session = new SmtpSession(socket);
  try {
    const greeting = await session.read();
    if (!isPositive(greeting.code)) {
      throw new Error(`Mailserver hat die Verbindung abgelehnt: ${greeting.lines.join(" ")}`);
    }

    const hostname = "nicolenders.com";
    let ehlo = await session.command(`EHLO ${hostname}`);

    if (!config.secure && supportsStartTls(ehlo.lines)) {
      await session.command("STARTTLS");
      await session.upgrade(config.host);
      ehlo = await session.command(`EHLO ${hostname}`);
    }

    if (config.user && config.password) {
      const payload = Buffer.from(`\0${config.user}\0${config.password}`, "utf8").toString("base64");
      await session.command(`AUTH PLAIN ${payload}`);
    }

    await session.command(`MAIL FROM:<${envelope.from}>`);
    await session.command(`RCPT TO:<${envelope.to}>`);
    await session.command("DATA", (code) => code === 354);
    session.write(`${envelope.data}\r\n.`);
    const accepted = await session.read();
    if (!isPositive(accepted.code)) {
      throw new Error(`Mailserver hat die Nachricht abgelehnt: ${accepted.lines.join(" ")}`);
    }
    session.write("QUIT");
  } finally {
    session.end();
  }
}
