import * as net from 'net';
import * as fs from 'fs';
import * as child_process from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { logger } from './logger';

/**
 * Embedded PowerShell script that invokes Win32 winspool.drv RAW printing.
 * Bypasses GDI processor and sends raw ESC/POS bytes directly to USB/Windows printer drivers.
 */
const PS1_SCRIPT = `param (
    [string]$PrinterName,
    [string]$FilePath
)

$ErrorActionPreference = "Stop"

$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPStr)]
        public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)]
        public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)]
        public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] pBytes)
    {
        Int32 dwWritten = 0;
        IntPtr hPrinter = new IntPtr(0);
        DOCINFOA di = new DOCINFOA();
        bool bSuccess = false;

        di.pDocName = "RAW POS Document";
        di.pDataType = "RAW";

        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero))
        {
            if (StartDocPrinter(hPrinter, 1, di))
            {
                if (StartPagePrinter(hPrinter))
                {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(pBytes.Length);
                    Marshal.Copy(pBytes, 0, pUnmanagedBytes, pBytes.Length);
                    bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, pBytes.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        if (bSuccess == false)
        {
            int dwError = Marshal.GetLastWin32Error();
            throw new Exception("Win32 Error: " + dwError);
        }
        return bSuccess;
    }
}
"@

try {
    Add-Type -TypeDefinition $code -ErrorAction Stop

    if (-not (Test-Path $FilePath)) {
        Write-Error "File not found: $FilePath"
        exit 1
    }

    $bytes = [System.IO.File]::ReadAllBytes($FilePath)
    [RawPrinterHelper]::SendBytesToPrinter($PrinterName, $bytes)
    Write-Host "SUCCESS"
    exit 0
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
`;

function ensurePs1Script(): string {
  const scriptPath = path.join(os.tmpdir(), 'unipro_raw_print.ps1');
  try {
    fs.writeFileSync(scriptPath, PS1_SCRIPT, 'utf-8');
  } catch (e) {
    logger.error(`[Print Bridge] Failed to write temp ps1 script: ${e}`);
  }
  return scriptPath;
}

function printRawWindows(printerName: string, payload: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = ensurePs1Script();
    const tempBinPath = path.join(os.tmpdir(), `print_${Date.now()}_${Math.random().toString(36).substring(7)}.bin`);

    fs.writeFile(tempBinPath, payload, (err) => {
      if (err) {
        return reject(new Error(`Failed to write temp print file: ${err.message}`));
      }

      const escapedPrinterName = printerName.replace(/"/g, '""');
      const cmd = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -PrinterName "${escapedPrinterName}" -FilePath "${tempBinPath}"`;

      child_process.exec(cmd, { timeout: 15000 }, (error, stdout, stderr) => {
        fs.unlink(tempBinPath, () => {});

        if (error || stdout.indexOf('SUCCESS') === -1) {
          const errMsg = stderr || stdout || (error ? error.message : 'Unknown RAW print error');
          logger.error(`[Print Bridge] USB/Windows RAW print failed for printer '${printerName}': ${errMsg}`);
          return reject(new Error(`Windows RAW print failed: ${errMsg}`));
        }

        logger.info(`[Print Bridge] USB/Windows RAW print completed successfully for printer '${printerName}'`);
        resolve();
      });
    });
  });
}

/**
 * Parses tags like [C], [L], [R], <B>, </B>, <font size='big'> to ESC/POS binary buffers.
 */
function parseFormatting(content: string): Buffer {
  const chunks: Buffer[] = [];
  
  // Tag translation regex
  const tagRegex = /(\[C\]|\[L\]|\[R\]|<\/?B>|<font size='big'>|<font size='normal'>|<\/font>)/gi;
  const parts = content.split(tagRegex);
  
  for (const part of parts) {
    if (!part) continue;
    const lower = part.toLowerCase();
    if (lower === '[c]') {
      chunks.push(Buffer.from([0x1B, 0x61, 0x01])); // Align center
    } else if (lower === '[l]') {
      chunks.push(Buffer.from([0x1B, 0x61, 0x00])); // Align left
    } else if (lower === '[r]') {
      chunks.push(Buffer.from([0x1B, 0x61, 0x02])); // Align right
    } else if (lower === '<b>') {
      chunks.push(Buffer.from([0x1B, 0x45, 0x01])); // Bold on
    } else if (lower === '</b>') {
      chunks.push(Buffer.from([0x1B, 0x45, 0x00])); // Bold off
    } else if (lower === "<font size='big'>" || lower === "<font size=\"big\">") {
      chunks.push(Buffer.from([0x1D, 0x21, 0x11])); // Double width + double height
    } else if (lower === "<font size='normal'>" || lower === "<font size=\"normal\">" || lower === '</font>') {
      chunks.push(Buffer.from([0x1D, 0x21, 0x00])); // Reset font size
    } else {
      chunks.push(Buffer.from(part, 'utf-8'));
    }
  }
  
  // Append line feeds and paper cut command (GS V 66 0)
  chunks.push(Buffer.from([0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x42, 0x00]));
  
  return Buffer.concat(chunks);
}

/**
 * Verifies that the destination printer is reachable using a short TCP connection check.
 * Checks the actual ESC/POS port (9100) with a 750ms timeout. Returns true if reachable, false otherwise.
 * Does not throw exceptions for expected offline printers.
 */
export function checkPrinterReachable(ip: string, port: number = 9100, timeoutMs: number = 750): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    socket.setTimeout(timeoutMs);

    socket.connect(port, ip, () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(true);
      }
    });

    socket.on('error', () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.on('timeout', () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(false);
      }
    });
  });
}

/**
 * Sends a raw data payload to a LAN/Wi-Fi or USB thermal printer.
 * Supports both base64 binary encoding and standard UTF-8 string encoding with tag translation.
 */
const CASH_DRAWER_PAYLOADS = new Set([
  'G3AAGRk=',   // ESC p 0 25 25 — standard drawer open
  'EBQBAAU=',   // DLE DC4 1 0 5 — real-time drawer open (no paper feed)
]);

export async function sendToPrinter(ip: string, port: number, content: string, jobId: string | number): Promise<void> {
  const targetPort = port || 9100;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const client = new net.Socket();
    const timeoutVal = 30000;
    const connectTimeoutMs = 3000; // 3 seconds connection timeout limit

    client.setTimeout(timeoutVal);

    let payload: Buffer;
    
    // Quick heuristic to check if content is base64 encoded binary
    const trimmed = content.trim();
    const isBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(trimmed) && (trimmed.length % 4 === 0);
    const isCashDrawerCommand = CASH_DRAWER_PAYLOADS.has(trimmed);

    if (isCashDrawerCommand) {
      payload = Buffer.from(trimmed, 'base64');
      console.log(`\n[CashDrawer] Opening drawer (raw binary only, no paper feed)\n`);
    } else if (isBase64) {
      payload = Buffer.from(trimmed, 'base64');
    } else {
      payload = parseFormatting(content);
    }

    if (!isCashDrawerCommand) {
      console.log(`\n[Print]\nStarted...\n`);
    }

    const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip.trim());

    if (!isIp && ip.trim().length > 0) {
      let printerName = ip.trim();
      // Strip leading UNC/local prefixes like \\localhost\, \localhost\, //localhost/, /localhost/, \\127.0.0.1\
      printerName = printerName.replace(/^([\\/]{1,2})(localhost|127\.0\.0\.1)[\\/]/i, '');
      printerName = printerName.replace(/^[\\/]/, '');

      logger.info(`[Print Bridge] USB/Local printer -> target printer name: '${printerName}' (raw input: '${ip}')`);

      if (process.platform === 'win32') {
        printRawWindows(printerName, payload)
          .then(resolve)
          .catch(reject);
        return;
      }

      // Fallback for non-Windows (or UNC file streams)
      let sharePath = ip.trim();
      if (!sharePath.startsWith('\\\\') && !sharePath.startsWith('//')) {
        sharePath = (sharePath.startsWith('\\') || sharePath.startsWith('/'))
          ? `\\\\localhost${sharePath.replace(/^[\\]/, '')}`
          : `\\\\localhost\\${sharePath}`;
      }

      const stream = fs.createWriteStream(sharePath, { flags: 'w' });
      stream.on('error', (err: any) => {
        logger.error(`[Print Bridge] USB/Shared print failed: ${err.message}`);
        reject(err);
      });
      stream.end(payload, () => {
        logger.info(`[Print Bridge] USB/Shared print completed successfully.`);
        resolve();
      });
      return;
    }

    let resolved = false;
    const connectTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        client.destroy();
        console.log(`Status: FAILED\nError: Connection to printer timed out\n`);
        reject(new Error('Connection to printer timed out'));
      }
    }, connectTimeoutMs);

    client.connect(targetPort, ip, () => {
      clearTimeout(connectTimer);
      client.write(payload, () => {
        client.end();
      });
    });

    client.on('close', () => {
      clearTimeout(connectTimer);
      if (!resolved) {
        resolved = true;
        const duration = Date.now() - startTime;
        console.log(`Completed\nDuration: ${duration}ms\nStatus: COMPLETED\n`);
        resolve();
      }
    });

    client.on('error', (err: any) => {
      clearTimeout(connectTimer);
      if (!resolved) {
        resolved = true;
        client.destroy();
        console.log(`Status: FAILED\nError: ${err.message || 'TCP Socket Connection Failed'}\n`);
        reject(err);
      }
    });

    client.on('timeout', () => {
      clearTimeout(connectTimer);
      if (!resolved) {
        resolved = true;
        client.destroy();
        console.log(`Status: FAILED\nError: Connection timed out\n`);
        reject(new Error(`Connection to printer timed out`));
      }
    });
  });
}
